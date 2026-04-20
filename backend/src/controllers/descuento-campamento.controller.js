const descuentoService = require('../services/descuento-campamento.service');

async function getByInscripcion(req, res, next) {
  try {
    const data = await descuentoService.findByInscripcion(Number(req.params.inscripcionId));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await descuentoService.create({
      inscripcionId: Number(req.params.inscripcionId),
      motivo: req.body.motivo,
      monto: req.body.monto,
      aplicadoPor: req.user.id,
    });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await descuentoService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  getByInscripcion,
  remove,
};
