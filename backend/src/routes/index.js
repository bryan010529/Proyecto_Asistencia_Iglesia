const { Router } = require('express');
const authRoutes = require('./auth.routes');
const cultosRoutes = require('./cultos.routes');
const miembrosRoutes = require('./miembros.routes');

const router = Router();

// Registrar rutas aquí a medida que se creen
// const asistenciaRoutes = require('./asistencia.routes');

router.use('/auth', authRoutes);
router.use('/cultos', cultosRoutes);
router.use('/miembros', miembrosRoutes);
// router.use('/asistencia', asistenciaRoutes);

router.get('/', (req, res) => res.json({ message: 'API Asistencia Iglesia v1' }));

module.exports = router;
