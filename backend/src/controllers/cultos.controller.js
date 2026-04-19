const cultosService = require('../services/cultos.service');

async function getAll(req, res, next) {
  try {
    const cultos = await cultosService.getAll();
    res.json({ data: cultos });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const culto = await cultosService.getById(req.params.id);
    res.json({ data: culto });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const culto = await cultosService.create(req.body);
    res.status(201).json({ data: culto });
  } catch (error) {
    next(error);
  }
}

async function getCultoActivo(req, res, next) {
  try {
    const culto = await cultosService.getCultoActivo();
    res.json({ data: culto });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  getCultoActivo,
};
