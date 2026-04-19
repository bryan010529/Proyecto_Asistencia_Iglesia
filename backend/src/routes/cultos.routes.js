const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const cultosController = require('../controllers/cultos.controller');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  return next();
}

const idValidation = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  validate,
];

const createValidations = [
  body('fecha')
    .notEmpty()
    .withMessage('La fecha es requerida')
    .isISO8601()
    .withMessage('La fecha debe ser válida'),
  body('tipo')
    .notEmpty()
    .withMessage('El tipo es requerido')
    .isIn(['Dominical', 'Oración', 'Especial'])
    .withMessage('El tipo no es válido'),
  validate,
];

router.use(authMiddleware);

router.get('/', cultosController.getAll);
router.get('/activo', cultosController.getCultoActivo);
router.get('/:id', idValidation, cultosController.getById);
router.post('/', createValidations, cultosController.create);

module.exports = router;
