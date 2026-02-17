require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");

const catalogRoutes = require("./routes/catalog");
const authRoutes = require("./routes/auth");
const favoritesRoutes = require("./routes/favorites");
const cartRoutes = require("./routes/cart");
const checkoutRoutes = require("./routes/checkout");
const profileRoutes = require("./routes/profile");
const adminRoutes = require("./routes/admin");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "..", "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

// Прокидываем пользователя и корзину в шаблоны
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cart = req.session.cart || { items: [], qty: 0, total: 0 };
  next();
});

app.use("/", catalogRoutes);
app.use("/", authRoutes);
app.use("/", favoritesRoutes);
app.use("/", cartRoutes);
app.use("/", checkoutRoutes);
app.use("/", profileRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => res.status(404).render("pages/404", { title: "404" }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`http://localhost:${port}`));
