const mappingModel = require("../models/mappingModel");

async function listMappings(req, res) {
  try {
    const mappings = await mappingModel.listMappings(req.session.user.id);

    return res.json({
      ok: true,
      data: mappings
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible cargar las configuraciones de mapeo.",
      detail: error.message
    });
  }
}

async function saveMapping(req, res) {
  const { name, mapping, originalHeaders } = req.body;

  if (!name || !mapping) {
    return res.status(400).json({
      ok: false,
      message: "Nombre y mapeo son obligatorios."
    });
  }

  try {
    const id = await mappingModel.saveMapping({
      userId: req.session.user.id,
      name,
      mapping,
      originalHeaders
    });

    return res.status(201).json({
      ok: true,
      data: { id }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible guardar el mapeo.",
      detail: error.message
    });
  }
}

module.exports = {
  listMappings,
  saveMapping
};
