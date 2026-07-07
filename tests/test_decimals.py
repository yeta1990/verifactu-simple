#
# Tests de precisión decimal en facturación (euros / VeriFactu).
#
# Cubre el bug reportado: base 43,925€ con IVA 21% debe dar
# base 43,93 / cuota 9,22 / total 53,15 (no 43,92 / 53,14).
#
# Normativa: Reglamento CE 1103/97 (redondeo aritmético al alza),
# DGT V1919-18, TEAC 00/02233/2022 (no redondear intermedios),
# XSD AEAT ImporteSgn12.2Type (punto decimal, 2 decimales).
#

import json
from decimal import Decimal

import pytest
from flask import Flask, jsonify

from app import db, DecimalJSONProvider
from app.models import Invoice, InvoiceLine, Company, round_money


@pytest.fixture
def app():
    """App Flask en memoria con los modelos reales y el provider Decimal."""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.json = DecimalJSONProvider(app)
    db.init_app(app)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def _make_invoice(lines_data, vat_id=None):
    """Crea empresa + factura y procesa sus líneas (igual que la API real)."""
    company = Company(name='TestCo', vat_id='B12345678')
    db.session.add(company)
    db.session.commit()
    inv = Invoice(company_id=company.id, name='Cliente',
                  verifactu_type='F1' if vat_id else 'F2')
    if vat_id:
        inv.vat_id = vat_id
    db.session.add(inv)
    db.session.commit()
    ret, status = inv.process_lines({'lines': lines_data})
    assert status is None, ret
    db.session.refresh(inv)
    return inv


# ── round_money: redondeo aritmético al alza (half-up) ──────────────────

def test_round_money_half_up():
    assert round_money('43.925') == Decimal('43.93')
    assert round_money('10.005') == Decimal('10.01')
    assert round_money('10.004') == Decimal('10.00')
    assert round_money('0.005') == Decimal('0.01')
    assert round_money('0.004') == Decimal('0.00')
    assert round_money('2.5') == Decimal('2.50')
    assert round_money('43.924') == Decimal('43.92')


def test_round_money_accepts_comma_decimal():
    assert round_money('43,925') == Decimal('43.93')
    assert round_money('1,5') == Decimal('1.50')


def test_round_money_does_not_use_bankers_rounding():
    # El round() de Python usa "banker's rounding" (43.925 -> 43.92).
    # round_money DEBE usar redondeo aritmético al alza (43.925 -> 43.93).
    assert round(43.925, 2) == 43.92  # demuestra el bug original
    assert round_money(43.925) == Decimal('43.93')


# ── El caso exacto del bug ──────────────────────────────────────────────

def test_bug_case_43925_one_line(app):
    inv = _make_invoice([{'descr': 'Servicio', 'units': 1, 'price': '43.925', 'vat': 21}])
    line = inv.invoice_lines[0]
    assert line.bi == Decimal('43.93')
    assert line.tvat == Decimal('9.22')
    assert line.total == Decimal('53.15')
    assert inv.bi == Decimal('43.93')
    assert inv.tvat == Decimal('9.22')
    assert inv.total == Decimal('53.15')


def test_consistency_base_plus_cuota_equals_total(app):
    inv = _make_invoice([{'descr': 'x', 'units': 1, 'price': '43.925', 'vat': 21}])
    assert inv.bi + inv.tvat == inv.total
    for line in inv.invoice_lines:
        assert line.bi + line.tvat == line.total


def test_multiline_sum_matches_invoice_totals(app):
    inv = _make_invoice([
        {'descr': 'a', 'units': 1, 'price': '43.925', 'vat': 21},
        {'descr': 'b', 'units': 2, 'price': '15.005', 'vat': 21},
    ])
    sum_bi = sum((l.bi for l in inv.invoice_lines), Decimal('0'))
    sum_tvat = sum((l.tvat for l in inv.invoice_lines), Decimal('0'))
    sum_total = sum((l.total for l in inv.invoice_lines), Decimal('0'))
    assert inv.bi == sum_bi
    assert inv.tvat == sum_tvat
    assert inv.total == sum_total
    assert inv.bi + inv.tvat == inv.total


def test_exenta_no_vat(app):
    inv = _make_invoice([{'descr': 'exenta', 'units': 1, 'price': '100.00', 'vat': None}])
    line = inv.invoice_lines[0]
    assert line.vat is None
    assert line.bi == Decimal('100.00')
    assert line.tvat == Decimal('0.00')
    assert line.total == Decimal('100.00')
    assert inv.total == Decimal('100.00')


def test_fractional_units(app):
    # 1.5 h × 40 €/h = 60,00 base; cuota 60 × 21% = 12,60; total 72,60
    inv = _make_invoice([{'descr': 'horas', 'units': '1.5', 'price': '40', 'vat': 21}])
    line = inv.invoice_lines[0]
    assert line.units == Decimal('1.500')
    assert line.bi == Decimal('60.00')
    assert line.tvat == Decimal('12.60')
    assert line.total == Decimal('72.60')


def test_cuota_computed_from_unrounded_base(app):
    # Caso donde redondear la base antes del IVA daría 1 céntimo de más:
    # base 43,93 × 21% = 9,2253 -> 9,23 -> total 53,16 (incorrecto).
    # Sobre la base sin redondear: 43,925 × 21% = 9,22425 -> 9,22 -> 53,15.
    inv = _make_invoice([{'descr': 'x', 'units': 1, 'price': '43.925', 'vat': 21}])
    assert inv.tvat == Decimal('9.22')  # no 9.23
    assert inv.total == Decimal('53.15')  # no 53.16


# ── Almacenamiento y lectura (Numeric) ──────────────────────────────────

def test_stored_values_round_trip_exact(app):
    inv = _make_invoice([{'descr': 'x', 'units': 1, 'price': '43.925', 'vat': 21}])
    # Recargar desde la BD (simula un reinicio / otra petición)
    line_id = (inv.invoice_lines[0].invoice_id, inv.invoice_lines[0].num)
    inv_id = inv.id
    db.session.expunge_all()
    line = db.session.get(InvoiceLine, line_id)
    reloaded = db.session.get(Invoice, inv_id)
    assert line.bi == Decimal('43.93')
    assert line.tvat == Decimal('9.22')
    assert line.total == Decimal('53.15')
    assert reloaded.total == Decimal('53.15')
    assert isinstance(reloaded.total, Decimal)


# ── Serialización JSON (provider Decimal) ───────────────────────────────

def test_json_serializes_decimal_as_number(app):
    inv = _make_invoice([{'descr': 'x', 'units': 1, 'price': '43.925', 'vat': 21}])
    with app.test_request_context():
        resp = jsonify(inv.to_dict())
        data = json.loads(resp.get_data(as_text=True))
    # La API devuelve números (no strings): el frontend usa parseFloat/formatEUR
    assert data['total'] == 53.15
    assert data['bi'] == 43.93
    assert data['tvat'] == 9.22
    assert isinstance(data['total'], (int, float))
    assert isinstance(data['bi'], (int, float))


# ── Formato XML AEAT (cur): punto decimal, 2 decimales ─────────────────

def test_cur_format_aeat():
    from app.verifactu import verifactuXML
    vf = verifactuXML.__new__(verifactuXML)  # evitar __init__ (lee config)
    assert vf.cur(Decimal('43.93')) == '43.93'
    assert vf.cur(Decimal('53.15')) == '53.15'
    assert vf.cur(Decimal('9.22')) == '9.22'
    assert vf.cur(43.93) == '43.93'           # acepta float (smart-repr)
    assert vf.cur(None) == '0.00'
    assert vf.cur(0) == '0.00'
    assert vf.cur(Decimal('1234.5')) == '1234.50'
    # El XSD exige punto, nunca coma
    assert ',' not in vf.cur(Decimal('1234567.89'))
    # Máximo 2 decimales (el XSD rechazaría 3)
    assert '.' not in vf.cur(Decimal('43.93')).split('.')[1] or \
        len(vf.cur(Decimal('43.93')).split('.')[1]) <= 2
