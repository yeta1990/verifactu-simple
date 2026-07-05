# Análisis Técnico y Legal de Conformidad: Veri*Factu para Venta de Entradas

Este documento analiza la validez del software de facturación adaptado a **Veri*Factu** (Reglamento de Sistemas Informáticos de Facturación - Real Decreto 1007/2023 y Orden HAC/1177/2024) y detalla las obligaciones legales y técnicas específicas para su uso en tu empresa de venta de entradas de conciertos, sin intermediarios.

---

## 1. Resumen de la Funcionalidad del Sistema

El software implementa un **Sistema Informático de Facturación (SIF)** basado en Python (Flask + SQLite en modo WAL) y una interfaz web con JS Vanilla y Bulma CSS. Sus capacidades principales son:

*   **Generación de Registros de Alta y Anulación**: Genera la estructura XML requerida por la AEAT de forma inmediata y cronológica.
*   **Encadenamiento Criptográfico (Hash/Huella)**: Aplica el algoritmo **SHA-256** para encadenar cada factura con la huella de la anterior, garantizando la inalterabilidad de los registros.
*   **Emisión de Facturas F1 y F2**: Permite emitir facturas completas (F1) y simplificadas (F2), idóneas para venta al consumidor final.
*   **Rectificación y Sustitución**: Soporta facturas rectificativas ($R1, R2, R5$) y facturas en sustitución de simplificadas ($F3$).
*   **Generación de Códigos QR**: Genera códigos de barras QR de validación que apuntan directamente a la Sede Electrónica de la AEAT para que el cliente verifique la factura.
*   **Envío Directo**: Conecta con los servidores SOAP de la AEAT (`prewww1.aeat.es` para pruebas y `www1.agenciatributaria.gob.es` para producción) mediante TLS mutuo (mTLS) utilizando tu certificado digital.

---

## 2. Correcciones Técnicas Realizadas (Bugs)

Durante el análisis del código fuente, se detectó y subsanó un **error crítico** en el endpoint de anulación de facturas en el backend:

> [!WARNING]
> **Bug Crítico de Anulación Solucionado**
> En [app/__init__.py](file:///home/albgarci/Documents/verifactu/app/__init__.py#L229-L243), la ruta `@app.route('/api/<int:company_id>/invoices/<string:id>/voided')` definía la función `create_invoice_voided(company_id)`.
> 
> **Consecuencias**: 
> 1. Al no recibir el parámetro `id` en la firma de la función, Flask lanzaba un error de coincidencia de argumentos (`TypeError`).
> 2. Internamente, la variable `id` hacía referencia a la función nativa de Python `id()`, provocando un fallo de atributo (`AttributeError`) al intentar ejecutar `id.split(',')`.
> 
> **Solución**: Se ha corregido la firma del endpoint a `create_invoice_voided(company_id, invoice_ids)` para procesar correctamente las peticiones del frontend en [invoice-detail.js](file:///home/albgarci/Documents/verifactu/frontend/invoice-detail.js#L248-L250).

---

## 3. Análisis Legal: ¿Es necesario un proveedor externo?

**No**. Puedes utilizar este software directamente para emitir tus facturas sin depender de ningún tercero, proveedor autorizado o plataforma de intermediación. 

Bajo la normativa de la AEAT, **Veri*Factu** es un canal de comunicación directo. Los puntos legales clave son:

| Concepto | Explicación |
|---|---|
| **Envío Directo** | La comunicación se realiza desde tu propio servidor al endpoint SOAP de la AEAT utilizando tu certificado digital. No se requiere contratar a un "proveedor de facturación electrónica autorizado" ni a redes EDI. |
| **Certificado Digital** | Solo necesitas disponer de un certificado digital de firma electrónica válido en España. Sirve el de **Representante de Persona Jurídica** o el de **Autónomo/Persona Física** emitido por una autoridad de certificación autorizada (como la FNMT o ANF AC). |
| **Desarrollo Propio** | Dado que usas un software forkeado (desarrollo a medida/interno), **tú actúas legalmente como la "Entidad Productora" (desarrollador)** del software de facturación para tu propio uso. |

---

## 4. La Obligación Legal: Declaración Responsable de Conformidad

Aunque no necesitas un proveedor externo, la ley exige un requisito obligatorio para **todos** los sistemas de facturación en España: la **Declaración Responsable de Conformidad** (Artículo 9 del RD 1007/2023).

Como tu empresa realiza un desarrollo a medida (o adapta un software open source), **tu empresa debe emitir y firmar su propia Declaración Responsable**.

### Requisitos de la Declaración Responsable:
1.  **Formato**: Debe ser un documento escrito firmado por el administrador de la empresa (o el desarrollador interno autorizado).
2.  **Contenido Mínimo**:
    *   **Identificación del sistema**: Nombre comercial (`software_name`) y el identificador de 2 caracteres (`software_id`) tal como se configuran en el backend.
    *   **Versión del software** (`software_version`).
    *   **Identificación del desarrollador/productor**: Tu nombre/razón social y tu NIF.
    *   **Número de instalación** o de licencia (`software_install_number`).
    *   **Declaración expresa**: Certificar bajo juramento que el sistema informático cumple con las especificaciones técnicas del artículo 29.2.j) de la Ley General Tributaria y de su reglamento de desarrollo.
3.  **Accesibilidad**: La declaración responsable debe estar accesible para su consulta y visualización dentro de la propia aplicación (por ejemplo, en una pestaña de "Ayuda", "Configuración" o "Acerca de").
4.  **Actualizaciones**: Si modificas el software en aspectos que afecten a la facturación, al encadenamiento o al envío a la AEAT, debes emitir una nueva declaración responsable actualizando la versión.

---

## 5. Aplicabilidad a la Venta de Entradas de Conciertos

Tu modelo de negocio (venta de entradas de espectáculos) tiene ventajas de facturación específicas en el Reglamento de Facturación de España (Real Decreto 1619/2012):

*   **Uso Generalizado de Facturas Simplificadas ($F2$)**:
    *   La venta de entradas de espectáculos culturales y deportivos al consumidor final (B2C) es una actividad autorizada para expedir **facturas simplificadas (tiques)** en lugar de facturas completas.
    *   El límite general para facturas simplificadas es de $400\text{ €}$, pero para espectáculos y actividades recreativas, el límite se amplía hasta los **$3.000\text{ €}$ (IVA incluido)**.
    *   Esto significa que casi la totalidad de tus ventas se registrarán como facturas simplificadas de tipo **F2** (sin necesidad de pedir NIF/CIF ni dirección postal al comprador).
*   **Petición de Factura Completa ($F1$)**:
    *   Si un cliente corporativo (patrocinador, empresa) o un particular te solicita una factura para deducirse el gasto, puedes introducir sus datos fiscales (Nombre, NIF y Dirección). El sistema la enviará automáticamente como **F1** (Factura Completa).

---

## 6. Configuración y Puesta en Marcha

Para arrancar el sistema en producción, debes seguir estos pasos:

### 1. Extracción del Certificado Digital
La AEAT requiere certificados digitales en formato PEM individuales para la clave y el certificado. Si dispones de un archivo `.p12` o `.pfx` de la FNMT, extrae los componentes mediante `openssl`:
```bash
# Extraer la clave privada (sin contraseña en el output pem)
openssl pkcs12 -in certificado.p12 -nocerts -nodes -out cert_key.pem

# Extraer el certificado cliente
openssl pkcs12 -in certificado.p12 -clcerts -nokeys -out cert.pem
```

### 2. Configuración del SIF
Edita el archivo `verifactu.conf` en el servidor:
```ini
debug = False
backend_url = http://localhost:8023
sqlite_path = verifactu.db
software_company_name = Tu Razón Social S.L.  # Tu empresa como desarrolladora
software_company_nif = B12345678              # Tu NIF
software_name = EntradasVF                    # Nombre de tu aplicación de entradas
software_id = ev                              # Identificador de 2 caracteres
software_version = 1.0
software_install_number = 00001
send_mode = prod                              # 'test' para pruebas, 'prod' para real
verifactu_log_file = verifactu.log
verifactu_save_responses = ./responses
```

### 3. Registro de tu Empresa en el Frontend
*   Inicia el software con `python run.py`.
*   Accede a `/frontend/companies.html` en tu navegador.
*   Crea una nueva empresa con tus datos de facturación reales e introduce las rutas locales absolutas a los archivos `cert.pem` y `cert_key.pem`.
*   Asegúrate de marcar `Empresa de prueba = Desactivado` en la pantalla de la empresa para habilitar el envío real a producción cuando estés listo.
*   *Nota*: Recomendamos encarecidamente utilizar primero `send_mode = test` y `Empresa de prueba = Activado` para validar los envíos contra el entorno de preproducción de la AEAT antes de emitir facturas con validez tributaria real.
