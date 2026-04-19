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
  body('rol')
    .optional()
    .isIn(['Miembro', 'Líder', 'Visitante', 'Pastor'])
    .withMessage('El rol no es válido'),
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo'])
    .withMessage('El estado debe ser activo o inactivo'),
  body('cedula').custom((value, { req }) => {
    if (value && String(value).trim()) {
      return true;
    }

    if (req.body.rol === 'Visitante') {
      return true;
    }

    throw new Error('La cédula es requerida');
  }),
  body('correo')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('El correo no es válido'),
  body('razonInactivacion')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La razón de inactivación debe ser texto'),
  body('tipoMiembroId')
    .optional({ values: 'falsy' })
    .isInt({ gt: 0 })
    .withMessage('El tipo de miembro debe ser válido'),
  validate,
];

const updateValidations = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('cedula').optional().trim().notEmpty().withMessage('La cédula no puede estar vacía'),
  body('rol')
    .optional()
    .isIn(['Miembro', 'Líder', 'Visitante', 'Pastor'])
    .withMessage('El rol no es válido'),
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo'])
    .withMessage('El estado debe ser activo o inactivo'),
  body('correo')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('El correo no es válido'),
  body('razonInactivacion')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La razón de inactivación debe ser texto'),
  body('tipoMiembroId')
    .optional({ values: 'falsy' })
    .isInt({ gt: 0 })
    .withMessage('El tipo de miembro debe ser válido'),
  validate,
];

const listValidations = [
  query('estado')
    .optional()
    .isIn(['activo', 'inactivo'])
    .withMessage('El estado debe ser activo o inactivo'),
  query('tipoMiembroId')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('El tipo de miembro debe ser válido'),
  validate,
];

const deleteValidations = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  body('razon')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La razón debe ser texto'),
  validate,
];

const bulkValidations = [
  body('miembros')
    .isArray({ min: 1 })
    .withMessage('Debes enviar al menos un miembro para importar'),
  body('miembros.*.nombre')
    .trim()
    .notEmpty()
    .withMessage('Cada fila debe tener nombre'),
  body('miembros.*.rol')
    .optional()
    .isIn(['Miembro', 'Líder', 'Visitante', 'Pastor'])
    .withMessage('El rol no es válido'),
  body('miembros.*.correo')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('El correo no es válido'),
  body('miembros.*.tipoMiembroId')
    .optional({ values: 'falsy' })
    .isInt({ gt: 0 })
    .withMessage('El tipo de miembro debe ser válido'),
  validate,
];

router.use(authMiddleware);

router.get('/', listValidations, miembrosController.getAll);
router.post('/carga-masiva', bulkValidations, miembrosController.bulkCreate);
router.get('/:id/historial-estados', idValidation, miembrosController.getStatusHistory);
router.get('/:id', idValidation, miembrosController.getById);
router.post('/', createValidations, miembrosController.create);
router.put('/:id', updateValidations, miembrosController.update);
router.delete('/:id', deleteValidations, miembrosController.remove);

module.exports = router;
