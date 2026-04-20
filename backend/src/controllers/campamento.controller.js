const campamentoService = require('../services/campamento.service');

async function getAll(req, res, next) {
  try {
    const data = await campamentoService.findAll({ estado: req.query.estado });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const data = await campamentoService.findById(Number(req.params.id));
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await campamentoService.create(req.body);
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = await campamentoService.update(Number(req.params.id), req.body);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await campamentoService.remove(Number(req.params.id));
    return res.json({ data: { ok: true } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  getAll,
  getById,
  remove,
  update,
};
