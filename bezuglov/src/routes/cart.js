const express = require("express");
const db = require("../db");
const { recalcCart } = require("./_cartUtils");

const router = express.Router();

router.get("/cart", (req, res) => {
  // Корзина
  const cart = req.session.cart || { items: [], qty: 0, total: 0 };
  res.render("pages/cart", { title: "Корзина", cart });
});

router.post("/cart/add", async (req, res) => {
  // Добавление товара в корзину
  const productId = Number(req.body.productId);
  const qty = Math.max(1, Number(req.body.qty || 1));

  const [[p]] = await db.query(
    "SELECT id, sku, title, price, stock, photo_url FROM products WHERE id=?",
    [productId]
  );
  if (!p) return res.status(404).render("pages/404", { title: "404" });

  req.session.cart = req.session.cart || { items: [], qty: 0, total: 0 };
  const cart = req.session.cart;

  const existing = cart.items.find(i => i.productId === p.id);
  const canQty = Math.max(0, p.stock);

  if (existing) {
    existing.qty = Math.min(canQty, existing.qty + qty);
    existing.price = p.price;
    existing.title = p.title;
    existing.sku = p.sku;
    existing.photo_url = p.photo_url;
  } else {
    cart.items.push({
      productId: p.id,
      sku: p.sku,
      title: p.title,
      price: p.price,
      photo_url: p.photo_url,
      qty: Math.min(canQty, qty),
    });
  }

  cart.items = cart.items.filter(i => i.qty > 0);
  recalcCart(cart);
  res.redirect("/cart");
});

router.post("/cart/update-json", async (req, res) => {
  // Обновление корзины (AJAX) + пересчет суммы в реальном времени
  const cart = req.session.cart || { items: [], qty: 0, total: 0 };
  const qtyMap = (req.body && req.body.qty) ? req.body.qty : {};

  if (!cart.items.length) {
    req.session.cart = cart;
    return res.json({ ok: true, cart });
  }

  const ids = cart.items.map(i => i.productId);
  const [rows] = await db.query(
    `SELECT id, stock, price, title, sku, photo_url FROM products WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  const map = new Map(rows.map(r => [r.id, r]));

  for (const item of cart.items) {
    const p = map.get(item.productId);
    if (!p) { item.qty = 0; continue; }

    const desired = Number(qtyMap[item.productId]);
    const nextQty = Number.isFinite(desired) ? Math.max(1, desired) : item.qty;

    item.qty = Math.min(Math.max(0, p.stock), nextQty);
    item.price = p.price;
    item.title = p.title;
    item.sku = p.sku;
    item.photo_url = p.photo_url;
  }

  cart.items = cart.items.filter(i => i.qty > 0);
  recalcCart(cart);
  req.session.cart = cart;

  res.json({ ok: true, cart });
});

router.post('/cart/update', async (req, res) => {
	// Изменение количества товаров в корзине (с учетом остатков)
	const cart = req.session.cart || { items: [], qty: 0, total: 0 }
	const qtyMap = req.body.qty || {}

	if (!cart.items.length) return res.redirect('/cart')

	const ids = cart.items.map(i => i.productId)
	const [rows] = await db.query(
		`SELECT id, stock, price, title, sku, photo_url
     FROM products
     WHERE id IN (${ids.map(() => '?').join(',')})`,
		ids,
	)

	const map = new Map(rows.map(r => [r.id, r]))

	for (const item of cart.items) {
		const p = map.get(item.productId)
		if (!p) {
			item.qty = 0
			continue
		}

		const desired = Number(qtyMap[item.productId])
		const nextQty = Number.isFinite(desired) ? Math.max(1, desired) : item.qty

		item.qty = Math.min(Math.max(0, p.stock), nextQty)
		item.price = p.price
		item.title = p.title
		item.sku = p.sku
		item.photo_url = p.photo_url
	}

	cart.items = cart.items.filter(i => i.qty > 0)
	recalcCart(cart)
	req.session.cart = cart
	res.redirect('/cart')
})


router.post("/cart/remove", (req, res) => {
  // Удаление товара из корзины
  const productId = Number(req.body.productId);

  const cart = req.session.cart || { items: [], qty: 0, total: 0 };
  cart.items = cart.items.filter(i => i.productId !== productId);

  recalcCart(cart);
  req.session.cart = cart;
  res.redirect("/cart");
});

module.exports = router;
