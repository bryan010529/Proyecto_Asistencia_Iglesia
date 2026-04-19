const { Router } = require('express');
const asistenciaRoutes = require('./asistencia.routes');
const authRoutes = require('./auth.routes');
const cultosRoutes = require('./cultos.routes');
const miembrosRoutes = require('./miembros.routes');
const reportesRoutes = require('./reportes.routes');

const router = Router();

// Registrar rutas aquí a medida que se creen
router.use('/asistencia', asistenciaRoutes);
router.use('/auth', authRoutes);
router.use('/cultos', cultosRoutes);
router.use('/miembros', miembrosRoutes);
router.use('/reportes', reportesRoutes);

router.get('/', (req, res) => res.json({ message: 'API Asistencia Iglesia v1' }));

module.exports = router;
