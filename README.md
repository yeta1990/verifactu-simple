# Veri*Factu — Panel de Gestión y Sistema de Facturación Veri✱Factu (AEAT)

<p align="center">
  <a href="https://github.com/EduardoRuizM/verifactu-api-python"><img src="logo.png" title="Veri*Factu" width="764" height="150"></a>
</p>

<p align="center">
  <a href="https://github.com/EduardoRuizM/verifactu-api-python">
    <img src="https://img.shields.io/badge/Python%203.9%2B-3776AB?logo=python&logoColor=fff" alt="Python 3.9+">
  </a>
  <a href="https://flask.palletsprojects.com/">
    <img src="https://img.shields.io/badge/Flask-000?logo=flask&logoColor=fff" alt="Flask">
  </a>
  <a href="https://www.sqlite.org/">
    <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=fff" alt="SQLite">
  </a>
  <a href="https://www.docker.com/">
    <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff" alt="Docker">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
</p>

---

## Atribución

**API original desarrollada por:**

> **[Eduardo Ruiz](https://github.com/EduardoRuizM)** —eruiz@dataclick.es
> [EduardoRuizM/verifactu-api-python](https://github.com/EduardoRuizM/verifactu-api-python)

Este repositorio es un **fork evolucionado** del proyecto original `verifactu-api-python`. A partir de la API REST del creador original, se ha construido un **panel de gestión completo** con frontend, gestión de empresas y clientes, descarga de facturas en PDF, generación de código QR y mucho más.

### Versiones en otros lenguajes (proyecto original)

- [Veri*Factu API (PHP)](https://github.com/EduardoRuizM/verifactu-api-php)
- [Veri*Factu API (NodeJS)](https://github.com/EduardoRuizM/verifactu-api-nodejs)

### VeriFactu Pro

- [VeriFactu Pro](https://verifactupro.es) — Programa completo de gestión, facturación, ERP con clientes, gastos, productos, stock, OpenAPI/Swagger y envío a la AEAT.

---

## ¿Qué es este proyecto?

**Veri*Factu** es un sistema completo de facturación para cumplir con la normativa **Veri✱Factu** de la Agencia Tributaria Española (AEAT), requerida desde el 1 de julio de 2025 para todas las empresas y profesionales obligados a expedir facturas.

Este proyecto proporciona:

- **API REST** para gestión de facturas, empresas y envío a la AEAT
- **Panel de gestión web** (frontend) con interfaz completa
- **Base de datos SQLite** para desarrollo y producción
- **Generación de XML SOAP** conforme al esquema de la AEAT
- **Código QR** de validación en cada factura
- **Modo mock** para desarrollo sin certificados ni conexión a la AEAT

---

## Funcionalidades

### Empresas

- **Multi-empresa**: gestión de múltiples empresas con facturación independiente
- Configuración personalizada de fórmula de numeración de facturas y rectificadas
- Almacenamiento de certificados digitales FNMT (clave privada y certificado PEM)
- Indicador de modo test/producción por empresa
- CRUD completo vía API y frontend

### Clientes

- Registro de clientes vinculado a cada empresa
- Búsqueda por nombre o NIF/CIF
- Auto-guardado de clientes al crear facturas
- CRUD completo vía API y frontend

### Facturas

- **Tipos de factura**: F1 (normal), F2 (simplificada), F3 (sustitutiva), R1/R2/R5 (rectificativas)
- **Líneas de factura**: múltiples líneas con descripción, unidades, precio y porcentaje IVA
- **Cálculo automático** de base imponible, IVA y total
- **Huella digital** (hash SHA-256 encadenado) para garantizar la inalterabilidad
- **Rectificación y sustitución** de facturas
- **Anulación** de facturas enviadas
- **Código QR** de validación generado automáticamente
- **Numeración personalizada** con fórmulas configurables
- **Descarga en PDF** de facturas
- Descarga de facturas individuales

### Envío a la AEAT

- **Envío continuo** de facturas al sistema de la AEAT mediante SOAP
- **Cooldown automático** respetando el `TiempoEsperaEnvio` de la AEAT
- **Máximo 1000 facturas** por envío
- **Reenvío de facturas con error** como subsanación
- **Consulta de registros** enviados a la AEAT por período
- Guardado de respuestas XML en directorio local
- Archivos de log detallados por operación

### Modos de envío

| Modo | Comportamiento | Certificados | URL destino |
|------|---------------|-------------|-------------|
| `mock` | No envía nada. Simula respuesta AEAT exitosa. | No requeridos | — |
| `test` | Envía a prewww1.aeat.es | Requeridos | `https://prewww1.aeat.es/...` |
| `prod` | Usa `company.test` para decidir URL | Requeridos | `www1.aeat.es` o `prewww1.aeat.es` |

### Frontend — Panel de gestión

| Pantalla | URL | Funcionalidad |
|----------|-----|--------------|
| **Dashboard** | `/` | Resumen: nº empresas, facturas pendientes, enviadas hoy, actividad reciente |
| **Empresas** | `/frontend/companies.html` | Listado, creación y edición de empresas |
| **Facturas** | `/frontend/invoices.html` | Listado de facturas por empresa con estados |
| **Clientes** | `/frontend/clients.html` | Gestión de clientes por empresa |
| **Detalle Empresa** | `/frontend/company.html?id=N` | Datos de empresa + facturas asociadas |
| **Crear Factura** | `/frontend/invoice.html` | Formulario con líneas dinámicas y cálculos automáticos |
| **Detalle Factura** | `/frontend/invoice-detail.html?id=N` | Vista completa, QR, rectificación, anulación, descarga PDF |
| **Envío** | `/frontend/process.html` | Panel de envío: filtrar por empresa, enviar facturas pendientes |
| **Consulta AEAT** | `/frontend/query.html` | Consulta de registros enviados por empresa/año/mes |
| **Configuración** | `/frontend/config.html` | Configuración del sistema (software info, send_mode, paths) |

### Tecnologías del frontend

- HTML + CSS (Bulma) + JavaScript vanilla
- Navegación compartida con selector de empresa
- Notificaciones toast apilables
- Modales con gestión de foco
- Formularios con validación y cálculos automáticos
- Diseño responsivo

---

## Requisitos

- **Python 3.9+**
- **pip** (gestor de paquetes de Python)
- Certificado digital **FNMT** (PKCS#12) para modo test/producción
  - [Certificado persona física](https://www.sede.fnmt.gob.es/certificados/persona-fisica)
  - [Certificado persona jurídica](https://www.sede.fnmt.gob.es/certificados/certificado-de-representante/persona-juridica)

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repo>
cd verifactu
```

### 2. Entorno virtual y dependencias

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate.bat

# Instalar dependencias
pip install -r requirements.txt
```

Dependencias principales: Flask, Flask-SQLAlchemy, qrcode, pillow, SQLAlchemy.

### 3. Configurar `verifactu.conf`

Copia el archivo de ejemplo y edítalo:

```bash
cp verifactu.conf.example verifactu.conf
```

| Parámetro | Tipo | Requerido | Por defecto | Descripción |
|---|---|:---:|---|---|
| `debug` | Bool | - | False | Habilitar modo depuración |
| `backend_url` | String | - | http://localhost:8074 | Dirección y puerto del servidor |
| `sqlite_path` | String | - | verifactu.db | Ruta al fichero SQLite |
| `software_company_name` | String | ✔ | — | Nombre/razón social del desarrollador |
| `software_company_nif` | String | ✔ | — | NIF del desarrollador |
| `software_name` | String | ✔ | verifactu | Nombre del sistema informático |
| `software_id` | String | ✔ | vf | Identificador del sistema (2 caracteres) |
| `software_version` | String | ✔ | 1.0 | Versión del sistema |
| `software_install_number` | String | ✔ | 00001 | Número de instalación |
| `verifactu_log_file` | String | - | verifactu.log | Ruta al archivo de logs (vacío = sin log) |
| `verifactu_save_responses` | String | - | ./responses | Directorio para guardar respuestas AEAT |
| `send_mode` | String | - | mock | `mock` \| `test` \| `prod` |
| `allowed_ips` | String | - | — | IPs adicionales permitidas para endpoints restringidos |

### 4. Extraer certificados (modo test/prod)

Si vas a operar en modo **test** o **prod**, extrae los certificados desde tu fichero `.p12`:

```bash
openssl pkcs12 -in miCertificadoFNMT.p12 -nocerts -nodes -out cert_key.pem
openssl pkcs12 -in miCertificadoFNMT.p12 -clcerts -nokeys -out cert.pem
```

### 5. Iniciar la aplicación

```bash
python run.py
# → Escucha en http://localhost:8074 (o el puerto configurado)
```

### 6. Acceder al frontend

| Página | URL |
|---|---|
| Dashboard | `http://localhost:8074/` |
| Empresas | `http://localhost:8074/frontend/companies.html` |
| Facturas | `http://localhost:8074/frontend/invoices.html` |
| Clientes | `http://localhost:8074/frontend/clients.html` |
| Envío | `http://localhost:8074/frontend/process.html` |
| Consulta AEAT | `http://localhost:8074/frontend/query.html` |
| Configuración | `http://localhost:8074/frontend/config.html` |

> El backend Flask sirve tanto la API REST (`/api/*`) como los archivos estáticos del frontend (`/frontend/*`). No se necesita un servidor web separado para desarrollo.

---

## Flujo típico de uso

```
1. Configurar → /frontend/config.html → software info + send_mode
2. Crear empresa → /frontend/companies.html → POST /api/companies (con certificados si es test/prod)
3. Crear factura → /frontend/invoice.html → POST /api/{id}/invoices
4. Ver factura → /frontend/invoice-detail.html → QR, rectificación, descarga PDF
5. Enviar facturas → /frontend/process.html → POST /api/process → AEAT
6. Consultar registros → /frontend/query.html → GET /api/{id}/query?year=2025&month=6
7. Gestionar clientes → /frontend/clients.html → CRUD de clientes por empresa
```

---

## API REST — Endpoints

### Empresas

| Endpoint | Método | Acción |
|---|---|---|
| `/api/companies` | GET | Obtener todas las empresas |
| `/api/companies` | POST | Crear empresa `{name, vat_id, address, postal_code, city, state, country, email, phone, contact, test, cert_file, key_file}` |
| `/api/<id>` | GET | Obtener empresa por ID |
| `/api/<id>` | PUT | Actualizar empresa |
| `/api/<id>` | DELETE | Eliminar empresa |

### Facturas

| Endpoint | Método | Acción |
|---|---|---|
| `/api/<company_id>/invoices` | GET | Obtener facturas de empresa |
| `/api/<company_id>/invoices` | POST | Crear factura `{name, vat_id, address, lines: [{descr, units, price, vat}]}` |
| `/api/<company_id>/invoices/<id>` | GET | Obtener factura con líneas |
| `/api/<company_id>/invoices/<id>/qr` | GET | Descargar código QR (PNG) |
| `/api/<company_id>/invoices/<id>/rect` | POST | Factura rectificativa R1/R5 |
| `/api/<company_id>/invoices/<id>/rect2` | POST | Factura rectificativa R2 |
| `/api/<company_id>/invoices/<id>/rectsust` | POST | Rectificativa sustitutiva R1/R5 |
| `/api/<company_id>/invoices/<id>/sust` | POST | Factura sustitutiva F3 |
| `/api/<company_id>/invoices/<id>/voided` | POST | Anular factura |

### Clientes

| Endpoint | Método | Acción |
|---|---|---|
| `/api/<company_id>/clients` | GET | Listar clientes (con búsqueda `?q=term`) |
| `/api/<company_id>/clients` | POST | Crear cliente `{name, vat_id, address, ...}` |
| `/api/<company_id>/clients/<id>` | PUT | Actualizar cliente |
| `/api/<company_id>/clients/<id>` | DELETE | Eliminar cliente |

### Envío y consulta

| Endpoint | Método | Acción |
|---|---|---|
| `/api/process` | POST | Enviar facturas pendientes `{selected: [{company_id, invoice_id}]}` |
| `/api/<company_id>/query` | GET | Consultar registros AEAT `?year=2025&month=6` |

### Estadísticas

| Endpoint | Método | Acción |
|---|---|---|
| `/api/stats` | GET | Facturas enviadas hoy |
| `/api/activity` | GET | Últimos 10 movimientos |
| `/api/config` | GET | Obtener configuración |
| `/api/config` | POST | Guardar configuración |

### Respuestas HTTP

| Status | Significado |
|---|---|
| 201 | CREATED — Registro creado |
| 400 | BAD_REQUEST — Faltan datos o erróneos |
| 404 | NOT_FOUND — No encontrado |
| 405 | METHOD_NOT_ALLOWED — Método no permitido |
| 415 | UNSUPPORTED_MEDIA_TYPE — Datos no son JSON |

---

## Tipos de factura

| Tipo | Descripción |
|---|---|
| **F1** | Factura normal (art. 6, 7.2 y 7.3 RD 1619/2012), con identificación del destinatario |
| **F2** | Factura simplificada (art. 6.1.D RD 1619/2012), sin identificación del destinatario |
| **F3** | Factura sustitutiva de facturas simplificadas |
| **R1** | Factura rectificativa (art. 80.1 y 80.2, error fundado en derecho) |
| **R2** | Factura rectificativa (art. 80.3) — impagos/insolvencias |
| **R5** | Factura rectificativa simplificada |
| **S1** | Operaciones sujetas y no exentas sin inversión del sujeto pasivo |

---

## Flujo de envío a la AEAT

```
Frontend (process.html)
    │ POST /api/process
    ▼
Backend (verifactuXML.pending() / send_selected())
    │
    ├─ Lee todas las empresas desde BD
    ├─ Por cada empresa, calcula cooldown desde company.next_send
    │   ├─ Si next_send > 0: "Next send in X seconds"
    │   └─ Si está listo: send(company, pending_invoices)
    │       │
    │       ├─ 1. Recoge facturas pendientes (verifactu_dt IS NULL)
    │       ├─ 2. Calcula fingerprint SHA-256 (encadenamiento)
    │       ├─ 3. Genera XML SOAP (RegistroAlta o RegistroAnulacion)
    │       ├─ 4. send_xml() → mock o AEAT real
    │       ├─ 5. Parsea respuesta XML SOAP
    │       └─ 6. Actualiza BD (verifactu_dt, csv, err, voided)
    ▼
JSON {companies: {1: {ok:[...], ko:[...]}, ...}}
    ▼
Frontend muestra resultados OK/ERROR por empresa y factura
```

### Cooldown (TiempoEsperaEnvio)

La AEAT responde con `TiempoEsperaEnvio` (segundos mínimos entre envíos). El sistema lo guarda en `company.next_send` y respeta el cooldown:

- Si se llama a `/api/process` antes de que expire, se devuelve mensaje de cooldown
- En modo **mock**, se usa un tiempo de espera por defecto

### Reenvío de facturas con error

Si una factura tiene `verifactu_err != 0`, se puede forzar un reenvío poniendo `verifactu_dt = NULL` en la BD. En el próximo proceso se enviará como **Subsanación** (`<Subsanacion>S</Subsanacion>`).

---

## Producción

### Systemd service

Crear `/etc/systemd/system/verifactu.service`:

```ini
[Unit]
Description=Veri*Factu Invoice System
After=network.target

[Service]
User=verifactu
Group=verifactu
WorkingDirectory=/path/to/verifactu
ExecStart=/path/to/verifactu/venv/bin/gunicorn run:app --bind 127.0.0.1:8074 --workers 1 --threads 2
Environment="PATH=/path/to/verifactu/venv/bin"
Restart=always

[Install]
WantedBy=default.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable verifactu.service
sudo systemctl start verifactu.service
```

> **Importante**: SQLite solo soporta escritura única. Usar `--workers 1` con `--threads 2` permite servir peticiones concurrentes sin conflictos de BD.

### Proxy HTTPS con Nginx

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name misitio.tld;

    ssl_certificate     /etc/letsencrypt/live/misitio.tld/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/misitio.tld/privkey.pem;
    ssl_protocols       TLSv1.3;

    location / {
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:8074;
    }
}
```

### Docker

```bash
docker build -t verifactu .
docker run -p 8074:8074 verifactu
```

---

## Base de datos

El sistema utiliza **SQLite** con las siguientes tablas:

### companies

| Campo | Tipo | Descripción |
|---|---|---|
| id | Integer (PK) | Identificador |
| name | String(25) | Nombre/razón social (único) |
| trade_name | String(50) | Nombre comercial |
| vat_id | String(25) | NIF/CIF (único) |
| address | String(75) | Dirección |
| postal_code | String(10) | Código postal |
| city | String(25) | Ciudad |
| state | String(25) | Provincia |
| country | String(2) | País (default: ES) |
| email | String(50) | Email |
| phone | String(50) | Teléfono |
| contact | String(50) | Contacto |
| formula | String(25) | Fórmula numeración facturas |
| formula_r | String(25) | Fórmula numeración rectificativas |
| first_num | Integer | Primer número anual |
| created | Date | Fecha de creación |
| test | Boolean | Modo test (true) o producción (false) |
| key_file | String(200) | Ruta clave privada PEM |
| cert_file | String(200) | Ruta certificado PEM |
| next_send | DateTime | Fecha/hora siguiente envío permitido |

### invoices

| Campo | Tipo | Descripción |
|---|---|---|
| id | Integer (PK) | Identificador |
| company_id | Integer (FK) | Empresa asociada |
| dt | DateTime | Fecha de emisión |
| num | Integer | Número de factura (ciclo anual) |
| name | String(50) | Nombre del cliente |
| vat_id | String(25) | NIF/CIF del cliente |
| address | String(75) | Dirección del cliente |
| postal_code | String(10) | CP del cliente |
| city | String(25) | Ciudad del cliente |
| state | String(25) | Provincia del cliente |
| country | String(2) | País del cliente |
| tvat | Float | Total IVA |
| bi | Float | Base imponible |
| total | Float | Total factura |
| email | String(50) | Email del cliente |
| ref | String(25) | Referencia del cliente |
| comments | Text | Descripción de la operación |
| fingerprint | String(64) | Huella SHA-256 encadenada |
| verifactu_type | String(2) | Tipo de factura (F1, F2, R1...) |
| verifactu_stype | String(1) | Subtipo (I=incremental, S=sustitutiva) |
| verifactu_dt | DateTime | Fecha/hora envío a AEAT |
| verifactu_csv | Text | CSV de verificación AEAT |
| verifactu_err | Integer | Código de error AEAT |
| verifactu_err_descr | Text | Descripción del error |
| invoice_ref_id | Integer (FK) | Factura original (rectificadas) |
| voided | Boolean | Factura anulada |

### invoice_lines

| Campo | Tipo | Descripción |
|---|---|---|
| invoice_id | Integer (PK, FK) | Factura asociada |
| num | Integer (PK) | Número de línea |
| descr | String(100) | Descripción del concepto |
| units | Integer | Unidades |
| price | Float | Precio unitario |
| vat | Integer | Porcentaje IVA |
| clave_regimen | String(2) | Clave régimen IVA |
| calificacion | String(2) | Calificación de la operación |
| tvat | Float | Total IVA de la línea |
| bi | Float | Base imponible de la línea |
| total | Float | Total de la línea |

### clients

| Campo | Tipo | Descripción |
|---|---|---|
| id | Integer (PK) | Identificador |
| company_id | Integer (FK) | Empresa asociada |
| name | String(50) | Nombre del cliente |
| vat_id | String(25) | NIF/CIF |
| address | String(75) | Dirección |
| postal_code | String(10) | Código postal |
| city | String(25) | Ciudad |
| state | String(25) | Provincia |
| country | String(2) | País |
| email | String(50) | Email |
| created | DateTime | Fecha de creación |

---

## Formato de numeración

Las fórmulas permiten personalizar el formato de números de factura:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `%n%` | Número sin ceros iniciales | `123` |
| `%n.X%` | Número con X dígitos, relleno con ceros | `%n.8%` → `00000123` |
| `%y%` | Año 2 dígitos | `25` |
| `%Y%` | Año 4 dígitos | `2025` |

**Ejemplo**: `FA%y%-%n.6%` → `FA25-000001`

---

## Archivos de log

Ejemplo de entrada en `verifactu.log`:

```
2025-05-02 08:15:00 TipoOperacion=Alta EstadoRegistro=Correcto NumSerieFactura=25/00000001 IDEmisorFactura=00000000A
2025-05-02 08:18:00 TipoOperacion=Anulacion EstadoRegistro=Correcto NumSerieFactura=25/00000001 IDEmisorFactura=00000000A
2025-05-02 08:20:00 TipoOperacion=Alta EstadoRegistro=Incorrecto CodigoErrorRegistro=1123 DescripcionErrorRegistro=El formato del NIF es incorrecto.. NIF:XXX. NumSerieFactura=25/00000002 IDEmisorFactura=00000000A
```

---

## Información legal y normativa

### Normativa aplicable

- [Ley 58/2003, de 17 de diciembre, General Tributaria](https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186)
- [Real Decreto 1007/2023, de 5 de diciembre](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840) — Requisitos de sistemas informáticos de facturación
- [Orden HAC/1177/2024, de 17 de octubre](https://www.boe.es/boe/dias/2024/10/28/pdfs/BOE-A-2024-22138.pdf) — Especificaciones técnicas Veri✱Factu

### Objetivos de la regulación

Los Sistemas Informáticos de Facturación (SIF) Veri✱Factu deben garantizar:

- Integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros
- Registro de alta de cada factura de forma simultánea o inmediatamente anterior a su expedición
- Remisión electrónica continuada, segura e instantánea a la AEAT
- Código QR en cada factura para verificación por parte de los destinatarios

---

## Licencia

**MIT License**

Se concede permiso, libre de cargos, a cualquier persona que obtenga una copia de este software, para usarlo sin restricción, incluyendo sin limitación los derechos a usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del software.

EL SOFTWARE SE PROPORCIONA "COMO ESTÁ", SIN GARANTÍA DE NINGÚN TIPO.
