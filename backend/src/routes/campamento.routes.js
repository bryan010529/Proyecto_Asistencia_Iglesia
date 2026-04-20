const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const campamentoCtrl = require('../controllers/campamento.controller');
const inscripcionCtrl = require('../controllers/inscripcion-campamento.controller');
const pagoCtrl = require('../controllers/pago-campamento.controller');
const descuentoCtrl = require('../controllers/descuento-campamento.controller');
const gastoCtrl = require('../controllers/gasto-campamento.controller');
const cabanaCtrl = require('../controllers/cabana.controller');
const reporteCtrl = require('../controllers/reporte-campamento.controller');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  return next();
}

router.use(authMiddleware);

router.get(
  '/',
  [
    query('estado')
      .optional()
      .isIn(['activo', 'cerrado', 'cancelado'])
      .withMessage('Estado inválido'),
    validate,
  ],
  campamentoCtrl.getAll
);

router.get(
  '/:id',
  [param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  campamentoCtrl.getById
);

router.post(
  '/',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
    body('fechaInicio').isDate().withMessage('Fecha de inicio inválida'),
    body('fechaFin').isDate().withMessage('Fecha de fin inválida'),
    body('precioBase').isFloat({ min: 0 }).withMessage('El precio base debe ser un número positivo'),
    body('capacidadMaxima')
      .optional({ values: 'falsy' })
      .isInt({ gt: 0 })
      .withMessage('La capacidad debe ser un entero positivo'),
    validate,
  ],
  campamentoCtrl.create
);

router.put(
  '/:id',
  [
    param('id').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('fechaInicio').optional().isDate().withMessage('Fecha de inicio inválida'),
    body('fechaFin').optional().isDate().withMessage('Fecha de fin inválida'),
    body('precioBase').optional().isFloat({ min: 0 }).withMessage('El precio base debe ser positivo'),
    body('capacidadMaxima')
      .optional({ values: 'falsy' })
      .isInt({ gt: 0 })
      .withMessage('La capacidad debe ser un entero positivo'),
    body('estado')
      .optional()
      .isIn(['activo', 'cerrado', 'cancelado'])
      .withMessage('Estado inválido'),
    validate,
  ],
  campamentoCtrl.update
);

router.delete(
  '/:id',
  [param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  campamentoCtrl.remove
);

router.get(
  '/:campamentoId/inscripciones',
  [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  inscripcionCtrl.getByCampamento
);

router.get(
  '/inscripciones/:id',
  [param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  inscripcionCtrl.getById
);

router.post(
  '/:campamentoId/inscripciones',
  [
    param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('miembroId').isInt({ gt: 0 }).withMessage('El miembro es requerido'),
    validate,
  ],
  inscripcionCtrl.create
);

router.patch(
  '/inscripciones/:id/estado',
  [
    param('id').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('estado')
      .isIn(['pendiente', 'confirmada', 'cancelada'])
      .withMessage('Estado inválido'),
    validate,
  ],
  inscripcionCtrl.updateEstado
);

router.get(
  '/inscripciones/:inscripcionId/pagos',
  [param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  pagoCtrl.getByInscripcion
);

router.post(
  '/inscripciones/:inscripcionId/pagos',
  [
    param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
    body('fechaPago').isDate().withMessage('Fecha de pago inválida'),
    body('metodoPago')
      .optional()
      .isIn(['efectivo', 'transferencia', 'otro'])
      .withMessage('Método inválido'),
    validate,
  ],
  pagoCtrl.create
);

router.delete(
  '/pagos/:id',
  [param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  pagoCtrl.remove
);

router.get(
  '/inscripciones/:inscripcionId/descuentos',
  [param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  descuentoCtrl.getByInscripcion
);

router.post(
  '/inscripciones/:inscripcionId/descuentos',
  [
    param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('motivo').trim().notEmpty().withMessage('El motivo es requerido'),
    body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
    validate,
  ],
  descuentoCtrl.create
);

router.delete(
  '/descuentos/:id',
  [param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  descuentoCtrl.remove
);

router.get(
  '/:campamentoId/gastos',
  [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  gastoCtrl.getByCampamento
);

router.post(
  '/:campamentoId/gastos',
  [
    param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('concepto').trim().notEmpty().withMessage('El concepto es requerido'),
    body('monto').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0'),
    body('fechaGasto').isDate().withMessage('Fecha de gasto inválida'),
    validate,
  ],
  gastoCtrl.create
);

router.delete(
  '/gastos/:id',
  [param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  gastoCtrl.remove
);

router.get(
  '/:campamentoId/cabanas',
  [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  cabanaCtrl.getByCampamento
);

router.post(
  '/:campamentoId/cabanas',
  [
    param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
    body('capacidad').isInt({ gt: 0 }).withMessage('La capacidad debe ser positiva'),
    validate,
  ],
  cabanaCtrl.create
);

router.put(
  '/cabanas/:id',
  [
    param('id').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('capacidad')
      .optional()
      .isInt({ gt: 0 })
      .withMessage('La capacidad debe ser positiva'),
    validate,
  ],
  cabanaCtrl.update
);

router.delete(
  '/cabanas/:id',
  [param('id').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  cabanaCtrl.remove
);

router.post(
  '/cabanas/:cabanaId/asignar',
  [
    param('cabanaId').isInt({ gt: 0 }).withMessage('Id inválido'),
    body('inscripcionId').isInt({ gt: 0 }).withMessage('La inscripción es requerida'),
    validate,
  ],
  cabanaCtrl.asignar
);

router.delete(
  '/asignaciones/:inscripcionId',
  [param('inscripcionId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  cabanaCtrl.desasignar
);

router.get(
  '/:campamentoId/reporte/resumen',
  [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  reporteCtrl.resumenFinanciero
);

router.get(
  '/:campamentoId/reporte/inscriptos',
  [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  reporteCtrl.listadoInscriptos
);

router.get(
  '/:campamentoId/reporte/exportar',
  [param('campamentoId').isInt({ gt: 0 }).withMessage('Id inválido'), validate],
  reporteCtrl.exportarExcel
);

module.exports = router;
