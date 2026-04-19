const usuariosService = require('../services/usuarios.service');

async function getAll(req, res, next) {
  try {
    const usuarios = await usuariosService.getAll();
    res.json({ data: usuarios });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const usuario = await usuariosService.create(req.body);
    res.status(201).json({ data: usuario });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const usuario = await usuariosService.update(req.params.id, req.body);
    res.json({ data: usuario });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAll,
  create,
  update,
};
