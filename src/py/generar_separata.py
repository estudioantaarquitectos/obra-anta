# -*- coding: utf-8 -*-
"""
==========================================================================
ANTA OBRA - Generador de Portadas y Separatas de Anexos en PDF
Genera una portada institucional en A4 para separar e identificar
claramente los anexos PDF incorporados a las actas e informes.
==========================================================================
"""

import sys
import os
import json
import argparse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generar_separata_pdf(data_or_output=None, output_pdf=None, **kwargs):
    """
    Genera un archivo PDF de una sola página A4 como separata/portada institucional.
    Admite tanto generar_separata_pdf(dict_data, output_pdf) como generar_separata_pdf(output_pdf, tipo=..., titulo=...)
    """
    if isinstance(data_or_output, dict):
        data = dict(data_or_output)
        out_file = output_pdf or kwargs.get('output_pdf')
        if kwargs:
            data.update(kwargs)
    elif isinstance(data_or_output, str):
        out_file = data_or_output
        if isinstance(output_pdf, dict):
            data = dict(output_pdf)
            if kwargs:
                data.update(kwargs)
        else:
            data = dict(kwargs)
            if output_pdf:
                out_file = output_pdf
    else:
        data = dict(kwargs)
        out_file = output_pdf or kwargs.get('output_pdf')

    if not out_file:
        raise ValueError("Non se especificou o ficheiro de saída para a separata PDF")

    os.makedirs(os.path.dirname(os.path.abspath(out_file)), exist_ok=True)

    c = canvas.Canvas(out_file, pagesize=A4)
    width, height = A4

    # Colores corporativos ANTA OBRA / Vivenda Pública de Galicia
    c_primary = colors.HexColor('#1e3a8a')   # Azul oscuro institucional
    c_accent = colors.HexColor('#0284c7')    # Azul cian destacado
    c_dark = colors.HexColor('#0f172a')      # Pizarra oscuro texto
    c_muted = colors.HexColor('#64748b')     # Gris texto secundario
    c_card_bg = colors.HexColor('#f8fafc')   # Fondo suave tarjeta
    c_card_border = colors.HexColor('#cbd5e1') # Borde suave

    # 1. Cabecera institucional oficial idéntica a ejemplo_modificado_informe_mensual.docx
    margin_x = 18 * mm
    top_y = height - 14 * mm

    # Logotipo
    logo_path = data.get('logo_path')
    if not logo_path or not os.path.exists(logo_path):
        for candidate in ['VIPUGAL_LOGO.png', 'LOGO_200px.png', 'LOGO.png', 'public/VIPUGAL_LOGO.png', 'public/LOGO_200px.png']:
            cand_abs = os.path.abspath(candidate)
            if os.path.exists(cand_abs):
                logo_path = cand_abs
                break

    # Columna 1: Logotipo Vipugal (Izquierda)
    if logo_path and os.path.exists(logo_path):
        try:
            c.drawImage(logo_path, margin_x, top_y - 14 * mm, width=46 * mm, height=15 * mm, preserveAspectRatio=True, mask='auto')
        except Exception:
            pass

    styles = getSampleStyleSheet()

    # Columna 2: Proyecto y Expediente (Centro)
    obra_txt = (data.get('obra') or data.get('obraTitulo') or data.get('proxecto') or data.get('proyecto') or 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU').strip()
    exp_txt = (data.get('expediente') or 'AVS 03007 25/05').strip()
    
    center_style = ParagraphStyle(
        'HeaderCenter',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=c_dark,
        alignment=1 # Center
    )
    p_center = Paragraph(f"<b>{obra_txt}</b><br/><font size=\"7.5\" color=\"#64748b\">(EXPTE: {exp_txt})</font>", center_style)
    center_w = 82 * mm
    w_c, h_c = p_center.wrap(center_w, 20 * mm)
    p_center.drawOn(c, margin_x + 48 * mm, top_y - 2 * mm - (h_c / 2))

    # Columna 3: Tipo Documento, Número y Fecha (Derecha)
    tipo_raw = str(data.get('tipo_doc') or data.get('tipo') or 'INFORME MENSUAL').strip().upper()
    if 'SEMANAL' in tipo_raw:
        tipo_doc = 'ACTA SEMANAL' if 'ACTA' in tipo_raw else 'INFORME SEMANAL'
    elif 'ACTA' in tipo_raw:
        tipo_doc = 'ACTA SEMANAL'
    else:
        tipo_doc = tipo_raw or 'INFORME MENSUAL'
    num_txt = str(data.get('numero') or '1')
    fecha_txt = str(data.get('fecha') or '—')

    right_style = ParagraphStyle(
        'HeaderRight',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_dark,
        alignment=2 # Right
    )
    p_right = Paragraph(f"<b>{tipo_doc}</b><br/><font size=\"16\" color=\"#0f172a\"><b>{num_txt}</b></font>&nbsp;&nbsp;&nbsp;<font size=\"8\" color=\"#64748b\">{fecha_txt}</font>", right_style)
    right_w = 42 * mm
    w_r, h_r = p_right.wrap(right_w, 20 * mm)
    p_right.drawOn(c, width - margin_x - right_w, top_y - 2 * mm - (h_r / 2))

    # Línea decorativa azul bajo cabecera (idéntica a la plantilla de Word)
    line_head_y = top_y - 16 * mm
    c.setStrokeColor(colors.HexColor('#4C94D8'))
    c.setLineWidth(1.5)
    c.line(margin_x, line_head_y, width - margin_x, line_head_y)

    # 2. Tarjeta Central (Separata Portada sin datos redundantes)
    card_margin_x = 22 * mm
    card_w = width - (2 * card_margin_x)

    # Título principal de la separata
    title_style = ParagraphStyle(
        'SeparataTitle',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=21,
        textColor=c_dark,
        alignment=0
    )

    titulo_raw = (data.get('titulo') or 'Documento Anexo').strip()
    p_title = Paragraph(titulo_raw, title_style)
    w_title, h_title = p_title.wrap(card_w - 20 * mm, 60 * mm)

    # Subtítulo descriptivo (si existe descripción proporcionada por el usuario)
    subtitulo_raw = (data.get('subtitulo') or '').strip()
    has_sub = bool(subtitulo_raw and subtitulo_raw != titulo_raw)
    h_sub = 0
    p_sub = None
    if has_sub:
        sub_style = ParagraphStyle(
            'SeparataSub',
            fontName='Helvetica-Oblique',
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor('#475569'),
            alignment=0
        )
        p_sub = Paragraph(subtitulo_raw, sub_style)
        w_sub, h_sub = p_sub.wrap(card_w - 20 * mm, 40 * mm)

    # Altura dinámica ajustada al contenido real
    card_h = 11 * mm + 12 * mm + h_title + (h_sub + 12 * mm if has_sub else 10 * mm)
    if card_h < 55 * mm:
        card_h = 55 * mm
    card_y = (height - card_h) / 2 + 15 * mm

    # Fondo tarjeta
    c.setFillColor(c_card_bg)
    c.setStrokeColor(c_card_border)
    c.setLineWidth(1)
    c.roundRect(card_margin_x, card_y, card_w, card_h, 8, fill=1, stroke=1)

    # Banda superior de la tarjeta (azul institucional)
    c.setFillColor(c_primary)
    c.roundRect(card_margin_x, card_y + card_h - 11 * mm, card_w, 11 * mm, 8, fill=1, stroke=0)
    c.rect(card_margin_x, card_y + card_h - 11 * mm, card_w, 5 * mm, fill=1, stroke=0)

    # Etiqueta badge dentro de la tarjeta (Sin 'SEPARATA • ', a petición del usuario)
    tipo = (data.get('tipo') or 'documento_anexo').lower()
    badge_text = "ACTAS DAS VISITAS SEMANAIS" if tipo == 'actas_semanais' else "ANEXO DOCUMENTAL"
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.white)
    c.drawString(card_margin_x + 10 * mm, card_y + card_h - 7.5 * mm, badge_text)

    # Dibujar título
    content_top = card_y + card_h - 20 * mm
    p_title.drawOn(c, card_margin_x + 10 * mm, content_top - h_title)

    # Dibujar subtítulo y línea divisoria elegante si existe
    if has_sub and p_sub:
        sub_y = content_top - h_title - 4 * mm - h_sub
        p_sub.drawOn(c, card_margin_x + 10 * mm, sub_y)
        
        line_y = sub_y - 5 * mm
        c.setStrokeColor(c_card_border)
        c.setLineWidth(0.8)
        c.line(card_margin_x + 10 * mm, line_y, card_margin_x + card_w - 10 * mm, line_y)

    # 3. Pie de página institucional
    footer_y = 18 * mm
    c.setStrokeColor(c_card_border)
    c.setLineWidth(0.5)
    c.line(margin_x, footer_y + 6 * mm, width - margin_x, footer_y + 6 * mm)

    c.setFont("Helvetica", 7.5)
    c.setFillColor(c_muted)
    c.drawString(margin_x, footer_y + 1.5 * mm, "Folla de separata oficial • Incorporada ao expediente de seguimento de obra.")
    c.drawRightString(width - margin_x, footer_y + 1.5 * mm, "Vivenda Pública de Galicia • ESTUDIO ANTA")

    c.showPage()
    c.save()
    return out_file


def main():
    parser = argparse.ArgumentParser(description="Generar separata PDF para anexos")
    parser.add_argument('--data', help="Ruta al archivo JSON o string JSON con los datos")
    parser.add_argument('--output', required=True, help="Ruta de destino del archivo PDF")
    args = parser.parse_args()

    data = {}
    if args.data:
        if os.path.exists(args.data):
            with open(args.data, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            try:
                data = json.loads(args.data)
            except Exception:
                data = {}

    generar_separata_pdf(data, args.output)
    print(json.dumps({"success": True, "pdf": args.output}))


if __name__ == '__main__':
    main()
