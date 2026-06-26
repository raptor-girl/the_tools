const userModel = require("../models/userModel");
const { verifyPassword } = require("../utils/password");

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      message: "Email y password son obligatorios."
    });
  }

  try {
    const user = await userModel.findByEmail(email);

    if (!user || !user.is_active) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales invalidas."
      });
    }

    const passwordMatches = verifyPassword(
      password,
      user.password_salt,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales invalidas."
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.json({
      ok: true,
      data: req.session.user
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible iniciar sesion. Revisa la conexion a MySQL.",
      detail: error.message
    });
  }
}

function me(req, res) {
  return res.json({
    ok: true,
    data: req.session.user || null
  });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({
      ok: true
    });
  });
}

module.exports = {
  login,
  me,
  logout
};
