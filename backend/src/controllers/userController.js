const userModel = require("../models/userModel");

async function listUsers(req, res) {
  try {
    const users = await userModel.listUsers();

    return res.json({
      ok: true,
      data: users
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible listar usuarios.",
      detail: error.message
    });
  }
}

async function createAdmin(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      ok: false,
      message: "Nombre, email y password son obligatorios."
    });
  }

  try {
    const user = await userModel.createAdmin({ name, email, password });

    return res.status(201).json({
      ok: true,
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible crear el administrador.",
      detail: error.message
    });
  }
}

module.exports = {
  listUsers,
  createAdmin
};
