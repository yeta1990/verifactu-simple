# PLAN — Revisión exhaustiva del frontend de Veri*Factu

> Este documento es el plan de trabajo para un agente revisor. Describe el contexto del proyecto, los objetivos, la metodología, el inventario del frontend, y una lista exhaustiva de tareas de revisión organizadas por categoría. Cada tarea indica **qué investigar** y **cómo verificarlo**.
>
> El agente debe leer este plan completo antes de empezar, luego trabajar de forma sistemática sección por sección, y entregar un informe estructurado (ver §9. Formato del informe).

---

## 1. Contexto del proyecto

**Veri*Factu** es un backoffice web para gestionar la facturación verificable conforme al sistema **Veri*Factu de la AEAT** (Sistema Informático de Facturación Verificable, cumplimiento 2025/2026). Permite:

- Gestionar varias **empresas emisoras** (con sus datos fiscales, certificados y fórmulas de numeración).
- Crear **facturas** de distintos tipos: `F1` (con NIF del destinatario), `F2` (simplificada, sin NIF), `F3` (sustitutiva de F2).
- Crear **rectificativas**: `R1`/`R5` (por integración o sustitución), `R2` (impagados).
- **Anular** facturas enviadas a la AEAT (registro de anulación).
- **Enviar** facturas pendientes a la AEAT por SOAP (modos `mock`, `test`, `prod`), con encadenamiento por huella (fingerprint).
- **Consultar** a la AEAT las facturas presentadas en un periodo.
- Gestionar **clientes** (auto-guardados al facturar).
- **Configurar** el sistema (datos del software, modo de envío, rutas, etc.).

### Arquitectura

- **Backend**: Flask + SQLAlchemy (SQLite) en `app/`.
  - `app/__init__.py` → factory `create_app()` + todos los endpoints REST.
  - `app/models.py` → modelos `Company`, `Invoice`, `InvoiceLine`, `Client`.
  - `app/verifactu.py` → generación de XML SOAP, envío a AEAT, encadenamiento por huella, consulta.
- **Frontend**: app multipágina en **vanilla JS + Bulma CSS 1.0.3 + FontAwesome 6.5.2**, sin framework, sin paso de build. Cada página es un par `*.html` + `*.js` en `frontend/`. Utilidades compartidas en `frontend/app.js`.
- Sin autenticación. Algunos endpoints (`/api/pending`, `/api/process`) están restringidos a IPs locales (ver §6.A).
- Servido por el propio Flask: `/` sirve `index.html` y `/frontend/<path>` sirve el resto.

### Stack y dependencias (todas vía CDN, sin SRI)
- Bulma CSS 1.0.3, FontAwesome 6.5.2, jsPDF 2.5.1 + jspdf-autotable 3.8.2 (solo en `invoice-detail.html`).

---

## 2. Objetivos de la revisión

Identificar y documentar, de forma **priorizada y accionable**:

1. **Fallos de funcionalidad** — bugs donde el frontend no hace lo que debería, se rompe, o contradice al backend.
2. **Gaps de funcionalidad** — capacidades del backend no expuestas, o flujos incompletos que impiden tareas reales del usuario.
3. **Fallos de UX** — fricciones, confusión, falta de feedback, flujos peligrosos sin confirmación, mensajes oscuros, etc.
4. **Mejoras de UI** — consistencia visual, jerarquía, responsive, accesibilidad, microinteracciones, estados vacíos/cargando/error.

La revisión debe ser **funcional y de producto**, no una auditoría de código estático. El agente debe ejecutar la app, reproducir flujos reales y verificar cada hipótesis.

---

## 3. Metodología — cómo trabajar

### 3.1 Puesta en marcha
1. Leer la sección 4 (inventario) y la sección 5 (superficie API) para entender qué existe.
2. Levantar la app localmente (Flask en `run.py` / `app/__init__.py`, config en `verifactu.conf`). Confirmar que el modo de envío por defecto es `mock` para no enviar nada real a la AEAT.
3. Abrir el frontend en un navegador (Chromium/Firefox) y recorrer cada página.

### 3.2 Enfoques de revisión (aplicar a cada página)
- **Lectura de código**: seguir el flujo de cada `*.js` y cotejarlo con el backend en `app/__init__.py` y `app/models.py`. Buscar contradicciones frontend↔backend.
- **Prueba funcional**: crear empresa, crear factura de cada tipo, enviar (mock), anular, rectificar, consultar AEAT, editar config. Probar casos límite.
- **Casos límite / error**: campos vacíos, valores negativos, decimales, NIFs mal formateados, muchas líneas, muchas facturas, sin red, backend caído, respuestas no-JSON.
- **Responsive**: redimensionar a 360px, 768px, 1024px; probar el burger de navbar.
- **Accesibilidad**: navegar solo con teclado (Tab/Enter/Esc), comprobar foco, contraste, `aria`, `alt`, toasts announces.
- **Consistencia**: comparar patrones entre páginas (navbar, escape de HTML, toasts, modales, vacíos, cargando, errores).
- **Seguridad**: inyección HTML/XSS en cualquier campo que se renderice (nombre empresa, cliente, descripción de línea, mensajes de error), CSRF, exposición de endpoints.

### 3.3 Cómo verificar cada hallazgo
- Indicar **archivo:línea** aproximada.
- Indicar **pasos para reproducir**.
- Indicar **comportamiento esperado** vs **comportamiento real**.
- Indicar **severidad** (bloqueante / mayor / menor / cosmético) y **categoría** (funcionalidad / gap / UX / UI).
- Si no se puede reproducir, marcar como "no confirmado" y explicar.

### 3.4 Hipótesis sembradas
A lo largo del plan se incluyen **hipótesis concretas** (marcadas como **[HIPÓTESIS]**) detectadas en una lectura previa del código. El agente debe **verificarlas** (confirmar, descartar o matizar) y buscar además otras similares. **No son conclusiones; son pistas.**

---

## 4. Inventario del frontend

| Página | HTML | JS | Rol |
|---|---|---|---|
| Dashboard | `index.html` | `index.js` | Resumen: empresas, pendientes, enviadas hoy, actividad reciente, acciones rápidas |
| Empresas (lista) | `companies.html` | `companies.js` | Listado + modal "Nueva empresa" |
| Empresa (detalle) | `company.html` | `company.js` | Ficha + facturas de la empresa + modal editar |
| Facturas (lista) | `invoices.html` | `invoices.js` | Facturas de una empresa, con tabs de filtro (todas/pendientes/enviadas/anuladas) |
| Nueva factura | `invoice.html` | `invoice.js` | Formulario de creación (cliente, líneas, resumen) |
| Detalle factura | `invoice-detail.html` | `invoice-detail.js` | Ficha + QR + acciones (anular, rectificar, descargar PDF) |
| Envío | `process.html` | `process.js` | Pendientes globales, selección, envío a AEAT |
| Consulta AEAT | `query.html` | `query.js` | Consulta facturas presentadas por periodo |
| Configuración | `config.html` | `config.js` | Formulario de configuración del sistema |

**Compartido**: `frontend/app.js` (apiFetch, showToast, openModal, navbarHTML, selector de empresa, localStorage, escapeHtml, formatDate, formatEUR, getParam) y `frontend/style.css`.

**Patrones arquitectónicos a revisar**:
- Navbar se inyecta por JS en cada página (excepto `config.html` y `index.html` que usan `#navbar`/`#navbar-placeholder`). Inconsistencia de contenedores.
- Estado de "empresa seleccionada" en `localStorage` (`verifactu_selected_company`).
- Render por `innerHTML` con plantillas de strings → riesgo XSS si no se escapa.
- Tres funciones de escape distintas: `escapeHtml` (app.js), `escapeHTML` (invoice-detail.js, company.js), `escHTML` (invoice.js). Inconsistencia.

---

## 5. Superficie API del backend (para cotejar gaps)

Endpoints en `app/__init__.py`:

| Método | Ruta | Notas |
|---|---|---|
| GET | `/api/companies` | lista empresas |
| POST | `/api/companies` | crea empresa |
| GET | `/api/<company_id>` | detalle empresa |
| PUT | `/api/<company_id>` | actualiza empresa |
| GET | `/api/<company_id>/invoices` | facturas de la empresa |
| POST | `/api/<company_id>/invoices` | crea factura (F1 si vat_id, si no F2) |
| GET | `/api/<company_id>/invoices/<id>` | detalle con líneas |
| GET | `/api/<company_id>/invoices/<id>/qr` | PNG del QR |
| POST | `/api/<company_id>/invoices/<id>/rect` | R1/R5 por integración |
| POST | `/api/<company_id>/invoices/<id>/rect2` | R2 |
| POST | `/api/<company_id>/invoices/<id>/rectsust` | R1/R5 por sustitución |
| POST | `/api/<company_id>/invoices/<id>/sust` | F3 sustitutiva de F2 |
| POST | `/api/<company_id>/invoices/<ids>/voided` | anulación (ids separados por coma) |
| GET | `/api/pending` | **solo IP local** |
| POST | `/api/process` | envío (todas o seleccionadas) — **solo IP local** |
| GET | `/api/<company_id>/clients` | lista (con `?q=`) |
| POST | `/api/<company_id>/clients` | crea cliente |
| PUT | `/api/<company_id>/clients/<client_id>` | actualiza cliente |
| GET | `/api/<company_id>/query?year=&month=` | consulta AEAT |
| GET | `/api/config` | lee config |
| POST | `/api/config` | guarda config |

**Campos del modelo Company** (`app/models.py`): `name, trade_name, vat_id, address, postal_code, city, state, country, email, phone, contact, formula, formula_r, first_num, key_file, cert_file, test, next_send, created`. Notar: `key_file`, `cert_file`, `formula`, `formula_r`, `first_num` **no se gestionan desde el frontend**.

**Campos de Invoice**: incluye `ref` (referencia interna) y `comments` (usado como `DescripcionOperacion` en el XML a la AEAT si existe).

---

## 6. Áreas de revisión — FALLOS DE FUNCIONALIDAD (bugs)

Objetivo: encontrar casos donde el frontend no cumple su función, se rompe, o contradice al backend.

### 6.A Endpoints restringidos a IP local
- **[HIPÓTESIS]** `/api/pending` y `/api/process` filtran por `request.remote_addr.startswith(('127.','192.168.','10.'))` (`app/__init__.py:298,324`). El frontend los llama desde el navegador en `index.js` (dashboard) y `process.js`.
  - Verificar qué pasa si se accede desde: IPv6 (`::1`), una IP pública, detrás de un proxy/Docker (donde `remote_addr` es la del proxy y no se honra `X-Forwarded-For`).
  - Comprobar el efecto en el dashboard (stat "pendientes") y en la página de Envío completa.
  - ¿El frontend muestra un mensaje útil cuando recibe 401, o falla en silencio?

### 6.B Bug de anulación (Anular)
- **[HIPÓTESIS confirmada en lectura]** En `invoice-detail.js:155` el botón "Anular" se muestra solo si `!isVoided && !isSent` (factura **no enviada**). Pero el backend `create_invoice_voided` (`app/__init__.py:284`) **rechaza** facturas con `not invoice.verifactu_dt` (no enviadas). Es decir:
  - El botón aparece en facturas **no enviadas** → al pulsarlo, el backend devuelve error "Already voided, not sent or referenced".
  - Las facturas **enviadas** (las únicas que la AEAT permite anular) **no muestran** el botón.
  - Verificar reproduciendo: crear factura, no enviar, ir al detalle, pulsar Anular → ¿error? Luego enviarla (mock), ir al detalle → ¿aparece Anular? Debería aparecer pero no aparece.
  - Revisar también la lógica de `voided` en `app/verifactu.py` (`registro_anulacion`) y el flag `voided` que solo se setea tras envío correcto.

### 6.C "Editar" factura no edita
- **[HIPÓTESIS confirmada]** En `invoices.js` el botón/enlace "Editar" apunta a `invoice.html?company_id=X` (formulario de **nueva** factura), no a una edición de la factura existente. No existe flujo de edición de borrador.
  - Verificar si existe algún endpoint PUT de invoice (no existe en el backend). Es un gap doble: el enlace es engañoso y la funcionalidad no existe.
  - Comprobar el comportamiento: ¿el usuario pierde la factura original? ¿se crea una nueva con otro número?

### 6.D `units` como Integer vs entrada decimal
- **[HIPÓTESIS confirmada]** `InvoiceLine.units = db.Column(db.Integer)` (`app/models.py:189`) pero el input en `invoice.js` usa `step="any"` (admite decimales). El backend `get_number` los acepta, pero al persistir en columna Integer se **truncan**.
  - Reproducir: línea con `units=1.5`, `price=10` → revisar el subtotal mostrado (15) vs el guardado en BD y el del PDF/detalle. ¿Coinciden? ¿Se trunca a 1?
  - Comprobar el impacto en totales y en el XML enviado a la AEAT.

### 6.E Consulta AEAT: rango de años
- **[HIPÓTESIS confirmada]** `query.js:76` genera años desde `currentYear` hasta 2200. Si el año actual es 2026, **no se puede consultar 2025** (año en el que entró en vigor Veri*Factu).
  - Verificar el año mínimo razonable (¿2025?) y si el backend impone límites (`verifactu.py` `consulta`: `year = max(2025, min(2200, year))`).
  - Comprobar también el comportamiento del selector de mes (valor `01`–`12` como string; el backend usa `type=int`).

### 6.F Envío "Enviar todas" ignora el filtro de empresa
- **[HIPÓTESIS]** En `process.js`, el filtro por empresa (`selectedCompanyIds`) solo filtra la **tabla mostrada**, pero `sendInvoices(false)` envía un body vacío → el backend envía **todas** las pendientes de **todas** las empresas. "Enviar todas" no respeta el filtro visual.
  - Verificar: filtrar por empresa A, pulsar "Enviar todas" → ¿se envían también facturas de la empresa B?
  - Comprobar también "Enviar seleccionadas": ¿construye bien `{company_id, invoice_id}` desde el `tr.dataset`?

### 6.G Selector de empresa del navbar y recarga
- `onNavbarCompanyChange` (`app.js`) navega a `invoices.html?company_id=X`. Verificar el comportamiento en cada página:
  - En `invoices.html` con otra empresa ya cargada, ¿recarga correctamente?
  - En `invoice.html` (creación), ¿cambia la empresa del formulario o se pierde el estado no guardado?
  - ¿Hay aviso antes de abandonar un formulario a medio rellenar?

### 6.H `formatDate` y zonas horarias
- `formatDate` usa `new Date(dt)`. El backend envía `'%Y-%m-%d %H:%M:%S'` (sin zona horaria) → JS lo interpreta como **hora local**. En un servidor en otra zona o en un navegador distinto, las fechas pueden desplazarse un día.
  - Verificar fechas de emisión, de envío AEAT, y la comparación "enviadas hoy" del dashboard.

### 6.I Dashboard: stats no implementadas
- `index.js`: "Facturas enviadas hoy" se hardcodea a `'—'` (placeholder). "Últimos movimientos" siempre muestra estado vacío (no hay endpoint `/api/activity`).
  - Confirmar que son placeholders y documentar como gap.

### 6.J `apiFetch` y tipos de contenido
- `app.js:apiFetch` siempre pone `Content-Type: application/json` incluso en GET (inofensivo pero incorrecto). Más importante: comprueba el cuerpo como texto y parsea JSON, pero ¿trata correctamente `204 No Content`? ¿Y respuestas `null` válidas?
  - Revisar el flujo de errores: ¿se muestra siempre el mensaje real del backend?

### 6.K Doble `escapeHTML`/`escapeHtml` y posibles renders sin escape
- En `invoice-detail.js` coexisten `escapeHTML` (local) y `escapeHtml` (global de app.js). Verificar que **todos** los valores dinámicos que se insertan por `innerHTML` estén escapados:
  - `inv.number_format`, `inv.name`, `inv.verifactu_csv`, `inv.verifactu_err`, `invoice_ref`, campos de cliente, líneas.
  - En `query.js` se usa `escapeHtml` para la tabla de resultados AEAT — verificar columnas.
  - En `companies.js`/`company.js` se usa `escapeHtml` — verificar.
  - En `invoice.js` se usa `escHTML` — verificar los `value="${escHTML(line.descr)}"` (¿y si la descripción contiene comillas dobles? ¿se rompe el atributo?).

### 6.L `showToast` con `innerHTML` (XSS)
- `showToast(message, ...)` inserta `message` por `innerHTML` sin escapar. Muchas llamadas pasan `err.message`, que puede contener texto del backend que a su vez puede incluir input del usuario (p.ej. nombres de empresa/cliente con `<img onerror=...>`).
  - Verificar inyectando HTML en un nombre de empresa o descripción de línea y observando el toast de error.

### 6.M Modales: cierre y foco
- `openModal` (app.js) usa `onclick` inline y `innerHTML`. Los modales "manuales" de `companies.js`/`company.js` se gestionan aparte. Verificar:
  - Cierre con tecla Escape (no implementado).
  - Trampa de foco dentro del modal (no implementado).
  - Restauración del foco al elemento que abrió el modal (no implementado).
  - Click en el fondo cierra, pero ¿y el botón delete en todos los casos?

### 6.N `process.js`: estado global frágil
- `window._processPendingInvoices` se usa como estado. Verificar qué pasa si se navega atrás/adelante, o si dos envíos solapados modifican el estado.
- Tras enviar, se recarga `/api/pending` y se re-renderiza. Verificar que los checkboxes y resultados no se mezclan con resultados anteriores (`send-results`).

### 6.O `config.html`: layout roto / navbar fuera de `#app`
- `config.html` tiene el formulario **fuera** de `#app`, y un script inline inyecta el navbar en `#app`. Verificar:
  - ¿El navbar aparece encima del formulario correctamente? ¿O el formulario queda fuera del flujo visual?
  - ¿Es el único `DOMContentLoaded` inline mezclado con `config.js`? Posible orden de ejecución.
  - ¿La página respeta el contenedor `container` y los márgenes como las demás?

### 6.P `company.js`: "Últ. envío" mal etiquetado
- **[HIPÓTESIS]** En `company.js` el campo `next_send` se muestra con etiqueta "Últ. envío", pero `next_send` es la **próxima** fecha de envío permitida (rate limit AEAT), no el último envío. Confuso y posiblemente erróneo.
  - Verificar el significado real de `next_send` en `app/verifactu.py` (se setea con `+{tiempo_espera_envio} seconds` tras enviar).

### 6.Q `company.js`: obtiene la empresa buscando en `/api/companies`
- Carga **todas** las empresas y hace `find` en cliente, cuando existe `GET /api/<company_id>`. Ineficiente y, si hay muchas empresas, lento. Verificar impacto y si hay casos donde la empresa no aparece (paginación futura).

### 6.R Validaciones de línea inconsistentes
- `invoice.js` valida `units > 0` y `price > 0`. Pero el backend permite `vat` nulo (operación no sujeta/exenta → `CalificacionOperacion=N1`). El frontend siempre envía `vat` (por defecto 21) y el input no permite vacío.
  - Verificar si se puede crear una factura exenta/no sujeta desde el UI (no). Gap de cumplimiento.

### 6.S Rectificación con body vacío
- En `invoice-detail.js`, los botones de rectificación envían `body: JSON.stringify({})`. El backend copia líneas del original. Para "sustitución" (`rectsust`, `sust`) el usuario podría querer **cambiar** importes/líneas, pero no hay formulario. Verificar el flujo completo y si el resultado es el esperado (¿se pueden editar? no).

### 6.T `voided` con múltiples IDs
- El backend acepta `invoice_ids` separados por coma (`/invoices/<string:invoice_ids>/voided`), pero el frontend solo anula de uno en uno. Verificar si es un gap intencionado.

### 6.U Otros bugs a buscar activamente
- Inputs `type="number"` con `step="any"`: ¿permiten `e` (notación científica)? ¿valores negativos? El `min="0"` está puesto pero no siempre se valida en JS.
- El campo "Referencia" (`ref`) y "Observaciones" (`comments`) en `invoice.js` se capturan pero **no se muestran** en `invoice-detail.js`. Verificar si se persisten (sí) y si el usuario los vuelve a ver (no). Gap.
- `invoices.js` ordena por `new Date(b.dt) - new Date(a.dt)`; si `dt` es nulo, usa `0`. Verificar orden raro.
- En `process.js`, `formatDate(inv.fecha || inv.created_at)` — `inv.fecha` viene como `'%Y-%m-%d'` (sin hora) → `new Date('2026-01-01')` se interpreta como UTC → puede desplazarse un día al mostrar.

---

## 7. Áreas de revisión — GAPS DE FUNCIONALIDAD

Objetivo: capacidades que faltan y que el usuario necesita para operar el sistema realistamente.

### 7.A Certificados digitales (clave para test/prod)
- El backend necesita `Company.cert_file` y `Company.key_file` para enviar a AEAT en modo `test`/`prod` (`app/verifactu.py:send_xml`). El frontend **no expone** subida/asignación de certificados en `companies.js`/`company.js`.
  - Verificar si hay **algún** modo de configurar certificados desde el UI (no). Sin esto, el modo `test`/`prod` es inutilizable desde el frontend. **Gap crítico.**
  - Considerar: subida de `.p12`/`.pem`, extracción de cert/key, o al menos indicar la ruta.

### 7.B Gestión de clientes
- El backend tiene endpoints GET/POST/PUT de clients, y los clientes se auto-guardan al facturar. Pero **no hay página de clientes**: no se pueden listar, editar ni eliminar clientes directamente.
  - Verificar si el usuario puede corregir un cliente mal guardado (no, salvo creando otra factura). Gap.
  - El `invoice.js` tiene un dropdown de clientes pero `searchTimeout` declarado y sin usar — **no hay búsqueda incremental** pese a que el backend soporta `?q=`.

### 7.C Edición de factura (borrador)
- No existe edición de facturas no enviadas. Solo crear, rectificar (que genera otra) o anular. Para corregir un borrador hay que anular/crear nuevo. Gap.

### 7.D Configuración de numeración
- `formula`, `formula_r`, `first_num` (fórmulas de numeración de facturas y rectificativas, primer número) no son editables en el modal de empresa. Se muestran read-only en `company.js`. Gap para quien quiera personalizar la serie.

### 7.E Eliminar empresa / cliente
- No hay DELETE de empresa ni de cliente (ni backend ni frontend). Gap (al menos para entornos de prueba).

### 7.F Reenvío / reintentar facturas fallidas
- Las facturas con `verifactu_err` quedan pendientes (`verifactu_dt=None`) y aparecen en el panel de envío, pero no hay **indicación visible** de que ya fallaron ni botón "reintentar" específico. Tampoco se muestra la descripción del error AEAT en el detalle (solo el código).
  - Verificar qué ve el usuario de una factura rechazada por la AEAT.

### 7.G Exportación de datos
- No hay exportación (CSV/PDF/Excel) de: listado de facturas, resultados de consulta AEAT, listado de empresas/clientes. Gap habitual en backoffices.

### 7.H Búsqueda y filtros avanzados
- `invoices.js` solo filtra por estado (tabs). No hay búsqueda por número, cliente, fecha, importe. `companies.js` no tiene búsqueda. `process.js` filtra por empresa pero no por texto. Gap para volúmenes medios.

### 7.I Paginación
- Ninguna lista pagina. El backend limita a 1000 (`verifactu.py`). Con más facturas, la lista se corta sin aviso. Gap.

### 7.J Modo prueba visible
- El flag `Company.test` determina si se envía a la sede de **pruebas** o **producción** AEAT. No hay indicador visual claro en el dashboard/proceso que avise "estás en modo prueba/producción". Riesgo de enviar a producción por error. Gap de UX crítico de producto.

### 7.K Estados de factura más finos
- El frontend distingue Anulada/Enviada/Pendiente. Pero el backend tiene además `verifactu_err` (rechazada) y `invoice_ref_id` (rectificada/sustituida). Verificar que estos estados se representan y filtran bien. En `invoices.js` el typeMap no incluye `R5` (sí R1, R2). Comprobar colores/etiquetas de todos los tipos.

### 7.L Configuración: reiniciar / probar conexión
- Guardar config avisa "reinicia el servidor", pero no hay botón de reinicio ni "probar conexión AEAT". Gap.
- No hay validación de `software_id` (2 caracteres), ni de campos obligatorios antes de guardar.

### 7.M Multi-IVA y claves de régimen
- El XML a la AEAT usa `ClaveRegimen=01` y `CalificacionOperacion=S1`/`N1` fijos. No hay UI para elegir clave de régimen (01–07) ni calificación. Para muchos regímenes (recargo de equivalencia, etc.) esto es un gap de cumplimiento.

### 7.N Actividad reciente / auditoría
- El dashboard tiene "Últimos movimientos" vacío. No hay log de auditoría visible (quién creó/envió/anuló qué y cuándo). Gap.

### 7.O Favicon y metadatos
- Sin favicon, sin `<meta name="description">`, sin Open Graph. Menor.

---

## 8. Áreas de revisión — FALLOS DE UX y MEJORAS DE UI

### 8.1 Feedback y estados de carga
- **Cargando**: `company.js` deja la pantalla en blanco hasta que llega el fetch (no hay skeleton). `invoices.js` sí muestra "Cargando facturas…". `invoice.js` muestra "Cargando empresas…" en el select. **Inconsistente**. Unificar con skeletons/spinners.
- **Errores**: muchos `console.error` que el usuario no ve. Verificar que los errores de carga de empresas (navbar) se notifiquen al usuario, no solo a consola.
- **Toasts**: se apilan bien, pero ¿se acumulan indefinidamente si hay muchos errores? Verificar límite. ¿Son `aria-live`? No → lectores de pantalla no los anuncian.
- **Botones de envío**: `process.js` usa `is-loading` en los botones, pero `invoice.js` cambia el HTML a spinner manualmente. **Inconsistente**. Unificar.

### 8.2 Confirmaciones en acciones destructivas/irreversibles
- "Enviar todas" a la AEAT **no pide confirmación**. Enviar a producción es irreversible. Debería haber un modal de confirmación claro, sobre todo si `send_mode=prod`.
- "Anular" sí abre modal (bien). "Rectificar" sí abre modal (bien).
- "Limpiar" formulario de factura no pide confirmación y borra todo. Verificar.

### 8.3 Formularios
- **Validación en tiempo real**: `invoice.js` solo valida al guardar. No hay feedback inline de campos inválidos (Bulma `is-danger`/`help`). Mejora.
- **Decimales**: el UI no aclara si usar coma o punto. Los inputs `type=number` no aceptan coma. El backend sí. Inconsistencia que puede confundir al usuario español.
- **NIF**: sin validación de formato ni normalización (mayúsculas, sin espacios). Mejora.
- **IVA**: sin validación de tipos impositivos españoles (0/4/10/21). Se acepta cualquier número. Mejora (al menos un warning).
- **Campos obligatorios**: el asterisco `*` aparece en algunos (Nombre, NIF empresa) pero no de forma sistemática. Unificar.
- **Orden de tabulación (Tab)**: verificar que el orden lógico de campos es correcto, especialmente en `invoice.js` (el NIF está en una fila separada del nombre, antes). Flujo raro.

### 8.4 Tablas
- **Densidad y legibilidad**: tablas anchas (`query.js` con 16 columnas) requieren scroll horizontal; en móvil es inviable. Considerar columnas ocultables, tarjetas en móvil, o vista simplificada.
- **Ordenación**: ninguna tabla se puede ordenar por columna. Mejora.
- **Selección**: `process.js` tiene checkbox "seleccionar todo" que solo afecta a los visibles. Verificar que el usuario lo entiende (no hay texto aclaratorio).
- **Acciones por fila**: en `invoices.js` hay dos estilos distintos de botones de acción entre la vista inicial y la vista filtrada (enlace "Ver | Editar" vs botones Bulma). **Inconsistencia**.

### 8.5 Navegación y "Volver"
- Algunas páginas tienen "← Volver" (`invoice.js`, `invoice-detail.js`, `company.js`), otras no (`invoices.js` depende, `query.js`, `process.js`, `config.html`). Inconsistente. Unificar.
- El navbar está siempre, pero el "Volver" a veces va a `companies.html`, otras a `invoices.html`. Verificar coherencia del árbol de navegación.

### 8.6 Responsive
- Probar cada página a 360px (móvil):
  - Navbar burger: ¿se abre/cierra? ¿el selector de empresa cabe?
  - `invoice.js`: las `columns is-4` se apilan; las tablas de líneas con `table-container` hacen scroll horizontal. ¿Es usable?
  - `query.js`: 16 columnas en móvil. Inusable. Mejora.
  - `process.js`: tabla de pendientes con 6 columnas en móvil.
  - `config.html`: formulario de un montón de campos, ¿cabe bien?
  - Dashboard: las stat cards `is-4` se apilan bien.
- Verificar que no hay contenido cortado ni solapado.

### 8.7 Accesibilidad (a11y)
- **Navegación por teclado**: recorrer todas las páginas con Tab. Verificar foco visible, orden lógico, y que los elementos clicables tipo `<a href="#">` sean alcanzables y accionables con Enter.
- **Modales**: sin trampa de foco ni Escape ni retorno de foco (ver 6.M).
- **Toasts**: sin `role="status"`/`aria-live`. Mejora.
- **Imágenes**: el QR tiene `alt="QR Code"` (genérico). Mejor `alt="Código QR de verificación de la factura"`.
- **Contraste**: verificar texto gris claro (`has-text-grey-light`) sobre fondos claros. Bulma es generalmente OK, pero revisar `has-text-light` sobre blanco en `query.js` (placeholder `—`).
- **Atributos `aria`**: el burger tiene `aria-label` y `aria-expanded` pero `aria-expanded` no se actualiza al togglear. Mejora.
- **Formularios**: los `<label>` están asociados por `id` en `config.html` pero en `invoice.js` los labels no tienen `for`. Mejora.

### 8.8 Consistencia visual y de patrones
- **Tres funciones de escape** (`escapeHtml`/`escapeHTML`/`escHTML`). Unificar en una.
- **Tres formas de render**: `app.innerHTML = navbarHTML(...) + ...`, `navbarEl.innerHTML + app.innerHTML`, plantilla inline. Unificar.
- **Títulos de página**: `<p class="title">` vs `<h1 class="title">` vs `<p class="title is-5">`. Mezcla de niveles semánticos. Unificar a `<h1>`/`<h2>`.
- **Botones**: mezcla de `is-small`, `is-outlined`, iconos a izquierda/derecha. Definir un sistema.
- **Estados vacíos**: `emptyState(msg)` se usa en algunos sitios, en otros se inlinea. Unificar.
- **Moneda**: `formatEUR` (app.js) y `fmtEUR` local en `invoice.js` (formato distinto: `formatEUR` usa `style:currency` → "1.234,00 €"; `fmtEUR` usa `toLocaleString` + " €" → "1.234,00 €" similar pero sin símbolo de moneda nativo). Unificar.
- **Fechas**: `formatDate` en app.js; en `process.js` se usa para `fecha` y `created_at`. Consistente, pero verificar formato en PDF (`invoice-detail.js` usa `formatDate`).

### 8.9 PDF (invoice-detail.js)
- **Datos hardcodeados**: "Forma de pago: Transferencia bancaria vía Stripe / Pagado" está fijo. Debería venir de la empresa o ser configurable. Gap.
- **Datos del emisor**: verificar que salen `name`, `trade_name`, NIF, dirección, email, teléfono. ¿Y `trade_name` vs `name`? El header usa `trade_name || name`. Consistente con el detalle.
- **Datos del cliente**: ¿falta `state`/provincia? Verificar.
- **QR**: se inserta bien; verificar el fallback si falla el fetch del QR.
- **Multilínea**: descripciones largas en la tabla autotable — ¿se cortan o desbordan? Verificar con texto largo.
- **Página adicional**: si la tabla no cabe, ¿salta de página bien? Probar con 30+ líneas.
- **Nombre del fichero**: `factura_${number_format}.pdf` — si `number_format` contiene `/` (p.ej. `26/00000001`), el nombre de archivo tiene `/` → inválido en algunos SO. **Bug** menor. Verificar y sanitizar.

### 8.10 Microinteracciones y polish
- Hover en filas de tabla (`is-hoverable`) — OK.
- `stat-card` hover animación — OK.
- Transiciones de toast — OK.
- Faltan: skeletons, transiciones de página, feedback de "copiado al portapapeles" (CSV, huella), tooltips en botones de icono solo.

### 8.11 Internacionalización y locale
- Todo en español (OK para el mercado). Pero `formatEUR` depende del locale del navegador. Verificar consistencia.
- Los inputs numéricos no localizan el separador decimal. Verificar UX.

### 8.12 Rendimiento percibido
- Dashboard hace 2–3 llamadas secuenciales (`companies` luego `pending`). Podrían paralelizarse con `Promise.all`. Mejora.
- `company.js` carga todas las empresas para mostrar una. Mejora.
- `invoices.js` carga todas las facturas sin paginar. Verificar con 500+ facturas.

---

## 9. Categorías transversales (aplicar a todo)

### 9.1 Seguridad
- **XSS**: revisar **todos** los `innerHTML` con datos dinámicos (ver 6.K, 6.L). Hacer una pasada sistemática buscando `.innerHTML =` y `${...}` en plantillas.
- **CSRF**: no hay tokens. La API es abierta (salvo pending/process). Si el frontend se sirve desde el mismo origen, es mitigado parcialmente. Documentar riesgo.
- **Auth**: no hay. Cualquiera que llegue al servidor opera todo. Aceptable para tool local, pero el frontend no lo aclara. Mejora de producto.
- **Certificados**: `cert.pem`/`cert_key.pem`/`.p12` están en el repo raíz (verificar `.gitignore`). Riesgo de filtración. Reportar aunque sea de backend.
- **Config sensible**: `sqlite_path`, rutas — el frontend las expone sin protección.

### 9.2 Robustez frente a errores de red/backend
- Simular backend caído: ¿qué muestra cada página? ¿`apiFetch` lanza un Error legible?
- Simular respuesta 500 con HTML: ¿`apiFetch` extrae texto y lo muestra sin `SyntaxError`? (El comentario de `apiFetch` dice que ya se arregló — verificar.)
- Simular 401 en pending/process (IP no local): ¿mensaje claro?

### 9.3 Consistencia de datos frontend↔backend
- Cotejar **cada campo** del formulario de empresa (`companies.js`) con `Company.validate_fields` (allowed). ¿Se envían campos no permitidos? Se filtran en backend, pero el frontend podría enviar `formula` etc. y no hacer nada.
- Cotejar el payload de creación de factura con `Invoice.validate_fields` y `InvoiceLine.validate_fields`.
- Verificar que `verifactu_type` se determina en el backend (F1/F2 por vat_id), no en el frontend. El badge del frontend es solo informativo.

### 9.4 Dependencias externas (CDN sin SRI)
- Bulma, FontAwesome, jsPDF desde jsdelivr. Si el CDN cae o es bloqueado, el UI se rompe. Considerar self-host o SRI. Verificar impacto de cada uno si no carga.

---

## 10. Lista de comprobación final (checklist de ejecución)

El agente debe recorrer esta lista y marcar cada ítem como ✅ OK / ⚠️ Problema / ❌ No aplica, con referencia al hallazgo.

- [ ] Dashboard: 3 stats cargan correctamente (incluido "enviadas hoy" — si es placeholder, documentar).
- [ ] Dashboard: actividad reciente (¿placeholder?).
- [ ] Empresas: crear, ver, editar (todos los campos), modo prueba.
- [ ] Empresas: ¿se pueden configurar certificados? (gap crítico).
- [ ] Facturas: crear F1 (con NIF) y F2 (sin NIF), verificar tipo y totales.
- [ ] Facturas: líneas con decimales en units (bug de truncamiento).
- [ ] Facturas: línea exenta (vat nulo) — ¿se puede? (gap).
- [ ] Facturas: validaciones inline y mensajes.
- [ ] Detalle: muestra todos los datos (¿falta `ref`, `comments`?).
- [ ] Detalle: botón Anular aparece en el momento correcto (bug 6.B).
- [ ] Detalle: botones de rectificación según tipo.
- [ ] Detalle: PDF se genera, nombre de archivo sin `/`, datos correctos.
- [ ] Detalle: estado de error AEAT muestra código (¿y descripción?).
- [ ] Lista de facturas: tabs de filtro, "Editar" (engañoso), ordenación.
- [ ] Envío: lista pendientes, filtro por empresa, "Enviar todas" (¿ignora filtro?), "Enviar seleccionadas", confirmación.
- [ ] Envío: resultados ok/ko, mensaje de rate-limit, recarga.
- [ ] Envío: ¿requiere IP local? Probar desde IP no local / IPv6.
- [ ] Consulta AEAT: rango de años (bug 6.E), mes, tabla de 16 columnas, export.
- [ ] Config: guarda, valida, reinicia, navbar fuera de `#app` (6.O).
- [ ] Navbar: selector de empresa, burger responsive, `aria-expanded`.
- [ ] Toasts: apilamiento, límite, `aria-live`, XSS.
- [ ] Modales: Escape, foco, retorno.
- [ ] Responsive: cada página a 360px.
- [ ] Accesibilidad: navegación por teclado en cada página.
- [ ] XSS: inyectar HTML en nombre empresa / descr línea / nombre cliente.
- [ ] Errores de red: backend caído, 500 HTML, 401.
- [ ] Consistencia: funciones de escape, render, títulos, botones, moneda, fechas, "Volver".
- [ ] Dependencias CDN: simular bloqueo de cada una.

---

## 11. Priorización sugerida para el informe

Clasificar cada hallazgo con:
- **Severidad**: 🔴 Bloqueante (impide una función esencial o causa datos erróneos en AEAT) · 🟠 Mayor (función rota o gap importante) · 🟡 Menor (UX/mejora) · 🔵 Cosmético.
- **Categoría**: Funcionalidad / Gap / UX / UI / Seguridad / Cumplimiento AEAT.
- **Esfuerzo estimado** (S/M/L) para orientar la reparación.

Dar prioridad a:
1. 🔴 que afecten al envío/validez ante la AEAT (certificados, units truncado, anular, modos test/prod, claves de régimen).
2. 🔴/🟠 de seguridad (XSS, sin auth, certificados en repo).
3. 🟠 de funcionalidad core (editar, gaps de clientes, config).
4. 🟡 de UX/consistencia.
5. 🔵 cosmético.

---

## 12. Entorno y notas técnicas para el agente

- **No enviar nada real a la AEAT**: trabajar siempre con `send_mode=mock` en `verifactu.conf`. Si se prueba `test`/`prod`, usar empresa con `test=True` (sede de pruebas) y certificados de prueba.
- **BD**: `verifactu.db` (SQLite con WAL). Se puede inspeccionar con `sqlite3` para verificar truncamientos y estados. **Ojo**: hacer backup antes de pruebas destructivas.
- **Logs**: `verifactu.log` y `responses/` guardan XML enviados/recibidos — útil para auditar el flujo.
- **Modelos**: leer `app/models.py` para entender columnas y validaciones; `app/verifactu.py` para el XML/SOAP y el encadenamiento.
- El frontend no tiene tests automatizados ni build. Cualquier cambio sugerido debe respetar el estilo vanilla (sin introducir frameworks salvo que se justifique).

---

## 13. Entregable esperado

Un informe en `REVISION_FRONTEND.md` (o el nombre que se indique) con:

1. **Resumen ejecutivo** (nº de hallazgos por severidad y categoría).
2. **Hallazgos por categoría** (Funcionalidad / Gap / UX / UI / Seguridad / Cumplimiento), cada uno con:
   - ID y título
   - Severidad, categoría, esfuerzo
   - Archivo:línea
   - Pasos para reproducir
   - Esperado vs real
   - Evidencia (captura si aplica, fragmento de log/BD)
   - Recomendación de arreglo concreta
3. **Matriz de checklist** (§10) completada.
4. **Priorización** de arreglos sugerida.
5. **Apéndice**: cualquier hallazgo no confirmado que requiera investigación adicional.

El agente debe ser **concreto y verificable**: cada hallazgo debe poder reproducirse por otra persona siguiendo los pasos. Evitar genéricos ("mejorar la UX") sin pasos concretos.
