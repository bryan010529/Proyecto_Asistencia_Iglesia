const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const authService = require('../services/auth.service');

const router = Router();

const loginValidations = [
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo es requerido')
    .isEmail()
    .withMessage('El correo no es válido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
];

const passwordValidations = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña actual debe tener al menos 6 caracteres'),
  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
];

router.post('/login', loginValidations, async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { correo, password } = req.body;
    const resultado = await authService.login(correo, password);

    return res.json(resultado);
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada' });
});

router.put('/password', authMiddleware, passwordValidations, async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    return res.json({ data: { message: 'Contraseña actualizada' } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
