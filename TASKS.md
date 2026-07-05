# TASKS — Implementación de arreglos de REVISION_FRONTEND.md

> Memoria de trabajo. Cada tarea se marca con `[x]` al completarla.
> El objetivo se cumple cuando todas las tareas están verificadas.
> Referencias: `REVISION_FRONTEND.md` (hallazgos F-x, S-x, C-x, G-x, UX-x, UI-x).

---

## Prioridad 1 — Bloqueantes (AEAT / seguridad)

- [x] **F-1** Botón "Anular" invertido en `invoice-detail.js` — cambiar `!isVoided && !isSent` → `!isVoided && isSent`
- [x] **F-5** Rectificación de F1 genera R5 — backend decide R1/R5 por factura original (`app/__init__.py` rect/rectsust)
- [x] **F-3** "Enviar todas" ignora filtro de empresa — `process.js` envía las visibles como `selected`
- [x] **C-4** Sin gestión de certificados — añadir `cert_file`/`key_file` a `allowed` + inputs en modal empresa
- [x] **S-1** XSS en `company.js` — escapar `company.name`, `vat_id` y `f.value` con `escapeHtml`
- [x] **C-3** Sin indicador de modo prueba/producción en panel de envío — `process.js` muestra `send_mode` + `test`
- [x] **UX-1** "Enviar todas" sin confirmación — `process.js` abre modal de confirmación (refuerzo si `prod`)

## Prioridad 2 — Mayores (funcionalidad core / cumplimiento)

- [x] **F-2** "Editar" factura engañoso — eliminar/deshabilitar botón en `invoices.js` (sin endpoint PUT)
- [x] **F-4** Consulta AEAT sin 2025 — `query.js` límite inferior a 2025
- [x] **F-6** Detalle sin `ref`/`comments` — `invoice-detail.js` añade filas Referencia y Observaciones
- [x] **C-1** Sin facturas exentas (vat nulo) — `invoice.js` permite IVA vacío → envía `null`
- [x] **G-1** Sin página de clientes — crear `clients.html` + `clients.js` (listado, búsqueda, edición)
- [x] **G-5** Error AEAT solo muestra código — persistir `verifactu_err_descr` en `Invoice` + mostrar en detalle
- [x] **S-2** `showToast` no escapa — escapar `message` con `escapeHtml` en `app.js`

## Prioridad 3 — Menores (UX / consistencia)

- [x] **F-8** Dashboard placeholders — implementar `/api/stats` (enviadas hoy) + actividad reciente
- [x] **F-9** "Últ. envío" mal etiquetado — `company.js` cambia etiqueta a "Próx. envío permitido"
- [x] **F-7** `formatDate` desplaza un día — tratar fechas sin hora como locales (`+T00:00:00`)
- [x] **UX-2** Modales sin Escape/foco — `openModal` añade Escape, trampa de foco y retorno
- [x] **UI-1** `aria-expanded` del burger no se actualiza — `app.js` alterna atributo
- [x] **F-10** `company.js` carga todas las empresas — usar `GET /api/<company_id>`
- [x] **G-2** Dropdown de clientes sin búsqueda incremental — implementar `?q=` con debounce en `invoice.js`
- [x] **UI-2** Unificar funciones de escape — eliminar `escapeHTML`/`escHTML` locales, usar `escapeHtml` global
- [x] **UI-2b** Unificar moneda — eliminar `fmtEUR` local, usar `formatEUR` global
- [x] **F-PDF** Nombre de PDF con `/` — sanitizar `number_format` en `invoice-detail.js`
- [x] **UI-2c** Añadir `R5` al typeMap de `invoices.js` y unificar botones de acción

## Prioridad 4 — Cosmético / gaps secundarios

- [x] **F-11** Anulación múltiple — selección con checkboxes en `invoices.js` (backend ya admite varios ids)
- [x] **G-3** Editar fórmulas de numeración — añadir `formula`/`formula_r`/`first_num` a `allowed` + modal
- [x] **G-4** Eliminar empresa/cliente — `DELETE` en backend + botones con confirmación
- [x] **G-6** Exportación CSV — listado de facturas y resultados de consulta AEAT
- [x] **C-2** Clave de régimen / calificación — campos opcionales en línea + propagar al XML
- [x] **S-3** IP filter IPv6/proxy — `ProxyFix` + allowlist configurable + mensaje claro en frontend

## Verificación final

- [x] Levantar la app en modo `mock` y recorrer los flujos críticos (crear, enviar, anular, rectificar, consultar)
- [x] Comprobar que no quedan `escapeHTML`/`escHTML`/`fmtEUR` locales sin unificar
- [x] Sin errores de sintaxis JS (cargar cada página)
