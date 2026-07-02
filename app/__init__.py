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
from urllib.parse import urlparse
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, request, jsonify, send_file, send_from_directory
from configparser import UNNAMED_SECTION
from sqlalchemy import text, inspect


db = SQLAlchemy()

app = Flask(__name__)
config_file = 'verifactu.conf'
time_zone = 'Europe/Madrid' # 'Atlantic/Canary' para Canarias


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
    db.init_app(app)
    with app.app_context():
            from . import models
            db.create_all()
            # Auto-migración: añadir columnas nuevas a tablas existentes
            # (db.create_all() solo crea tablas, no altera las ya existentes)
            inspector = inspect(db.engine)
            existing_cols = [c['name'] for c in inspector.get_columns('companies')]
            if 'trade_name' not in existing_cols:
                db.session.execute(text("ALTER TABLE companies ADD COLUMN trade_name VARCHAR(50)"))
                db.session.commit()
            # Auto-create clients table if it doesn't exist
            db.create_all()
            # Activar WAL mode para concurrencia lectura/escritura
            db.session.execute(text("PRAGMA journal_mode=WAL"))
            # Timeout de 5s si la BD está bloqueada
            db.session.execute(text("PRAGMA busy_timeout=5000"))
            db.session.commit()

    return app


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
    data = request.get_json(silent=True) or {}
    invoice = db.session.query(Invoice).filter(Invoice.id == id, Invoice.company_id == company_id).first()
    if not invoice or not (invoice.verifactu_type in ['F1', 'F2', 'F3']) or invoice.voided:
        return {'error': f'Not exists, not type F1/F2/F3 or voided: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    type = 'R1' if 'vat_id' in data else 'R5'
    return insertInvoice(company_id, type, invoice, 'I')


@app.route('/api/<int:company_id>/invoices/<int:id>/rect2', methods=['POST'])
def create_invoice_rect2(company_id, id):
    invoice = db.session.query(Invoice).filter(Invoice.id == id, Invoice.company_id == company_id).first()
    if not invoice or not (invoice.verifactu_type in ['F1', 'F3']) or invoice.voided:
        return {'error': f'Not exists, not type F1/F3 or voided: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    return insertInvoice(company_id, 'R2', invoice, 'I')


@app.route('/api/<int:company_id>/invoices/<int:id>/rectsust', methods=['POST'])
def create_invoice_rectsust(company_id, id):
    data = request.get_json(silent=True) or {}
    invoice = db.session.query(Invoice).filter(Invoice.id == id, Invoice.company_id == company_id).first()
    if not invoice or not (invoice.verifactu_type in ['F1', 'F2', 'F3', 'R1', 'R5']) or invoice.voided:
        return {'error': f'Not exists, not type F1/F2/F3/R1/R5 or voided: {invoice.get_number_format()}'}, HTTPStatus.BAD_REQUEST

    type = 'R1' if 'vat_id' in data else 'R5'
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
    if not request.remote_addr.startswith(('127.', '192.168.', '10.')):
        return jsonify({'error': 'Access only from local address'}), HTTPStatus.UNAUTHORIZED
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
    if not request.remote_addr.startswith(('127.', '192.168.', '10.')):
        return jsonify({'error': 'Access only from local address'}), HTTPStatus.UNAUTHORIZED
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
        return jsonify(client.to_dict()), HTTPStatus.OK
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
