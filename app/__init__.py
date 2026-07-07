#
# Veri*Factu - 2025 Eduardo Ruiz <eruiz@dataclick.es>
# https://github.com/EduardoRuizM/verifactu-api-python
#

import io
import os
import re
import sys
import qrcode
import configparser

from http import HTTPStatus
from decimal import Decimal
from urllib.parse import urlparse
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask.json.provider import DefaultJSONProvider
from configparser import UNNAMED_SECTION
from sqlalchemy import text, inspect
from werkzeug.middleware.proxy_fix import ProxyFix


db = SQLAlchemy()

app = Flask(__name__)
config_file = 'verifactu.conf'
time_zone = 'Europe/Madrid' # 'Atlantic/Canary' para Canarias


class DecimalJSONProvider(DefaultJSONProvider):
    """Serializa Decimal (columnas Numeric) como number en las respuestas JSON.

    Flask 3.1 ya convierte Decimal a str; aquí lo servimos como float para
    mantener la API devolviendo números (igual que antes con Float). Los
    importes están redondeados a 2 dp, y json usa el "shortest repr" del
    float, así 43.93 se serializa como 43.93 (sin pérdida visible).
    """

    @staticmethod
    def default(o):
        if isinstance(o, Decimal):
            return float(o)
        return DefaultJSONProvider.default(o)


def create_app():
    config = configparser.ConfigParser(allow_unnamed_section=True)
    config.read(config_file)
    debug = config.getboolean(UNNAMED_SECTION, 'debug', fallback=False)
    backend_url = urlparse(config.get(UNNAMED_SECTION, 'backend_url', fallback='http://localhost:8074'))

    # SQLite path from config
    sqlite_path = config.get(UNNAMED_SECTION, 'sqlite_path', fallback='verifactu.db')
    # Resolve to absolute path so SQLite can find it
    if not os.path.isabs(sqlite_path) and sqlite_path != ':memory:':
        sqlite_path = os.path.join(os.path.dirname(os.path.abspath(config_file)), sqlite_path)

    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{sqlite_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['HOST'] = backend_url.hostname or 'localhost'
    app.config['PORT'] = backend_url.port or 8074
    app.config['DEBUG'] = debug
    # Allowlist de IPs para endpoints restringidos (/api/pending, /api/process).
    # Además de los rangos locales, se permiten estas IPs exactas (config: allowed_ips).
    raw_allowed = config.get(UNNAMED_SECTION, 'allowed_ips', fallback='')
    app.config['ALLOWED_IPS'] = [ip.strip() for ip in raw_allowed.split(',') if ip.strip()]
    # ProxyFix: tras un proxy inverso, request.remote_addr refleja la IP real
    # del cliente (X-Forwarded-For). Sin proxy, no tiene efecto.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    # Serializar Decimal (columnas Numeric) como number en JSON
    app.json = DecimalJSONProvider(app)
    db.init_app(app)
    with app.app_context():
            from . import models
            db.create_all()
            # Auto-migración: añadir columnas nuevas a tablas existentes
            # (db.create_all() solo crea tablas, no altera las ya existentes)
            inspector = inspect(db.engine)

            def add_column_if_missing(table, column, ddl):
                cols = [c['name'] for c in inspector.get_columns(table)]
                if column not in cols:
                    db.session.execute(text(ddl))
                    db.session.commit()

            # companies
            add_column_if_missing('companies', 'trade_name',
                                  "ALTER TABLE companies ADD COLUMN trade_name VARCHAR(50)")
            add_column_if_missing('companies', 'formula',
                                  "ALTER TABLE companies ADD COLUMN formula VARCHAR(25)")
            add_column_if_missing('companies', 'formula_r',
                                  "ALTER TABLE companies ADD COLUMN formula_r VARCHAR(25)")
            add_column_if_missing('companies', 'first_num',
                                  "ALTER TABLE companies ADD COLUMN first_num INTEGER")
            add_column_if_missing('companies', 'key_file',
                                  "ALTER TABLE companies ADD COLUMN key_file VARCHAR(200)")
            add_column_if_missing('companies', 'cert_file',
                                  "ALTER TABLE companies ADD COLUMN cert_file VARCHAR(200)")
            add_column_if_missing('companies', 'next_send',
                                  "ALTER TABLE companies ADD COLUMN next_send DATETIME")
            add_column_if_missing('companies', 'test',
                                  "ALTER TABLE companies ADD COLUMN test BOOLEAN")
            # invoices
            add_column_if_missing('invoices', 'verifactu_err_descr',
                                  "ALTER TABLE invoices ADD COLUMN verifactu_err_descr TEXT")
            add_column_if_missing('invoices', 'ref',
                                  "ALTER TABLE invoices ADD COLUMN ref VARCHAR(25)")
            add_column_if_missing('invoices', 'comments',
                                  "ALTER TABLE invoices ADD COLUMN comments TEXT")
            add_column_if_missing('invoices', 'fingerprint',
                                  "ALTER TABLE invoices ADD COLUMN fingerprint VARCHAR(64)")
            add_column_if_missing('invoices', 'verifactu_stype',
                                  "ALTER TABLE invoices ADD COLUMN verifactu_stype VARCHAR(1)")
            add_column_if_missing('invoices', 'invoice_ref_id',
                                  "ALTER TABLE invoices ADD COLUMN invoice_ref_id INTEGER")
            # invoice_lines
            add_column_if_missing('invoice_lines', 'clave_regimen',
                                  "ALTER TABLE invoice_lines ADD COLUMN clave_regimen VARCHAR(2)")
            add_column_if_missing('invoice_lines', 'calificacion',
                                  "ALTER TABLE invoice_lines ADD COLUMN calificacion VARCHAR(2)")
            # Auto-create clients table if it doesn't exist
            db.create_all()
            # Activar WAL mode para concurrencia lectura/escritura
            db.session.execute(text("PRAGMA journal_mode=WAL"))
            # Timeout de 5s si la BD está bloqueada
            db.session.execute(text("PRAGMA busy_timeout=5000"))
            db.session.commit()

    return app


def is_local_request():
    """Comprueba si la petición viene de una IP local o de la allowlist configurada.

    Cubre IPv4 e IPv6 (incluida la forma mapeada ::ffff:127.0.0.1), el rango
    privado 172.16/12 y una allowlist configurable vía `allowed_ips` en verifactu.conf.
    """
    addr = (request.remote_addr or '').strip()
    if not addr:
        return False
    local_prefixes = ('127.', '192.168.', '10.', '::1',
                      '::ffff:127.', '::ffff:192.168.', '::ffff:10.')
    if addr.startswith(local_prefixes):
        return True
    # Rango privado 172.16.0.0 - 172.31.255.255 (IPv4 y forma mapeada)
    for pfx in ('172.', '::ffff:172.'):
        if addr.startswith(pfx):
            try:
                second = int(addr[len(pfx):].split('.')[0])
                if 16 <= second <= 31:
                    return True
            except (ValueError, IndexError):
                pass
            break
    return addr in app.config.get('ALLOWED_IPS', [])


from .models import Company, Invoice, Client
from .verifactu import verifactuXML


@app.route('/api/companies', methods=['GET'])
def get_companies():
    return jsonify([c.to_dict() for c in Company.query.all()])


@app.route('/api/companies', methods=['POST'])
def create_company():
    data = request.get_json(silent=True) or {}
    ret, status = Company.validate_fields(data)
    if status:
        return ret, status

    # Check for duplicate name or vat_id
    if Company.query.filter_by(name=ret.get('name')).first():
        return jsonify({'error': 'Company name already exists'}), HTTPStatus.CONFLICT
    if Company.query.filter_by(vat_id=ret.get('vat_id')).first():
        return jsonify({'error': 'VAT ID already exists'}), HTTPStatus.CONFLICT

    try:
        company = Company(**ret)
        db.session.add(company)
        db.session.commit()
        return jsonify({'id': company.id}), HTTPStatus.CREATED
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), HTTPStatus.BAD_REQUEST


@app.route('/api/<int:company_id>/invoices', methods=['GET'])
def get_invoices(company_id):
    return jsonify([invoice.to_dict() for invoice in Invoice.query.filter_by(company_id=company_id).order_by(Invoice.dt).all()])


@app.route('/api/<int:company_id>', methods=['GET'])
def get_company(company_id):
    company = Company.query.get(company_id)
    if company is None:
        return jsonify({'error': 'Not found'}), HTTPStatus.NOT_FOUND
    return jsonify(company.to_dict())


@app.route('/api/<int:company_id>', methods=['PUT'])
def update_company(company_id):
    company = Company.query.get(company_id)
    if company is None:
        return jsonify({'error': 'Not found'}), HTTPStatus.NOT_FOUND

    data = request.get_json(silent=True) or {}
    ret, status = Company.validate_fields(data, element=company)
    if status:
        return ret, status

    # Check for duplicate name or vat_id (excluding current company)
    if data.get('name') and Company.query.filter(Company.name == data['name'], Company.id != company_id).first():
        return jsonify({'error': 'Company name already exists'}), HTTPStatus.CONFLICT
    if data.get('vat_id') and Company.query.filter(Company.vat_id == data['vat_id'], Company.id != company_id).first():
        return jsonify({'error': 'VAT ID already exists'}), HTTPStatus.CONFLICT

    try:
        db.session.commit()
        return jsonify(company.to_dict()), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), HTTPStatus.BAD_REQUEST


@app.route('/api/<int:company_id>', methods=['DELETE'])
def delete_company(company_id):
    company = Company.query.get(company_id)
    if company is None:
        return jsonify({'error': 'Not found'}), HTTPStatus.NOT_FOUND
    # No se puede eliminar una empresa con facturas (FK ondelete=RESTRICT)
    if Invoice.query.filter_by(company_id=company_id).first():
        return jsonify({'error': 'No se puede eliminar una empresa con facturas asociadas'}), HTTPStatus.CONFLICT
    try:
        db.session.delete(company)
        db.session.commit()
        return jsonify({'ok': True}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), HTTPStatus.BAD_REQUEST


@app.route('/api/<int:company_id>/invoices/<int:id>', methods=['GET'])
def get_invoice(company_id, id):
    invoice = Invoice.query.filter_by(id=id, company_id=company_id).first()
    if invoice is None:
        return jsonify({'error': 'Not found'}), HTTPStatus.NOT_FOUND
    return jsonify(invoice.to_lines_dict())


@app.route('/api/<int:company_id>/invoices/<int:id>/qr', methods=['GET'])
def qr_invoice(company_id, id):
    invoice = Invoice.query.filter_by(id=id, company_id=company_id).first()
    if invoice is None:
        return jsonify({'error': 'Not found'}), HTTPStatus.NOT_FOUND
    img = qrcode.make(invoice.get_verifactu_qr())
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')


def insertInvoice(company_id, type, ref=None, stype=None):
    company = Company.query.get(company_id)
    if company is None:
        return jsonify({'error': 'Company not found'}), HTTPStatus.NOT_FOUND

    data = {**request.json, 'company_id': company_id, 'verifactu_type': type, 'verifactu_stype': stype}

    ret, status = Invoice.validate_fields(data)
    if status:
        return ret, status

    if ref:
        ret['invoice_ref_id'] = ref.id
        # Copiar datos del cliente de la factura original si no vienen en la petición
        for field in ['name', 'vat_id', 'address', 'postal_code', 'city', 'state', 'country', 'email', 'ref', 'comments']:
            if ret.get(field) is None and hasattr(ref, field):
                val = getattr(ref, field)
                if val is not None:
                    ret[field] = val
        # Copiar líneas de la factura original si no vienen en la petición
        if not data.get('lines') and hasattr(ref, 'invoice_lines'):
            data['lines'] = [
                {
                    'descr': l.descr,
                    'units': l.units,
                    'price': l.price,
                    'vat': l.vat,
                }
                for l in ref.invoice_lines
            ]

    try:
        invoice = Invoice(**ret)
        db.session.add(invoice)
        db.session.commit()

        # Preserve invoice data for client auto-save before process_lines overwrites ret
        invoice_data = {**ret}

        ret, status = invoice.process_lines(data)
        if status:
            return ret, status

        # Auto-save/update client from invoice data
        _save_client_from_invoice(company_id, invoice_data)

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), HTTPStatus.BAD_REQUEST

    return jsonify({'id': invoice.id}), HTTPStatus.CREATED


def _save_client_from_invoice(company_id, client_data):
    """Save or update a client record from invoice creation data."""
    name = client_data.get('name')
    if not name:
        return

    existing = Client.query.filter_by(company_id=company_id, name=name).first()
    if existing:
        # Update existing client with new data (if changed)
        for field in ['vat_id', 'address', 'postal_code', 'city', 'state', 'country', 'email']:
            if client_data.get(field) is not None:
                setattr(existing, field, client_data[field])
        db.session.commit()
    else:
        # Create new client
        new_client = Client(company_id=company_id, name=name)
        for field in ['vat_id', 'address', 'postal_code', 'city', 'state', 'country', 'email']:
            if client_data.get(field) is not None:
                setattr(new_client, field, client_data[field])
        db.session.add(new_client)
        db.session.commit()


@app.route('/api/<int:company_id>/invoices', methods=['POST'])
def create_invoice(company_id):
    data = request.get_json(silent=True) or {}
    return insertInvoice(company_id, 'F1' if data.get('vat_id') else 'F2')


@app.route('/api/<int:company_id>/invoices/<int:id>/rect', methods=['POST'])
def create_invoice_rect(company_id, id):
    data = request.get_json(force=True, silent=True) or {}
    invoice = db.session.query(Invoice).filter(Invoice.id == id, Invoice.company_id == company_id).first()
    if not invoice or not (invoice.verifactu_type in ['F1', 'F2', 'F3']) or invoice.voided:
        return {'error': f'Not exists, not type F1/F2/F3 or voided: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    # R1 si la rectificativa lleva NIF (en el body o copiado del original); si no, R5
    type = 'R1' if data.get('vat_id') or invoice.vat_id else 'R5'
    return insertInvoice(company_id, type, invoice, 'I')


@app.route('/api/<int:company_id>/invoices/<int:id>/rect2', methods=['POST'])
def create_invoice_rect2(company_id, id):
    invoice = db.session.query(Invoice).filter(Invoice.id == id, Invoice.company_id == company_id).first()
    if not invoice or not (invoice.verifactu_type in ['F1', 'F3']) or invoice.voided:
        return {'error': f'Not exists, not type F1/F3 or voided: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    return insertInvoice(company_id, 'R2', invoice, 'I')


@app.route('/api/<int:company_id>/invoices/<int:id>/rectsust', methods=['POST'])
def create_invoice_rectsust(company_id, id):
    data = request.get_json(force=True, silent=True) or {}
    invoice = db.session.query(Invoice).filter(Invoice.id == id, Invoice.company_id == company_id).first()
    if not invoice or not (invoice.verifactu_type in ['F1', 'F2', 'F3', 'R1', 'R5']) or invoice.voided:
        return {'error': f'Not exists, not type F1/F2/F3/R1/R5 or voided: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    # R1 si la rectificativa lleva NIF (en el body o copiado del original); si no, R5
    type = 'R1' if data.get('vat_id') or invoice.vat_id else 'R5'
    return insertInvoice(company_id, type, invoice, 'S')


@app.route('/api/<int:company_id>/invoices/<int:id>/sust', methods=['POST'])
def create_invoice_sust(company_id, id):
    invoice = db.session.query(Invoice).filter(Invoice.id == id, Invoice.company_id == company_id).first()
    if not invoice or invoice.verifactu_type != 'F2' or invoice.voided:
        return {'error': f'Not exists, not type F2 or voided: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    return insertInvoice(company_id, 'F3', invoice)


@app.route('/api/<int:company_id>/invoices/<string:invoice_ids>/voided', methods=['POST'])
def create_invoice_voided(company_id, invoice_ids):
    ids = [int(i) for i in invoice_ids.split(',')]
    invoices = db.session.query(Invoice).filter(Invoice.id.in_(ids), Invoice.company_id == company_id).all()
    for invoice in invoices:
        if invoice.voided or not invoice.verifactu_dt or invoice.invoice_ref_id:
            return {'error': f'Already voided, not sent or referenced: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    company = db.session.get(Company, company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), HTTPStatus.NOT_FOUND

    verifactuxml = verifactuXML()
    return jsonify(verifactuxml.voided(company, invoices))


@app.route('/api/pending', methods=['GET'])
def get_pending():
    """List pending invoices without sending them."""
    if not is_local_request():
        return jsonify({'error': 'Esta acción solo está disponible desde el servidor local'}), HTTPStatus.UNAUTHORIZED
    companies = Company.query.all()
    pending_invoices = []
    for company in companies:
        invoices = Invoice.query.filter_by(
            company_id=company.id,
            verifactu_dt=None,
            voided=False
        ).order_by(Invoice.dt).all()
        for inv in invoices:
            pending_invoices.append({
                'id': inv.id,
                'company_id': inv.company_id,
                'company_name': company.name,
                'num': inv.get_number_format(),
                'fecha': inv.dt.strftime('%Y-%m-%d') if inv.dt else '',
                'cliente': inv.name,
                'total': inv.total,
            })
    return jsonify({'pending': pending_invoices})


@app.route('/api/process', methods=['POST'])
def post_process():
    """Send pending invoices for all companies."""
    if not is_local_request():
        return jsonify({'error': 'Esta acción solo está disponible desde el servidor local'}), HTTPStatus.UNAUTHORIZED
    verifactuxml = verifactuXML()
    data = request.get_json(silent=True) or {}
    selected = data.get('selected')
    if isinstance(selected, list) and selected:
        # Enviar solo las facturas seleccionadas: [{company_id, invoice_id}, ...]
        return jsonify(verifactuxml.send_selected(selected))
    # Sin selección (o selected=false): enviar todas las pendientes
    return jsonify(verifactuxml.pending())


# --- Client endpoints ---

@app.route('/api/<int:company_id>/clients', methods=['GET'])
def get_clients(company_id):
    q = request.args.get('q', '').strip()
    if q:
        clients = Client.query.filter(
            Client.company_id == company_id,
            db.or_(
                Client.name.ilike(f'%{q}%'),
                Client.vat_id.ilike(f'%{q}%')
            )
        ).order_by(Client.name).all()
    else:
        clients = Client.query.filter_by(company_id=company_id).order_by(Client.name).all()
    return jsonify([c.to_dict() for c in clients])


@app.route('/api/<int:company_id>/clients', methods=['POST'])
def create_client(company_id):
    data = request.get_json(silent=True) or {}
    ret, status = Client.validate_fields(data)
    if status:
        return ret, status

    # Check duplicate name within same company
    if Client.query.filter_by(company_id=company_id, name=ret.get('name')).first():
        return jsonify({'error': 'Client name already exists'}), HTTPStatus.CONFLICT

    try:
        client = Client(company_id=company_id, **ret)
        db.session.add(client)
        db.session.commit()
        db.session.refresh(client)
        return jsonify(client.to_dict()), HTTPStatus.CREATED
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), HTTPStatus.BAD_REQUEST


@app.route('/api/<int:company_id>/clients/<int:client_id>', methods=['PUT'])
def update_client(company_id, client_id):
    client = Client.query.filter_by(id=client_id, company_id=company_id).first()
    if client is None:
        return jsonify({'error': 'Client not found'}), HTTPStatus.NOT_FOUND

    data = request.get_json(silent=True) or {}
    ret, status = Client.validate_fields(data, element=client)
    if status:
        return ret, status

    try:
        db.session.commit()
        db.session.refresh(client)
        return jsonify(client.to_dict()), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), HTTPStatus.BAD_REQUEST


@app.route('/api/<int:company_id>/clients/<int:client_id>', methods=['DELETE'])
def delete_client(company_id, client_id):
    client = Client.query.filter_by(id=client_id, company_id=company_id).first()
    if client is None:
        return jsonify({'error': 'Client not found'}), HTTPStatus.NOT_FOUND
    try:
        db.session.delete(client)
        db.session.commit()
        return jsonify({'ok': True}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), HTTPStatus.BAD_REQUEST


@app.route('/api/<int:company_id>/query', methods=['GET'])
def get_query(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), HTTPStatus.NOT_FOUND

    year = request.args.get('year', type=int, default=0)
    month = request.args.get('month', type=int, default=0)
    verifactuxml = verifactuXML()
    return jsonify(verifactuxml.consulta(company, year, month))


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Estadísticas para el dashboard: facturas enviadas hoy."""
    sent_today = Invoice.query.filter(
        Invoice.verifactu_dt.isnot(None),
        db.func.date(Invoice.verifactu_dt) == db.func.current_date()
    ).count()
    return jsonify({'sent_today': sent_today})


@app.route('/api/activity', methods=['GET'])
def get_activity():
    """Últimos movimientos: facturas recientes con su estado/acción."""
    rows = db.session.query(Invoice, Company.name).join(
        Company, Invoice.company_id == Company.id
    ).order_by(Invoice.id.desc()).limit(10).all()
    items = []
    for inv, company_name in rows:
        if inv.voided:
            action = 'Anulada'
            when = inv.verifactu_dt or inv.dt
        elif inv.verifactu_dt:
            action = 'Enviada a AEAT'
            when = inv.verifactu_dt
        else:
            action = 'Creada'
            when = inv.dt
        items.append({
            'id': inv.id,
            'company_id': inv.company_id,
            'company_name': company_name,
            'num': inv.get_number_format(),
            'verifactu_type': inv.verifactu_type,
            'total': inv.total,
            'when': when.strftime('%Y-%m-%d %H:%M:%S') if when else None,
            'action': action,
        })
    return jsonify({'activity': items})


# --- Frontend serving ---

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')


@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/frontend/<path:filename>')
def serve_frontend(filename):
    return send_from_directory(FRONTEND_DIR, filename)


# --- Config endpoints for frontend ---

@app.route('/api/config', methods=['GET'])
def get_config():
    config = configparser.ConfigParser(allow_unnamed_section=True)
    config.read(config_file)
    return jsonify(dict(config.items(UNNAMED_SECTION)))


@app.route('/api/config', methods=['POST'])
def save_config():
    data = request.get_json(silent=True) or {}
    config = configparser.ConfigParser(allow_unnamed_section=True)
    config.read(config_file)
    for key, value in data.items():
        config.set(UNNAMED_SECTION, key, str(value))
    with open(config_file, 'w') as f:
        config.write(f)
    return jsonify({'message': 'Config saved. Restart server to apply changes.'})
