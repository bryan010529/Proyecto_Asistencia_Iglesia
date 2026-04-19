const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const agendaController = require('../controllers/agenda.controller');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  return next();
}

const monthValidation = [
  query('mes')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('El mes debe tener formato YYYY-MM'),
  validate,
];

const upsertValidations = [
  body('fecha')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('La fecha debe tener formato YYYY-MM-DD'),
  body('tipo').trim().notEmpty().withMessage('El tipo es requerido'),
  body('descripcion').optional().isString().withMessage('La descripción debe ser texto'),
  body('razon').optional().isString().withMessage('La razón debe ser texto'),
  validate,
];

const cancelValidations = [
  param('fecha')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('La fecha debe tener formato YYYY-MM-DD'),
  body('razon').optional().isString().withMessage('La razón debe ser texto'),
  validate,
];

router.use(authMiddleware);

router.get('/', monthValidation, agendaController.getAgenda);
router.get('/historial', monthValidation, agendaController.getHistory);
router.post('/', upsertValidations, agendaController.upsertAgenda);
router.delete('/:fecha', cancelValidations, agendaController.cancelAgenda);

module.exports = router;
