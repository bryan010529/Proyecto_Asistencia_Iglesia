const tiposMiembroService = require('../services/tipos-miembro.service');

async function getAll(req, res, next) {
  try {
    const tipos = await tiposMiembroService.getAll();
    res.json({ data: tipos });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const tipo = await tiposMiembroService.create(req.body);
    res.status(201).json({ data: tipo });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const tipo = await tiposMiembroService.update(req.params.id, req.body);
    res.json({ data: tipo });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  getAll,
  update,
};
