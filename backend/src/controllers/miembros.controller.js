const miembrosService = require('../services/miembros.service');

async function getAll(req, res, next) {
  try {
    const miembros = await miembrosService.getAll(req.query);
    res.json({ data: miembros });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const miembro = await miembrosService.getById(req.params.id);
    res.json({ data: miembro });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const miembro = await miembrosService.create(req.body, req.user.id);
    res.status(201).json({ data: miembro });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const miembro = await miembrosService.update(req.params.id, req.body, req.user.id);
    res.json({ data: miembro });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await miembrosService.remove(req.params.id, {
      razon: req.body?.razon,
      changedBy: req.user.id,
    });
    res.json({ data: { message: 'Miembro desactivado' } });
  } catch (error) {
    next(error);
  }
}

async function getStatusHistory(req, res, next) {
  try {
    const history = await miembrosService.getStatusHistory(req.params.id);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAll,
  getById,
  getStatusHistory,
  create,
  update,
  remove,
};
