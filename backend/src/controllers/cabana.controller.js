const cabanaService = require('../services/cabana.service');

async function getByCampamento(req, res, next) {
  try {
    const data = await cabanaService.findByCampamento(Number(req.params.campamentoId));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await cabanaService.create({
      campamentoId: Number(req.params.campamentoId),
      nombre: req.body.nombre,
      capacidad: Number(req.body.capacidad),
    });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = await cabanaService.update(Number(req.params.id), req.body);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await cabanaService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (error) {
    return next(error);
  }
}

async function asignar(req, res, next) {
  try {
    const data = await cabanaService.asignar({
      cabanaId: Number(req.params.cabanaId),
      inscripcionId: Number(req.body.inscripcionId),
      asignadoPor: req.user.id,
    });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

async function desasignar(req, res, next) {
  try {
    await cabanaService.desasignar(Number(req.params.inscripcionId));
    return res.json({ data: { ok: true } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  asignar,
  create,
  desasignar,
  getByCampamento,
  remove,
  update,
};
