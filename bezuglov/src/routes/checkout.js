const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");
const { recalcCart } = require("./_cartUtils");

const router = express.Router();

router.get("/checkout", requireAuth, (req, res) => {
  // Страница оформления заказа (адрес)
  const cart = req.session.cart || { items: [], qty: 0, total: 0 };
  if (!cart.items.length) return res.redirect("/cart");
  res.render("pages/checkout", { title: "Оформление", cart });
});

router.post("/checkout", requireAuth, async (req, res) => {
  // Создание заказа
  const address = (req.body.address || "").trim();
  if (!address) {
    const cart = req.session.cart || { items: [], qty: 0, total: 0 };
    return res.status(400).render("pages/checkout", {
      title: "Оформление",
      cart,
      error: "Укажи адрес доставки/получения.",
    });
  }

  const cart = req.session.cart || { items: [], qty: 0, total: 0 };
  if (!cart.items.length) return res.redirect("/cart");

  // Проверка цен/остатков с базой (чтобы не оформить то, чего нет)
  const ids = cart.items.map(i => i.productId);
  const [rows] = await db.query(
    `SELECT id, sku, title, price, stock FROM products WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  const map = new Map(rows.map(r => [r.id, r]));

  // Пересчет корзины на основе БД
  for (const it of cart.items) {
    const p = map.get(it.productId);
    if (!p) return res.status(400).send("Товар из корзины не найден в базе.");
    it.price = p.price;
    it.title = p.title;
    it.sku = p.sku;
    if (p.stock < it.qty) it.qty = Math.max(1, p.stock);
  }
  cart.items = cart.items.filter(i => i.qty > 0);
  recalcCart(cart);

  if (!cart.items.length) {
    req.session.cart = { items: [], qty: 0, total: 0 };
    return res.redirect("/cart");
  }

  const userId = req.session.user.id;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [orderRes] = await conn.query(
      "INSERT INTO orders (user_id, address, total, status) VALUES (?,?,?, 'in_transit')",
      [userId, address, cart.total]
    );
    const orderId = orderRes.insertId;

    for (const it of cart.items) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, sku, title, price, qty, line_total)
         VALUES (?,?,?,?,?,?,?)`,
        [orderId, it.productId, it.sku, it.title, it.price, it.qty, it.price * it.qty]
      );

      await conn.query("UPDATE products SET stock = stock - ? WHERE id=? AND stock >= ?", [
        it.qty, it.productId, it.qty
      ]);
    }

    await conn.commit();

    // Очистка корзины после успешного заказа
    req.session.cart = { items: [], qty: 0, total: 0 };

    res.render("pages/orders_success", { title: "Заказ оформлен", orderId });
  } catch (e) {
    await conn.rollback();
    res.status(500).send("Ошибка оформления заказа: " + e.message);
  } finally {
    conn.release();
  }
});

module.exports = router;
