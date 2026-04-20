const reporteService = require('../services/reporte-campamento.service');

async function resumenFinanciero(req, res, next) {
  try {
    const data = await reporteService.resumenFinanciero(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function listadoInscriptos(req, res, next) {
  try {
    const data = await reporteService.listadoInscriptos(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function exportarExcel(req, res, next) {
  try {
    const { buffer, filename, contentType } = await reporteService.exportarExcel(Number(req.params.campamentoId));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  exportarExcel,
  listadoInscriptos,
  resumenFinanciero,
};
