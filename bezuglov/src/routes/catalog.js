const express = require("express");
const db = require("../db");

const router = express.Router();

function buildFilters(req) {
  const q = (req.query.q || "").trim();
  const category = (req.query.category || "").trim();
  const brand = (req.query.brand || "").trim();
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
  const inStock = req.query.inStock === "1";
  const sort = (req.query.sort || "new").trim();
  const page = Math.max(1, Number(req.query.page || 1));
  return { q, category, brand, minPrice, maxPrice, inStock, sort, page };
}

function sortSql(sort) {
  switch (sort) {
    case "price_asc": return "ORDER BY p.price ASC";
    case "price_desc": return "ORDER BY p.price DESC";
    case "name_asc": return "ORDER BY p.title ASC";
    case "name_desc": return "ORDER BY p.title DESC";
    default: return "ORDER BY p.created_at DESC";
  }
}

router.get("/", async (req, res) => {
  // Главная: поиск + фильтры + каталог (сортировка + пагинация)
  const f = buildFilters(req);
  const perPage = 12;

  let where = "WHERE 1=1";
  const params = [];

  if (f.q) { where += " AND (p.title LIKE ? OR p.sku LIKE ?)"; params.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.category) { where += " AND c.slug = ?"; params.push(f.category); }
  if (f.brand) { where += " AND b.id = ?"; params.push(Number(f.brand)); }
  if (f.minPrice !== null && Number.isFinite(f.minPrice)) { where += " AND p.price >= ?"; params.push(f.minPrice); }
  if (f.maxPrice !== null && Number.isFinite(f.maxPrice)) { where += " AND p.price <= ?"; params.push(f.maxPrice); }
  if (f.inStock) { where += " AND p.stock > 0"; }

  const [categories] = await db.query("SELECT * FROM categories ORDER BY name");
  const [brands] = await db.query("SELECT * FROM brands ORDER BY name");

  const [[cnt]] = await db.query(
    `SELECT COUNT(*) AS c
     FROM products p
     JOIN categories c ON c.id=p.category_id
     JOIN brands b ON b.id=p.brand_id
     ${where}`,
    params
  );

  const total = Number(cnt.c || 0);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(f.page, pages);
  const offset = (page - 1) * perPage;

  const [products] = await db.query(
    `SELECT p.id, p.sku, p.title, p.price, p.stock, p.photo_url,
            c.name AS category_name, c.slug AS category_slug,
            b.name AS brand_name, b.id AS brand_id
     FROM products p
     JOIN categories c ON c.id=p.category_id
     JOIN brands b ON b.id=p.brand_id
     ${where}
     ${sortSql(f.sort)}
     LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  let favSet = new Set();
  if (req.session.user) {
    const [favRows] = await db.query("SELECT product_id FROM favorites WHERE user_id=?", [req.session.user.id]);
    favSet = new Set(favRows.map(r => r.product_id));
  }

  res.render("pages/index", {
    title: "Главная",
    categories,
    brands,
    products,
    filters: { ...req.query, page: String(page) },
    favSet,
    pager: { total, pages, page, perPage },
  });
});

router.get("/product/:id", async (req, res) => {
  // Страница товара
  const id = Number(req.params.id);

  const [[product]] = await db.query(
    `SELECT p.*, c.name AS category_name, b.name AS brand_name
     FROM products p
     JOIN categories c ON c.id=p.category_id
     JOIN brands b ON b.id=p.brand_id
     WHERE p.id=?`,
    [id]
  );

  if (!product) return res.status(404).render("pages/404", { title: "404" });

  let isFav = false;
  if (req.session.user) {
    const [[f]] = await db.query(
      "SELECT 1 AS ok FROM favorites WHERE user_id=? AND product_id=?",
      [req.session.user.id, product.id]
    );
    isFav = !!f;
  }

  res.render("pages/product", { title: product.title, product, isFav });
});

module.exports = router;
