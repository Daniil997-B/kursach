const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const STATUS_LABEL = {
  in_transit: "В пути",
  pickup_point: "В пункте выдачи",
  done: "Завершен",
};

router.get("/profile", requireAuth, async (req, res) => {
  // Профиль: личные данные + заказы
  const userId = req.session.user.id;

  const [[profileUser]] = await db.query("SELECT id, name, email, phone FROM users WHERE id=?", [userId]);

  const [orders] = await db.query(
    "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC",
    [userId]
  );

  let itemsByOrder = {};
  if (orders.length) {
    const orderIds = orders.map(o => o.id);
    const [items] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY id`,
      orderIds
    );
    for (const it of items) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    }
  }

  res.render("pages/profile", {
    title: "Профиль",
    profileUser,
    orders,
    itemsByOrder,
    STATUS_LABEL,
    saved: req.query.saved === "1",
  });
});

router.post("/profile/update", requireAuth, async (req, res) => {
  // Обновление личных данных
  const userId = req.session.user.id;
  const name = (req.body.name || "").trim();
  const phone = (req.body.phone || "").trim() || null;

  if (!name) return res.redirect("/profile");

  await db.query("UPDATE users SET name=?, phone=? WHERE id=?", [name, phone, userId]);
  req.session.user.name = name;

  res.redirect("/profile?saved=1");
});

module.exports = router;
