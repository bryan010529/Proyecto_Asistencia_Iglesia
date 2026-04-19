const agendaService = require('../services/agenda.service');

async function getAgenda(req, res, next) {
  try {
    const month = req.query.mes || new Date().toISOString().slice(0, 7);
    const agenda = await agendaService.getAgenda(month);
    res.json({ data: agenda });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const month = req.query.mes || new Date().toISOString().slice(0, 7);
    const history = await agendaService.getHistory(month);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
}

async function upsertAgenda(req, res, next) {
  try {
    const agenda = await agendaService.upsertAgenda({
      ...req.body,
      changedBy: req.user.id,
    });
    res.json({ data: agenda });
  } catch (error) {
    next(error);
  }
}

async function cancelAgenda(req, res, next) {
  try {
    const agenda = await agendaService.cancelAgenda({
      fecha: req.params.fecha,
      razon: req.body?.razon,
      changedBy: req.user.id,
    });
    res.json({ data: agenda });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  cancelAgenda,
  getAgenda,
  getHistory,
  upsertAgenda,
};
