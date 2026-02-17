function recalcCart(cart) {
  cart.qty = cart.items.reduce((s, i) => s + i.qty, 0);
  cart.total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
}

module.exports = { recalcCart };
