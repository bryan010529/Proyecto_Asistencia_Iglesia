const { Router } = require('express');
const agendaRoutes = require('./agenda.routes');
const asistenciaRoutes = require('./asistencia.routes');
const authRoutes = require('./auth.routes');
const campamentoRoutes = require('./campamento.routes');
const cultosRoutes = require('./cultos.routes');
const celulasRoutes = require('./celulas.routes');
const miembrosRoutes = require('./miembros.routes');
const reportesRoutes = require('./reportes.routes');
const tiposMiembroRoutes = require('./tipos-miembro.routes');
const usuariosRoutes = require('./usuarios.routes');

const router = Router();

// Registrar rutas aquí a medida que se creen
router.use('/agenda-cultos', agendaRoutes);
router.use('/asistencia', asistenciaRoutes);
router.use('/auth', authRoutes);
router.use('/campamentos', campamentoRoutes);
router.use('/cultos', cultosRoutes);
router.use('/celulas', celulasRoutes);
router.use('/miembros', miembrosRoutes);
router.use('/reportes', reportesRoutes);
router.use('/tipos-miembro', tiposMiembroRoutes);
router.use('/usuarios', usuariosRoutes);

router.get('/', (req, res) => res.json({ message: 'API Asistencia Iglesia v1' }));

module.exports = router;
