const asistenciaService = require('../services/asistencia.service');

async function registrar(req, res, next) {
  try {
    const registro = await asistenciaService.registrar({
      ...req.body,
      registradoPor: req.body.registradoPor || req.user.id,
    });

    res.status(201).json({ data: registro });
  } catch (error) {
    next(error);
  }
}

async function getByCulto(req, res, next) {
  try {
    const registros = await asistenciaService.getByCulto(req.params.cultoId);
    res.json({ data: registros });
  } catch (error) {
    next(error);
  }
}

async function anular(req, res, next) {
  try {
    await asistenciaService.anular(req.params.id);
    res.json({ data: { message: 'Registro anulado' } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registrar,
  getByCulto,
  anular,
};
