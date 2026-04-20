const gastoService = require('../services/gasto-campamento.service');

async function getByCampamento(req, res, next) {
  try {
    const data = await gastoService.findByCampamento(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await gastoService.create({
      campamentoId: Number(req.params.campamentoId),
      concepto: req.body.concepto,
      monto: req.body.monto,
      fechaGasto: req.body.fechaGasto,
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
    await gastoService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  getByCampamento,
  remove,
};
