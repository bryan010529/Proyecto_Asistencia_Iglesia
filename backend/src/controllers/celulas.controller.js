const celulasService = require('../services/celulas.service');

async function getAll(req, res, next) {
  try {
    const celulas = await celulasService.getAll();
    res.json({ data: celulas });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const celula = await celulasService.create(req.body);
    res.status(201).json({ data: celula });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const celula = await celulasService.update(req.params.id, req.body);
    res.json({ data: celula });
  } catch (error) {
    next(error);
  }
}

async function getReuniones(req, res, next) {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const reuniones = await celulasService.getReunionesByCelula(req.params.id, mes);
    res.json({ data: reuniones });
  } catch (error) {
    next(error);
  }
}

async function createReunion(req, res, next) {
  try {
    const reunion = await celulasService.createReunion({
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({ data: reunion });
  } catch (error) {
    next(error);
  }
}

async function getReunionById(req, res, next) {
  try {
    const reunion = await celulasService.getReunionById(req.params.id);
    res.json({ data: reunion });
  } catch (error) {
    next(error);
  }
}

async function saveAttendance(req, res, next) {
  try {
    const reunion = await celulasService.saveAttendance(req.params.id, req.body.registros, req.user.id);
    res.json({ data: reunion });
  } catch (error) {
    next(error);
  }
}

async function saveReport(req, res, next) {
  try {
    const reunion = await celulasService.saveReport(req.params.id, req.body, req.user.id);
    res.json({ data: reunion });
  } catch (error) {
    next(error);
  }
}

async function getResumen(req, res, next) {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const resumen = await celulasService.getResumen(mes);
    res.json({ data: resumen });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  createReunion,
  getAll,
  getReunionById,
  getReuniones,
  getResumen,
  saveAttendance,
  saveReport,
  update,
};
