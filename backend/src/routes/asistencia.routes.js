const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const asistenciaController = require('../controllers/asistencia.controller');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  return next();
}

const registrarValidations = [
  body('miembroId').isInt({ gt: 0 }).withMessage('El miembroId es requerido'),
  body('cultoId').isInt({ gt: 0 }).withMessage('El cultoId es requerido'),
  body('registradoPor')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('El registradoPor debe ser un entero válido'),
  validate,
];

const idValidation = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  validate,
];

const cultoValidation = [
  param('cultoId').isInt({ gt: 0 }).withMessage('El cultoId debe ser un entero válido'),
  validate,
];

router.use(authMiddleware);

router.post('/', registrarValidations, asistenciaController.registrar);
router.get('/:cultoId', cultoValidation, asistenciaController.getByCulto);
router.delete('/:id', idValidation, asistenciaController.anular);

module.exports = router;
