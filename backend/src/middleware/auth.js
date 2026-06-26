function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      ok: false,
      message: "Debes iniciar sesion."
    });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({
      ok: false,
      message: "Necesitas perfil administrador."
    });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
