const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("pages/login", { title: "Вход" });
});

router.get("/register", (req, res) => {
  res.render("pages/register", { title: "Регистрация" });
});

router.post("/register", async (req, res) => {
  // Регистрация пользователя
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const phone = (req.body.phone || "").trim() || null;
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 6) {
    return res.status(400).render("pages/register", {
      title: "Регистрация",
      error: "Заполни имя, email и пароль (минимум 6 символов).",
    });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const [r] = await db.query(
      "INSERT INTO users (name, email, phone, password_hash) VALUES (?,?,?,?)",
      [name, email, phone, hash]
    );

    req.session.user = { id: r.insertId, name, email, role: "user" };
    res.redirect("/");
  } catch (e) {
    const msg = String(e.message || "");
    const error = msg.includes("Duplicate") ? "Email уже зарегистрирован." : "Ошибка регистрации.";
    res.status(400).render("pages/register", { title: "Регистрация", error });
  }
});

router.post("/login", async (req, res) => {
  // Вход
  const email = (req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const [[u]] = await db.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email=?",
    [email]
  );

  if (!u) {
    return res.status(400).render("pages/login", { title: "Вход", error: "Неверный email или пароль." });
  }

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) {
    return res.status(400).render("pages/login", { title: "Вход", error: "Неверный email или пароль." });
  }

  req.session.user = { id: u.id, name: u.name, email: u.email, role: u.role };
  res.redirect("/");
});

router.post("/logout", (req, res) => {
  // Выход
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
