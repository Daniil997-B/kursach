const express = require("express");
const db = require("../db");
const requireAdmin = require("../middleware/admin");

const router = express.Router();

const STATUS_LABEL = {
  in_transit: "В пути",
  pickup_point: "В пункте выдачи",
  done: "Завершен",
};

router.get("/orders", requireAdmin, async (req, res) => {
  // Админ: список заказов
  const [orders] = await db.query(
    `SELECT o.*, u.name AS user_name, u.email AS user_email
     FROM orders o
     JOIN users u ON u.id=o.user_id
     ORDER BY o.created_at DESC
     LIMIT 200`
  );

  // Позиции для отображения
  let itemsByOrder = {};
  if (orders.length) {
    const ids = orders.map(o => o.id);
    const [items] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
      ids
    );
    for (const it of items) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    }
  }

  res.render("pages/admin_orders", {
    title: "Админ · Заказы",
    orders,
    itemsByOrder,
    STATUS_LABEL,
  });
});


router.get("/products", requireAdmin, async (req, res) => {
  // Админ: товары (список)
  const q = (req.query.q || "").trim();

  const params = [];
  let where = "WHERE 1=1";
  if (q) {
    where += " AND (p.title LIKE ? OR p.sku LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  const [products] = await db.query(
    `SELECT p.*, c.name AS category_name, b.name AS brand_name
     FROM products p
     JOIN categories c ON c.id=p.category_id
     JOIN brands b ON b.id=p.brand_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT 500`,
    params
  );

  res.render("pages/admin_products", {
    title: "Админ · Товары",
    products,
    q,
  });
});

router.get("/products/new", requireAdmin, async (req, res) => {
  // Админ: добавление товара
  const [categories] = await db.query("SELECT * FROM categories ORDER BY name");
  const [brands] = await db.query("SELECT * FROM brands ORDER BY name");

  res.render("pages/admin_product_form", {
    title: "Админ · Добавить товар",
    mode: "create",
    product: {
      sku: "",
      title: "",
      description: "",
      price: 0,
      stock: 0,
      photo_url: "",
      category_id: categories[0]?.id || 1,
      brand_id: brands[0]?.id || 1,
    },
    categories,
    brands,
    error: null,
  });
});

router.post("/products/new", requireAdmin, async (req, res) => {
  // Админ: создание товара
  const data = {
    sku: String(req.body.sku || "").trim(),
    title: String(req.body.title || "").trim(),
    description: String(req.body.description || "").trim(),
    price: Number(req.body.price || 0),
    stock: Number(req.body.stock || 0),
    photo_url: String(req.body.photo_url || "").trim(),
    category_id: Number(req.body.category_id),
    brand_id: Number(req.body.brand_id),
  };

  const [categories] = await db.query("SELECT * FROM categories ORDER BY name");
  const [brands] = await db.query("SELECT * FROM brands ORDER BY name");

  if (!data.sku || !data.title) {
    return res.status(400).render("pages/admin_product_form", {
      title: "Админ · Добавить товар",
      mode: "create",
      product: data,
      categories,
      brands,
      error: "Заполни артикул и название",
    });
  }

  try {
    await db.query(
      `INSERT INTO products (category_id, brand_id, sku, title, description, price, stock, photo_url)
       VALUES (?,?,?,?,?,?,?,?)`,
      [data.category_id, data.brand_id, data.sku, data.title, data.description || null, data.price, data.stock, data.photo_url || null]
    );
  } catch (e) {
    return res.status(400).render("pages/admin_product_form", {
      title: "Админ · Добавить товар",
      mode: "create",
      product: data,
      categories,
      brands,
      error: "Не удалось сохранить товар (возможно, такой артикул уже существует).",
    });
  }

  res.redirect("/admin/products");
});

router.get("/products/:id/edit", requireAdmin, async (req, res) => {
  // Админ: редактирование товара
  const id = Number(req.params.id);

  const [[product]] = await db.query("SELECT * FROM products WHERE id=?", [id]);
  if (!product) return res.status(404).render("pages/404", { title: "404" });

  const [categories] = await db.query("SELECT * FROM categories ORDER BY name");
  const [brands] = await db.query("SELECT * FROM brands ORDER BY name");

  res.render("pages/admin_product_form", {
    title: "Админ · Редактировать товар",
    mode: "edit",
    product,
    categories,
    brands,
    error: null,
  });
});

router.post("/products/:id/edit", requireAdmin, async (req, res) => {
  // Админ: сохранение изменений товара
  const id = Number(req.params.id);

  const data = {
    sku: String(req.body.sku || "").trim(),
    title: String(req.body.title || "").trim(),
    description: String(req.body.description || "").trim(),
    price: Number(req.body.price || 0),
    stock: Number(req.body.stock || 0),
    photo_url: String(req.body.photo_url || "").trim(),
    category_id: Number(req.body.category_id),
    brand_id: Number(req.body.brand_id),
  };

  const [categories] = await db.query("SELECT * FROM categories ORDER BY name");
  const [brands] = await db.query("SELECT * FROM brands ORDER BY name");

  if (!data.sku || !data.title) {
    return res.status(400).render("pages/admin_product_form", {
      title: "Админ · Редактировать товар",
      mode: "edit",
      product: { id, ...data },
      categories,
      brands,
      error: "Заполни артикул и название",
    });
  }

  try {
    await db.query(
      `UPDATE products
       SET category_id=?, brand_id=?, sku=?, title=?, description=?, price=?, stock=?, photo_url=?
       WHERE id=?`,
      [data.category_id, data.brand_id, data.sku, data.title, data.description || null, data.price, data.stock, data.photo_url || null, id]
    );
  } catch (e) {
    return res.status(400).render("pages/admin_product_form", {
      title: "Админ · Редактировать товар",
      mode: "edit",
      product: { id, ...data },
      categories,
      brands,
      error: "Не удалось сохранить изменения (проверь артикул на уникальность).",
    });
  }

  res.redirect("/admin/products");
});

router.post("/products/:id/delete", requireAdmin, async (req, res) => {
  // Админ: удаление товара
  const id = Number(req.params.id);
  await db.query("DELETE FROM products WHERE id=?", [id]);
  res.redirect("/admin/products");
});

router.post("/orders/status", requireAdmin, async (req, res) => {
  // Админ: смена статуса заказа
  const orderId = Number(req.body.orderId);
  const status = String(req.body.status || "");

  if (!["in_transit", "pickup_point", "done"].includes(status)) {
    return res.status(400).send("Некорректный статус");
  }

  await db.query("UPDATE orders SET status=? WHERE id=?", [status, orderId]);
  res.redirect("/admin/orders");
});

module.exports = router;
