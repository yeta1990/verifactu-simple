# Revisión exhaustiva del frontend de Veri*Factu

> Informe generado siguiendo el plan definido en `PLAN.md`.
> Metodología: lectura de código + **pruebas funcionales empíricas** contra la app real (Flask en modo `mock`, Chromium headless vía Puppeteer-core, inspección de SQLite y de respuestas de la API).
>
> Cada hallazgo indica **archivo:línea**, **pasos para reproducir**, **esperado vs real**, **severidad**, **categoría** y **esfuerzo** (S/M/L), con **recomendación concreta**.
>
> Convención de severidad: 🔴 Bloqueante · 🟠 Mayor · 🟡 Menor · 🔵 Cosmético.
> Categorías: Funcionalidad · Gap · UX · UI · Seguridad · Cumplimiento AEAT.

---

## 1. Resumen ejecutivo

Se revisaron las 9 páginas del frontend, las utilidades compartidas (`app.js`, `style.css`) y su cotejo con el backend (`app/__init__.py`, `app/models.py`, `app/verifactu.py`). Se ejecutaron **pruebas empíricas** (creación de empresas/facturas, envío mock, anulación, rectificación, render headless con detección de `alert()` XSS, inspección de DOM y SQLite).

**Totales: 27 hallazgos** (algunos agrupan varias hipótesis del plan).

| Severidad | Nº |
|---|---|
| 🔴 Bloqueante | 5 |
| 🟠 Mayor | 11 |
| 🟡 Menor | 8 |
| 🔵 Cosmético | 3 |

| Categoría | Nº |
|---|---|
| Funcionalidad | 11 |
| Seguridad | 3 |
| Cumplimiento AEAT | 4 |
| Gap | 6 |
| UX | 2 |
| UI | 1 |

**Hipótesis del plan verificadas:**

| Hipótesis | Resultado |
|---|---|
| 6.B Anular aparece en no enviadas / falta en enviadas | ✅ **Confirmada empíricamente** |
| 6.C "Editar" no edita | ✅ Confirmada |
| 6.D `units` Integer trunca decimales | ❌ **Refutada** (SQLite almacena `1.5` como `real`; funciona) |
| 6.E query.js no permite 2025 | ✅ **Confirmada empíricamente** |
| 6.F "Enviar todas" ignora filtro empresa | ✅ **Confirmada empíricamente** |
| 6.I dashboard stats placeholder | ✅ **Confirmada empíricamente** |
| 6.K/9.1 XSS en company.js | ✅ **Confirmada empíricamente** (`alert()` ejecutado) |
| 6.M modales sin Escape | ✅ **Confirmada empíricamente** |
| 6.P "Últ. envío" muestra next_send | ✅ **Confirmada empíricamente** |
| 6.U ref/comments no se muestran | ✅ **Confirmada empíricamente** |
| 6.S rectificación body vacío | ✅ Confirmada (+ bug R5/R1 adicional) |
| 7.A certificados no editables | ✅ Confirmada (gap crítico) |
| 7.B no página de clientes | ✅ Confirmada (404) |
| 8.2 "Enviar todas" sin confirmación | ✅ Confirmada |
| 8.7 burger aria-expanded no actualiza | ✅ **Confirmada empíricamente** |
| 8.9 PDF nombre con `/` | ✅ Confirmada |
| 9.1 certificados en repo | ❌ **Refutada** (en `.gitignore`, no trackeados en git) |

**Hallazgos nuevos** (no listados como hipótesis en el plan):
- **F-15** Rectificación de F1 genera R5 en vez de R1 (frontend envía body vacío).
- **F-16** `formatDate` desplaza un día en zonas occidentales (fecha sin hora → UTC).
- **S-3** `showToast` inserta `message` por `innerHTML` sin escapar (riesgo latente).

---

## 2. Hallazgos por categoría

### 2.1 Funcionalidad (bugs)

---

#### F-1 · El botón "Anular" aparece donde el backend rechaza y falta donde acepta 🔴
**Categoría:** Funcionalidad · Cumplimiento AEAT · **Esfuerzo:** S

- **Archivo:** `frontend/invoice-detail.js:155` (condición) y `app/__init__.py:284-285` (validación backend).
- **Pasos para reproducir:**
  1. Crear factura, **no enviarla**, ir al detalle → el botón "Anular" **sí aparece**.
  2. Pulsar "Anular" → el backend devuelve `400 {"error":"Already voided, not sent or referenced: ..."}`.
  3. Enviar la factura (mock), ir al detalle → el botón "Anular" **ya no aparece**.
  4. `curl -X POST /api/1/invoices/1/voided` sobre una factura enviada → `200 OK` (el backend SÍ la anula).
- **Esperado:** El botón "Anular" debe aparecer en facturas **enviadas** (las únicas que la AEAT permite anular) y ocultarse en no enviadas.
- **Real:** Invertido. Aparece en no enviadas (backend 400) y se oculta en enviadas (backend 200).
- **Evidencia:** DOM renderizado: factura enviada id=1 → `grep -c 'void-btn'` = **0**; factura pendiente id=10 → = **1**. Backend: anular enviada → `{"ok":[{"id":1,...}]}`.
- **Causa:** `if (!isVoided && !isSent)` en `invoice-detail.js:155`. Debería ser `if (!isVoided && isSent)`.
- **Recomendación:** Cambiar la condición a `if (!isVoided && isSent)`. (O, si se quiere permitir anular también pendientes locales sin envío a AEAT, añadir un flujo de "borrado local" distinto al registro de anulación AEAT.)

---

#### F-2 · "Editar" factura no edita: abre el formulario de nueva factura 🔴
**Categoría:** Funcionalidad · Gap · **Esfuerzo:** M

- **Archivo:** `frontend/invoices.js:116` y `:247-254` (vista filtrada).
- **Pasos:** En `invoices.html`, pulsar "Editar" en una factura pendiente.
- **Esperado:** Abrir un formulario precargado con los datos de esa factura para modificarla.
- **Real:** Navega a `invoice.html?company_id=X` **sin `id`** → formulario de nueva factura. Al guardar se crea **otra factura con otro número**; la original queda intacta.
- **Causa:** El enlace apunta a `invoice.html?company_id=${companyId}` (sin `id` de factura). No existe endpoint `PUT /api/.../invoices/<id>` en el backend (`app/__init__.py` solo define PUT de company y client).
- **Evidencia:** `grep "methods=\['PUT'\]" app/__init__.py` → solo company y client.
- **Recomendación:** Mientras no exista edición, **eliminar o deshabilitar** el botón "Editar" (o renombrarlo a "Duplicar"). Si se quiere edición real, añadir `PUT /api/<company_id>/invoices/<id>` (solo para facturas no enviadas) y un modo edición en `invoice.js` que cargue la factura por `?id=`.

---

#### F-3 · "Enviar todas" ignora el filtro visual de empresa 🔴
**Categoría:** Funcionalidad · Cumplimiento AEAT · **Esfuerzo:** S

- **Archivo:** `frontend/process.js:308` (`const body = {};` sin `selected` cuando no es selección) y `app/__init__.py:324-330` (envía todas las pendientes).
- **Pasos:**
  1. Tener facturas pendientes en empresa A y empresa B.
  2. En `process.html`, filtrar por empresa A (la tabla solo muestra las de A).
  3. Pulsar "Enviar todas" → el body enviado es `{}`.
  4. El backend envía **todas** las pendientes de **todas** las empresas (A y B).
- **Esperado:** "Enviar todas" respeta el filtro visual activo (solo las de A).
- **Real:** Envía todas las de todas las empresas.
- **Evidencia:** `POST /api/process` con `{}` → `{"companies":{"1":{"ok":[...id6...]},"2":{"ok":[...id7...]}}}` (envió facturas de ambas empresas).
- **Causa:** `sendInvoices(false)` no rellena `body.selected` con las facturas visibles filtradas.
- **Recomendación:** Que "Enviar todas" construya `body.selected` a partir de las filas **visibles** (las del filtro activo), o que el backend acepte un `company_id`/filtro. Como mínimo, al pulsar "Enviar todas" enviar como `selected` todos los `tr` visibles.

---

#### F-4 · Consulta AEAT: no se puede consultar el año 2025 🟠
**Categoría:** Funcionalidad · Cumplimiento AEAT · **Esfuerzo:** S

- **Archivo:** `frontend/query.js:76` (`for (let y = currentYear; y <= 2200; y++)`).
- **Pasos:** Abrir `query.html`, desplegar el selector "Año".
- **Esperado:** Poder consultar desde 2025 (año de entrada en vigor de Veri*Factu).
- **Real:** El selector va de `currentYear` (2026) a 2200. **2025 no aparece**.
- **Evidencia:** DOM: `grep 'value="2025"'` = 0; primer option = `2026`, último = `2200`.
- **Nota:** El backend (`app/verifactu.py:465`) hace `year = max(2025, min(2200, year))`, así que 2025 es válido.
- **Recomendación:** Cambiar el límite inferior a `2025` (o a una constante `VERIFACTU_START_YEAR = 2025`).

---

#### F-5 · Rectificación de F1 genera R5 en vez de R1 🔴
**Categoría:** Cumplimiento AEAT · **Esfuerzo:** S

- **Archivo:** `frontend/invoice-detail.js` (botones `.rect-btn` envían `body: JSON.stringify({})`) y `app/__init__.py:246,266` (`type = 'R1' if 'vat_id' in data else 'R5'`).
- **Pasos:**
  1. Crear una factura F1 (con NIF del destinatario) y enviarla.
  2. En el detalle, pulsar "Rectificación por integración".
  3. El frontend envía `POST /api/.../rect` con body `{}`.
  4. El backend crea una factura **R5** (rectificativa sin identificación de destinatario) aunque copia el `vat_id` del original.
- **Esperado:** Una rectificación de una F1 (con NIF) debe ser **R1** (rectificativa con NIF).
- **Real:** Se crea **R5** con `vat_id` copiado del original → inconsistencia: R5 indica "sin destinatario" pero el XML incluirá `<NIF>`. Riesgo de rechazo AEAT.
- **Evidencia:** `POST /api/1/invoices/1/rect` con `{}` → factura id=9, `verifactu_type=R5`, `stype=I`, copia 1 línea, `vat_id` copiado del original.
- **Causa:** El backend decide el tipo por la **presencia** de la key `vat_id` en el body, y el frontend nunca la envía.
- **Recomendación:** Que el frontend envíe en el body de rectificación los datos del destinatario (al menos `vat_id` y `name`), o que el backend decida R1/R5 en función de la factura **original** (si el original tiene `vat_id`, crear R1). Opción más robusta: `type = 'R1' if data.get('vat_id') or ref.vat_id else 'R5'`.

---

#### F-6 · El detalle no muestra "Referencia" ni "Observaciones" 🟠
**Categoría:** Funcionalidad · Gap · **Esfuerzo:** S

- **Archivo:** `frontend/invoice-detail.js` (sin mención a `inv.ref` ni `inv.comments` en `renderInvoice`).
- **Pasos:** Crear una factura rellenando "Referencia" y "Observaciones" en `invoice.html`. Abrir el detalle.
- **Esperado:** Ver ambos campos en la ficha.
- **Real:** No aparecen. `grep -cE 'Referencia|Observaciones'` en el DOM = 0.
- **Evidencia:** Factura 1 tiene `ref='22'` en BD, pero el detalle no lo muestra.
- **Nota:** `comments` se usa como `DescripcionOperacion` en el XML a la AEAT (`app/verifactu.py:registro_alta`), por lo que el usuario **no ve** qué descripción se está enviando a la AEAT.
- **Recomendación:** Añadir filas "Referencia" y "Observaciones" a la ficha del detalle.

---

#### F-7 · `formatDate` puede desplazar la fecha un día en zonas occidentales 🟡
**Categoría:** Funcionalidad · **Esfuerzo:** S

- **Archivo:** `frontend/app.js` (`formatDate`) y `frontend/process.js` (`formatDate(inv.fecha || inv.created_at)`).
- **Pasos:** En un navegador con zona horaria occidental (ej. UTC-5), abrir el detalle de una factura o `process.html`.
- **Esperado:** La fecha de emisión coincide con la de BD.
- **Real:** `inv.fecha` llega como `'2026-07-04'` (sin hora ni TZ); `new Date('2026-07-04')` se interpreta como **UTC 00:00**, que en UTC-5 es `03/07/2026`. El día se desplaza.
- **Evidencia:** `new Date('2026-07-04').toString()` → `Sat Jul 04 2026 02:00:00 GMT+0200` (en Madrid, OK); en UTC-5 sería `21/07` víspera. Las fechas con hora (`'%Y-%m-%d %H:%M:%S'`) se interpretan como hora local y no se desplazan.
- **Recomendación:** Tratar fechas sin hora como locales explícitamente (ej. `new Date(dt + 'T00:00:00')`) o devolver ISO con TZ desde el backend.

---

#### F-8 · Dashboard: "Facturas enviadas hoy" y "Últimos movimientos" son placeholders 🟡
**Categoría:** Funcionalidad · Gap · **Esfuerzo:** M

- **Archivo:** `frontend/index.js:64` (`stat-sent-today` = `'—'` hardcoded) y `:71` (`renderRecentActivity` → `emptyState`).
- **Pasos:** Abrir el dashboard.
- **Esperado:** Contar facturas enviadas hoy y listar actividad reciente.
- **Real:** "Enviadas hoy" siempre muestra `—`. "Últimos movimientos" siempre muestra "No hay movimientos recientes para mostrar." No existe endpoint `/api/activity`.
- **Evidencia:** DOM: `stat-sent-today` = `—`; `recent-activity` = emptyState.
- **Recomendación:** Implementar `/api/stats` (enviadas hoy) y `/api/activity` (log de movimientos), o eliminar las tarjetas si no se van a implementar.

---

#### F-9 · "Últ. envío" muestra la **próxima** fecha de envío (rate-limit) 🟡
**Categoría:** Funcionalidad · UX · **Esfuerzo:** S

- **Archivo:** `frontend/company.js:55` (`{ label: 'Últ. envío', value: formatDate(company.next_send) }`).
- **Pasos:** Abrir el detalle de una empresa que haya enviado facturas.
- **Esperado:** Ver la fecha del último envío realizado.
- **Real:** Muestra `next_send`, que el backend setea a `now + TiempoEsperaEnvio segundos` tras cada envío (es la **próxima** fecha permitida, no la última).
- **Evidencia:** Empresa 1 con `next_send = 04 Jul 2026 20:22:39` (futuro) etiquetada como "Últ. envío".
- **Recomendación:** Cambiar la etiqueta a "Próx. envío permitido" (o añadir un campo `last_send` real).

---

#### F-10 · `company.js` carga todas las empresas para mostrar una 🟡
**Categoría:** Funcionalidad · Rendimiento · **Esfuerzo:** S

- **Archivo:** `frontend/company.js:14` (`apiFetch('/api/companies')` + `find`).
- **Pasos:** Abrir `company.html?id=1`.
- **Esperado:** Cargar solo la empresa necesaria.
- **Real:** Descarga el listado completo de empresas y hace `find` en cliente. Existe `GET /api/<company_id>` que devuelve una sola.
- **Recomendación:** Usar `GET /api/<company_id>` para la ficha (y cargar `/api/companies` solo para el navbar, que ya lo necesita).

---

#### F-11 · Anular solo permite una factura por vez (backend admite varias) 🔵
**Categoría:** Gap · **Esfuerzo:** S

- **Archivo:** `frontend/invoice-detail.js` (anula con un solo `id`); `app/__init__.py:279-281` (acepta `invoice_ids` separados por coma).
- **Pasos:** El backend acepta `POST /api/.../invoices/1,2,3/voided`; el frontend solo llama con un id.
- **Recomendación:** Si se quiere anulación masiva, añadir selección múltiple en `invoices.html`. Menor.

---

### 2.2 Seguridad

---

#### S-1 · XSS en `company.js` (detalle de empresa) 🔴
**Categoría:** Seguridad · **Esfuerzo:** S

- **Archivo:** `frontend/company.js:61` (`<td class="is-vcentered">${f.value || '—'}</td>`), `:72` (`<h1 class="title">${company.name}</h1>`), `:73` (`<p class="subtitle ...">${company.vat_id || ''}</p>`).
- **Pasos:**
  1. `POST /api/companies` con `name = "<b>bold</b><img src=x onerror=alert(1)>"`.
  2. Abrir `company.html?id=<nuevo>`.
- **Esperado:** El nombre se muestra como texto plano (escapado).
- **Real:** El `onerror=alert(1)` **se ejecuta** (dos veces: en el `<h1>` y en la tabla de campos).
- **Evidencia:** Puppeteer capturó `ALERTS=["1","1"]`; DOM contiene `<h1 class="title"><b>bold</b><img src="x" onerror="alert(1)"></h1>` sin escapar.
- **Causa:** `renderCompany` inserta `company.name`, `company.vat_id` y todos los `f.value` (address, email, phone, contact, etc.) por `innerHTML` **sin `escapeHtml`**.
- **Recomendación:** Envolver todos los valores dinámicos con `escapeHtml()` (la función ya existe en `app.js`). Unificar las tres funciones de escape (`escapeHtml`/`escapeHTML`/`escHTML`) en una sola.

---

#### S-2 · `showToast` inserta el mensaje por `innerHTML` sin escapar 🟠
**Categoría:** Seguridad · **Esfuerzo:** S

- **Archivo:** `frontend/app.js:103` (`<span class="toast-body">${message}</span>`).
- **Pasos:** Cualquier llamada `showToast('...' + err.message)` donde `err.message` provenga del backend y este incluya input del usuario.
- **Esperado:** El mensaje se muestra como texto.
- **Real:** Se inserta como HTML. Hoy no es explotable empíricamente porque los mensajes de error del backend son genéricos ("VAT ID already exists", "Missing field") y no reflejan input crudo del usuario, pero es un **riesgo latente**: cualquier futuro error que incluya un valor del usuario (ej. `str(e)` de SQLAlchemy, o mensajes de la AEAT) se ejecutaría.
- **Recomendación:** Escapar `message` en `showToast` con `escapeHtml` antes de insertarlo (o usar `textContent`).

---

#### S-3 · Endpoints `/api/pending` y `/api/process` restringidos a IP local: riesgo en IPv6/proxy 🟡
**Categoría:** Seguridad · **Esfuerzo:** M

- **Archivo:** `app/__init__.py:298,324` (`request.remote_addr.startswith(('127.','192.168.','10.'))`).
- **Pasos:** Acceder desde IPv6 (`::1`), una IP pública, o detrás de un proxy/Docker (donde `remote_addr` es la del proxy y no se hondea `X-Forwarded-For`).
- **Esperado:** Acceso controlado y mensaje claro.
- **Real:** `::1` no empieza por los prefijos → `401 {"error":"Access only from local address"}`. Detrás de proxy, `remote_addr` es la del proxy (que puede ser `172.x` y no pasar el filtro) o, si el proxy es `127.0.0.1`, **cualquiera** pasaría el filtro. El frontend muestra un toast con `err.message` (no falla en silencio), pero el mensaje "Access only from local address" es técnico.
- **Recomendación:** Usar `ProxyFix` de Werkzeug y filtrar por una lista configurable de IPs/allowlist; mostrar un mensaje más explicativo en el frontend ("Esta acción solo está disponible desde el servidor local").

> **Nota positiva (refutación de hipótesis 9.1):** los certificados (`cert.pem`, `cert_key.pem`, `*.p12`) y la BD **sí están en `.gitignore`** y **no están trackeados** en git (`git ls-files` no los lista). Riesgo de filtración mitigado a nivel de repo.

---

### 2.3 Cumplimiento AEAT

---

#### C-1 · No se pueden crear facturas exentas / no sujetas (IVA nulo) 🟠
**Categoría:** Cumplimiento AEAT · Gap · **Esfuerzo:** M

- **Archivo:** `frontend/invoice.js:565` (default `vat: 21`), `:659` (`vat: parseFloat(l.vat) || 0`); el input `type="number"` no admite vacío.
- **Pasos:** En `invoice.html`, intentar dejar el IVA vacío para una operación exenta/no sujeta.
- **Esperado:** Poder crear una línea con `vat` nulo → el XML usaría `CalificacionOperacion=N1` (el backend ya lo soporta, `app/verifactu.py:registro_alta`).
- **Real:** El frontend siempre envía `vat` (21 por defecto, o 0 si se borra). No se puede expresar "exento".
- **Recomendación:** Permitir `vat` vacío en la línea (o un selector "Exenta/No sujeta") y enviar `null` en su lugar.

---

#### C-2 · Sin UI para clave de régimen ni calificación (fijos en 01/S1) 🟠
**Categoría:** Cumplimiento AEAT · Gap · **Esfuerzo:** L

- **Archivo:** `app/verifactu.py:registro_alta` (`ClaveRegimen=01`, `CalificacionOperacion=S1`/`N1` hardcoded).
- **Pasos:** Crear cualquier factura y revisar el XML generado.
- **Esperado:** Poder elegir `ClaveRegimen` (01–07) y `CalificacionOperacion` para regímenes especiales (recargo de equivalencia, etc.).
- **Real:** Todo se envía con `ClaveRegimen=01` y `S1`/`N1`.
- **Recomendación:** Añadir campos opcionales en la línea/factura para clave de régimen y calificación, y propagarlos al XML.

---

#### C-3 · Sin indicador de modo prueba/producción en el panel de envío 🔴
**Categoría:** Cumplimiento AEAT · UX · Seguridad · **Esfuerzo:** S

- **Archivo:** `frontend/process.js` (no menciona `send_mode` ni `company.test`; no consulta `/api/config`).
- **Pasos:** Con `send_mode=prod` y `company.test=false`, abrir `process.html` y pulsar "Enviar todas".
- **Esperado:** Advertencia visible de que se va a enviar a **producción** (irreversible).
- **Real:** Ningún indicador. El usuario puede enviar a producción sin saberlo.
- **Recomendación:** Mostrar el `send_mode` actual y el flag `test` de cada empresa en el panel; añadir confirmación modal explícita si `send_mode=prod` (ver UX-1).

---

#### C-4 · Sin gestión de certificados digitales desde el frontend (gap crítico para test/prod) 🔴
**Categoría:** Cumplimiento AEAT · Gap · **Esfuerzo:** M

- **Archivo:** `frontend/companies.js` y `frontend/company.js` (0 referencias a `cert_file`/`key_file`); `app/models.py:53` (`allowed` no los incluye).
- **Pasos:** Abrir el modal de crear/editar empresa.
- **Esperado:** Campos para asignar/subir certificado y clave.
- **Real:** No existen. Sin `cert_file`/`key_file`, el modo `test`/`prod` devuelve `400 Missing certificate or key file` (`app/verifactu.py:send_xml`). El modo `test`/`prod` es **inutilizable desde el frontend**.
- **Nota:** La empresa 1 los tiene configurados (vía DB directa), pero no se pueden ver ni cambiar desde el UI.
- **Recomendación:** Añadir a `Company.validate_fields.allowed` los campos `cert_file`/`key_file`, y en el modal de empresa inputs para subir/asignar certificado (`.p12`/`.pem`) con extracción en el backend, o al menos un campo de ruta.

---

### 2.4 Gaps de funcionalidad

---

#### G-1 · No existe página de clientes 🟠
**Categoría:** Gap · **Esfuerzo:** M

- **Archivo:** no existe `frontend/clients.html` (404); el backend sí tiene `GET/POST/PUT /api/<company_id>/clients`.
- **Pasos:** Navegar a `/frontend/clients.html` → 404.
- **Esperado:** Listar, editar y crear clientes de una empresa.
- **Real:** Los clientes se auto-guardan al facturar, pero no se pueden consultar ni corregir directamente. Un cliente mal guardado solo se "corrige" creando otra factura.
- **Recomendación:** Añadir `clients.html` con listado, búsqueda (el backend ya soporta `?q=`) y edición.

---

#### G-2 · El dropdown de clientes no tiene búsqueda incremental 🟡
**Categoría:** Gap · UX · **Esfuerzo:** S

- **Archivo:** `frontend/invoice.js` (`searchTimeout` declarado en `:~30` pero sin usar; `loadClients` carga todos sin `?q=`).
- **Pasos:** En `invoice.html` con muchos clientes, el dropdown los lista todos sin filtro.
- **Esperado:** Búsqueda incremental vía `?q=` (soportado por el backend).
- **Real:** Carga todos los clientes de golpe.
- **Recomendación:** Implementar el `searchTimeout` ya declarado: input de búsqueda que llame a `/api/<cid>/clients?q=...` con debounce.

---

#### G-3 · No se pueden editar fórmulas de numeración ni primer número 🟡
**Categoría:** Gap · **Esfuerzo:** S

- **Archivo:** `frontend/company.js` (muestra `formula`, `formula_r`, `first_num` read-only); `Company.validate_fields.allowed` no los incluye.
- **Recomendación:** Añadirlos a `allowed` y al modal de editar empresa (con validación de formato).

---

#### G-4 · No se puede eliminar ninguna empresa ni cliente 🟡
**Categoría:** Gap · **Esfuerzo:** M

- **Archivo:** no existe `DELETE` en el backend ni botones en el frontend.
- **Recomendación:** Añadir `DELETE` (con confirmación) al menos para entornos de prueba; respetar `ondelete=RESTRICT` de `company_id`.

---

#### G-5 · El estado de error AEAT solo muestra el código, no la descripción 🟠
**Categoría:** Gap · Cumplimiento · **Esfuerzo:** S

- **Archivo:** `frontend/invoice-detail.js` (muestra `Código de error AEAT: <strong>${escapeHTML(inv.verifactu_err)}</strong>`; no hay `verifactu_err_descr`).
- **Pasos:** Una factura rechazada por la AEAT (`verifactu_err != 0`) muestra solo el código numérico.
- **Esperado:** Ver la descripción del rechazo para subsanar.
- **Real:** Solo el código. La descripción se registra en `verifactu.log` y en `process.js` (resultados de envío) pero no se persiste en la factura ni se muestra en el detalle.
- **Recomendación:** Persistir `verifactu_err_descr` en `Invoice` y mostrarla en el detalle; añadir un botón "Reintentar envío" para facturas rechazadas.

---

#### G-6 · Sin exportación de datos (CSV/PDF/Excel) 🟡
**Categoría:** Gap · **Esfuerzo:** M

- **Archivo:** ninguna lista tiene exportación.
- **Recomendación:** Añadir exportación CSV al menos en listado de facturas y resultados de consulta AEAT.

---

### 2.5 UX

---

#### UX-1 · "Enviar todas" a la AEAT no pide confirmación 🔴
**Categoría:** UX · Cumplimiento · **Esfuerzo:** S

- **Archivo:** `frontend/process.js:281` (`btnSendAll.addEventListener('click', () => sendInvoices(false))` — sin `openModal`/`confirm` previo).
- **Pasos:** En `process.html`, pulsar "Enviar todas".
- **Esperado:** Modal de confirmación, especialmente si `send_mode=prod` (envío irreversible a la AEAT).
- **Real:** Envía inmediatamente sin confirmación.
- **Recomendación:** Añadir `openModal` de confirmación; si `send_mode=prod`, requerir confirmación explícita con texto de advertencia.

---

#### UX-2 · Modales: sin cierre con Escape, sin trampa de foco, sin retorno de foco 🟡
**Categoría:** UX · Accesibilidad · **Esfuerzo:** M

- **Archivo:** `frontend/app.js` (`openModal`) y modales manuales de `companies.js`/`company.js`.
- **Pasos:** Abrir cualquier modal y pulsar Escape.
- **Esperado:** Escape cierra; el foco queda atrapado dentro; al cerrar, el foco vuelve al elemento que abrió el modal.
- **Real:** Escape no cierra (verificado: modal sigue `is-active` tras Escape). No hay trampa de foco ni retorno.
- **Evidencia:** Puppeteer: `modal is-active AFTER Escape: true`.
- **Recomendación:** Añadir listener de `keydown` Escape en `openModal`; gestionar foco con `tabindex` y guardar/restaurar `document.activeElement`.

---

### 2.6 UI

---

#### UI-1 · El `aria-expanded` del burger no se actualiza al togglear 🟡
**Categoría:** UI · Accesibilidad · **Esfuerzo:** S

- **Archivo:** `frontend/app.js` (listener del burger toggles `is-active` pero no actualiza `aria-expanded`).
- **Pasos:** En móvil (360px), abrir el burger.
- **Esperado:** `aria-expanded` pasa a `"true"`.
- **Real:** Sigue `"false"` aunque el menú se abre (`is-active` sí cambia).
- **Evidencia:** Puppeteer: `aria-expanded AFTER click: false`, `menu is-active AFTER: true`.
- **Recomendación:** En el handler del burger, alternar `burger.setAttribute('aria-expanded', isActive)`.

---

#### UI-2 · Inconsistencias estructurales menores 🔵
**Categoría:** UI · **Esfuerzo:** M

- **Tres funciones de escape** (`escapeHtml` en `app.js`, `escapeHTML` en `invoice-detail.js`/`company.js`, `escHTML` en `invoice.js`). Unificar en una.
- **`config.html`** inyecta el navbar en `#app` y deja el formulario en una `<section>` separada fuera de `#app`, a diferencia del resto de páginas (donde todo va en `#app`). Funciona visualmente, pero es inconsistente.
- **Títulos**: mezcla de `<p class="title">`, `<h1 class="title">`, `<p class="title is-5">`. Unificar a `<h1>`/`<h2>`.
- **Moneda**: `formatEUR` (app.js, `style:currency`) vs `fmtEUR` (invoice.js, `toLocaleString` + " €"). Unificar.
- **Botones de acción** en `invoices.js`: la vista inicial usa enlaces "Ver | Editar"; la vista filtrada usa botones Bulma. Unificar.

---

## 3. Matriz de checklist (§10 del plan)

| Ítem | Estado | Ref. |
|---|---|---|
| Dashboard: 3 stats cargan | ⚠️ "enviadas hoy" placeholder | F-8 |
| Dashboard: actividad reciente | ⚠️ placeholder | F-8 |
| Empresas: crear, ver, editar, modo prueba | ✅ OK (editar funciona) | — |
| Empresas: configurar certificados | ❌ gap crítico | C-4 |
| Facturas: crear F1 y F2, tipo y totales | ✅ OK | — |
| Facturas: líneas con decimales en units | ✅ OK (refutado 6.D) | — |
| Facturas: línea exenta (vat nulo) | ❌ no se puede | C-1 |
| Facturas: validaciones inline | ⚠️ solo al guardar | (mejora) |
| Detalle: muestra todos los datos | ⚠️ falta `ref`, `comments` | F-6 |
| Detalle: botón Anular en el momento correcto | ❌ invertido | F-1 |
| Detalle: botones de rectificación según tipo | ⚠️ genera R5 en F1 | F-5 |
| Detalle: PDF generado, nombre sin `/`, datos correctos | ❌ nombre con `/` | F-PDF |
| Detalle: estado de error AEAT muestra código (¿y descr?) | ⚠️ solo código | G-5 |
| Lista facturas: tabs, "Editar" (engañoso), ordenación | ❌ "Editar" engañoso | F-2 |
| Envío: pendientes, filtro, "Enviar todas" (¿ignora filtro?) | ❌ ignora filtro | F-3 |
| Envío: "Enviar seleccionadas", confirmación | ⚠️ sin confirmación | UX-1 |
| Envío: resultados ok/ko, rate-limit, recarga | ✅ OK | — |
| Envío: ¿requiere IP local? IPv6/proxy | ⚠️ riesgo | S-3 |
| Consulta AEAT: rango años, mes, 16 columnas, export | ❌ sin 2025, sin export | F-4, G-6 |
| Config: guarda, valida, reinicia, navbar fuera de `#app` | ✅ guarda; ⚠️ sin validar/reiniciar; navbar en `#app` | UI-2 |
| Navbar: selector empresa, burger, `aria-expanded` | ⚠️ `aria-expanded` no actualiza | UI-1 |
| Toasts: apilamiento, límite, `aria-live`, XSS | ⚠️ sin `aria-live`; `showToast` no escapa | S-2 |
| Modales: Escape, foco, retorno | ❌ sin Escape/foco | UX-2 |
| Responsive: cada página a 360px | ✅ burger funciona (menú se abre) | — |
| Accesibilidad: navegación por teclado | ⚠️ modales | UX-2 |
| XSS: nombre empresa / descr línea / nombre cliente | ❌ empresa (company.js) | S-1 |
| Errores de red: backend caído, 500 HTML, 401 | ✅ apiFetch robusto | — |
| Consistencia: escape, render, títulos, botones, moneda, fechas, "Volver" | ⚠️ varias | UI-2 |
| Dependencias CDN: simular bloqueo | ⚠️ no probado (sin SRI) | (9.4) |

---

## 4. Priorización de arreglos sugerida

### Prioridad 1 — Bloqueantes que afectan a la AEAT o a la seguridad
1. **F-1** Botón Anular invertido (cambiar `!isSent` → `isSent`) — S
2. **F-5** Rectificación de F1 genera R5 (enviar `vat_id` o decidir por factura original) — S
3. **F-3** "Enviar todas" ignora filtro de empresa — S
4. **C-4** Sin gestión de certificados (modo test/prod inutilizable) — M
5. **S-1** XSS en `company.js` (escapar `company.name`, `vat_id`, `f.value`) — S
6. **C-3 + UX-1** Sin indicador de modo + "Enviar todas" sin confirmación — S

### Prioridad 2 — Mayores de funcionalidad core / cumplimiento
7. **F-2** "Editar" engañoso (eliminar o implementar edición real) — M
8. **F-4** Consulta AEAT sin 2025 — S
9. **F-6** Detalle sin `ref`/`comments` — S
10. **C-1** Sin facturas exentas (vat nulo) — M
11. **G-1** Sin página de clientes — M
12. **G-5** Error AEAT sin descripción — S
13. **S-2** `showToast` no escapa — S

### Prioridad 3 — Menores de UX / consistencia
14. **F-8** Dashboard placeholders — M
15. **F-9** "Últ. envío" mal etiquetado — S
16. **F-7** `formatDate` timezone — S
17. **UX-2** Modales sin Escape/foco — M
18. **UI-1** `aria-expanded` del burger — S
19. **F-10** `company.js` carga todas las empresas — S
20. **G-2** Búsqueda incremental de clientes — S
21. **UI-2** Unificar escape/títulos/moneda/botones — M

### Prioridad 4 — Cosmético / gaps secundarios
22. **F-11** Anulación múltiple — S
23. **G-3** Editar fórmulas de numeración — S
24. **G-4** Eliminar empresa/cliente — M
25. **G-6** Exportación CSV — M
26. **C-2** Clave de régimen / calificación — L
27. **S-3** IP filter IPv6/proxy — M

---

## 5. Apéndice — Hallazgos no confirmados / refutados

- **6.D (`units` Integer trunca decimales)** — **Refutada empíricamente.** SQLite con afinidad `INTEGER` almacena `1.5` como `real` (1.5), no trunca. `POST` con `units=1.5` → BD `1.5|real`, totales correctos (bi=15.0, tvat=3.15, total=18.15). El XML a la AEAT no envía `units`, solo `bi`/`tvat`/`total`. **Riesgo latente** solo si se migra a PostgreSQL/MySQL (que sí truncarían); el modelo `db.Column(db.Integer)` debería ser `db.Float` para documentar la intención.
- **9.1 (certificados en el repo)** — **Refutada.** `cert.pem`, `cert_key.pem`, `*.p12`, `*.db` están en `.gitignore` y `git ls-files` no los lista. Riesgo mitigado.
- **6.L (XSS vía `showToast`)** — Riesgo latente confirmado por código (`showToast` no escapa) pero **no reproducido empíricamente**: los mensajes de error del backend actuales son genéricos y no reflejan input crudo del usuario. Se documenta como S-2.
- **Dependencias CDN sin SRI (9.4)** — No probado (requiere simular bloqueo de CDN). Riesgo conocido: si jsdelivr cae, Bulma/FontAwesome/jsPDF no cargan y el UI se rompe. Recomendación: self-host o añadir SRI.
- **`apiFetch` y 204/null (6.J)** — El backend no usa 204 (todas las respuestas son JSON). `apiFetch` devuelve `data ?? {}` para cuerpos vacíos. Comportamiento correcto; no se encontró caso problemático.

---

*Fin del informe.*
