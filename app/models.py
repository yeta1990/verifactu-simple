#
# Veri*Factu - 2025 Eduardo Ruiz <eruiz@dataclick.es>
# https://github.com/EduardoRuizM/verifactu-api-python
#

import re
import urllib.parse

from decimal import Decimal, ROUND_HALF_UP

from flask import jsonify
from sqlalchemy import text
from http import HTTPStatus
from datetime import datetime

from app import db


# Dos decimales exactos para importes en euros. El redondeo aritmético al alza
# (half-up) es el exigido por la normativa española (Reglamento CE 1103/97 y
# DGT V1919-18). NO usar el redondeo "banker's" (half-even) de Python/IEEE 754.
_CENTS = Decimal('0.01')


def round_money(value):
    """Redondea un importe a 2 decimales con redondeo aritmético al alza (half-up).

    Acepta Decimal, float, int o str (con coma o punto decimal). Devuelve Decimal.
    """
    if isinstance(value, Decimal):
        d = value
    else:
        d = Decimal(str(value).replace(',', '.'))
    return d.quantize(_CENTS, rounding=ROUND_HALF_UP)


class Company(db.Model):
    __tablename__ = 'companies'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(25), unique=True, nullable=False)
    trade_name = db.Column(db.String(50))
    vat_id = db.Column(db.String(25), unique=True, nullable=False)
    address = db.Column(db.String(75))
    postal_code = db.Column(db.String(10))
    city = db.Column(db.String(25))
    state = db.Column(db.String(25))
    country = db.Column(db.String(2), default='ES')
    email = db.Column(db.String(50))
    phone = db.Column(db.String(50))
    contact = db.Column(db.String(50))
    formula = db.Column(db.String(25), default='%y%/%n.8%')
    formula_r = db.Column(db.String(25), default='R-%y%/%n.8%')
    first_num = db.Column(db.Integer, default=1)
    created = db.Column(db.Date, nullable=False, default=db.func.current_date())
    key_file = db.Column(db.String(200))
    cert_file = db.Column(db.String(200))
    next_send = db.Column(db.DateTime)
    test = db.Column(db.Boolean, nullable=False, default=True)

    def __repr__(self):
        return f'<Company {self.name}>'

    def to_dict(self, cert_days=False):
        result = to_dict(self)
        result['created'] = self.created.strftime('%Y-%m-%d')
        # Indicador de certificado configurado (sin exponer la ruta)
        result['has_cert'] = bool(self.cert_file and self.key_file)
        result.pop('key_file', None)
        result.pop('cert_file', None)
        return result

    @staticmethod
    def validate_fields(data, element=None):
        required = ['name', 'vat_id']
        allowed = ['name', 'trade_name', 'vat_id', 'address', 'postal_code', 'city', 'state',
                   'country', 'email', 'phone', 'contact', 'test',
                   'cert_file', 'key_file', 'formula', 'formula_r', 'first_num']
        return validate_fields(data, required, allowed, element)

    def get_url_aeat(self):
        return 'https://prewww2.aeat.es/' if self.test else 'https://www2.agenciatributaria.gob.es/'


class Invoice(db.Model):
    __tablename__ = 'invoices'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='RESTRICT'), nullable=False)
    dt = db.Column(db.DateTime, index=True, nullable=False, default=db.func.current_timestamp())
    num = db.Column(db.Integer, index=True, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    vat_id = db.Column(db.String(25))
    address = db.Column(db.String(75))
    postal_code = db.Column(db.String(10))
    city = db.Column(db.String(25))
    state = db.Column(db.String(25))
    country = db.Column(db.String(2), default='ES')
    tvat = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    bi = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    total = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    email = db.Column(db.String(50))
    ref = db.Column(db.String(25))
    comments = db.Column(db.Text)
    fingerprint = db.Column(db.String(64), index=True)
    verifactu_type = db.Column(db.String(2), index=True)
    verifactu_stype = db.Column(db.String(1))
    verifactu_dt = db.Column(db.TIMESTAMP, index=True)
    verifactu_csv = db.Column(db.Text)
    verifactu_err = db.Column(db.Integer)
    verifactu_err_descr = db.Column(db.Text)
    invoice_ref_id = db.Column(db.Integer, db.ForeignKey('invoices.id', ondelete='RESTRICT'))
    voided = db.Column(db.Boolean, index=True, nullable=False, default=False)

    company = db.relationship('Company', backref='invoices')
    invoice_ref = db.relationship('Invoice', backref=db.backref('invoice_refs', remote_side=[id]))

    def __repr__(self):
        return f'<Invoice {self.id}>'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.num:
            self.get_next_num()

    def to_dict(self):
        result = to_dict(self)
        result['dt'] = self.dt.strftime('%Y-%m-%d %H:%M:%S')
        result['verifactu_dt'] = self.verifactu_dt.strftime('%Y-%m-%d %H:%M:%S') if self.verifactu_dt else None
        # invoice_ref can be a list (backref) or a single Invoice; handle both
        ref = self.invoice_ref
        if hasattr(ref, 'get_number_format'):
            result['invoice_ref'] = ref.get_number_format()
        else:
            result['invoice_ref'] = None
        result['number_format'] = self.get_number_format()
        return result

    def to_lines_dict(self):
        return {**self.to_dict(), 'lines': [line.to_dict() for line in self.invoice_lines]}

    @staticmethod
    def validate_fields(data, element=None):
        required = ['company_id']
        allowed = ['company_id', 'name', 'vat_id', 'address', 'postal_code', 'city', 'state',
                   'vat', 'email', 'ref', 'comments', 'verifactu_type', 'verifactu_stype']
        return validate_fields(data, required, allowed, element)

    def get_next_num(self):
        current_year = datetime.now().year
        filters = [
            Invoice.company_id == self.company_id,
            db.func.strftime('%Y', Invoice.dt) == str(current_year)
        ]

        if getattr(self, 'verifactu_type', None):
            f = 'R' if self.verifactu_type and self.verifactu_type.startswith('R') else 'F'
            filters.append(Invoice.verifactu_type.startswith(f))

        max_num = db.session.query(db.func.max(Invoice.num)).filter(*filters).scalar()
        self.num = (max_num + 1) if max_num else getattr(self.company, 'first_num', 1)

    def get_number_format(self):
        f = 'formula' if not self.verifactu_type or self.verifactu_type[0] == 'F' else 'formula_r'
        formula = getattr(self.company, f, None) or ('%n%' if self.verifactu_type[0] == 'F' else 'R-%n%')
        return re.sub(r'%n(?:\.(\d+))?%',
            lambda m: f'{self.num:0{int(m.group(1))}d}' if m.group(1) else str(self.num),
            formula.replace('%y%', self.dt.strftime('%y')).replace('%Y%', self.dt.strftime('%Y')))

    def get_verifactu_qr(self):
        return self.company.get_url_aeat() + 'wlpl/TIKE-CONT/ValidarQR?nif=' + urllib.parse.quote(self.company.vat_id) +\
               '&numserie=' + urllib.parse.quote(self.get_number_format()) + '&fecha=' +\
               urllib.parse.quote(self.dt.strftime('%d-%m-%Y')) + '&importe=' + urllib.parse.quote(f'{Decimal(str(self.total or 0)):.2f}')

    def get_number(self, value, default=0):
        try:
            return Decimal(str(value).replace(',', '.'))
        except:
            return Decimal(str(default))

    def process_lines(self, data):
        num = 0
        self.tvat = Decimal('0')
        self.bi = Decimal('0')
        self.total = Decimal('0')
        for line in data['lines']:
            ret, status = InvoiceLine.validate_fields(line)
            if status:
                db.session.rollback()
                return ret, status

            num = num + 1
            invoice_line = InvoiceLine(**ret)
            invoice_line.invoice_id = self.id
            invoice_line.num = num
            units = self.get_number(line['units'], 1)
            price = self.get_number(line['price'])
            vat = self.get_number(line['vat'])
            invoice_line.vat = int(vat) if vat else None
            # Base sin redondear (precio × unidades): se conserva la precisión
            # para calcular la cuota. Redondear aquí propagaría el error (43,925
            # -> 43,93 y luego 43,93 × 21% = 9,23, total 53,16 ≠ lo cobrado).
            base_raw = units * price
            # Cuota calculada sobre la base SIN redondear (normativa ES / TEAC
            # 00/02233/2022: no redondear valores intermedios). Así 43,925 × 21%
            # = 9,22425 -> 9,22 y total = 43,93 + 9,22 = 53,15.
            cuota_raw = (base_raw * vat / Decimal('100')) if vat else Decimal('0')
            invoice_line.bi = round_money(base_raw)
            invoice_line.tvat = round_money(cuota_raw)
            invoice_line.total = invoice_line.bi + invoice_line.tvat
            self.bi += invoice_line.bi
            self.tvat += invoice_line.tvat
            self.total += invoice_line.total
            db.session.add(invoice_line)
        db.session.commit()
        return None, None


class InvoiceLine(db.Model):
    __tablename__ = 'invoice_lines'
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id', ondelete='CASCADE'), primary_key=True)
    num = db.Column(db.Integer, primary_key=True, default=1)
    descr = db.Column(db.String(100))
    units = db.Column(db.Numeric(10, 3))
    price = db.Column(db.Numeric(12, 6))
    vat = db.Column(db.Integer)
    clave_regimen = db.Column(db.String(2))
    calificacion = db.Column(db.String(2))
    tvat = db.Column(db.Numeric(14, 2))
    bi = db.Column(db.Numeric(14, 2))
    total = db.Column(db.Numeric(14, 2))

    invoice = db.relationship('Invoice', backref=db.backref('invoice_lines', order_by='InvoiceLine.num'))

    def to_dict(self):
        return to_dict(self)

    @staticmethod
    def validate_fields(data, element=None):
        required = ['descr', 'units', 'price']
        allowed = ['descr', 'units', 'price', 'vat', 'clave_regimen', 'calificacion']
        return validate_fields(data, required, allowed, element)


class Client(db.Model):
    __tablename__ = 'clients'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    vat_id = db.Column(db.String(25))
    address = db.Column(db.String(75))
    postal_code = db.Column(db.String(10))
    city = db.Column(db.String(25))
    state = db.Column(db.String(25))
    country = db.Column(db.String(2), default='ES')
    email = db.Column(db.String(50))
    created = db.Column(db.DateTime, default=db.func.current_timestamp())

    company = db.relationship('Company', backref=db.backref('clients', order_by='Client.name'))

    def __repr__(self):
        return f'<Client {self.name}>'

    def to_dict(self):
        result = to_dict(self)
        if self.created:
            result['created'] = self.created.strftime('%Y-%m-%d %H:%M:%S')
        return result

    @staticmethod
    def validate_fields(data, element=None):
        required = ['name']
        allowed = ['name', 'vat_id', 'address', 'postal_code', 'city', 'state', 'country', 'email']
        return validate_fields(data, required, allowed, element)


def to_dict(obj):
    return {k: (v.to_dict() if hasattr(v, '__tablename__') else v) for k, v in vars(obj).items() if not k.startswith('_')}


def validate_fields(data, required_fields, allowed_fields, element=None):
    if data is None:
        return jsonify({'error': 'No JSON'}), HTTPStatus.UNSUPPORTED_MEDIA_TYPE

    if element:
        for field in required_fields:
            if field in data and not data[field]:
                return jsonify({'error': f'Missing {field}'}), HTTPStatus.BAD_REQUEST
    else:
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing {field}'}), HTTPStatus.BAD_REQUEST

    if element:
        for key, value in data.items():
            if key in allowed_fields and hasattr(element, key):
                setattr(element, key, value)
        return None, None
    else:
        return {key: value for key, value in data.items() if key in allowed_fields}, None
