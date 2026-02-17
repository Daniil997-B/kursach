(() => {
  // Мобильное меню
  const btn = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => nav.classList.toggle("nav--open"));

  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) nav.classList.remove("nav--open");
  });
})();



/* Корзина: пересчет суммы в реальном времени + сохранение на сервер */
(() => {
  const cartEl = document.querySelector("[data-cart]");
  if (!cartEl) return;

  const totalEl = cartEl.querySelector("[data-total]");
  const items = Array.from(cartEl.querySelectorAll("[data-item]"));

  const fmt = (n) => String(Math.round(Number(n) || 0));

  const recalcUi = () => {
    let total = 0;
    for (const it of items) {
      const price = Number(it.dataset.price || 0);
      const qtyInput = it.querySelector("[data-qty]");
      const qty = Math.max(1, Number(qtyInput.value || 1));
      const sum = price * qty;
      it.querySelector("[data-sum]").textContent = fmt(sum);
      total += sum;
    }
    if (totalEl) totalEl.textContent = fmt(total);
  };

  const buildPayload = () => {
    const qty = {};
    for (const it of items) {
      const id = it.dataset.id;
      const q = Math.max(1, Number(it.querySelector("[data-qty]").value || 1));
      qty[id] = q;
    }
    return { qty };
  };

  let cartUpdateTimer = null;
  const sync = () => {
    clearTimeout(cartUpdateTimer);
    cartUpdateTimer = setTimeout(async () => {
      try {
        const r = await fetch("/cart/update-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await r.json();
        if (data && data.ok && data.cart) {
          const map = new Map((data.cart.items || []).map(i => [String(i.productId), i]));
          for (const it of items) {
            const row = map.get(String(it.dataset.id));
            if (row) {
              it.dataset.price = row.price;
              it.querySelector("[data-price]").textContent = fmt(row.price);
              it.querySelector("[data-qty]").value = row.qty;
            }
          }
          if (totalEl) totalEl.textContent = fmt(data.cart.total);
        }
      } catch (e) {
      }
    }, 350);
  };

  // События
  cartEl.addEventListener("input", (e) => {
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    recalcUi();
    sync();
  });

  cartEl.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    recalcUi();
    sync();
  });

  recalcUi();
})();
