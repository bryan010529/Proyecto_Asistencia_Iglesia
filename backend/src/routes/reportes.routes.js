const { Router } = require('express');
const { query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const reportesController = require('../controllers/reportes.controller');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  return next();
}

const resumenValidations = [
  query('mes')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('El mes debe tener formato YYYY-MM'),
  validate,
];

router.use(authMiddleware);

router.get('/resumen', resumenValidations, reportesController.getResumen);

module.exports = router;
