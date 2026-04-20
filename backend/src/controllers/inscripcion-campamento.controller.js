const inscripcionService = require('../services/inscripcion-campamento.service');

async function getByCampamento(req, res, next) {
  try {
    const data = await inscripcionService.findByCampamento(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const data = await inscripcionService.findById(Number(req.params.id));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await inscripcionService.create({
      campamentoId: Number(req.params.campamentoId),
      miembroId: Number(req.body.miembroId),
      registradoPor: req.user.id,
    });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

async function updateEstado(req, res, next) {
  try {
    const data = await inscripcionService.updateEstado(Number(req.params.id), req.body.estado);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  getByCampamento,
  getById,
  updateEstado,
};
