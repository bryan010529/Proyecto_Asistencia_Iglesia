const reportesService = require('../services/reportes.service');

async function getResumen(req, res, next) {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const resumen = await reportesService.getResumen(mes);
    res.json({ data: resumen });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getResumen,
};
