const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const tiposMiembroController = require('../controllers/tipos-miembro.controller');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  return next();
}

const createValidations = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('descripcion').optional().isString().withMessage('La descripción debe ser texto'),
  validate,
];

const updateValidations = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('descripcion').optional().isString().withMessage('La descripción debe ser texto'),
  body('activo').optional().isBoolean().withMessage('El activo debe ser booleano'),
  validate,
];

router.use(authMiddleware);

router.get('/', tiposMiembroController.getAll);
router.post('/', createValidations, tiposMiembroController.create);
router.put('/:id', updateValidations, tiposMiembroController.update);

module.exports = router;
