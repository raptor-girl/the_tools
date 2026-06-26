const fileModel = require("../models/fileModel");

async function listHistory(req, res) {
  try {
    const history = await fileModel.listHistory();

    return res.json({
      ok: true,
      data: history
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible cargar el historial.",
      detail: error.message
    });
  }
}

module.exports = {
  listHistory
};
