const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const celulasController = require('../controllers/celulas.controller');

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

const idValidation = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  validate,
];

const reunionesQueryValidations = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  query('mes')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('El mes debe tener formato YYYY-MM'),
  validate,
];

const createCelulaValidations = [
  body('nombre').trim().notEmpty().withMessage('El nombre de la célula es requerido'),
  body('sector').optional().isString().withMessage('El sector debe ser texto'),
  body('liderMiembroId')
    .optional({ values: 'falsy' })
    .isInt({ gt: 0 })
    .withMessage('El líder debe ser un miembro válido'),
  body('diaReunion').optional().isString().withMessage('El día de reunión debe ser texto'),
  body('horaReunion').optional().isString().withMessage('La hora de reunión debe ser texto'),
  body('activa').optional().isBoolean().withMessage('El estado activo debe ser booleano'),
  validate,
];

const updateCelulaValidations = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre de la célula es requerido'),
  body('sector').optional().isString().withMessage('El sector debe ser texto'),
  body('liderMiembroId')
    .optional({ values: 'falsy' })
    .isInt({ gt: 0 })
    .withMessage('El líder debe ser un miembro válido'),
  body('diaReunion').optional().isString().withMessage('El día de reunión debe ser texto'),
  body('horaReunion').optional().isString().withMessage('La hora de reunión debe ser texto'),
  body('activa').optional().isBoolean().withMessage('El estado activo debe ser booleano'),
  validate,
];

const createReunionValidations = [
  body('celulaId').isInt({ gt: 0 }).withMessage('La célula es requerida'),
  body('fecha')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('La fecha debe tener formato YYYY-MM-DD'),
  body('tema').trim().notEmpty().withMessage('El tema es requerido'),
  body('comentarios').optional().isString().withMessage('Los comentarios deben ser texto'),
  validate,
];

const saveAttendanceValidations = [
  param('id').isInt({ gt: 0 }).withMessage('La reunión debe ser válida'),
  body('registros')
    .isArray()
    .withMessage('Los registros de asistencia son requeridos'),
  body('registros.*.miembroId')
    .optional({ values: 'falsy' })
    .isInt({ gt: 0 })
    .withMessage('El miembro debe ser válido'),
  body('registros.*.visitanteNombre')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('El nombre del visitante debe ser texto'),
  body('registros.*.comentario')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('El comentario debe ser texto'),
  validate,
];

const saveReportValidations = [
  param('id').isInt({ gt: 0 }).withMessage('La reunión debe ser válida'),
  body('visitantes').optional().isInt({ min: 0 }).withMessage('Los visitantes deben ser un número válido'),
  body('conversiones').optional().isInt({ min: 0 }).withMessage('Las conversiones deben ser un número válido'),
  body('ofrenda').optional().isFloat({ min: 0 }).withMessage('La ofrenda debe ser un monto válido'),
  body('observaciones').optional().isString().withMessage('Las observaciones deben ser texto'),
  body('animo')
    .optional()
    .isIn(['Excelente', 'Bien', 'Regular', 'Difícil'])
    .withMessage('El ánimo no es válido'),
  validate,
];

router.use(authMiddleware);

router.get('/', celulasController.getAll);
router.get('/resumen', monthValidation, celulasController.getResumen);
router.post('/', createCelulaValidations, celulasController.create);
router.put('/:id', updateCelulaValidations, celulasController.update);
router.get('/:id/reuniones', reunionesQueryValidations, celulasController.getReuniones);
router.post('/reuniones', createReunionValidations, celulasController.createReunion);
router.get('/reuniones/:id', idValidation, celulasController.getReunionById);
router.post('/reuniones/:id/asistencia', saveAttendanceValidations, celulasController.saveAttendance);
router.put('/reuniones/:id/reporte', saveReportValidations, celulasController.saveReport);

module.exports = router;
