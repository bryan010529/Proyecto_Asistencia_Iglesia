# Estado de Validación — Actualizado automáticamente por Claude

## Estado actual
⚠️ APROBADO CON CORRECCIONES

## Última tarea validada
TASK-B04 — Modelo Usuario

## Correcciones aplicadas
- `index.js`: eliminado comentario duplicado `// const Usuario = require('./usuario.model')` (línea 8 — ya estaba importado en línea 5)

## Próxima tarea
**TASK-B05** — Servicio y rutas de autenticación

### Archivos a crear:

**`backend/src/services/auth.service.js`**
```js
// Funciones:
// - login(correo, password) → busca Usuario por correo, compara con bcrypt, genera JWT
// - El JWT debe incluir payload: { id, nombre, rol }
// - Si credenciales inválidas → throw { status: 401, message: 'Credenciales inválidas' }
```

**`backend/src/routes/auth.routes.js`**
```js
// POST /api/auth/login   → body: { correo, password } → res: { token, usuario: { id, nombre, rol } }
// POST /api/auth/logout  → res: { message: 'Sesión cerrada' }  (solo limpia en cliente, no hay estado servidor)
```

**Registrar en `backend/src/routes/index.js`:**
```js
const authRoutes = require('./auth.routes');
router.use('/auth', authRoutes);
```

### Detalles importantes:
- Usar `bcryptjs` (ya en package.json) para comparar contraseña con `passwordHash`
- JWT con `jsonwebtoken`: secret = `process.env.JWT_SECRET`, expiresIn = `process.env.JWT_EXPIRES_IN`
- Validar con `express-validator`: correo requerido + isEmail, password requerido + minLength(6)
- Errores siempre como `{ error: 'mensaje' }` con status HTTP correcto

---
*Última actualización: Claude Sonnet 4.6 — validación automática*
