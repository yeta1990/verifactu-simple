<p align="center">
  <a href="https://github.com/EduardoRuizM/verifactu-api-python"><img src="logo.png" title="Veri*Factu API (Python)" width="764" height="150"></a>
</p><h1 align="center">VeriFactu
  <a href="https://github.com/EduardoRuizM/verifactu-api-python">EduardoRuizM/verifactu-api-python</a>
</h1>
<p align="center">Dataclick <a href="https://github.com/EduardoRuizM/verifactu-api-python">Veri✱Factu API (Python)</a>
  API para sistema de facturas Veri✱Factu de la Agencia Tributaria Española (AEAT)
  <a href="https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html">Sistemas Informáticos de Facturación (SIF) y VERI✱FACTU</a>
</p>

<p align="center"><a href="https://github.com/EduardoRuizM/verifactu-api-python"><img src="https://raw.githubusercontent.com/EduardoRuizM/verifactu-api-python/main/logo.png" title="Veri*Factu API (Python)" width="256" height="50"></a> <a href="https://github.com/EduardoRuizM/verifactu-api-nodejs"><img src="https://raw.githubusercontent.com/EduardoRuizM/verifactu-api-nodejs/main/logo.png" title="Veri*F:actu API (NodeJS)" width="256" height="50"></a> <a href="https://github.com/EduardoRuizM/verifactu-api-php"><img src="https://raw.githubusercontent.com/EduardoRuizM/verifactu-api-php/main/logo.png" title="Veri*Factu API (PHP)" width="256" height="50"></a></p>

# [Veri*Factu API (Python)](https://github.com/EduardoRuizM/verifactu-api-python "Veri*Factu API (Python)")

![Python](https://img.shields.io/badge/Python%203.9%2B-3776AB?logo=python&logoColor=fff) ![Flask](https://img.shields.io/badge/Flask-000?logo=flask&logoColor=fff) ![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=fff) ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Sistema de facturas Veri*Factu con envío a la AEAT

✔️ Preparado para desarrollo y producción.

✔️ Permite disponer de múltiples empresas (facturación independiente).

✔️ Sirve para autónomos, PYMEs o cualquier tipo de empresa.

✔️ Generación de la huella o hash de los registros de facturación.

✔️ Rectificación, sustitución y anulación de facturas.

✔️ Crea código QR de validación de factura.

✔️ Numeración de facturas personalizado.

✔️ Consulta de registros enviados a la AEAT por fechas.

✔️ Modo mock para desarrollo sin red ni certificados FNMT.

# Autor
[Eduardo Ruiz](https://github.com/EduardoRuizM) <<eruiz@dataclick.es>>

# ⚖ Objetivos de la regulación
Su objeto es regular cómo deben funcionar los sistemas informáticos de facturación (SIF) para asegurar el cumplimiento de los requisitos que establece el artículo 29.2.j) LGT sin interpolaciones, omisiones o alteraciones de las que no quede la debida anotación en los sistemas mismos.
Los clientes podrán verificar la calidad fiscal de las facturas recibidas, contrastándolas en la web de la Agencia Tributaria a través del código QR obligatorio del que debe disponer cada factura.
Todas las empresas y profesionales obligados a expedir facturas deberán utilizar sistemas informáticos de facturación adaptados a las características desde el 1 de julio de 2025.
- Garantizar la integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros de facturación.
- Generar un registro de facturación de alta por cada factura emitida, de forma simultánea o inmediatamente anterior a su expedición.
- Remitir electrónicamente a la Agencia Tributaria todos los registros de facturación de manera continuada, segura, correcta, íntegra, automática, consecutiva, instantánea y fehaciente.
- Incluir en las facturas un código QR que permita a los destinatarios identificarla y verificar su autenticidad.

### Versiones en otros lenguajes:
- #### [Veri*Factu API (PHP)](https://github.com/EduardoRuizM/verifactu-api-php "Veri*Factu API (PHP)")
- #### [Veri*Factu API (NodeJS)](https://github.com/EduardoRuizM/verifactu-api-nodejs "Veri*Factu API NodeJS")

## VeriFactu Pro:
- #### 👉 Completo programa de gestión, facturación, ERP con clientes, gastos, productos, stock, OpenAPI/Swagger,  facturas VeriFactu y envío a la AEAT [VeriFactu Pro](https://verifactupro.es "VeriFactu Pro")
[![VeriFactu Pro](https://verifactupro.es/images/logo.png)](https://verifactupro.es)

## Tipo de facturas y envío
- **F1**: Factura (art. 6, 7.2 y 7.3 del RD 1619/2012), si se indica en la factura el CIF/NIF (campo vat_id).
- **F2**: Factura simplificada y facturas sin identificación del destinatario Art. 6.1.D) RD 1619/2012.
- **F3**: Facturas emitidas en sustitución de facturas simplificadas facturadas y declaradas.
- **R1**: Factura rectificativa (Art 80.1 y 80.2 y error fundado en derecho).
- **R2**: Factura rectificativa (Art 80.3 ) recuperar IVA por impagos/insolvencias.
- **R5**: Factura rectificativa en facturas simplificadas.
- **S1**: Operaciones sujetas y no exentas - sin inversión del sujeto pasivo, facturas con IVA con identificación del emisor y el destinatario.
- El envío a la AEAT se hace mediante un certificado **PKCS#12** de la FNMT de [persona física](https://www.sede.fnmt.gob.es/certificados/persona-fisica "persona física") o [persona jurídica](https://www.sede.fnmt.gob.es/certificados/certificado-de-representante/persona-juridica "persona jurídica").
- Envío cada vez hasta el máximo permitido de 1000 facturas.
- Control de espera entre envíos según el TiempoEsperaEnvio facilitado por la AEAT.

## Modos de envío (`send_mode`)

| Modo | Comportamiento | Certificados | URL destino |
|------|---------------|-------------|-------------|
| `mock` | No envía nada. Simula respuesta AEAT exitosa. | No requeridos | — |
| `test` | Envía a prewww1.aeat.es | Requeridos | `https://prewww1.aeat.es/...` |
| `prod` | Usa `company.test` para decidir URL | Requeridos | `www1.aeat.es` o `prewww1.aeat.es` |

- En modo **mock** (desarrollo), `Company.cert_file` y `Company.key_file` pueden ser NULL.
- En modo **test** o **prod**, se validan los certificados y se devuelve error si faltan.

## Identificación sistema informático
Es obligatorio indicar en cada factura como responsable el sistema informático de la empresa o desarrollador que lo ha realizado en el bloque **SistemaInformatico** que incluye nombre de la razón y NIF, junto con el nombre del programa, identificador del sistema informático (2 caracteres), versión y número de instalación, además de valores booleanos (S/N) para:
- **TipoUsoPosibleSoloVerifactu** si el programa se utiliza solo para Veri✱Factu (por defecto S)
- **TipoUsoPosibleMultiOT** si el programa lo pueden utilizar varios obligados tributarios (por defecto S)
- **IndicadorMultiplesOT** si el programa lo utilizan varios obligados tributarios (por defecto S)

# ⚙ Instalación para Python (Flask + SQLite + qrcode)

### 1. Clona el repositorio
```
git clone https://github.com/EduardoRuizM/verifactu-api-python.git
cd verifactu-api-python
```

### 2. Entorno virtual y dependencias
- Crear entorno: `python -m venv venv`
- Activar entorno:
**🐧Linux:** `source venv/bin/activate`
**🪟 Windows:** `venv\Scripts\activate.bat`

- Instalar dependencias:
  `pip install -r requirements.txt`
  (Instaladas: *Flask Flask-SQLAlchemy qrcode[pil] pillow*)

### 2b. Ejecutar en background (Linux)

Mantener la aplicación corriendo tras cerrar la terminal:

```bash
# Activar entorno y lanzar en background
source venv/bin/activate
nohup python run.py > verifactu.log 2>&1 &

# Ver logs en tiempo real
tail -f verifactu.log
```

**Otras opciones:**

| Herramienta | Comando |
|-------------|---------|
| `screen` | `screen -S verifactu` → `python run.py` → `Ctrl+A, D` para desconectar |
| `tmux` | `tmux new -s verifactu` → `python run.py` → `Ctrl+B, D` para desconectar |

**Gestionar el proceso:**
```bash
# Ver si está corriendo
ps aux \| grep run.py

# Parar la aplicación
pkill -f "python run.py"
```

### 3. Archivo de configuración `verifactu.conf`

| Valor | Tipo | Requerido | Por defecto | Descripción |
| --- | --- | :---: | --- | --- |
| debug | Bool | - | False | Habilitar depuración |
| backend_url | String | - | http://localhost:8023 | Dirección/puerto del backend |
| sqlite_path | String | - | verifactu.db | Ruta al fichero SQLite |
| software_company_name | String | ✔ | - | Nombre/razón desarrollador |
| software_company_nif | String | ✔ | - | NIF desarrollador |
| software_name | String | ✔ | verifactu | Nombre sistema informático |
| software_id | String | ✔ | vf | Identificador sistema informático (2 caracteres) |
| software_version | String | ✔ | 1.0 | Versión sistema informático |
| software_install_number | String | ✔ | 00001 | Número instalación sistema informático |
| verifactu_log_file | String | - | verifactu.log | Ruta archivo de logs (vacío = sin log) |
| verifactu_save_responses | String | - | ./responses | Ruta si existe guarda respuestas AEAT |
| send_mode | String | - | mock | mock \| test \| prod |

> **Nota**: SQLite se configura con **WAL mode** (Write-Ahead Log) y **busy_timeout=5000ms** para concurrencia. Se recomienda ejecutar con **1 solo worker** de gunicorn.

### 4. Ejecuta Veri✱Factu API (Python)
`python run.py`

### 5. Crea una empresa vía API
```
curl -X POST http://localhost:8023/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "MiEmpresa SL", "vat_id": "B53000000", "address": "Calle 1", "city": "Madrid", "postal_code": "28001", "country": "ES", "test": true}'
```

En modo **test** o **prod**, también hay que insertar `key_file` y `cert_file`:
```
curl -X POST http://localhost:8023/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "MiEmpresa SL", "vat_id": "B53000000", "key_file": "./cert_key.pem", "cert_file": "./cert.pem", "test": true}'
```

### 5b. Extraer clave privada y certificado para `key_file` y `cert_file` (modo test/prod)
Se extrae la clave privada y el certificado PEM:
```
openssl pkcs12 -in miCertificadoFNMT.p12 -nocerts -nodes -out cert_key.pem
openssl pkcs12 -in miCertificadoFNMT.p12 -clcerts -nokeys -out cert.pem
```

# 📚 Secciones
Para cumplir con la normativa de Veri✱Factu, no se podrán borrar registros.

⚡ = Primary Key
🔑 = Unique
🔍 = Index

### Respuesta de estados HTTP
| HTTP Status | Código | Descripción | Body |
| --- | :---: | --- | --- |
| CREATED | 201 | Registro creado | {'id': id} |
| BAD_REQUEST | 400 | Faltan datos o erróneos | {'error': 'Missing fields {fields}'} |
| NOT_FOUND | 404 | No encontrado | {'error': 'Not found'} |
| METHOD_NOT_ALLOWED | 405 | Método no permitido | {'error': 'Method Not allowed'} |
| UNSUPPORTED_MEDIA_TYPE | 415 | Datos no son JSON | {'error': 'Unsupported Media Type:'} |

## Empresas (tabla: companies)
Empresas para el sistema de facturación independiente y envío a AEAT.

| Campo | Nombre | Tipo | Requerido | Por defecto | Descripción |
| --- | --- | --- | :---: | :---: | --- |
| id | Id | Int | ⚡ | (auto) | - |
| name | Nombre | String(25) | 🔑✔ | - | - |
| vat_id | CIF/DNI | String(25) | 🔑✔ | - | - |
| address | Dirección | String(75) | - | - | - |
| postal_code | Código postal | String(10) | - | - | - |
| city | Ciudad | String(25) | - | - | - |
| state | Provincia | String(25) | - | - | - |
| country | País | String(2) | - | ES | - |
| email | Email | String(50) | - | - | - |
| phone | Teléfono(s) | String(50) | - | - | - |
| contact | Contacto | String(50) | - | - | - |
| formula | Fórmula nº facturas | String(25) | - | %y%/%n.8% | Fórmula para el formato del número de factura |
| formula_r | Fórmula nº rectificadas | String(25) | - | R-%y%/%n.8% | Fórmula para el formato del número de factura rectificada |
| first_num | Primer nº anual facturas | Int | - | 1 | Primer número a emplear en el inicio de la facturación anual |
| created | Creado | Date | ✔ | (fecha actual) | Fecha creación |
| next_send | Siguiente envío | DateTime | - | - | Fecha permitida del siguiente envío a la AEAT |
| test | Empresa de prueba | Bool | - | 1 | Para realizar pruebas y enviar las facturas al sistema de pruebas de la AEAT |
| key_file | Ruta clave | String(200) | - | - | Ruta al fichero de clave privada (solo test/prod) |
| cert_file | Ruta certificado | String(200) | - | - | Ruta al fichero de certificado (solo test/prod) |

- Variables para **Fórmula**:
%n% = Número de la factura (sin ceros iniciales)
%n.X% = Número de factura con X dígitos, rellenando con ceros a la izquierda (ejemplo: %n.8% para 8 dígitos: 00000001)
%y% = Año 2 dígitos (ejemplo: 25)
%Y% = Año 4 dígitos (ejemplo: 2025)

- Ejemplo **Fórmula**:
FA%y%-%n.6% = FA25-000001

## Facturas (tabla: invoices)

| Campo | Nombre | Tipo | Requerido | Por defecto | Descripción |
| --- | --- | --- | :---: | :---: | --- |
| id | Id | Int | ⚡ | (auto) | - |
| company_id | Empresa | Int(➔companies) | ✔ | - | - |
| dt | Fecha | DateTime | 🔍✔ | CURRENT_TIMESTAMP | - |
| num | Número | Int | 🔑🔍 | - | Número factura (ciclo anual) |
| name | Nombre (cliente) | String(50) | ✔ | - | - |
| vat_id | CIF/DNI (cliente) | String(25) | - | - | - |
| address | Dirección | String(75) | - | - | - |
| postal_code | Código postal | String(10) | - | - | - |
| city | Ciudad | String(25) | - | - | - |
| state | Provincia | String(25) | - | - | - |
| country | País | String(2) | - | ES | - |
| tvat | Total IVA (€) | Float | ✔ | 0 | - |
| bi | Base imponible (€) | Float | ✔ | 0 | - |
| total | Total (€) | Float | ✔ | 0 | - |
| email | Email | String(50) | - | - | - |
| ref | Referencia | String(25) | - | - | Referencia del cliente |
| comments | Comentarios | Text | - | - | Descripción operación para la AEAT |
| fingerprint | Huella | String(64) | 🔍 | - | Huella o hash registro facturación |
| verifactu_type | Tipo | Char(2) | 🔍 | - | Tipo de factura |
| verifactu_stype | Tipo | Char(1) | - | - | Subtipo de factura rectificada incremental/sustitución |
| verifactu_dt | Fecha enviada | TimeStamp | 🔍 | - | Fecha enviada a la AEAT en UTC |
| verifactu_csv | CSV | Text | - | - | Códigos seguros de verificación de las respuestas |
| verifactu_err | Respuesta error | Int | - | - | Error de la respuesta o 0 |
| invoice_ref_id | Referencia factura | Int(➔invoices) | - | - | Factura original en rectificada/sustituida |
| voided | Factura anulada | Bool | ✔ | 0 | La factura está anulada |

## Líneas de facturas (tabla: invoice_lines)

| Campo | Nombre | Tipo | Requerido | Por defecto | Descripción |
| --- | --- | --- | :---: | :---: | --- |
| invoice_id | Factura | Int(➔invoices) | ⚡ | - | - |
| num | Número | Int | ⚡🔍 | - | Número de línea |
| descr | Descripción | String(100) | - | - | - |
| units | Unidades | Int | - | 1 | - |
| price | Precio (€) | Float | - | - | - |
| vat | IVA % | Int | - | - | Porcentaje de IVA |
| tvat | Total IVA (€) | Float | - | - | - |
| bi | Base imponible (€) | Float | - | - | - |
| total | Total (€) | Float | - | - | - |

| 🌍 Endpoint | Método | Acción | Variables GET | Variables POST | Respuesta |
| --- | --- | --- | --- | --- | --- |
| **/api/companies** | GET | Obtener todas las empresas | - | - | [{...}] |
| **/api/companies** | POST | Crear empresa | - | {name, vat_id, address, postal_code, city, state, country, email, phone, contact, test} | {id} |
| **/api/:company_id/invoices** | GET | Obtener facturas de empresa | - | - | [{id, company_id, dt, num, name, vat_id, address, postal_code, city, state, country, tvat, bi, total, email, ref, comments, fingerprint, verifactu_type, verifactu_stype, verifactu_dt, verifactu_csv, verifactu_err, invoice_ref_id, voided, number_format, invoice_ref}] |
| **/api/:company_id/invoices/:id** | GET | Obtener factura :id de empresa | - | - | {id, ..., lines: [{invoice_id, num, descr, units, price, vat, tvat, bi, total}]} |
| **/api/:company_id/invoices/:id/qr** | GET | Obtener código QR de factura | - | - | Imagen PNG con QR de verificación |
| **/api/:company_id/invoices** | POST | Añadir factura | - | {name, vat_id, address, postal_code, city, state, country, email, ref, comments, lines: [{descr, units, price, vat}]} | {id} |
| **/api/:company_id/invoices/:id/rect** | POST | Rectificada R1/R5 | - | {name, vat_id, address, postal_code, city, state, country, email, ref, comments, lines: [{descr, units, price, vat}]} | {id} |
| **/api/:company_id/invoices/:id/rect2** | POST | Rectificada R2 | - | {name, vat_id, address, postal_code, city, state, country, email, ref, comments, lines: [{descr, units, price, vat}]} | {id} |
| **/api/:company_id/invoices/:id/rectsust** | POST | Rectificada R1/R5 sust. | - | {name, vat_id, address, postal_code, city, state, country, email, ref, comments, lines: [{descr, units, price, vat}]} | {id} |
| **/api/:company_id/invoices/:id/sust** | POST | Sustituida F3 | - | {name, vat_id, address, postal_code, city, state, country, email, ref, comments, lines: [{descr, units, price, vat}]} | {id} |
| **/api/:company_id/invoices/:id/voided** | POST | Anular factura | - | - | {ok: [...], ko: [...]} |
| **/api/process** | GET | Procesar envíos pendientes | - | - | {companies: {...}} |
| **/api/:company_id/query** | GET | Consulta registros enviados | year=Año, month=Mes | - | {data: [...]} |

- Campos obligatorios: name y 1 línea de factura con descr y price.
- Se calcula automáticamente: tvat, bi y total.
- `verifactu_dt_local` es la fecha en zona horaria local (definida en `time_zone` en `__init__.py`), por defecto `Europe/Madrid`.

## Ejemplos / Tests
- Ver todas las facturas de empresa 1:
```
curl -i -X GET http://localhost:8023/api/1/invoices
```
Respuesta:
```
[
	{
		"id": 1,
		"company_id": 1,
		"dt": "2025-07-01 11:35:20",
		"num": 1,
		"name": "Promociones XX",
		"vat_id": "00000000A",
		"address": "C/Jardines",
		"postal_code": "03600",
		"city": "Elda",
		"state": "Alicante",
		"country": "ES",
		"tvat": 210.05,
		"bi": 1000.25,
		"total": 1210.30,
		"email": "eruiz@dataclick.es",
		"ref": null,
		"comments": null,
		"fingerprint": null,
		"verifactu_type": "F1",
		"verifactu_stype": null,
		"verifactu_dt": null,
		"verifactu_csv": null,
		"verifactu_err": null,
		"invoice_ref_id": null,
		"voided": false,
		"number_format": "25/00000001"
	}
]
```

- Insertar factura en empresa 1 del tipo F1 (con destinatario):
```
curl -i -X POST -H "Content-Type: application/json" -d "{\"name\": \"Promociones XX\", \"vat_id\": \"00000000A\", \"address\": \"C/Jardines\", \"postal_code\": \"03600\", \"city\": \"Elda\", \"state\": \"Alicante\", \"email\": \"eruiz@dataclick.es\", \"lines\": [{\"descr\": \"Producto1\", \"units\": 2, \"price\": 20.5, \"vat\": 21}]}" http://localhost:8023/api/1/invoices
```
Respuesta:
```
{"id": 1}
```

- Insertar factura en empresa 1 del tipo F2 (simplificada / sin destinatario):
**Nota:** Las facturas simplificadas sin destinatarios solo se pueden emitir si el importe no supera 400 €, o 3.000 € en el caso de no necesitar factura el destinatario para deducir el IVA, o en actividades como ventas al por menor, servicios ambulancia, transporte, hostelería...
```
curl -i -X POST -H "Content-Type: application/json" -d "{\"name\": \"TPV\", \"lines\": [{\"descr\": \"Producto1\", \"units\": 2, \"price\": 20.5, \"vat\": 21}]}" http://localhost:8023/api/1/invoices
```
Respuesta:
```
{"id": 2}
```

- Insertar rectificada en empresa 1 del tipo F1 de la factura 2:
```
curl -i -X POST -H "Content-Type: application/json" -d "{\"name\": \"Promociones YY\", \"vat_id\": \"00000000A\", \"address\": \"C/Jardines\", \"postal_code\": \"03600\", \"city\": \"Elda\", \"state\": \"Alicante\", \"email\": \"eruiz@dataclick.es\", \"lines\": [{\"descr\": \"Producto1\", \"units\": 2, \"price\": 20.5, \"vat\": 21}]}" http://localhost:8023/api/1/invoices/2/rect
```
Respuesta:
```
{"id": 3}
```

- Anular factura 2 en empresa 1:
**Nota:** La Ley General Tributaria **NO** permite anular facturas salvo en algunos casos como simplificadas del mismo día para TPVs, por lo que se debe crear factura rectificativa (Ley 58/2003 y Reglamento 1619/2012).
```
curl -X POST http://localhost:8023/api/1/invoices/2/voided
```
Respuesta:
```
{
  "ok": [
     {
      "id": ID_FACTURA,
      "num": NUM_SERIE_FACTURA
    }
   ]
}
```

- Imagen QR de validación de factura 2 en empresa 1:
```
curl http://localhost:8023/api/1/invoices/2/qr --output qr.png
```
Respuesta:
```
QR Imagen PNG en archivo qr.png
```

- Consultar registros enviados a la AEAT de junio/2025 en empresa 1:
```
curl "http://localhost:8023/api/1/query?month=6&year=2025"
```
Respuesta:
```
{
   "data": [
    {
     "IDFactura": {
       "IDEmisorFactura": "00000000A",
       "NumSerieFactura": "25/00000001",
       "FechaExpedicionFactura": "02-05-2025"
     },
     "DatosRegistroFacturacion": {
       "TipoFactura": "F1",
       "DescripcionOperacion": "Prueba-1",
       "Destinatarios": {
         "IDDestinatario": {
           "NombreRazon": "Eduardo Ruiz",
           "NIF": "00000000B"
         }
       },
       "Desglose": {
         "DetalleDesglose": {
           "Impuesto": "01",
           "ClaveRegimen": "01",
           "CalificacionOperacion": "S1",
           "TipoImpositivo": "21",
           "BaseImponibleOimporteNoSujeto": "17.7",
           "CuotaRepercutida": "3.72"
         }
       },
       "CuotaTotal": "3.72",
       "ImporteTotal": "21.42",
       "Encadenamiento": {
         "PrimerRegistro": "S"
       },
       "FechaHoraHusoGenRegistro": "2025-05-02T08:49:41+02:00",
       "TipoHuella": "01",
       "Huella": "E3768536752595E50C7146ADA8F7B6C87C4FAE802E9A8BD448E4BE91B3D21C88"
     },
     ...
    }
   ]
}
```

## 🌍 Flujo completo de envío a la AEAT

### Visión general

```
Frontend (process.html)
    │ GET /api/process
    ▼
Backend (get_process → verifactuXML.pending())
    │
    ├─ Lee todas las empresas desde BD
    ├─ Por cada empresa, calcula cooldown desde company.next_send
    │   ├─ Si next_send > 0 (en cooldown): "Next send in X seconds"
    │   └─ Si está listo: send(company, pending_invoices)
    │       │
    │       ├─ 1. Recoge facturas pendientes (verifactu_dt IS NULL)
    │       ├─ 2. Calcula fingerprint SHA-256 (encadenamiento)
    │       ├─ 3. Genera XML SOAP (RegistroAlta o RegistroAnulacion)
    │       ├─ 4. send_xml() → mock o AEAT real
    │       ├─ 5. Parsea respuesta XML SOAP
    │       └─ 6. Actualiza BD (verifactu_dt, csv, err, voided)
    ▼
JSON {companies: {1: {ok:[...], ko:[...]}, 2: {...}}}
    ▼
Frontend muestra resultados OK/ERROR por empresa y factura
```

### Detalle del proceso `pending()`

1. **Consulta cooldown**: Para cada empresa, calcula `next_send - now`. Si hay tiempo pendiente, devuelve un mensaje de cooldown y no procesa esa empresa.
2. **Facturas pendientes**: Si no hay cooldown, selecciona todas las facturas de esa empresa donde `verifactu_dt IS NULL` (máximo 1000 por llamada).
3. **Para cada factura pendiente**:
   - Calcula el **fingerprint** (hash SHA-256 que encadena con la factura anterior). Incluye: NIF emisor, número de factura, fecha, tipo, importe total, huella anterior y timestamp.
   - Genera el **XML de alta** (`registro_alta()`) con: datos del cliente, desglose fiscal (base/IVA por tipo), descripción de la operación, encadenamiento con la factura anterior, datos del sistema informático y la huella.
   - Si es anulación, genera el **XML de anulación** (`registro_anulacion()`) con estructura similar pero marcando como `RegistroAnulacion`.
4. **Envío SOAP**: `send_xml()` decide el modo:
   - **Mock** (`send_mode = 'mock'`): No hay red. Genera respuesta SOAP simulada con éxito para todas las facturas.
   - **Test/Prod**: Envía por HTTPS al SOAP real de la AEAT con certificado digital del cliente.
     - `company.test == 1` → `https://prewww1.aeat.es/...` (sede de pruebas)
     - `company.test == 0` → `https://www1.agenciatributaria.gob.es/...` (producción)
5. **Procesamiento de respuesta**:
   - Parsea el XML de respuesta: extrae CSV, `TimestampPresentacion`, `CodigoErrorRegistro` y `DescripcionErrorRegistro` por factura.
   - Actualiza la BD: `verifactu_dt` = timestamp de presentación, `verifactu_csv` = CSV acumulado, `verifactu_err` = código de error (0 = correcto), `voided = 1` si era anulación exitosa.
   - Actualiza `next_send` de la empresa: `datetime.now() + TiempoEsperaEnvio segundos` (cooldown para no saturar la AEAT).

### Cooldown (TiempoEsperaEnvio)

La AEAT responde con un campo `TiempoEsperaEnvio` que indica los segundos mínimos entre envíos. El sistema guarda este valor en `company.next_send` y lo respeta:

- Si se llama a `/api/process` antes de que expire `next_send`, se devuelve `{"message": "Next send in XX seconds"}` y no se procesan facturas.
- El cooldown se calcula como: `next_send = datetime.now() + TiempoEsperaEnvio segundos`.
- En modo **mock**, se usa un tiempo de espera por defecto.

### Modos de envío (`send_mode`)

| Modo | Comportamiento | Certificados | URL destino |
|------|---------------|-------------|-------------|
| `mock` | No envía nada. Simula respuesta AEAT exitosa. | No requeridos | — |
| `test` | Envía a prewww1.aeat.es | Requeridos | `https://prewww1.aeat.es/...` |
| `prod` | Usa `company.test` para decidir URL | Requeridos | `www1.aeat.es` o `prewww1.aeat.es` |

En modo **mock** (desarrollo), `Company.cert_file` y `Company.key_file` pueden ser NULL.
En modo **test** o **prod**, se validan los certificados y se devuelve error si faltan.

### Formato de respuesta de `/api/process`

```json
{
  "companies": {
    "1": {
      "ok": [
        { "id": 1, "num": "25/00000001" }
      ],
      "ko": [
        { "id": 2, "num": "25/00000002", "codError": "1123", "descrError": "El formato del NIF es incorrecto.." }
      ]
    },
    "2": {
      "message": "Next send in 45 seconds"
    }
  }
}
```

- **ok**: facturas enviadas correctamente → se actualizan `verifactu_dt`, `verifactu_csv`, `verifactu_err=0`.
- **ko**: facturas con error → se actualizan `verifactu_dt`, `verifactu_csv`, `verifactu_err=código_error`.
- **message**: cooldown activo → no se procesan facturas.

### Reenvío de facturas con error

Si una factura tiene `verifactu_err != 0`, se puede forzar un reenvío poniendo `verifactu_dt = NULL` en la BD. En el próximo proceso se enviará como **Subsanación** (con `<Subsanacion>S</Subsanacion>` en el XML). Si hubo rechazo previo, también se marca `<RechazoPrevio>X</RechazoPrevio>`.

### Programación automática

Para ejecutar el envío automáticamente cada 3 minutos, añadir en `/etc/crontab`:

```
*/3 * * * * /usr/bin/curl http://localhost:8023/api/process
```

> **Nota**: El frontend también puede llamar a este endpoint manualmente desde la pantalla "Envío" (`process.html`).

---

## 🖥 Frontend — Pantallas y funcionalidades

La aplicación incluye un panel de gestión basado en HTML + CSS (Bulma) + JavaScript vanilla, servido por el propio backend Flask en `/frontend/<path:filename>`.

### Pantallas disponibles

| Pantalla | URL | Funcionalidad |
|----------|-----|--------------|
| **Dashboard** | `/` | Resumen general: nº empresas, facturas pendientes, facturas enviadas hoy, acciones rápidas |
| **Empresas** | `/frontend/companies.html` | Listado de empresas en tabla (Nombre/NIF/País/Teléfono), botón "Nueva empresa", enlace a detalle |
| **Detalle Empresa** | `/frontend/company.html?id=N` | Datos completos de la empresa, tabla de facturas con estados (Pendiente/Enviada/Anulada), botones "Nueva factura" y "Enviar facturas" (solo si hay pendientes) |
| **Crear Factura** | `/frontend/invoice.html` | Formulario de factura: datos del cliente, líneas dinámicas con cálculos automáticos (BI + IVA + Total), badge de tipo F1/F2, validación de campos |
| **Detalle Factura** | `/frontend/invoice-detail.html?id=N` | Vista completa: datos del cliente, líneas, resumen, código QR, estado de envío, botones de rectificación (F1→R1/R2/R5, F2→Sustitutiva) y anulación |
| **Envío** | `/frontend/process.html` | Panel de envío: filtrar por empresa, listado de facturas pendientes, botón "Enviar", resultados OK/ERROR, cooldown |
| **Consulta AEAT** | `/frontend/query.html` | Consulta de registros enviados a la AEAT: selector de empresa, año y mes, resultados de la consulta SOAP |
| **Configuración** | `/frontend/config.html` | Formulario de configuración del sistema (software info, send_mode, paths), GET/POST a `/api/config` |

### Navegación

Todas las pantallas comparten una navbar oscura con enlaces a: Dashboard, Empresas, Envío, Consulta AEAT, Configuración.

### Arquitectura frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `app.js` | Utilidades compartidas: `apiFetch()`, `showToast()`, `openModal()`, `emptyState()`, `formatDate()`, `formatEUR()`, `getParam()`, `navbarHTML()` |
| `index.js` | Dashboard: carga de estadísticas, cards resumen, acciones rápidas |
| `companies.js` | Listado de empresas, modal de creación, tabla con acciones |
| `company.js` | Detalle de empresa + listado de facturas con estados |
| `invoice.js` | Formulario de creación de factura con líneas dinámicas |
| `invoice-detail.js` | Vista detallada de factura, código QR, botones de rectificación/anulación |
| `process.js` | Panel de envío: filtrado por empresa, checkboxes, resultados OK/ERROR |
| `query.js` | Consulta de registros AEAT por empresa/año/mes |
| `config.html` + `config.js` | Configuración del sistema |

### Cómo arrancar la aplicación completa

```bash
# 1. Clonar y configurar
git clone https://github.com/EduardoRuizM/verifactu-api-python.git
cd verifactu-api-python

# 2. Entorno virtual y dependencias
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Crear archivo de configuración verifactu.conf
# (ver tabla de configuración más arriba)

# 4. Iniciar backend (sirve API + frontend estático)
python run.py
# → Escucha en http://localhost:8023

# 5. Abrir el frontend en el navegador
# Dashboard:    http://localhost:8023/
# Empresas:     http://localhost:8023/frontend/companies.html
# Envío:        http://localhost:8023/frontend/process.html
# Consulta AEAT: http://localhost:8023/frontend/query.html
# Configuración: http://localhost:8023/frontend/config.html
```

> El backend Flask sirve tanto la API REST (`/api/*`) como los archivos estáticos del frontend (`/frontend/*`). No se necesita un servidor web separado para desarrollo.

### Flujo típico de uso

```
1. Crear empresa → /frontend/companies.html → POST /api/companies
2. Crear factura → /frontend/invoice.html → POST /api/{id}/invoices
3. Ver factura → /frontend/invoice-detail.html → GET /api/{id}/invoices/{num}
4. Enviar facturas → /frontend/process.html → GET /api/process
   ├─ Si hay cooldown: "Next send in XX seconds"
   ├─ Si hay facturas pendientes: genera XML SOAP → AEAT → actualiza BD
   └─ Muestra resultados OK/ERROR
5. Consultar registros → /frontend/query.html → GET /api/{id}/query?year=2025&month=6
6. Rectificar factura → /frontend/invoice-detail.html → POST /api/{id}/invoices/{num}/rect
7. Anular factura → /frontend/invoice-detail.html → POST /api/{id}/invoices/{num}/voided
```

## 🌍 Procesar envío a la AEAT

> **Detalle completo del flujo de envío**: ver sección [🌍 Flujo completo de envío a la AEAT](#-flujo-completo-de-envío-a-la-aeat) más arriba.

- Endpoint (GET): **/api/process** — solo accesible desde direcciones locales (127.x, 192.168.x, 10.x)
- Procesa facturas pendientes (`verifactu_dt IS NULL`) de todas las empresas sin cooldown activo
- Respuesta por empresas: `ok` (correctos), `ko` (errores), `message` (cooldown)
- En caso de error [(consultar errores)](https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/errores.properties "(consultar errores)") se guarda en `verifactu_err`; para reenviar poner `verifactu_dt=null` y se enviará como **Subsanación**
- Si hubo rechazo previo, se marca **RechazoPrevio=X** en el reenvío. Las anulaciones marcan **RechazoPrevio=S**.

### Ejemplo archivo de logs con alta, anulación y error en `verifactu_log_file`
```
2025-05-02 08:15:00 TipoOperacion=Alta EstadoRegistro=Correcto NumSerieFactura=25/00000001 IDEmisorFactura=00000000A
2025-05-02 08:18:00 TipoOperacion=Anulacion EstadoRegistro=Correcto NumSerieFactura=25/00000001 IDEmisorFactura=00000000A
2025-05-02 08:20:00 TipoOperacion=Alta EstadoRegistro=Incorrecto CodigoErrorRegistro=1123 DescripcionErrorRegistro=El formato del NIF es incorrecto.. NIF:XXX. NumSerieFactura=25/00000002 IDEmisorFactura=00000000A
```

## Crear servicio del backend en producción
**🐧Linux:** Crea entorno virtual, activarlo, instalar dependencias y ajustar rutas/permisos:
```
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

- Crear archivo `/etc/systemd/system/verifactu.service` (y ajustar rutas):

```
[Unit]
Description=Dataclick VeriFactu API
After=network.target

[Service]
User=verifactu
Group=verifactu
WorkingDirectory=/var/home/verifactu
ExecStart=/var/home/verifactu/venv/bin/gunicorn run:app --bind 127.0.0.1:8023 --workers 1 --threads 2
Environment="PATH=/var/home/verifactu/venv/bin"
Restart=always

[Install]
WantedBy=default.target
```

> **Importante**: SQLite solo soporta escritura única. Usar `--workers 1` con `--threads 2` permite servir peticiones concurrentes sin conflictos de BD.

- Recargar configuración, habilitar e iniciar servicio:

```
sudo systemctl daemon-reload
sudo systemctl enable verifactu.service
sudo systemctl start verifactu.service
```

## ⬢ Proxy HTTPS con Nginx
```
server {
	listen		443 ssl;
	listen		[::]:443 ssl;
	server_name	mybackend.tld;

	ssl_certificate		ACME_PATH/mybackend.tld/fullchain.cer;
	ssl_certificate_key	ACME_PATH/mybackend.tld/mybackend.tld.key;
	ssl_protocols			TLSv1.3;

	location / {
		proxy_set_header	X-Forwarded-For $remote_addr;
		proxy_set_header	Host $host;
		proxy_pass		http://127.0.0.1:8023; # Ajusta la URL del backend
	}
}
```

## Servicio siempre en ejecución
**🐧Linux:** Para asegurar que el servicio siempre está en ejecución comprobando cada minuto en un cron job y reiniciarlo si es necesario.
- Crear `/usr/local/bin/check_verifactu.sh`:
```
#!/bin/bash
SERVICE="verifactu.service"
if ! systemctl is-active --quiet "$SERVICE"; then
	systemctl restart "$SERVICE"
fi
```
`chmod +x /usr/local/bin/check_verifactu.sh`

- Añadir en `/etc/crontab`:

`* * * * * /usr/local/bin/check_verifactu.sh`

## Docker
- Instala desde: https://www.docker.com
- Construir imagen: `docker build -t verifactu .`
- Ejecutar contenedor: `docker run -p 8023:8023 verifactu`

# ℹ️ Información
**Dataclick Veri✱Factu**
- [Dataclick.es](https://www.dataclick.es "Dataclick.es") es una empresa de programación desde 2006.
- [Olimpo](https://www.dataclick.es/es/la-tecnologia-detras-de-olimpo.html "Olimpo") es una solución completa para administrar dominios, alojamiento, creación de webs, facturación, CRM y ERP.

**Normativa y criterios aplicables:**
- [Ley 58/2003, de 17 de diciembre, General Tributaria.](https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186&p=20230525&tn=1#a29 "Ley 58/2003, de 17 de diciembre")
- [Real Decreto 1007/2023, de 5 de diciembre, por el que se aprueba el Reglamento que establece los requisitos que deben adoptar los sistemas y programas informáticos o electrónicos que soporten los procesos de facturación de empresarios y profesionales, y la estandarización de formatos de los registros de facturación.](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840&p=20231206&tn=1#da "Real Decreto 1007/2023, de 5 de diciembre")
- [Orden HAC/1177/2024, de 17 de octubre, por la que se desarrollan las especificaciones técnicas, funcionales y de contenido referidas en el Reglamento que establece los requisitos que deben adoptar los sistemas y programas informáticos o electrónicos que soporten los procesos de facturación de empresarios y profesionales, y la estandarización de formatos de los registros de facturación, aprobado por el Real Decreto 1007/2023, de 5  de diciembre; y en el Reglamento por el que se regulan las obligaciones de facturación, aprobado por Real Decreto 1619/2012, de 30 de noviembre.](https://www.boe.es/boe/dias/2024/10/28/pdfs/BOE-A-2024-22138.pdf "Orden HAC/1177/2024, de 17 de octubre")

# Licencia MIT
Se concede permiso, libre de cargos, a cualquier persona que obtenga una copia de este software y de los archivos de documentación asociados (el "Software"), a utilizar el Software sin restricción, incluyendo sin limitación los derechos a usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar, y/o vender copias del Software, y a permitir a las personas a las que se les proporcione el Software a hacer lo mismo, sujeto a las siguientes condiciones:

El aviso de copyright anterior y este aviso de permiso se incluirán en todas las copias o partes sustanciales del Software.
EL SOFTWARE SE PROPORCIONA "COMO ESTÁ", SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA, INCLUYENDO PERO NO LIMITADO A GARANTÍAS DE COMERCIALIZACIÓN, IDONEIDAD PARA UN PROPÓSITO PARTICULAR E INCUMPLIMIENTO. EN NINGÚN CASO LOS AUTORES O PROPIETARIOS DE LOS DERECHOS DE AUTOR SERÁN RESPONSABLES DE NINGUNA RECLAMACIÓN, DAÑOS U OTRAS RESPONSABILIDADES, YA SEA EN UNA ACCIÓN DE CONTRATO, AGRAVIO O CUALQUIER OTRO MOTIVO, DERIVADAS DE, FUERA DE O EN CONEXIÓN CON EL SOFTWARE O SU USO U OTRO TIPO DE ACCIONES EN EL SOFTWARE.
