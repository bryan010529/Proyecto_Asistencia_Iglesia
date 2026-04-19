const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const usuariosController = require('../controllers/usuarios.controller');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  return next();
}

function adminOnly(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  return next();
}

const createValidations = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('correo').trim().notEmpty().withMessage('El correo es requerido').isEmail().withMessage('El correo no es válido'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol')
    .optional()
    .isIn(['admin', 'secretaria'])
    .withMessage('El rol no es válido'),
  validate,
];

const updateValidations = [
  param('id').isInt({ gt: 0 }).withMessage('El id debe ser un entero válido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('correo').optional().trim().isEmail().withMessage('El correo no es válido'),
  body('password')
    .optional()
    .trim()
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol')
    .optional()
    .isIn(['admin', 'secretaria'])
    .withMessage('El rol no es válido'),
  body('activo').optional().isBoolean().withMessage('El activo debe ser booleano'),
  validate,
];

router.use(authMiddleware, adminOnly);

router.get('/', usuariosController.getAll);
router.post('/', createValidations, usuariosController.create);
router.put('/:id', updateValidations, usuariosController.update);

module.exports = router;
