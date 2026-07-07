#
# Migración one-shot: recalcula los importes (bi, tvat, total) de TODAS las
# facturas y líneas históricas usando la nueva lógica Decimal + redondeo
# aritmético al alza (half-up) + cuota sobre la base sin redondear.
#
# Corrige facturas afectadas por el bug de float/banker's-rounding
# (p.ej. base 43,925 -> 43,92/53,14  =>  43,93/9,22/53,15).
#
# NO toca huellas (fingerprint) ni verifactu_dt: la cadena AEAT
# (encadenamiento) se basa sólo en huellas, que se conservan. Tras la
# migración, los importes almacenados quedan correctos para visualización,
# PDF y futuras rectificativas. Las facturas ya enviadas a la AEAT con un
# total distinto podrían requerir una rectificativa si se quiere corregir
# lo que recibió la AEAT (la migración lo indicará en el informe).
#
# Uso:
#   venv/bin/python migrate_decimals.py            # dry-run (sólo informe)
#   venv/bin/python migrate_decimals.py --apply    # aplica los cambios
#
# Se recomienda hacer una copia de verifactu.db antes de --apply.
#

import sys
from decimal import Decimal

from app import create_app, db
from app.models import Invoice, InvoiceLine, round_money


def recompute_line(line):
    """Recalcula bi/tvat/total de una línea desde price × units. Devuelve
    (bi, tvat, total) nuevos."""
    units = Decimal(str(line.units or 0))
    price = Decimal(str(line.price or 0))
    vat = Decimal(str(line.vat)) if line.vat is not None else None
    base_raw = units * price
    cuota_raw = (base_raw * vat / Decimal('100')) if vat else Decimal('0')
    bi = round_money(base_raw)
    tvat = round_money(cuota_raw)
    total = bi + tvat
    return bi, tvat, total


def main():
    apply = '--apply' in sys.argv

    app = create_app()
    with app.app_context():
        invoices = db.session.query(Invoice).order_by(Invoice.id).all()
        lines = db.session.query(InvoiceLine).order_by(
            InvoiceLine.invoice_id, InvoiceLine.num).all()

        changed_lines = 0
        changed_invoices = 0
        sent_with_discrepancy = []

        # 1) Recalcular líneas (guardamos los nuevos valores para sumarlos
        #    en los totales de factura también en modo dry-run).
        new_line_values = {}
        for line in lines:
            old = (Decimal(str(line.bi or 0)), Decimal(str(line.tvat or 0)),
                   Decimal(str(line.total or 0)))
            bi, tvat, total = recompute_line(line)
            new_line_values[(line.invoice_id, line.num)] = (bi, tvat, total)
            if (bi, tvat, total) != old:
                changed_lines += 1
                if apply:
                    line.bi, line.tvat, line.total = bi, tvat, total

        # 2) Recalcular totales de factura sumando los NUEVOS valores de línea
        for inv in invoices:
            inv_lines = [l for l in lines if l.invoice_id == inv.id]
            new_bi = sum((new_line_values[(l.invoice_id, l.num)][0]
                          for l in inv_lines), Decimal('0'))
            new_tvat = sum((new_line_values[(l.invoice_id, l.num)][1]
                            for l in inv_lines), Decimal('0'))
            new_total = sum((new_line_values[(l.invoice_id, l.num)][2]
                             for l in inv_lines), Decimal('0'))
            new_bi = round_money(new_bi)
            new_tvat = round_money(new_tvat)
            new_total = round_money(new_total)
            old_bi = Decimal(str(inv.bi or 0))
            old_tvat = Decimal(str(inv.tvat or 0))
            old_total = Decimal(str(inv.total or 0))
            if (new_bi, new_tvat, new_total) != (old_bi, old_tvat, old_total):
                changed_invoices += 1
                if apply:
                    inv.bi, inv.tvat, inv.total = new_bi, new_tvat, new_total
            # Facturas ya enviadas a la AEAT cuyo total cambia: avisar
            if inv.verifactu_dt is not None and new_total != old_total:
                sent_with_discrepancy.append(
                    (inv.id, inv.get_number_format(), old_total, new_total))

        if apply:
            db.session.commit()
            print(f'Aplicado: {changed_lines} líneas y '
                  f'{changed_invoices} facturas actualizadas.')
        else:
            print(f'[DRY-RUN] Se actualizarían {changed_lines} líneas y '
                  f'{changed_invoices} facturas de {len(invoices)} totales.')
            print('Ejecuta con --apply para guardar los cambios '
                  '(haz copia de verifactu.db antes).')

        if sent_with_discrepancy:
            print('\n⚠  Facturas ENVIADAS a la AEAT cuyo total cambia '
                  '(pueden requerir rectificativa):')
            for inv_id, num, old, new in sent_with_discrepancy:
                print(f'  - Factura #{inv_id} {num}: '
                      f'{old} € -> {new} €')


if __name__ == '__main__':
    main()
