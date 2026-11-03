# -*- coding: utf-8 -*-
"""
==========================================================================
ANTA OBRA - Generador Oficial de Informes Semanais (DOCX y PDF)
Rellena directamente la plantilla oficial de Word:
plantilla_informe_semanal.docx (o ejemplo_modificado_informe_semanal.docx)
Preserva al 100% las tablas nativas, bordes, estilos, anchos y encabezados.
==========================================================================
"""

import sys
import os
import json
import shutil
import base64
import re
import tempfile
import argparse
import subprocess

try:
    import docx
    from docx.shared import Pt, Inches, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
    from docx.oxml import OxmlElement, parse_xml
    from docx.oxml.ns import nsdecls, qn
    import pypdf
except ImportError as ie:
    print(json.dumps({"success": False, "error": f"Falta una librería requerida ({ie})."}))
    sys.exit(1)


def format_date_es(date_str):
    if not date_str:
        return '—'
    try:
        parts = date_str.split('-')
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
        return date_str
    except Exception:
        return date_str


def format_date_long_es(date_str):
    if not date_str:
        return 'a data de emisión'
    months = [
        '', 'xaneiro', 'febreiro', 'marzo', 'abril', 'maio', 'xuño',
        'xullo', 'agosto', 'setembro', 'outubro', 'novembro', 'decembro'
    ]
    try:
        parts = date_str.split('-')
        if len(parts) == 3:
            d = int(parts[2])
            m = int(parts[1])
            y = int(parts[0])
            m_name = months[m] if 1 <= m <= 12 else str(m)
            return f"{d} de {m_name} de {y}"
        return date_str
    except Exception:
        return date_str


def safe_read_docx_bytes(path):
    try:
        with open(path, 'rb') as f:
            return f.read()
    except Exception:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.docx').name
        try:
            shutil.copyfile(path, tmp)
            with open(tmp, 'rb') as f:
                data = f.read()
            try:
                os.remove(tmp)
            except Exception:
                pass
            return data
        except Exception:
            base_dir = os.path.dirname(path)
            for alt in ['plantilla_informe_semanal.docx', 'ejemplo_modificado_informe_semanal.docx']:
                alt_path = os.path.join(base_dir, alt)
                if os.path.exists(alt_path) and alt_path != path:
                    with open(alt_path, 'rb') as f:
                        return f.read()
            raise


def set_cell_clean_value(cell, text, bold=False, font_size_pt=8.5, color_rgb=None, align=WD_ALIGN_PARAGRAPH.LEFT, italic=False):
    """Establece texto limpio en una celda preservando estilos."""
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.left_indent = Pt(0)
    p.paragraph_format.right_indent = Pt(0)
    r = p.add_run(str(text if text is not None else '—'))
    r.font.name = 'Arial'
    r.font.size = Pt(font_size_pt)
    r.bold = bold
    r.italic = italic
    if color_rgb:
        r.font.color.rgb = color_rgb


def generar_informe_semanal_desde_plantilla(informe_data, output_docx, output_pdf=None, plantilla_path='plantilla_informe_semanal.docx'):
    """
    Genera el informe semanal rellenando las 3 tablas nativas y párrafos
    de la plantilla oficial plantilla_informe_semanal.docx.
    """
    if not os.path.isabs(plantilla_path):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        cand = os.path.join(base_dir, plantilla_path)
        if os.path.exists(cand):
            plantilla_path = cand
        elif os.path.exists(os.path.join(base_dir, 'plantilla_informe_semanal.docx')):
            plantilla_path = os.path.join(base_dir, 'plantilla_informe_semanal.docx')
        elif os.path.exists(os.path.join(base_dir, 'ejemplo_modificado_informe_semanal.docx')):
            plantilla_path = os.path.join(base_dir, 'ejemplo_modificado_informe_semanal.docx')

    if not os.path.exists(plantilla_path):
        raise FileNotFoundError(f"Non se atopou a plantilla en: {plantilla_path}")

    # 1. Cargar plantilla en memoria de forma segura
    plantilla_bytes = safe_read_docx_bytes(plantilla_path)
    tmp_plantilla = tempfile.NamedTemporaryFile(delete=False, suffix='.docx').name
    with open(tmp_plantilla, 'wb') as f_out:
        f_out.write(plantilla_bytes)

    doc = docx.Document(tmp_plantilla)
    co = informe_data.get('currentObra') or informe_data.get('obra') or {}
    dx = informe_data.get('datosXerais') or {}

    obra_titulo = (
        co.get('titulo') or dx.get('proxecto') or
        informe_data.get('obraTitulo') or informe_data.get('obra') or
        'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU'
    )
    expte = co.get('expediente') or dx.get('expediente') or informe_data.get('expediente') or 'AVS 03007 25/05'
    situacion = co.get('situacion') or dx.get('emprazamento') or dx.get('situacion') or '—'
    contratista = co.get('contratista') or dx.get('contratista') or '—'
    
    raw_do = co.get('direccionObra') or dx.get('direccionObra') or ''
    do_clean = informe_data.get('doClean') or (raw_do.split(' / ')[0].strip() if ' / ' in raw_do else raw_do) or '—'
    de_clean = informe_data.get('deClean') or co.get('direccionEjecucion') or dx.get('direccionEjecucion') or (raw_do.split(' / ')[1].strip() if ' / ' in raw_do else '—')
    css_str = informe_data.get('coordinadorCSSStr') or co.get('coordinadorCSS') or dx.get('coordinadorCSS') or '—'
    jo_str = informe_data.get('jefeObraStr') or co.get('jefeObra') or dx.get('xefeObra') or '—'

    report_num = str(informe_data.get('numero') or dx.get('numeroInforme') or '1')
    data_inf = dx.get('dataInforme') or informe_data.get('fecha') or ''
    fecha_inf_fmt = format_date_es(data_inf)

    # 2. ACTUALIZAR ENCABEZADO OFICIAL DE LA PLANTILLA
    if doc.sections and doc.sections[0].header:
        sec = doc.sections[0]
        # Eliminar bordes azules de página
        for b in sec._sectPr.xpath('./w:pgBorders'):
            sec._sectPr.remove(b)

        if sec.header.tables:
            t_head = sec.header.tables[0]
            # Celda 1: Proyecto y Expediente
            try:
                c_proj = t_head.cell(0, 1)
                c_proj.text = ""
                p1 = c_proj.add_paragraph()
                p1.paragraph_format.space_before = Pt(0)
                p1.paragraph_format.space_after = Pt(0)
                r1 = p1.add_run(obra_titulo)
                r1.bold = True
                r1.font.size = Pt(8.5)

                p2 = c_proj.add_paragraph()
                p2.paragraph_format.space_before = Pt(0)
                p2.paragraph_format.space_after = Pt(0)
                r2 = p2.add_run(f"(EXPTE: {expte})")
                r2.font.size = Pt(8)
                r2.font.color.rgb = RGBColor(100, 116, 139)
            except Exception:
                pass

            # Celda de tipo: INFORME SEMANAL
            try:
                c_t = t_head.cell(0, 2)
                c_t.text = ""
                p_t = c_t.add_paragraph()
                p_t.paragraph_format.space_before = Pt(0)
                p_t.paragraph_format.space_after = Pt(0)
                r_t = p_t.add_run("INFORME SEMANAL")
                r_t.bold = True
                r_t.font.size = Pt(11)
            except Exception:
                pass

            # Fila 1: Número y Fecha
            if len(t_head.rows) > 1:
                try:
                    c_num = t_head.cell(1, 2)
                    c_num.text = ""
                    p_n = c_num.add_paragraph()
                    r_n = p_n.add_run(report_num)
                    r_n.bold = True
                    r_n.font.size = Pt(16)
                except Exception:
                    pass

                try:
                    c_fec = t_head.cell(1, 3) if len(t_head.rows[1].cells) > 3 else t_head.cell(1, 2)
                    if c_fec != c_num:
                        c_fec.text = ""
                        p_f = c_fec.add_paragraph()
                        r_f = p_f.add_run(fecha_inf_fmt)
                        r_f.font.size = Pt(8.5)
                        r_f.font.color.rgb = RGBColor(100, 116, 139)
                except Exception:
                    pass

    # 3. TABLA 0: DATOS XERAIS DA OBRA (10 filas x 3 cols)
    if len(doc.tables) > 0:
        t0 = doc.tables[0]
        # Row 0: Proxecto
        if len(t0.rows) > 0:
            set_cell_clean_value(t0.cell(0, 1), obra_titulo, bold=True, font_size_pt=8.5)
        # Row 1: Emprazamento
        if len(t0.rows) > 1:
            set_cell_clean_value(t0.cell(1, 1), situacion, font_size_pt=8.5)
        # Row 2: Expediente nº
        if len(t0.rows) > 2:
            set_cell_clean_value(t0.cell(2, 1), expte, bold=True, font_size_pt=8.5, color_rgb=RGBColor(30, 58, 138))
        # Row 3: Contratista
        if len(t0.rows) > 3:
            set_cell_clean_value(t0.cell(3, 1), contratista, bold=True, font_size_pt=8.5)
        # Row 4: Dirección de obra
        if len(t0.rows) > 4:
            set_cell_clean_value(t0.cell(4, 1), do_clean, bold=True, font_size_pt=8.5, color_rgb=RGBColor(15, 71, 97))
            if len(t0.rows[4].cells) > 2:
                set_cell_clean_value(t0.cell(4, 2), "(UTE - ANTA - BOG)", font_size_pt=8)
        # Row 7: Dirección de execución
        if len(t0.rows) > 7:
            set_cell_clean_value(t0.cell(7, 1), de_clean, bold=True, font_size_pt=8.5, color_rgb=RGBColor(2, 132, 199))
        # Row 8: Coordinador CSS
        if len(t0.rows) > 8:
            set_cell_clean_value(t0.cell(8, 1), css_str, font_size_pt=8.5)
        # Row 9: Xefe de Obra
        if len(t0.rows) > 9:
            set_cell_clean_value(t0.cell(9, 1), jo_str, font_size_pt=8.5)

    # 4. TABLA 1: RELACIÓN DE VISITAS E REUNIÓNS EN OBRA (cols: Fecha | Tipo | Nº)
    relacion = informe_data.get('relacionVisitasReunions') or informe_data.get('relacion') or []
    if not relacion:
        # Construir relación automáticamente a partir de visitasPdf y reunionsPdf si no se pasó array explícito
        for v in (informe_data.get('visitasPdf') or informe_data.get('actasPdf') or []):
            relacion.append({
                'fecha': v.get('fecha') or '',
                'tipo': 'Visita de obra',
                'numero': v.get('numero') or (re.search(r'\d+', str(v.get('nombre') or '')).group(0) if re.search(r'\d+', str(v.get('nombre') or '')) else '1'),
                'nombre': v.get('nombre') or ''
            })
        for r in (informe_data.get('reunionsPdf') or informe_data.get('reunionesPdf') or []):
            relacion.append({
                'fecha': r.get('fecha') or '',
                'tipo': 'Reunión de obra',
                'numero': r.get('numero') or (re.search(r'\d+', str(r.get('nombre') or '')).group(0) if re.search(r'\d+', str(r.get('nombre') or '')) else '1'),
                'nombre': r.get('nombre') or ''
            })

    if len(doc.tables) > 1:
        t1 = doc.tables[1]
        # Headers en row 0: ['Fecha', 'Tipo visita / reunión', 'Nº']
        # Limpiar filas existentes de ejemplo (a partir de row 1)
        # Si hay elementos en relación:
        if relacion:
            # Asegurar filas suficientes
            while len(t1.rows) - 1 < len(relacion):
                # Añadir fila clonando la fila 1
                new_row = t1.add_row()
            # Si hay más filas en la plantilla que elementos en relación, eliminar sobrantes
            while len(t1.rows) - 1 > len(relacion):
                tr = t1.rows[-1]._tr
                t1._tbl.remove(tr)

            for idx, item in enumerate(relacion):
                row = t1.rows[idx + 1]
                fec_val = format_date_es(item.get('fecha'))
                tipo_val = item.get('tipo') or ('Reunión de obra' if 'reun' in str(item.get('nombre', '')).lower() else 'Visita de obra')
                num_val = str(item.get('numero') or (idx + 1))

                set_cell_clean_value(row.cells[0], fec_val, font_size_pt=8.5, align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_clean_value(row.cells[1], tipo_val, bold=True, font_size_pt=8.5, color_rgb=RGBColor(15, 71, 97))
                set_cell_clean_value(row.cells[2], num_val, bold=True, font_size_pt=8.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        else:
            # Si no hay visitas ni reuniones registradas esa semana
            while len(t1.rows) > 2:
                t1._tbl.remove(t1.rows[-1]._tr)
            set_cell_clean_value(t1.rows[1].cells[0], '—', font_size_pt=8.5, align=WD_ALIGN_PARAGRAPH.CENTER)
            set_cell_clean_value(t1.rows[1].cells[1], 'Non se rexistraron visitas nin reunións de obra nesta semana', font_size_pt=8.5, italic=True)
            set_cell_clean_value(t1.rows[1].cells[2], '—', font_size_pt=8.5, align=WD_ALIGN_PARAGRAPH.CENTER)

    # 5. ACTUALIZAR PÁRRAFO DE FECHA DE FIRMAS
    lugar = 'Ferrol' if 'ferrol' in situacion.lower() else (situacion.split(',')[-1].strip() or 'Ferrol')
    fecha_longa = format_date_long_es(data_inf)
    p_fir_intro = None
    for p in doc.paragraphs:
        if 'Para que así conste e aos efectos oportunos' in p.text:
            p_fir_intro = p
            break

    if p_fir_intro:
        p_fir_intro.text = ""
        r_f = p_fir_intro.add_run(f"En {lugar} a {fecha_longa}. Para que así conste e aos efectos oportunos, asinan o presente informe semanal:")
        r_f.font.name = 'Arial'
        r_f.font.size = Pt(8.5)
        r_f.italic = True
        r_f.font.color.rgb = RGBColor(71, 85, 105)

    # 6. TABLA 2: DILIXENCIA DE FIRMAS (DO e DE individuais)
    firmas = informe_data.get('firmas') or []
    if not firmas:
        # Generar un firmante individual para cada persona de la DO y de la DE
        def split_signers(text, default_cargo, default_ent):
            if not text or text == '—':
                return []
            cleaned = re.sub(r'\s+(?:e|y|and)\s+', ', ', str(text))
            names = [n.strip() for n in cleaned.split(',') if n.strip()]
            return [{'nombre': n, 'cargo': default_cargo, 'entidad': default_ent} for n in names]

        firmas.extend(split_signers(do_clean, 'DIRECCIÓN DE OBRA (DO)', 'UTE ANTA-BOG'))
        firmas.extend(split_signers(de_clean, 'DIRECCIÓN DE EXECUCIÓN (DE)', ''))

    if len(doc.tables) > 2:
        t2 = doc.tables[2]
        if firmas:
            while len(t2.rows) < len(firmas):
                t2.add_row()
            while len(t2.rows) > len(firmas):
                t2._tbl.remove(t2.rows[-1]._tr)

            for idx, f_item in enumerate(firmas):
                row = t2.rows[idx]
                f_nom = f_item.get('nombre') or f_item.get('texto') or 'Director de Obra'
                f_rol = f_item.get('cargo') or 'Dirección Facultativa'
                f_ent = f_item.get('entidad') or ''

                c0 = row.cells[0]
                c0.text = ""
                p_nom = c0.add_paragraph()
                p_nom.paragraph_format.space_before = Pt(0)
                p_nom.paragraph_format.space_after = Pt(1)
                r_nom = p_nom.add_run(f_nom)
                r_nom.bold = True
                r_nom.font.name = 'Arial'
                r_nom.font.size = Pt(9)
                r_nom.font.color.rgb = RGBColor(15, 23, 42)

                p_rol = c0.add_paragraph()
                p_rol.paragraph_format.space_before = Pt(0)
                p_rol.paragraph_format.space_after = Pt(0)
                r_rol = p_rol.add_run(f_rol + (f" ({f_ent})" if f_ent else ""))
                r_rol.font.name = 'Arial'
                r_rol.font.size = Pt(8)
                r_rol.font.color.rgb = RGBColor(30, 58, 138)

                # Celda 1: Línea de firma
                set_cell_clean_value(row.cells[1], "Asdo.: ____________________________", font_size_pt=8.5, color_rgb=RGBColor(100, 116, 139))

    # 7. ANEXOS DOCUMENTAIS EN DOCX
    visitas_pdf = informe_data.get('visitasPdf') or informe_data.get('actasPdf') or []
    reunions_pdf = informe_data.get('reunionsPdf') or informe_data.get('reunionesPdf') or []
    anexos = informe_data.get('anexosPdf') or []

    p_anx_h = None
    for p in doc.paragraphs:
        if 'ANEXOS DOCUMENTAIS DO INFORME' in p.text:
            p_anx_h = p
            break

    if p_anx_h:
        if visitas_pdf:
            pv = doc.add_paragraph()
            pv.paragraph_format.space_before = Pt(6)
            pv.paragraph_format.space_after = Pt(2)
            rv = pv.add_run(f"Visitas de obra achegadas en PDF ({len(visitas_pdf)}):")
            rv.bold = True
            rv.font.size = Pt(9.5)
            rv.font.color.rgb = RGBColor(15, 71, 97)
            for v_item in visitas_pdf:
                pi = doc.add_paragraph()
                pi.paragraph_format.left_indent = Inches(0.25)
                pi.paragraph_format.space_after = Pt(1)
                v_nom = v_item.get('nombre') or 'Visita de obra'
                v_fec = format_date_es(v_item.get('fecha'))
                ri = pi.add_run(f"• {v_nom} (data: {v_fec})")
                ri.font.size = Pt(8.5)

        if reunions_pdf:
            pr = doc.add_paragraph()
            pr.paragraph_format.space_before = Pt(6)
            pr.paragraph_format.space_after = Pt(2)
            rr = pr.add_run(f"Reunións de obra achegadas en PDF ({len(reunions_pdf)}):")
            rr.bold = True
            rr.font.size = Pt(9.5)
            rr.font.color.rgb = RGBColor(15, 71, 97)
            for r_item in reunions_pdf:
                pi = doc.add_paragraph()
                pi.paragraph_format.left_indent = Inches(0.25)
                pi.paragraph_format.space_after = Pt(1)
                r_nom = r_item.get('nombre') or 'Reunión de obra'
                r_fec = format_date_es(r_item.get('fecha'))
                ri = pi.add_run(f"• {r_nom} (data: {r_fec})")
                ri.font.size = Pt(8.5)

        if anexos:
            pa = doc.add_paragraph()
            pa.paragraph_format.space_before = Pt(6)
            pa.paragraph_format.space_after = Pt(2)
            ra = pa.add_run(f"Outros documentos anexos en PDF ({len(anexos)}):")
            ra.bold = True
            ra.font.size = Pt(9.5)
            ra.font.color.rgb = RGBColor(15, 71, 97)
            for a_item in anexos:
                pi = doc.add_paragraph()
                pi.paragraph_format.left_indent = Inches(0.25)
                pi.paragraph_format.space_after = Pt(1)
                a_nom = a_item.get('nombre') or a_item.get('titulo') or 'Documento anexo'
                ri = pi.add_run(f"• {a_nom}")
                ri.font.size = Pt(8.5)

    # 8. GUARDAR DOCX
    os.makedirs(os.path.dirname(os.path.abspath(output_docx)), exist_ok=True)
    doc.save(output_docx)
    try:
        os.remove(tmp_plantilla)
    except Exception:
        pass

    pdf_result = None
    if output_pdf:
        # 9. CONVERSIÓN DOCX -> PDF
        os.makedirs(os.path.dirname(os.path.abspath(output_pdf)), exist_ok=True)
        # Intentar Word COM (Windows)
        if sys.platform == 'win32':
            try:
                import win32com.client
                import pythoncom
                pythoncom.CoInitialize()
                word = win32com.client.DispatchEx('Word.Application')
                word.Visible = False
                word.DisplayAlerts = False
                w_doc = word.Documents.Open(os.path.abspath(output_docx), ReadOnly=True)
                w_doc.SaveAs(os.path.abspath(output_pdf), FileFormat=17)
                w_doc.Close(False)
                word.Quit()
                pythoncom.CoUninitialize()
                pdf_result = os.path.abspath(output_pdf)
            except Exception as w_err:
                sys.stderr.write(f"Word COM fallo: {w_err}\n")

        # Fallback docx2pdf
        if not pdf_result or not os.path.exists(pdf_result):
            try:
                from docx2pdf import convert
                convert(output_docx, output_pdf)
                if os.path.exists(output_pdf):
                    pdf_result = os.path.abspath(output_pdf)
            except Exception as d2p_err:
                sys.stderr.write(f"docx2pdf fallo: {d2p_err}\n")

        # Fallback LibreOffice
        if not pdf_result or not os.path.exists(pdf_result):
            try:
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

        # 10. FUSIÓN CON SEPARATAS PARA VISITAS, REUNIONES Y ANEXOS PDF
        if (visitas_pdf or reunions_pdf or anexos) and pdf_result and os.path.exists(pdf_result):
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

                # Fusión de Visitas de Obra
                for v_idx, v_item in enumerate(visitas_pdf):
                    if not isinstance(v_item, dict):
                        continue
                    v_nom = v_item.get('nombre') or f"VISITA DE OBRA Nº {v_item.get('numero') or (v_idx + 1)}"
                    v_fecha = v_item.get('fecha', '')
                    subtitulo = f"Visita de obra da dirección facultativa correspondente ao {format_date_es(v_fecha)}." if v_fecha else "Visita ordinaria da dirección facultativa."

                    sep_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                    temp_pdf_files.append(sep_path)

                    generar_separata_pdf(
                        sep_path,
                        tipo="visitas_obra",
                        titulo=v_nom.upper(),
                        subtitulo=subtitulo,
                        obra=obra_titulo,
                        expediente=expte,
                        tipo_doc="INFORME SEMANAL",
                        numero=report_num,
                        fecha=fecha_inf_fmt
                    )
                    writer.append(sep_path)

                    v_pdf = v_item.get('pdfData') or v_item.get('url') or v_item.get('dataUrl') or v_item.get('data')
                    if v_pdf:
                        tmp_v = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                        if isinstance(v_pdf, str) and ';base64,' in v_pdf:
                            _, b64 = v_pdf.split(';base64,', 1)
                            tmp_v.write(base64.b64decode(b64))
                        elif isinstance(v_pdf, str) and os.path.exists(v_pdf):
                            with open(v_pdf, 'rb') as f_in:
                                tmp_v.write(f_in.read())
                        tmp_v.close()
                        temp_pdf_files.append(tmp_v.name)
                        writer.append(tmp_v.name)

                # Fusión de Reunións de Obra
                for r_idx, r_item in enumerate(reunions_pdf):
                    if not isinstance(r_item, dict):
                        continue
                    r_nom = r_item.get('nombre') or f"REUNIÓN DE OBRA Nº {r_item.get('numero') or (r_idx + 1)}"
                    r_fecha = r_item.get('fecha', '')
                    subtitulo = f"Reunión de obra da dirección facultativa correspondente ao {format_date_es(r_fecha)}." if r_fecha else "Reunión de obra da dirección facultativa."

                    sep_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                    temp_pdf_files.append(sep_path)

                    generar_separata_pdf(
                        sep_path,
                        tipo="reunions_obra",
                        titulo=r_nom.upper(),
                        subtitulo=subtitulo,
                        obra=obra_titulo,
                        expediente=expte,
                        tipo_doc="INFORME SEMANAL",
                        numero=report_num,
                        fecha=fecha_inf_fmt
                    )
                    writer.append(sep_path)

                    r_pdf = r_item.get('pdfData') or r_item.get('url') or r_item.get('dataUrl') or r_item.get('data')
                    if r_pdf:
                        tmp_r = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                        if isinstance(r_pdf, str) and ';base64,' in r_pdf:
                            _, b64 = r_pdf.split(';base64,', 1)
                            tmp_r.write(base64.b64decode(b64))
                        elif isinstance(r_pdf, str) and os.path.exists(r_pdf):
                            with open(r_pdf, 'rb') as f_in:
                                tmp_r.write(f_in.read())
                        tmp_r.close()
                        temp_pdf_files.append(tmp_r.name)
                        writer.append(tmp_r.name)

                # Fusión de outros anexos
                for anexo in anexos:
                    if not isinstance(anexo, dict):
                        continue
                    anx_nom = anexo.get('nombre') or anexo.get('titulo') or 'DOCUMENTO ANEXO'
                    sep_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                    temp_pdf_files.append(sep_path)

                    generar_separata_pdf(
                        sep_path,
                        tipo="documento_anexo",
                        titulo=f"ANEXO: {anx_nom.upper()}",
                        subtitulo=anexo.get('descripcion') or "Documentación anexa incorporada ao informe semanal.",
                        obra=obra_titulo,
                        expediente=expte,
                        tipo_doc="INFORME SEMANAL",
                        numero=report_num,
                        fecha=fecha_inf_fmt
                    )
                    writer.append(sep_path)

                    anx_data = anexo.get('dataUrl') or anexo.get('url') or anexo.get('data')
                    if isinstance(anx_data, str) and ';base64,' in anx_data:
                        _, b64 = anx_data.split(';base64,', 1)
                        tmp_doc = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                        tmp_doc.write(base64.b64decode(b64))
                        tmp_doc.close()
                        temp_pdf_files.append(tmp_doc.name)
                        writer.append(tmp_doc.name)

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
                sys.stderr.write(f"Erro adjuntando separatas ao informe semanal: {pe}\n")

    return {
        "success": True,
        "docx": output_docx,
        "pdf": pdf_result
    }


def main():
    parser = argparse.ArgumentParser(description="Generar informe semanal DOCX y PDF a partir de plantilla")
    parser.add_argument('--data', required=True, help="Ruta al archivo JSON con los datos o string JSON")
    parser.add_argument('--output-docx', help="Ruta de destino del archivo .docx")
    parser.add_argument('--output-pdf', help="Ruta de destino del archivo .pdf")
    parser.add_argument('--plantilla', default='plantilla_informe_semanal.docx', help="Ruta a la plantilla")

    args = parser.parse_args()

    try:
        if os.path.exists(args.data):
            with open(args.data, 'r', encoding='utf-8') as f:
                inf_data = json.load(f)
        else:
            inf_data = json.loads(args.data)

        output_docx = args.output_docx or 'informe_semanal_out.docx'
        output_pdf = args.output_pdf

        res = generar_informe_semanal_desde_plantilla(inf_data, output_docx, output_pdf, args.plantilla)
        print(json.dumps(res, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()

