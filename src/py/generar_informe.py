# -*- coding: utf-8 -*-
"""
==========================================================================
ANTA OBRA - Generador Oficial de Informes Mensuales (DOCX y PDF)
Rellena directamente la plantilla oficial de Word:
ejemplo_modificado_informe_mensual.docx (o plantilla_informe.docx)
preservando al 100% sus 13 tablas nativas, bordes, alturas de fila y estilos.
==========================================================================
"""

import sys
import os
import re
import json
import base64
import shutil
import tempfile
import argparse
from io import BytesIO

import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import pypdf

# Fechas en gallego / español
MESES_GL = [
    "", "xaneiro", "febreiro", "marzo", "abril", "maio", "xuño",
    "xullo", "agosto", "setembro", "outubro", "novembro", "decembro"
]


def format_date_es(date_str):
    if not date_str:
        return "—"
    try:
        parts = str(date_str).split('-')
        if len(parts) == 3:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            return f"{d:02d}/{m:02d}/{y}"
        return str(date_str)
    except Exception:
        return str(date_str)


def format_date_long_gl(date_str):
    if not date_str:
        return "a data da sinatura"
    try:
        parts = str(date_str).split('-')
        if len(parts) == 3:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            m_nom = MESES_GL[m] if 1 <= m <= 12 else str(m)
            return f"{d} de {m_nom} de {y}"
        return str(date_str)
    except Exception:
        return str(date_str)


def format_currency(val):
    if val is None or val == "":
        return "—"
    try:
        f = float(str(val).replace('€', '').replace('.', '').replace(',', '.').strip())
        s = f"{f:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        return f"{s} €"
    except Exception:
        return f"{val} €" if not str(val).endswith('€') else str(val)


def strip_html_to_text(html_str):
    if not html_str:
        return ""
    text = str(html_str)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    text = re.sub(r'</p>', '\n', text, flags=re.I)
    text = re.sub(r'</li>', '\n', text, flags=re.I)
    text = re.sub(r'<li[^>]*>', '• ', text, flags=re.I)
    text = re.sub(r'<[^>]+>', '', text)
    # Limpiar entidades HTML comunes
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    lines = [l.strip() for l in text.split('\n')]
    # Eliminar líneas vacías consecutivas
    result = []
    for l in lines:
        if l or (result and result[-1]):
            result.append(l)
    return '\n'.join(result).strip()


def safe_read_docx_bytes(path):
    """
    Lee un archivo docx garantizando compatibilidad con archivos bloqueados
    por Microsoft Word en Windows mediante FILE_SHARE_READ.
    """
    try:
        with open(path, 'rb') as f:
            return f.read()
    except PermissionError:
        try:
            import win32file
            handle = win32file.CreateFile(
                path,
                win32file.GENERIC_READ,
                win32file.FILE_SHARE_READ | win32file.FILE_SHARE_WRITE | win32file.FILE_SHARE_DELETE,
                None, win32file.OPEN_EXISTING, win32file.FILE_ATTRIBUTE_NORMAL, None
            )
            data = win32file.ReadFile(handle, 100 * 1024 * 1024)[1]
            win32file.CloseHandle(handle)
            return data
        except Exception:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            for alt in ['plantilla_informe.docx', 'ejemplo_modificado_informe_mensual.docx']:
                cand = os.path.join(base_dir, alt)
                if os.path.exists(cand) and cand != path:
                    try:
                        with open(cand, 'rb') as f:
                            return f.read()
                    except Exception:
                        pass
            raise


# Colores oficiales para semáforos y estados
COLOR_GREEN = (22, 163, 74)   # #16a34a - Verde vibrante
COLOR_AMBER = (217, 119, 6)   # #d97706 - Ámbar / amarillo cálido
COLOR_RED = (220, 38, 38)     # #dc2626 - Rojo vivo


def set_cell_margins(cell, top=60, bottom=60, left=80, right=80):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)


def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex.lstrip("#")}"/>')
    tcPr.append(shd)


def set_cell_clean_text(cell, text, bold=False, italic=False, color_rgb=(30, 41, 59), font_size_pt=10.0, alignment=WD_ALIGN_PARAGRAPH.LEFT):
    """
    Reemplaza el texto de una celda respetando los márgenes, fuentes y alineación.
    Unificado a Arial 10pt para mantener consistencia tipográfica en todo el documento.
    """
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = alignment
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15

    clean = strip_html_to_text(text)
    if not clean:
        clean = "—"

    lines = [l.strip() for l in clean.split('\n') if l.strip()]
    if not lines:
        lines = ["—"]

    for i, line in enumerate(lines):
        if i > 0:
            p = cell.add_paragraph()
            p.alignment = alignment
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
        if line.startswith('•') or line.startswith('-'):
            p.paragraph_format.left_indent = Inches(0.15)
        r = p.add_run(line)
        r.font.name = 'Arial'
        r.font.size = Pt(font_size_pt)
        r.bold = bold
        r.italic = italic
        r.font.color.rgb = RGBColor(*color_rgb)


def replace_para_text(para, text, font_size_pt=10.0, italic=False, bold=False, color_rgb=(30, 41, 59)):
    """
    Reemplaza el texto de un párrafo existente (por ejemplo un 'Lorem ipsum')
    manteniendo la estructura original del documento.
    Separa en párrafos reales con alineación izquierda para evitar justificaciones forzadas
    con espacios artificiales gigantes entre palabras.
    """
    clean = strip_html_to_text(text)
    if not clean:
        clean = "—"

    lines = [l.strip() for l in clean.split('\n') if l.strip()]
    if not lines:
        lines = ["—"]

    # Primer párrafo en el elemento existente
    para.text = ""
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    para.paragraph_format.space_before = Pt(2)
    para.paragraph_format.space_after = Pt(2)
    para.paragraph_format.line_spacing = 1.15
    if lines[0].startswith('•') or lines[0].startswith('-'):
        para.paragraph_format.left_indent = Inches(0.2)

    r = para.add_run(lines[0])
    r.font.name = 'Arial'
    r.font.size = Pt(font_size_pt)
    r.bold = bold
    r.italic = italic
    r.font.color.rgb = RGBColor(*color_rgb)

    # Insertar párrafos reales adyacentes para líneas sucesivas
    curr_p = para
    for line in lines[1:]:
        new_p = OxmlElement('w:p')
        curr_p._element.addnext(new_p)
        curr_p = docx.text.paragraph.Paragraph(new_p, para._parent)
        curr_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        curr_p.paragraph_format.space_before = Pt(1)
        curr_p.paragraph_format.space_after = Pt(2)
        curr_p.paragraph_format.line_spacing = 1.15
        if line.startswith('•') or line.startswith('-'):
            curr_p.paragraph_format.left_indent = Inches(0.2)
        r_n = curr_p.add_run(line)
        r_n.font.name = 'Arial'
        r_n.font.size = Pt(font_size_pt)
        r_n.bold = bold
        r_n.italic = italic
        r_n.font.color.rgb = RGBColor(*color_rgb)


def add_status_run(paragraph, is_checked, color_rgb, label, font_size_pt=10.0):
    """
    Agrega a un párrafo un elemento de estado con casilla [X]/[ ] y círculo coloreado ●
    garantizando que Word y la exportación a PDF muestren el círculo en su color RGB real
    con tipografía idéntica a la plantilla oficial de Word.
    """
    r_chk = paragraph.add_run("☒ " if is_checked else "☐ ")
    r_chk.font.name = 'Segoe UI Symbol'
    r_chk.font.size = Pt(12.0)
    r_chk.bold = False
    r_chk.font.color.rgb = RGBColor(15, 23, 42)

    r_dot = paragraph.add_run("● ")
    r_dot.font.name = 'Arial'
    r_dot.font.size = Pt(16.5)
    r_dot.bold = True
    r_dot.font.color.rgb = RGBColor(*color_rgb)

    r_lbl = paragraph.add_run(label)
    r_lbl.font.name = 'Arial'
    r_lbl.font.size = Pt(font_size_pt)
    r_lbl.bold = False
    r_lbl.font.color.rgb = RGBColor(15, 23, 42)


def check_symbol(is_checked):
    return "☒" if is_checked else "☐"


def generar_informe_desde_plantilla(informe_data, output_docx, output_pdf=None, plantilla_path='ejemplo_modificado_informe_mensual.docx'):
    """
    Genera el informe mensual rellenando las 13 tablas nativas y párrafos
    de la plantilla oficial sin romper bordes ni alturas de fila.
    """
    if not os.path.isabs(plantilla_path):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        cand = os.path.join(base_dir, plantilla_path)
        if os.path.exists(cand):
            plantilla_path = cand
        elif os.path.exists(os.path.join(base_dir, 'ejemplo_modificado_informe_mensual.docx')):
            plantilla_path = os.path.join(base_dir, 'ejemplo_modificado_informe_mensual.docx')
        elif os.path.exists(os.path.join(base_dir, 'plantilla_informe.docx')):
            plantilla_path = os.path.join(base_dir, 'plantilla_informe.docx')

    if not os.path.exists(plantilla_path):
        raise FileNotFoundError(f"Non se atopou a plantilla en: {plantilla_path}")

    # 1. Cargar plantilla en memoria de forma segura
    plantilla_bytes = safe_read_docx_bytes(plantilla_path)
    tmp_plantilla = tempfile.NamedTemporaryFile(delete=False, suffix='.docx').name
    with open(tmp_plantilla, 'wb') as f_out:
        f_out.write(plantilla_bytes)

    doc = docx.Document(tmp_plantilla)

    # 2. Extraer datos del informe
    dx = informe_data.get('datosXerais') or {}
    co = informe_data.get('currentObra') or {}
    obra_titulo = informe_data.get('obraTitulo') or informe_data.get('obra') or dx.get('proxecto') or dx.get('proyecto') or co.get('titulo') or '—'
    expte = informe_data.get('expediente') or dx.get('expediente') or co.get('expediente') or '—'
    data_inf = dx.get('dataInforme') or informe_data.get('fecha') or ''
    mes_inf = dx.get('mesInformado') or str(informe_data.get('numero') or '1')
    report_num = str(informe_data.get('numero') or mes_inf or '1')
    tipo_str = str(informe_data.get('tipo', '')).strip().lower()
    tipo_label = "INFORME SEMANAL" if tipo_str in ['semanal', 'informe_semanal'] else "INFORME MENSUAL"

    # Eliminar cualquier borde inferior de página en secciones (pgBorders)
    for s in doc.sections:
        for b in s._sectPr.xpath('./w:pgBorders'):
            s._sectPr.remove(b)

    # 3. ACTUALIZAR ENCABEZADO OFICIAL DE LA PLANTILLA
    header = doc.sections[0].header
    for p in list(header.paragraphs):
        p._element.getparent().remove(p._element)

    if header.tables:
        t_head = header.tables[0]
        # Celda central: Proyecto y Expediente con formato idéntico a las actas
        c_proj = t_head.cell(0, 1)
        for p in list(c_proj.paragraphs):
            p._element.getparent().remove(p._element)

        p1 = c_proj.add_paragraph()
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(1)
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p1.add_run(obra_titulo)
        r1.font.name = 'Arial'
        r1.font.size = Pt(8.5)
        r1.bold = True

        p2 = c_proj.add_paragraph()
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(0)
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p2.add_run(f"(EXPTE: {expte})")
        r2.font.name = 'Arial'
        r2.font.size = Pt(8.0)
        r2.font.color.rgb = RGBColor(100, 116, 139)

        # Celda título: INFORME MENSUAL / INFORME SEMANAL
        c_title = t_head.cell(0, 2)
        if c_title.paragraphs:
            p = c_title.paragraphs[0]
            p.text = tipo_label
            if p.runs:
                p.runs[0].bold = True
                p.runs[0].font.size = Pt(11)

        # Celda número correlativo
        c_num = t_head.cell(1, 2)
        if c_num.paragraphs:
            p = c_num.paragraphs[0]
            p.text = str(report_num)
            if p.runs:
                p.runs[0].bold = True
                p.runs[0].font.size = Pt(18)

        # Celda fecha
        c_date = t_head.cell(1, 3)
        if c_date.paragraphs:
            c_date.paragraphs[0].text = format_date_es(data_inf)

    # 4. RELLENAR LAS 13 TABLAS NATIVAS DE LA PLANTILLA
    tables = doc.tables

    # =========================================================================
    # TABLA 0: DATOS XERAIS (9 filas x 3 columnas)
    # =========================================================================
    if len(tables) > 0:
        t0 = tables[0]
        set_cell_clean_text(t0.cell(0, 1), obra_titulo, bold=True, font_size_pt=10.0)
        set_cell_clean_text(t0.cell(1, 1), dx.get('emprazamento') or dx.get('situacion') or informe_data.get('situacion') or co.get('situacion') or '—', font_size_pt=10.0)
        set_cell_clean_text(t0.cell(2, 1), expte, bold=True, font_size_pt=10.0)
        set_cell_clean_text(t0.cell(3, 1), dx.get('contratista') or informe_data.get('contratista') or co.get('contratista') or '—', font_size_pt=10.0)

        raw_do = dx.get('direccionObra') or informe_data.get('doClean') or co.get('direccionObra') or '—'
        de_clean = dx.get('direccionExecucion') or dx.get('direccionEjecucion') or informe_data.get('deClean') or co.get('direccionEjecucion') or '—'
        css_clean = dx.get('coordinadorCSS') or informe_data.get('coordinadorCSSStr') or co.get('coordinadorCSS') or '—'
        jo_clean = dx.get('xefeObra') or informe_data.get('jefeObraStr') or co.get('jefeObra') or '—'

        # Separar nombres de Dirección de Obra para evitar duplicar en filas 4 y 5
        do_parts = [p.strip() for p in re.split(r'\s+(?:e|y|&)\s+|;\s*|\n', raw_do, flags=re.IGNORECASE) if p.strip()]
        clean_do = [re.sub(r'\s*\([Dd][Oo]\)\s*$', '', p).strip() for p in do_parts if p.strip() and p.strip() != '—']

        r_do = t0.rows[4]
        r_do2 = t0.rows[5] if len(t0.rows) > 5 else None
        r_de = t0.rows[6] if len(t0.rows) > 6 else None
        r_css = t0.rows[7] if len(t0.rows) > 7 else None
        r_jo = t0.rows[8] if len(t0.rows) > 8 else None

        if len(clean_do) >= 2:
            set_cell_clean_text(r_do.cells[1], clean_do[0], bold=True, color_rgb=(15, 71, 97), font_size_pt=10.0)
            if r_do2:
                set_cell_clean_text(r_do2.cells[1], " / ".join(clean_do[1:]), bold=True, color_rgb=(15, 71, 97), font_size_pt=10.0)
        else:
            set_cell_clean_text(r_do.cells[1], clean_do[0] if clean_do else raw_do, bold=True, color_rgb=(15, 71, 97), font_size_pt=10.0)
            if r_do2:
                t0._element.remove(r_do2._element)

        if r_de:
            set_cell_clean_text(r_de.cells[1], de_clean, bold=True, color_rgb=(2, 132, 199), font_size_pt=10.0)
        if r_css:
            set_cell_clean_text(r_css.cells[1], css_clean, font_size_pt=10.0)
        if r_jo:
            set_cell_clean_text(r_jo.cells[1], jo_clean, font_size_pt=10.0)

    # =========================================================================
    # TABLA 1: RESUMEN EJECUTIVO (6 filas x 2 columnas)
    # =========================================================================
    rx = informe_data.get('resumoExecutivo') or {}
    if len(tables) > 1:
        t1 = tables[1]
        
        # Asegurar borde superior nítido de color 4C94D8 en la tabla de Resumen Ejecutivo (Captura 2)
        tblBorders = t1._element.xpath('w:tblPr/w:tblBorders')
        if tblBorders:
            top_b = tblBorders[0].find(qn('w:top'))
            if top_b is not None:
                top_b.set(qn('w:val'), 'single')
                top_b.set(qn('w:sz'), '6')
                top_b.set(qn('w:color'), '4C94D8')
        for c in t1.rows[0].cells:
            tcPr = c._element.get_or_add_tcPr()
            tcBorders = tcPr.find(qn('w:tcBorders'))
            if tcBorders is None:
                tcBorders = OxmlElement('w:tcBorders')
                tcPr.append(tcBorders)
            top_b = tcBorders.find(qn('w:top'))
            if top_b is None:
                top_b = OxmlElement('w:top')
                tcBorders.append(top_b)
            top_b.set(qn('w:val'), 'single')
            top_b.set(qn('w:sz'), '6')
            top_b.set(qn('w:space'), '0')
            top_b.set(qn('w:color'), '4C94D8')

        # Fila 1: Estado xeral da obra (3 párrafos verticais idénticos á plantilla)
        est_val = rx.get('estadoXeral', 'en_prazo')
        c_status = t1.cell(1, 1)
        c_status.text = ""

        # Párrafo 1: En prazo e controlada
        p1 = c_status.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(1)
        p1.paragraph_format.line_spacing = 1.0
        p1.paragraph_format.left_indent = Inches(0.08)
        add_status_run(p1, est_val == 'en_prazo', COLOR_GREEN, "En prazo e controlada")

        # Párrafo 2: Con desviacións
        p2 = c_status.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(1)
        p2.paragraph_format.line_spacing = 1.0
        p2.paragraph_format.left_indent = Inches(0.08)
        add_status_run(p2, est_val in ('con_desviacions', 'desviacions'), COLOR_AMBER, "Con desviacións")

        # Párrafo 3: Comprometida
        p3 = c_status.add_paragraph()
        p3.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p3.paragraph_format.space_before = Pt(0)
        p3.paragraph_format.space_after = Pt(1)
        p3.paragraph_format.line_spacing = 1.0
        p3.paragraph_format.left_indent = Inches(0.08)
        add_status_run(p3, est_val == 'comprometido', COLOR_RED, "Comprometida")

        # Fila 2: Avance estimado
        av_prev = rx.get('avancePrevisto', 0)
        av_exec = rx.get('avanceExecutado', 0)
        c_av = t1.cell(2, 1)
        c_av.text = ""
        p_av = c_av.paragraphs[0]
        p_av.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_av.paragraph_format.space_before = Pt(0)
        p_av.paragraph_format.space_after = Pt(0)
        p_av.paragraph_format.line_spacing = 1.0
        p_av.paragraph_format.left_indent = Inches(0.08)
        r_av = p_av.add_run(f"{av_exec}% executado vs {av_prev}% previsto")
        r_av.font.name = 'Arial'
        r_av.font.size = Pt(10.0)

        # Helper para rechear celas de texto da Táboa 1 co formato compacto nativo da plantilla
        def set_table1_text(cell, raw_text):
            cell.text = ""
            clean = strip_html_to_text(raw_text)
            lines = [l.strip() for l in clean.split('\n') if l.strip()]
            if not lines:
                lines = ["—"]
            for idx, line in enumerate(lines):
                p = cell.paragraphs[0] if idx == 0 else cell.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(1)
                p.paragraph_format.line_spacing = 1.0
                p.paragraph_format.left_indent = Inches(0.08)
                r = p.add_run(line)
                r.font.name = 'Arial'
                r.font.size = Pt(10.0)
                r.font.color.rgb = RGBColor(15, 23, 42)

        set_table1_text(t1.cell(3, 1), rx.get('principaisFitos') or '—')
        set_table1_text(t1.cell(4, 1), rx.get('principaisIncidencias') or '—')
        set_table1_text(t1.cell(5, 1), rx.get('riscosDetectados') or '—')

    # =========================================================================
    # TABLA 2: PREVISIÓN DE MODIFICADOS - CHECKBOXES (1 fila x 3 columnas)
    # =========================================================================
    cm = informe_data.get('condicionantesModificacions') or {}
    prev_mod = cm.get('previsionModificados') or {}
    sit_mod = prev_mod.get('situacion', 'non_hai')
    if len(tables) > 2:
        t2 = tables[2]
        set_cell_clean_text(t2.cell(0, 0), f"{check_symbol(sit_mod == 'non_hai')}  Non hai", bold=(sit_mod == 'non_hai'), font_size_pt=10.0)
        set_cell_clean_text(t2.cell(0, 1), f"{check_symbol(sit_mod == 'en_estudo')} En estudo", bold=(sit_mod == 'en_estudo'), font_size_pt=10.0)
        set_cell_clean_text(t2.cell(0, 2), f"{check_symbol(sit_mod == 'en_tramitacion')} En tramitación", bold=(sit_mod == 'en_tramitacion'), font_size_pt=10.0)

    # =========================================================================
    # TABLA 3: MODIFICADOS - DESCRICIÓN E IMPACTO (5 filas x 2 columnas)
    # =========================================================================
    if len(tables) > 3:
        t3 = tables[3]
        set_cell_clean_text(t3.cell(1, 1), prev_mod.get('descricionBreve') or 'Non se prevén modificacións de proxecto neste momento.', font_size_pt=10.0)
        set_cell_clean_text(t3.cell(4, 1), prev_mod.get('impactoPrazoCusto') or 'Sen impacto en prazo nin custo.', font_size_pt=10.0)

    # =========================================================================
    # TABLA 4: SEGUEMENTO ORZAMENTARIO - CONTROL ECONÓMICO (5 filas x 2 cols)
    # =========================================================================
    so = informe_data.get('seguimentoOrzamentario') or {}
    ce = so.get('controlEconomico') or {}
    if len(tables) > 4:
        t4 = tables[4]
        set_cell_clean_text(t4.cell(0, 1), format_currency(ce.get('orzamentoAdxudicacion', 894520.00)), bold=True, font_size_pt=10.0)
        set_cell_clean_text(t4.cell(1, 1), format_currency(ce.get('importeCertificadoAcumulado', 402534.00)), bold=True, font_size_pt=10.0)
        pct_ac = ce.get('porcentaxeAcumulada', 45.0)
        try:
            pct_float = float(str(pct_ac).replace('%', '').replace(',', '.').strip())
            pct_str = f"{pct_float:.2f}".replace('.', ',') + " %"
        except Exception:
            pct_str = f"{pct_ac}%" if not str(pct_ac).endswith('%') else str(pct_ac)
        set_cell_clean_text(t4.cell(2, 1), pct_str, bold=True, font_size_pt=10.0)
        set_cell_clean_text(t4.cell(3, 1), format_currency(ce.get('certificacionMes', 44726.00)), bold=True, font_size_pt=10.0)
        set_cell_clean_text(t4.cell(4, 1), str(ce.get('desviacionEstimada', '0.0%')), font_size_pt=10.0)

    # =========================================================================
    # TABLA 5: CONTROL DE PRAZO - CHECKBOXES (1 fila x 3 columnas)
    # =========================================================================
    cp = so.get('controlPrazo') or {}
    sit_prazo = cp.get('situacion', 'en_prazo')
    if len(tables) > 5:
        t5 = tables[5]
        c0 = t5.cell(0, 0); c0.text = ""; p0 = c0.paragraphs[0]; p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p0, sit_prazo == 'en_prazo', COLOR_GREEN, "En prazo", font_size_pt=10.0)
        c1 = t5.cell(0, 1); c1.text = ""; p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p1, sit_prazo == 'atraso_leve', COLOR_AMBER, "Atraso leve", font_size_pt=10.0)
        c2 = t5.cell(0, 2); c2.text = ""; p2 = c2.paragraphs[0]; p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p2, sit_prazo == 'atraso_significativo', COLOR_RED, "Atraso significativo", font_size_pt=10.0)

    # =========================================================================
    # TABLA 6: PRAZO - DETALLES E MEDIDAS (10 filas x 3 columnas)
    # =========================================================================
    if len(tables) > 6:
        t6 = tables[6]
        desv_sem = cp.get('desviacionSemanas', 0)
        desv_txt = f"{desv_sem} semanas" if str(desv_sem).isdigit() or isinstance(desv_sem, (int, float)) else str(desv_sem)
        set_cell_clean_text(t6.cell(1, 2), desv_txt, font_size_pt=10.0)
        set_cell_clean_text(t6.cell(3, 2), cp.get('causas') or 'Sen causas de atraso destacadas.', font_size_pt=10.0)
        set_cell_clean_text(t6.cell(5, 1), cp.get('medidasCorrectoras') or 'Cumprimento estrito do programa de traballos.', font_size_pt=10.0)
        set_cell_clean_text(t6.cell(7, 2), cp.get('previsionReestimacion') or 'Previsión de cumprimento do prazo contratual.', font_size_pt=10.0)
        set_cell_clean_text(t6.cell(9, 2), cp.get('actualizacionPrograma') or 'Programa vixente aprobado na acta de replanteo.', font_size_pt=10.0)

    # =========================================================================
    # TABLA 7: AMPLIACIÓN DE PRAZO (3 filas x 2 columnas)
    # =========================================================================
    if len(tables) > 7:
        t7 = tables[7]
        nec_amp = bool(cp.get('necesariaAmpliacion', False))
        set_cell_clean_text(t7.cell(0, 0), f"{check_symbol(nec_amp)} É necesaria unha ampliación do prazo     {check_symbol(not nec_amp)} Non é necesaria", bold=True, font_size_pt=10.0)
        set_cell_clean_text(t7.cell(2, 1), cp.get('xustificacionAmpliacion') or 'Non procede ampliación de prazo no período informado.', font_size_pt=10.0)

    # =========================================================================
    # TABLA 8: SEGURIDADE E SAÚDE - SITUACIÓN XERAL (1 fila x 2 columnas)
    # =========================================================================
    ss = informe_data.get('seguridadeSaude') or {}
    sit_ss = ss.get('situacionXeral', 'correcta')
    if len(tables) > 8:
        t8 = tables[8]
        c0 = t8.cell(0, 0); c0.text = ""; p0 = c0.paragraphs[0]; p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p0, sit_ss == 'correcta', COLOR_GREEN, "Correcta", font_size_pt=10.0)
        c1 = t8.cell(0, 1); c1.text = ""; p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p1, sit_ss == 'con_incidencias', COLOR_AMBER, "Con incidencias", font_size_pt=10.0)

    # =========================================================================
    # TABLA 9: DILIXENCIA DE FIRMAS (Un cuadro independiente por cada DO y DEM)
    # =========================================================================
    if len(tables) > 9:
        t9 = tables[9]
        agentes_list = informe_data.get('agentes') or []

        def get_firmante_info(nombre_clean, rol_default, empresa_default, colegiado_default):
            norm = nombre_clean.lower()
            for ag in agentes_list:
                ag_nom = (ag.get('nombre') or ag.get('nome') or '').lower()
                if ag_nom and (ag_nom in norm or norm in ag_nom):
                    cargo = ag.get('cargoHabitual') or ag.get('cargo') or rol_default
                    ent = ag.get('entidad') or ag.get('empresa') or empresa_default
                    col = ag.get('colegiado') or colegiado_default
                    emp_str = f"{ent} ({col})" if col and col not in ent else ent
                    return ag.get('nombre') or nombre_clean, cargo, emp_str

            col_str = f" ({colegiado_default})" if colegiado_default else ""
            return nombre_clean, rol_default, f"{empresa_default}{col_str}"

        firmantes_inf = []
        for do_name in clean_do:
            f_nom, f_rol, f_emp = get_firmante_info(do_name, "Dirección Facultativa de Obra (DO)", "Dirección Facultativa", "")
            firmantes_inf.append((f_nom, f_rol, f_emp))

        clean_de = re.sub(r'\s*\([Dd][Ee][Mm]\)\s*$', '', de_clean).strip() if de_clean and de_clean != '—' else ""
        if clean_de:
            f_nom, f_rol, f_emp = get_firmante_info(clean_de, "Dirección de Execución Material (DEM)", "Dirección de Execución", "")
            firmantes_inf.append((f_nom, f_rol, f_emp))

        # Ajustar número de filas de la tabla de firmas
        while len(t9.rows) < len(firmantes_inf):
            t9.add_row()
        while len(t9.rows) > len(firmantes_inf):
            t9._element.remove(t9.rows[-1]._element)

        for f_idx, (f_nom, f_rol, f_emp) in enumerate(firmantes_inf):
            r = t9.rows[f_idx]
            # cantSplit: Garantiza que el cuadro de firma nunca se corte entre páginas
            trPr = r._tr.get_or_add_trPr()
            if not trPr.xpath('w:cantSplit'):
                trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

            c0 = r.cells[0]
            c1 = r.cells[1]
            set_cell_shading(c0, "F8FAFC")
            set_cell_margins(c0, 45, 45, 60, 60)
            set_cell_shading(c1, "F8FAFC")
            set_cell_margins(c1, 45, 45, 60, 60)

            while len(c0.paragraphs) < 3:
                c0.add_paragraph()
            while len(c0.paragraphs) > 3:
                p_extra = c0.paragraphs[-1]
                p_extra._element.getparent().remove(p_extra._element)

            p0 = c0.paragraphs[0]; p0.text = ""; p0.paragraph_format.space_before = Pt(0); p0.paragraph_format.space_after = Pt(1)
            r0 = p0.add_run(f_nom); r0.bold = True; r0.font.size = Pt(10.0); r0.font.color.rgb = RGBColor(15, 23, 42)

            p1 = c0.paragraphs[1]; p1.text = ""; p1.paragraph_format.space_before = Pt(0); p1.paragraph_format.space_after = Pt(1)
            r1 = p1.add_run(f_rol); r1.font.size = Pt(8.5); r1.font.color.rgb = RGBColor(71, 85, 105)

            p2 = c0.paragraphs[2]; p2.text = ""; p2.paragraph_format.space_before = Pt(0); p2.paragraph_format.space_after = Pt(0)
            r2 = p2.add_run(f_emp); r2.font.size = Pt(8.5); r2.font.color.rgb = RGBColor(100, 116, 139)

            p_asdo = c1.paragraphs[0]; p_asdo.text = ""; p_asdo.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p_asdo.paragraph_format.space_before = Pt(10); p_asdo.paragraph_format.space_after = Pt(0)
            r_asdo = p_asdo.add_run("Asdo.: ____________________________")
            r_asdo.font.size = Pt(8.0); r_asdo.font.color.rgb = RGBColor(148, 163, 184)

    # =========================================================================
    # TABLA 10: REPORTAXE FOTOGRÁFICO (Rejilla de fotos 2x2 con escala proporcional)
    # =========================================================================
    fotos = informe_data.get('reportaxeFotografica') or informe_data.get('fotos') or []
    if len(tables) > 10:
        t10 = tables[10]
        if fotos:
            from PIL import Image

            # Vaciar primera fila existente para rellenarla
            for r_idx in range(len(t10.rows) - 1, 0, -1):
                t10._element.remove(t10.rows[r_idx]._element)

            # Insertar fotos por parejas (2 columnas)
            for i in range(0, len(fotos), 2):
                if i == 0:
                    r = t10.rows[0]
                else:
                    r = t10.add_row()

                # Impedir que la fila se rompa entre dos páginas
                trPr = r._element.get_or_add_trPr()
                trPr.append(parse_xml(r'<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))

                # Foto izquierda (i)
                f_left = fotos[i]
                c_left = r.cells[0]
                c_left.text = ""
                p_l = c_left.paragraphs[0]
                p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_l.paragraph_format.space_before = Pt(3)
                p_l.paragraph_format.space_after = Pt(2)

                img_data = f_left.get('url') or f_left.get('data') or f_left.get('dataUrl')
                if img_data and ';base64,' in img_data:
                    try:
                        _, b64 = img_data.split(';base64,', 1)
                        img_bytes = base64.b64decode(b64)
                        with Image.open(BytesIO(img_bytes)) as im_l:
                            w_px_l, h_px_l = im_l.size
                        aspect_l = max(0.1, w_px_l / max(1, h_px_l))

                        max_w = 3.2
                        max_h = 2.45
                        w_in_l = max_w
                        h_in_l = w_in_l / aspect_l
                        if h_in_l > max_h:
                            h_in_l = max_h
                            w_in_l = h_in_l * aspect_l

                        p_l.add_run().add_picture(BytesIO(img_bytes), width=Inches(w_in_l), height=Inches(h_in_l))
                    except Exception as ie:
                        sys.stderr.write(f"Aviso decodificando foto {i}: {ie}\n")

                p_cap = c_left.add_paragraph()
                p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_cap.paragraph_format.space_before = Pt(2)
                p_cap.paragraph_format.space_after = Pt(4)
                f_date = format_date_es(f_left.get('data') or f_left.get('fecha') or data_inf)
                f_desc = (f_left.get('descripcion') or f_left.get('desc') or '').strip()
                r_num = p_cap.add_run(f"Foto {i + 1} [{f_date}] ")
                r_num.bold = True
                r_num.font.size = Pt(8.5)
                r_num.font.color.rgb = RGBColor(15, 71, 97)
                if f_desc:
                    r_desc = p_cap.add_run(f_desc)
                    r_desc.font.size = Pt(8.0)
                    r_desc.font.color.rgb = RGBColor(71, 85, 105)

                # Foto derecha (i + 1) si existe
                c_right = r.cells[1]
                c_right.text = ""
                if i + 1 < len(fotos):
                    f_right = fotos[i + 1]
                    p_r = c_right.paragraphs[0]
                    p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_r.paragraph_format.space_before = Pt(3)
                    p_r.paragraph_format.space_after = Pt(2)

                    img_r = f_right.get('url') or f_right.get('data') or f_right.get('dataUrl')
                    if img_r and ';base64,' in img_r:
                        try:
                            _, b64_r = img_r.split(';base64,', 1)
                            img_r_bytes = base64.b64decode(b64_r)
                            with Image.open(BytesIO(img_r_bytes)) as im_r:
                                w_px_r, h_px_r = im_r.size
                            aspect_r = max(0.1, w_px_r / max(1, h_px_r))

                            max_w = 3.2
                            max_h = 2.45
                            w_in_r = max_w
                            h_in_r = w_in_r / aspect_r
                            if h_in_r > max_h:
                                h_in_r = max_h
                                w_in_r = h_in_r * aspect_r

                            p_r.add_run().add_picture(BytesIO(img_r_bytes), width=Inches(w_in_r), height=Inches(h_in_r))
                        except Exception as ie_r:
                            sys.stderr.write(f"Aviso decodificando foto {i+1}: {ie_r}\n")

                    p_cap_r = c_right.add_paragraph()
                    p_cap_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_cap_r.paragraph_format.space_before = Pt(2)
                    p_cap_r.paragraph_format.space_after = Pt(4)
                    f_date_r = format_date_es(f_right.get('data') or f_right.get('fecha') or data_inf)
                    f_desc_r = (f_right.get('descripcion') or f_right.get('desc') or '').strip()
                    r_num_r = p_cap_r.add_run(f"Foto {i + 2} [{f_date_r}] ")
                    r_num_r.bold = True
                    r_num_r.font.size = Pt(8.5)
                    r_num_r.font.color.rgb = RGBColor(15, 71, 97)
                    if f_desc_r:
                        r_desc_r = p_cap_r.add_run(f_desc_r)
                        r_desc_r.font.size = Pt(8.0)
                        r_desc_r.font.color.rgb = RGBColor(71, 85, 105)
        else:
            set_cell_clean_text(t10.cell(0, 0), "Non se incorporaron fotografías neste período informado.", font_size_pt=10.0)
            set_cell_clean_text(t10.cell(0, 1), "—", font_size_pt=10.0)

    # =========================================================================
    # TABLA 11: CONCLUSIÓN DA DO - CHECKBOXES (1 fila x 3 columnas)
    # =========================================================================
    concl = informe_data.get('conclusion') or {}
    est_concl = concl.get('estado', 'favorable')
    if len(tables) > 11:
        t11 = tables[11]
        c0 = t11.cell(0, 0); c0.text = ""; p0 = c0.paragraphs[0]; p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p0, est_concl == 'favorable', COLOR_GREEN, "Favorable", font_size_pt=10.0)
        c1 = t11.cell(0, 1); c1.text = ""; p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p1, est_concl == 'con_atencion', COLOR_AMBER, "Con atención requirida", font_size_pt=10.0)
        c2 = t11.cell(0, 2); c2.text = ""; p2 = c2.paragraphs[0]; p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_status_run(p2, est_concl == 'comprometido', COLOR_RED, "Comprometida", font_size_pt=10.0)

    # =========================================================================
    # TABLA 12: COMENTARIOS FINAIS DA CONCLUSIÓN (1 fila x 1 columna)
    # =========================================================================
    if len(tables) > 12:
        t12 = tables[12]
        coments = concl.get('comentariosFinais') or 'A dirección de obra valora favorablemente a evolución dos traballos mantendo a programación prevista.'
        set_cell_clean_text(t12.cell(0, 0), coments, font_size_pt=10.0)

    # 5. RELLENAR LOS PÁRRAFOS NATIVOS DE CONTENIDO ENTRE TABLAS
    te = informe_data.get('traballosExecutados') or {}
    cc = informe_data.get('controlCalidade') or {}
    outr = informe_data.get('outros') or {}

    paras = doc.paragraphs
    # Localizar y sustituir los párrafos de texto (Placeholders)
    for i, p in enumerate(paras):
        p_text = p.text.strip()
        prev_p = paras[i - 1].text.strip() if i > 0 else ""

        # Traballos executados
        if "TRABALLOS EXECUTADOS NO MES" in prev_p:
            replace_para_text(p, te.get('executadosMes'))
        elif "TRABALLOS EN CURSO" in prev_p:
            replace_para_text(p, te.get('enCurso'))
        elif "TRABALLOS PREVISTOS NO PRÓXIMO MES" in prev_p:
            replace_para_text(p, te.get('previstosProximoMes'))
        elif "CONTROL XEOMÉTRICO E CUALITATIVO" in prev_p:
            replace_para_text(p, te.get('controlXeometricoCualitativo'))
        elif "COORDINACIÓN CON ORGANISMOS" in prev_p:
            replace_para_text(p, te.get('coordinacionOrganismos'))
        elif "OBRA NON ACREDITADA" in prev_p:
            replace_para_text(p, te.get('obraNonAcreditada') or 'Non hai obra non acreditada.')

        # Condicionantes e modificacións
        elif "CIRCUNSTANCIAS SOBREVIDAS" in prev_p:
            replace_para_text(p, cm.get('circunstanciasSobrevidas') or 'Non se rexistraron circunstancias sobrevidas salientables.')
        elif "Desfases nas medicións" in prev_p:
            replace_para_text(p, cm.get('desfasesMedicions') or 'Non se aprecian desfases de medición significativos.')

        # Control de calidade
        elif "Resumo de ensaios e informes do mes" in prev_p:
            replace_para_text(p, cc.get('resumoEnsaios') or 'Ensaios conformes co prego e normativa vixente.')
        elif "Incidencias e solución proposta para materiais" in prev_p:
            replace_para_text(p, cc.get('incidenciasSolucions') or 'Non se rexistraron incidencias de materiais deficientes.')

        # Seguridade e saúde incidencias
        elif "Incidencias relevantes (en base a documentación CSS)" in prev_p:
            replace_para_text(p, ss.get('incidenciasRelevantes') or 'Sen incidencias salientables de seguridade e saúde laborais.')

        # Dilixencia de firmas fórmula
        elif "DILIXENCIA DE FIRMAS" in prev_p:
            fecha_larga = format_date_long_gl(data_inf)
            replace_para_text(p, f"En Ferrol, a {fecha_larga}. Para que así conste e aos efectos oportunos, asinan a presente dilixencia:", italic=True)

        # Outros
        elif "MODIFICACIÓNS DAS CONDICIÓNS CONTRACTUAIS" in prev_p:
            replace_para_text(p, outr.get('modificacionCondicions') or 'Non se produciron modificacións das condicións contractuais.')
        elif "Certificado de terminación de fase" in prev_p:
            replace_para_text(p, outr.get('certificadoTerminacionFase') or 'Non aplica neste período informado.')

    # 5.1 ELIMINAR CUALQUIER PÁRRAFO RESIDUAL 'Lorem ipsum' DE LA PLANTILLA
    for p in list(doc.paragraphs):
        if "Lorem ipsum" in p.text:
            p._element.getparent().remove(p._element)

    # 5.2 REUBICAR DILIXENCIA DE FIRMAS ENTRE O PUNTO 10 (CONCLUSIÓN) E O PUNTO 11 (ANEXOS)
    p_dil = None
    p_form = None
    p_anx = None
    for i, p in enumerate(doc.paragraphs):
        p_up = p.text.strip().upper()
        if "DILIXENCIA DE FIRMAS" in p_up and p_dil is None:
            p_dil = p
            if i + 1 < len(doc.paragraphs):
                p_form = doc.paragraphs[i + 1]
        elif "ANEXOS DOCUMENTAIS DO INFORME" in p_up and p_anx is None:
            p_anx = p

    if p_dil is not None and p_anx is not None:
        p_anx._element.addprevious(p_dil._element)
        if p_form is not None:
            p_anx._element.addprevious(p_form._element)
        if len(tables) > 9:
            p_anx._element.addprevious(tables[9]._element)

    # 6. SECCIÓN 11: ANEXOS DOCUMENTAIS DO INFORME
    # Extraer actas semanales adjuntadas en PDF (apartado propio) y otros documentos anexos
    actas_pdf_raw = informe_data.get('actasPdf') or informe_data.get('actas_pdf') or informe_data.get('actasAnexas') or []
    if not isinstance(actas_pdf_raw, list):
        actas_pdf_raw = []

    actas_pdf = []
    for a in actas_pdf_raw:
        if isinstance(a, dict):
            actas_pdf.append(a)
        elif isinstance(a, str):
            actas_pdf.append({'nombre': f"Acta de Visita {a}", 'numero': a, 'fecha': ''})

    anexos_raw = []
    if isinstance(informe_data.get('anexosPdf'), list):
        anexos_raw = informe_data.get('anexosPdf')
    elif isinstance(informe_data.get('anexos_pdf'), list):
        anexos_raw = informe_data.get('anexos_pdf')
    elif isinstance(informe_data.get('anexos'), list):
        anexos_raw = informe_data.get('anexos')

    anexos = []
    for d in anexos_raw:
        if isinstance(d, dict):
            anexos.append(d)
        elif isinstance(d, str):
            anexos.append({'nombre': 'Documento anexo', 'url': d})

    outros_anexos_txt = ''
    if isinstance(informe_data.get('anexos'), dict):
        outros_anexos_txt = (informe_data.get('anexos') or {}).get('outrosAnexos', '').strip()

    # Buscar el encabezado de ANEXOS DOCUMENTAIS DO INFORME para detallar la lista
    p_anx_header = None
    for p in paras:
        if "ANEXOS DOCUMENTAIS DO INFORME" in p.text:
            p_anx_header = p
            break

    if p_anx_header:
        # Apartado 11.1: Actas de visitas semanais achegadas en PDF
        if actas_pdf:
            p_actas_title = doc.add_paragraph()
            p_actas_title.paragraph_format.space_before = Pt(6)
            p_actas_title.paragraph_format.space_after = Pt(2)
            r_at = p_actas_title.add_run(f"Actas de visitas semanais achegadas en PDF ({len(actas_pdf)}):")
            r_at.bold = True
            r_at.font.size = Pt(9.5)
            r_at.font.color.rgb = RGBColor(15, 71, 97)

            for a_idx, a_item in enumerate(actas_pdf):
                p_item = doc.add_paragraph()
                p_item.paragraph_format.space_after = Pt(1)
                p_item.paragraph_format.left_indent = Inches(0.25)
                a_nom = a_item.get('nombre') or (f"Acta nº {a_item.get('numero')}" if a_item.get('numero') else f"Acta de Visita {a_idx + 1}")
                a_data = format_date_es(a_item.get('fecha')) if a_item.get('fecha') else ''
                data_str = f" (data da visita: {a_data})" if a_data else ""
                r_it = p_item.add_run(f"• {a_nom}{data_str}")
                r_it.bold = True
                r_it.font.size = Pt(9)
                r_it.font.color.rgb = RGBColor(15, 71, 97)

                a_desc = (a_item.get('descripcion') or '').strip()
                if a_desc:
                    p_adesc = doc.add_paragraph()
                    p_adesc.paragraph_format.space_after = Pt(1)
                    p_adesc.paragraph_format.left_indent = Inches(0.4)
                    r_desc = p_adesc.add_run(f"Descrición: {a_desc}")
                    r_desc.font.size = Pt(8.5)
                    r_desc.font.italic = True
                    r_desc.font.color.rgb = RGBColor(71, 85, 105)

                a_arch = a_item.get('archivo') or ''
                if a_arch and a_arch != a_nom:
                    p_aarch = doc.add_paragraph()
                    p_aarch.paragraph_format.space_after = Pt(2)
                    p_aarch.paragraph_format.left_indent = Inches(0.4)
                    r_arch = p_aarch.add_run(f"Arquivo orixinal: {a_arch}")
                    r_arch.font.size = Pt(8)
                    r_arch.font.color.rgb = RGBColor(100, 116, 139)

        # Apartado 11.2: Outros documentos e informes PDF anexos
        if anexos:
            p_doc_title = doc.add_paragraph()
            p_doc_title.paragraph_format.space_before = Pt(6)
            p_doc_title.paragraph_format.space_after = Pt(2)
            r_dt = p_doc_title.add_run(f"Outros documentos e informes PDF anexos ({len(anexos)}):")
            r_dt.bold = True
            r_dt.font.size = Pt(9.5)
            r_dt.font.color.rgb = RGBColor(15, 71, 97)

            for d_idx, d_item in enumerate(anexos):
                p_d = doc.add_paragraph()
                p_d.paragraph_format.space_after = Pt(2)
                p_d.paragraph_format.left_indent = Inches(0.25)

                d_titulo = d_item.get('nombre') or d_item.get('titulo') or f"Documento Anexo {d_idx + 1}"
                d_desc = (d_item.get('descripcion') or '').strip()
                d_archivo = d_item.get('archivo') or ''

                r_nom = p_d.add_run(f"• {d_titulo}")
                r_nom.bold = True
                r_nom.font.size = Pt(9)
                r_nom.font.color.rgb = RGBColor(15, 71, 97)

                if d_desc:
                    p_desc = doc.add_paragraph()
                    p_desc.paragraph_format.space_after = Pt(1)
                    p_desc.paragraph_format.left_indent = Inches(0.4)
                    r_desc = p_desc.add_run(f"Descrición: {d_desc}")
                    r_desc.font.size = Pt(8.5)
                    r_desc.font.italic = True
                    r_desc.font.color.rgb = RGBColor(71, 85, 105)

                if d_archivo and d_archivo != d_titulo:
                    p_arch = doc.add_paragraph()
                    p_arch.paragraph_format.space_after = Pt(2)
                    p_arch.paragraph_format.left_indent = Inches(0.4)
                    r_arch = p_arch.add_run(f"Arquivo orixinal: {d_archivo}")
                    r_arch.font.size = Pt(8)
                    r_arch.font.color.rgb = RGBColor(100, 116, 139)

        if outros_anexos_txt:
            p_ot = doc.add_paragraph()
            p_ot.paragraph_format.space_before = Pt(4)
            p_ot.paragraph_format.space_after = Pt(2)
            r_ot = p_ot.add_run(f"Observacións sobre anexos: {outros_anexos_txt}")
            r_ot.font.size = Pt(8.5)
            r_ot.font.italic = True

        if not actas_pdf and not anexos and not outros_anexos_txt:
            p_no = doc.add_paragraph('Non se incorporan documentos anexos adicionais neste período.')
            p_no.paragraph_format.space_before = Pt(4)

    # 7. GUARDAR DOCUMENTO DOCX FINAL
    os.makedirs(os.path.dirname(os.path.abspath(output_docx)), exist_ok=True)
    doc.save(output_docx)

    # Eliminar archivo temporal de la plantilla
    try:
        os.remove(tmp_plantilla)
    except Exception:
        pass

    # 8. EXPORTACIÓN A PDF OFICIAL Y FUSIÓN DE SEPARATAS Y ANEXOS
    pdf_result = None
    if output_pdf:
        os.makedirs(os.path.dirname(os.path.abspath(output_pdf)), exist_ok=True)
        pdf_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name

        # Conversión mediante Word COM
        try:
            import win32com.client
            import pythoncom
            pythoncom.CoInitialize()
            word = win32com.client.DispatchEx('Word.Application')
            word.Visible = False
            word.DisplayAlerts = False
            in_docx = os.path.abspath(output_docx)
            w_doc = word.Documents.Open(in_docx, ReadOnly=True)
            w_doc.SaveAs(os.path.abspath(pdf_temp), FileFormat=17)
            w_doc.Close(False)
            word.Quit()
            pythoncom.CoUninitialize()
            pdf_result = os.path.abspath(output_pdf)
            shutil.copyfile(pdf_temp, pdf_result)
            try:
                os.remove(pdf_temp)
            except Exception:
                pass
        except Exception as we:
            sys.stderr.write(f"Word COM PDF fallo en informe mensual: {we}\n")
            try:
                from docx2pdf import convert
                convert(output_docx, output_pdf)
                pdf_result = os.path.abspath(output_pdf)
            except Exception as d2p_err:
                sys.stderr.write(f"docx2pdf fallo: {d2p_err}\n")

            if not pdf_result or not os.path.exists(pdf_result):
                try:
                    import subprocess
                    out_dir = os.path.dirname(os.path.abspath(output_pdf))
                    base_name = os.path.splitext(os.path.basename(output_docx))[0]
                    expected_pdf = os.path.join(out_dir, f"{base_name}.pdf")
                    cmd = ['soffice', '--headless', '--convert-to', 'pdf', '--outdir', out_dir, os.path.abspath(output_docx)]
                    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    if os.path.exists(expected_pdf):
                        if expected_pdf != os.path.abspath(output_pdf):
                            shutil.move(expected_pdf, output_pdf)
                        pdf_result = os.path.abspath(output_pdf)
                except Exception as lo_err:
                    sys.stderr.write(f"LibreOffice headless fallo: {lo_err}\n")

        # FUSIÓN CON SEPARATAS PARA ACTAS Y ANEXOS PDF
        if (anexos or actas_pdf) and pdf_result and os.path.exists(pdf_result):
            try:
                base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
                sys.path.insert(0, os.path.dirname(__file__))
                try:
                    from generar_separata import generar_separata_pdf
                except ImportError:
                    from src.py.generar_separata import generar_separata_pdf

                writer = pypdf.PdfWriter()
                writer.append(pdf_result)
                temp_pdf_files = []

                # Fusión de actas semanales adjuntadas en PDF (con separata propia de actas)
                for a_idx, a_item in enumerate(actas_pdf):
                    if not isinstance(a_item, dict):
                        continue

                    a_nom = a_item.get('nombre') or (f"ACTA DE VISITA Nº {a_item.get('numero')}" if a_item.get('numero') else f"ACTA DE VISITA {a_idx + 1}")
                    a_fecha = a_item.get('fecha', '')
                    a_desc = (a_item.get('descripcion') or '').strip()
                    subtitulo = f"Acta semanal da dirección facultativa correspondente á visita do {format_date_es(a_fecha)}." if a_fecha else (a_desc or "Acta de visita semanal da dirección facultativa.")

                    sep_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                    temp_pdf_files.append(sep_path)

                    generar_separata_pdf(
                        sep_path,
                        tipo="actas_semanais",
                        titulo=a_nom.upper(),
                        subtitulo=subtitulo,
                        obra=obra_titulo,
                        expediente=expte,
                        tipo_doc=tipo_label,
                        numero=report_num,
                        fecha=format_date_es(data_inf)
                    )
                    writer.append(sep_path)

                    # Obtener PDF del acta adjuntado
                    a_pdf = a_item.get('pdfData') or a_item.get('url') or a_item.get('dataUrl') or a_item.get('data')
                    if a_pdf:
                        tmp_a = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                        if isinstance(a_pdf, str) and ';base64,' in a_pdf:
                            _, b64 = a_pdf.split(';base64,', 1)
                            tmp_a.write(base64.b64decode(b64))
                        elif isinstance(a_pdf, str) and os.path.exists(a_pdf):
                            with open(a_pdf, 'rb') as f_in:
                                tmp_a.write(f_in.read())
                        tmp_a.close()
                        temp_pdf_files.append(tmp_a.name)
                        writer.append(tmp_a.name)

                # Fusión de documentos anexos en PDF
                for anexo in anexos:
                    if not isinstance(anexo, dict):
                        continue

                    anx_nom = anexo.get('nombre') or anexo.get('titulo') or 'DOCUMENTO'
                    anx_desc = (anexo.get('descripcion') or '').strip()

                    sep_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                    temp_pdf_files.append(sep_path)

                    generar_separata_pdf(
                        sep_path,
                        tipo="documento_anexo",
                        titulo=f"ANEXO: {anx_nom.upper()}",
                        subtitulo=anx_desc or f"Documentación complementaria incorporada ao {tipo_label.lower()}.",
                        obra=obra_titulo,
                        expediente=expte,
                        tipo_doc=tipo_label,
                        numero=report_num,
                        fecha=format_date_es(data_inf)
                    )
                    writer.append(sep_path)

                    anexo_data = anexo.get('dataUrl') or anexo.get('url') or anexo.get('data')
                    if isinstance(anexo_data, str) and ';base64,' in anexo_data:
                        _, b64 = anexo_data.split(';base64,', 1)
                        tmp_doc = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                        tmp_doc.write(base64.b64decode(b64))
                        tmp_doc.close()
                        temp_pdf_files.append(tmp_doc.name)
                        writer.append(tmp_doc.name)
                    elif isinstance(anexo_data, str) and os.path.exists(anexo_data):
                        writer.append(anexo_data)

                # Guardar PDF combinado final
                tmp_merged = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                writer.write(tmp_merged)
                writer.close()
                shutil.copyfile(tmp_merged, pdf_result)
                try:
                    os.remove(tmp_merged)
                except Exception:
                    pass
                for tf in temp_pdf_files:
                    try:
                        os.remove(tf)
                    except Exception:
                        pass
            except Exception as pe:
                sys.stderr.write(f"Erro adjuntando anexos ao informe mensual: {pe}\n")

    return {
        "success": True,
        "docx": output_docx,
        "pdf": pdf_result
    }


def main():
    parser = argparse.ArgumentParser(description="Generar informe mensual DOCX y PDF a partir de plantilla")
    parser.add_argument('--data', help="Ruta al archivo JSON con los datos del informe")
    parser.add_argument('--json-str', help="String JSON con los datos del informe")
    parser.add_argument('--output-docx', help="Ruta de destino del archivo .docx")
    parser.add_argument('--output-pdf', help="Ruta de destino del archivo .pdf")
    parser.add_argument('--plantilla', default='ejemplo_modificado_informe_mensual.docx', help="Ruta a la plantilla")
    args = parser.parse_args()

    inf_data = None
    if args.data and os.path.exists(args.data):
        with open(args.data, 'r', encoding='utf-8') as f:
            inf_data = json.load(f)
    elif args.json_str:
        inf_data = json.loads(args.json_str)

    if not inf_data:
        print(json.dumps({"success": False, "error": "No se proporcionaron datos de informe válidos"}))
        sys.exit(1)

    output_docx = args.output_docx or 'informe_out.docx'
    output_pdf = args.output_pdf

    try:
        res = generar_informe_desde_plantilla(inf_data, output_docx, output_pdf, args.plantilla)
        print(json.dumps(res))
    except Exception as e:
        import traceback
        err_msg = str(e)
        err_tb = traceback.format_exc()
        sys.stderr.write(err_tb)
        print(json.dumps({"success": False, "error": err_msg, "traceback": err_tb}))
        sys.exit(1)


if __name__ == '__main__':
    main()
