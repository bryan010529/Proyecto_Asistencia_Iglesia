const pagoService = require('../services/pago-campamento.service');

async function getByInscripcion(req, res, next) {
  try {
    const data = await pagoService.findByInscripcion(Number(req.params.inscripcionId));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await pagoService.create({
      inscripcionId: Number(req.params.inscripcionId),
      monto: req.body.monto,
      fechaPago: req.body.fechaPago,
      metodoPago: req.body.metodoPago,
      referencia: req.body.referencia,
      nota: req.body.nota,
      registradoPor: req.user.id,
    });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await pagoService.remove(Number(req.params.id));
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
