const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function sortSql(sort) {
  switch (sort) {
    case "price_asc": return "ORDER BY p.price ASC";
    case "price_desc": return "ORDER BY p.price DESC";
    case "name_asc": return "ORDER BY p.title ASC";
    case "name_desc": return "ORDER BY p.title DESC";
    default: return "ORDER BY f.created_at DESC";
  }
}

router.get("/favorites", requireAuth, async (req, res) => {
  // Избранное: фильтры + сортировка + пагинация
  const q = (req.query.q || "").trim();
  const category = (req.query.category || "").trim();
  const brand = (req.query.brand || "").trim();
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
  const inStock = req.query.inStock === "1";
  const sort = (req.query.sort || "new").trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = 12;

  let where = "WHERE f.user_id = ?";
  const params = [req.session.user.id];

  if (q) { where += " AND (p.title LIKE ? OR p.sku LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
  if (category) { where += " AND c.slug = ?"; params.push(category); }
  if (brand) { where += " AND b.id = ?"; params.push(Number(brand)); }
  if (minPrice !== null && Number.isFinite(minPrice)) { where += " AND p.price >= ?"; params.push(minPrice); }
  if (maxPrice !== null && Number.isFinite(maxPrice)) { where += " AND p.price <= ?"; params.push(maxPrice); }
  if (inStock) { where += " AND p.stock > 0"; }

  const [categories] = await db.query("SELECT * FROM categories ORDER BY name");
  const [brands] = await db.query("SELECT * FROM brands ORDER BY name");

  const [[cnt]] = await db.query(
    `SELECT COUNT(*) AS c
     FROM favorites f
     JOIN products p ON p.id=f.product_id
     JOIN categories c ON c.id=p.category_id
     JOIN brands b ON b.id=p.brand_id
     ${where}`,
    params
  );

  const total = Number(cnt.c || 0);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pg = Math.min(page, pages);
  const offset = (pg - 1) * perPage;

  const [products] = await db.query(
    `SELECT p.id, p.sku, p.title, p.price, p.stock, p.photo_url,
            c.name AS category_name, c.slug AS category_slug,
            b.name AS brand_name
     FROM favorites f
     JOIN products p ON p.id=f.product_id
     JOIN categories c ON c.id=p.category_id
     JOIN brands b ON b.id=p.brand_id
     ${where}
     ${sortSql(sort)}
     LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  res.render("pages/favorites", {
    title: "Избранное",
    categories,
    brands,
    products,
    filters: { ...req.query, page: String(pg) },
    pager: { total, pages, page: pg, perPage },
  });
});

router.post("/favorites/toggle", requireAuth, async (req, res) => {
  // Добавление/удаление из избранного
  const productId = Number(req.body.productId);
  const userId = req.session.user.id;

  const [[exists]] = await db.query(
    "SELECT 1 AS ok FROM favorites WHERE user_id=? AND product_id=?",
    [userId, productId]
  );

  if (exists) await db.query("DELETE FROM favorites WHERE user_id=? AND product_id=?", [userId, productId]);
  else await db.query("INSERT INTO favorites (user_id, product_id) VALUES (?,?)", [userId, productId]);

  res.redirect(req.get("referer") || "/favorites");
});

module.exports = router;
