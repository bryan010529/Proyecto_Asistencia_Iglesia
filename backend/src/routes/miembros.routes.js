const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const miembrosController = require('../controllers/miembros.controller');

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
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('cedula').trim().notEmpty().withMessage('La cédula es requerida'),
  body('correo')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('El correo no es válido'),
  validate,
];

const updateValidations = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('cedula').optional().trim().notEmpty().withMessage('La cédula no puede estar vacía'),
  body('correo')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('El correo no es válido'),
  validate,
];

const listValidations = [
  query('estado')
    .optional()
    .isIn(['activo', 'inactivo'])
    .withMessage('El estado debe ser activo o inactivo'),
  validate,
];

router.use(authMiddleware);

router.get('/', listValidations, miembrosController.getAll);
router.get('/:id', idValidation, miembrosController.getById);
router.post('/', createValidations, miembrosController.create);
router.put('/:id', updateValidations, miembrosController.update);
router.delete('/:id', idValidation, miembrosController.remove);

module.exports = router;
