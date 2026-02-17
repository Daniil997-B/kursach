module.exports = function requireAuth(req, res, next) {
  // Защита страниц для авторизованных
  if (!req.session.user) return res.redirect("/login");
  next();
};
