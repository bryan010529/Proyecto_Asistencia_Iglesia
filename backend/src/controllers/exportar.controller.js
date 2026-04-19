const exportarService = require('../services/exportar.service');

async function exportar(req, res, next) {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const formato = req.query.formato || 'xlsx';
    const { buffer, filename, contentType } = await exportarService.exportar(mes, formato);

    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  exportar,
};
