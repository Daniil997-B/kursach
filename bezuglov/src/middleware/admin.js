module.exports = function requireAdmin(req, res, next) {
  // Защита админ‑части по роли
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Доступ запрещен");
  }
  next();
};
