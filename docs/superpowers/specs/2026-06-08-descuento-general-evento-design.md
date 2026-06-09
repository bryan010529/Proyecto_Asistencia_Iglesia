# Descuento General por Evento

**Fecha:** 2026-06-08  
**Archivo afectado:** `frontend/src/pages/CampamentoScreen.jsx`

## Objetivo

Agregar un botón "Descuento general" en la pestaña Inscripciones del evento que permita aplicar un descuento (por porcentaje o monto fijo) a múltiples inscripciones de una sola vez, con opción de filtrar por estado.

## UI — Botón

En la pestaña **Inscripciones**, junto al botón existente "Inscribir miembro", se agrega un botón secundario con ícono `tag` y texto **"Descuento general"**.

## UI — Modal

Al hacer clic se abre un modal con los siguientes campos:

| Campo | Tipo | Validación |
|---|---|---|
| Tipo de descuento | Radio: `Porcentaje (%)` / `Monto fijo ($)` | Requerido |
| Valor | Input numérico | > 0, requerido |
| Motivo | Input texto | Requerido |
| Aplicar a | Select: `Todas` / `Solo confirmadas` / `Solo pendientes` | Requerido |
| Preview | Texto informativo: "Se aplicará a X inscripciones" | Calculado en tiempo real |

El botón "Aplicar descuento general" queda deshabilitado si faltan campos o si el filtro no retorna ninguna inscripción.

## Lógica

1. Filtrar inscripciones del campamento activo según la selección ("Todas", "confirmadas" o "pendientes")
2. Calcular monto por inscripción:
   - Porcentaje: `monto = precio_base_inscripcion * (valor / 100)`
   - Monto fijo: `monto = valor` (mismo monto para todas)
3. Insertar un registro en `descuentos_campamento` por cada inscripción filtrada
4. Llamar a `recalcularSaldo` para cada inscripción procesada
5. Recargar lista de inscripciones
6. Mostrar toast de éxito: "Descuento aplicado a X inscripciones"

## Casos límite

- Si el descuento calculado supera el saldo, la lógica existente de `Math.max(0, precio_base - total_pagado - total_descuentos)` ya evita saldos negativos.
- Si el filtro no retorna inscripciones, el botón "Aplicar" queda deshabilitado.
- Se procesan las inscripciones en serie para no saturar la base de datos.

## Archivos afectados

- `frontend/src/pages/CampamentoScreen.jsx` — único archivo a modificar (estado del modal, función `saveDescuentoGeneral`, UI del modal y botón)

## Reutilización

Se reutiliza la lógica existente de `recalcularSaldo` e `inscripcionesState` ya cargado en memoria para calcular el preview y filtrar inscripciones sin queries adicionales.
