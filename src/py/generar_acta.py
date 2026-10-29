# -*- coding: utf-8 -*-
"""
==========================================================================
ANTA OBRA - Generador Oficial de Actas de Obra (DOCX y PDF)
Utiliza la plantilla corporativa oficial: plantilla_acta.docx
Genera primero el documento Word (.docx) y a partir de él exporta el PDF oficial.
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

try:
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.oxml import parse_xml
    from docx.oxml.ns import nsdecls
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    import pypdf
except ImportError as ie:
    print(json.dumps({"success": False, "error": f"Falta una librería requerida ({ie})."}))
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    Image = None


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
        return 'a data da reunión'
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


def decode_image_data(url):
    """Extrae archivo temporal de imagen base64, dataUrl o ruta física."""
    if not url:
        return None
    try:
        if url.startswith('data:image/'):
            if ';base64,' in url:
                header, b64_data = url.split(';base64,', 1)
                img_bytes = base64.b64decode(b64_data)
                ext = 'png' if 'png' in header else ('jpg' if 'jpeg' in header or 'jpg' in header else 'png')
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}')
                tmp.write(img_bytes)
                tmp.close()
                return tmp.name
        elif os.path.exists(url):
            return url
    except Exception as e:
        sys.stderr.write(f"Error procesando imagen: {e}\n")
    return None


def set_cell_margins(cell, top=60, bottom=60, left=80, right=80):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)


def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex.lstrip("#")}"/>')
    tcPr.append(shd)


def set_row_bottom_border(row, color_hex="E2E8F0", sz="4"):
    for cell in row.cells:
        tcPr = cell._tc.get_or_add_tcPr()
        tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/></w:tcBorders>')
        tcPr.append(tcBorders)


def get_agent_initials(name):
    if not name or not isinstance(name, str):
        return 'AG'
    clean = name.strip()
    if not clean:
        return 'AG'
    particles = {'de', 'del', 'la', 'las', 'los', 'el', 'y', 'da', 'do', 'das', 'dos', 'van', 'von', 'e'}
    words = [w for w in clean.split() if w]
    if len(words) == 1:
        return words[0][:2].upper()
    meaningful = [w for w in words if w.lower() not in particles]
    target = meaningful if len(meaningful) >= 2 else words
    if len(target) == 2 or len(target) == 3:
        return (target[0][0] + target[1][0]).upper()
    return (target[0][0] + target[2][0]).upper()


def get_agent_colors(agent):
    name = (agent.get('nombre') or agent.get('nome') or '').lower()
    cargo = (agent.get('cargo') or '').lower()
    if 'rosa vilas' in name or 'sergio beceiro' in name or 'directora de obra' in cargo or 'director de obra' in cargo:
        return ('1E3A8A', 'FFFFFF') # Azul oscuro
    if 'ana gallego' in name or 'directora de ejecución' in cargo or 'dem' in cargo:
        return ('38BDF8', 'FFFFFF') # Azul claro
    if 'juan carlos bello' in name or 'seguridad' in cargo or 'css' in cargo:
        return ('E0F2FE', '0369A1') # Azul muy claro
    return ('FFFFFF', '1E293B') # Blanco / Gris por defecto


def safe_read_docx_bytes(path):
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
            data = win32file.ReadFile(handle, 100*1024*1024)[1]
            win32file.CloseHandle(handle)
            return data
        except Exception:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            cand = os.path.join(base_dir, 'plantilla_acta.docx')
            if os.path.exists(cand):
                with open(cand, 'rb') as f:
                    return f.read()
            raise


def generar_acta_desde_plantilla(acta_data, output_docx, output_pdf=None, plantilla_path='ejemplo_modificado_acta_semanal.docx'):
    if not os.path.isabs(plantilla_path):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        cand = os.path.join(base_dir, plantilla_path)
        if os.path.exists(cand):
            plantilla_path = cand
        elif os.path.exists(os.path.join(base_dir, 'ejemplo_modificado_acta_semanal.docx')):
            plantilla_path = os.path.join(base_dir, 'ejemplo_modificado_acta_semanal.docx')
        elif os.path.exists(os.path.join(base_dir, 'plantilla_acta.docx')):
            plantilla_path = os.path.join(base_dir, 'plantilla_acta.docx')

    if not os.path.exists(plantilla_path):
        raise FileNotFoundError(f"No se encontró la plantilla en: {plantilla_path}")

    # Copia temporal segura para evitar bloqueos
    plantilla_bytes = safe_read_docx_bytes(plantilla_path)
    tmp_plantilla = tempfile.NamedTemporaryFile(delete=False, suffix='.docx').name
    with open(tmp_plantilla, 'wb') as f_out:
        f_out.write(plantilla_bytes)

    doc = docx.Document(tmp_plantilla)

    # 1. ACTUALIZAR ENCABEZADO OFICIAL DE LA PLANTILLA
    header = doc.sections[0].header
    # Eliminar cualquier párrafo suelto en el encabezado para que sólo quede la tabla oficial sin textos redundantes
    for p in list(header.paragraphs):
        p._element.getparent().remove(p._element)

    if header.tables:
        t_head = header.tables[0]
        co_head = acta_data.get('currentObra') or {}
        obra_titulo = acta_data.get('obraTitulo') or acta_data.get('obra') or co_head.get('titulo') or acta_data.get('proxecto') or acta_data.get('proyecto') or '—'
        expte = acta_data.get('expediente') or co_head.get('expediente') or '—'

        # Celda central: Proyecto y Expediente con formato oficial idéntico al informe mensual
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

        # Celda título: ACTA SEMANAL o REUNIÓN según tipo de documento
        es_reunion = acta_data.get('tipoDocumento') == 'reunion' or acta_data.get('tipo') == 'reunion' or acta_data.get('esReunion') is True
        c_title = t_head.cell(0, 2)
        if c_title.paragraphs:
            p = c_title.paragraphs[0]
            p.text = "REUNIÓN" if es_reunion else "ACTA SEMANAL"
            if p.runs:
                p.runs[0].bold = True
                p.runs[0].font.size = Pt(11)

        # Celda número
        c_num = t_head.cell(1, 2)
        if c_num.paragraphs:
            p = c_num.paragraphs[0]
            p.text = str(acta_data.get('numero') or '')
            if p.runs:
                p.runs[0].bold = True
                p.runs[0].font.size = Pt(18)

        # Celda fecha
        c_date = t_head.cell(1, 3)
        if c_date.paragraphs:
            c_date.paragraphs[0].text = format_date_es(acta_data.get('fecha', ''))

    # 2. LIMPIAR PÁRRAFOS E TABLAS DE MUESTRA DEL CUERPO
    for p in list(doc.paragraphs):
        p._element.getparent().remove(p._element)
    for t in list(doc.tables):
        t._element.getparent().remove(t._element)

    # Eliminar cualquier borde inferior azul de página (w:pgBorders) en todas las secciones
    for s in doc.sections:
        for b in s._sectPr.xpath('./w:pgBorders'):
            s._sectPr.remove(b)

    # Helper para estilos disponibles en la plantilla
    style_h1 = 'Heading 1' if 'Heading 1' in doc.styles else ('Ttulo1' if 'Ttulo1' in doc.styles else 'Heading 1')
    style_h2 = 'Heading 2' if 'Heading 2' in doc.styles else ('Ttulo2' if 'Ttulo2' in doc.styles else 'Heading 2')

    co = acta_data.get('currentObra') or {}
    situacion = acta_data.get('situacion') or co.get('situacion') or '—'
    contratista = acta_data.get('contratista') or co.get('contratista') or '—'
    raw_do = acta_data.get('doClean') or co.get('direccionObra') or acta_data.get('direccionObra') or ''
    do_clean = raw_do.split(' / ')[0].strip() if ' / ' in raw_do else (raw_do or '—')
    de_clean = acta_data.get('deClean') or co.get('direccionEjecucion') or acta_data.get('direccionEjecucion') or (raw_do.split(' / ')[1].strip() if ' / ' in raw_do else '—')
    css_str = acta_data.get('coordinadorCSSStr') or co.get('coordinadorCSS') or acta_data.get('coordinadorCSS') or '—'
    jo_str = acta_data.get('jefeObraStr') or co.get('jefeObra') or acta_data.get('jefeObra') or '—'
    es_reunion = acta_data.get('tipoDocumento') == 'reunion' or acta_data.get('tipo') == 'reunion' or acta_data.get('esReunion') is True

    if es_reunion:
        # ======================================================================
        # DOCUMENTO OFICIAL: REUNIÓN
        # ======================================================================
        # 1- DATOS XERAIS DA OBRA
        doc.add_paragraph('1.- DATOS XERAIS DA OBRA', style=style_h1)
        t_obra = doc.add_table(rows=0, cols=2)
        t_obra.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_obra.autofit = False

        fields_obra = [
            [("Proxecto:", obra_titulo, True, "0F172A"), ("Emprazamento:", situacion, False, "334155")],
            [("Expediente nº:", expte, True, "0F172A"), ("Contratista:", contratista, True, "0F172A")],
            [("Dirección de obra:", do_clean, True, "1E3A8A"), ("Dirección de execución:", de_clean, True, "0284C7")],
            [("Coordinador CSS:", css_str, False, "334155"), ("Xefe de Obra:", jo_str, False, "334155")]
        ]
        for row_data in fields_obra:
            row = t_obra.add_row()
            set_row_bottom_border(row, "E2E8F0", "2")
            for col_i in range(2):
                cell = row.cells[col_i]
                cell.width = Inches(3.6)
                set_cell_margins(cell, 35, 35, 40, 40)
                p = cell.paragraphs[0]
                lbl, val, b, col = row_data[col_i]
                r_lbl = p.add_run(lbl + " ")
                r_lbl.font.name = 'Arial'
                r_lbl.font.size = Pt(8.5)
                r_lbl.font.color.rgb = RGBColor(100, 116, 139)
                r_val = p.add_run(val)
                r_val.font.name = 'Arial'
                r_val.font.size = Pt(8.5)
                r_val.bold = b
                if col == "1E3A8A": r_val.font.color.rgb = RGBColor(30, 58, 138)
                elif col == "0284C7": r_val.font.color.rgb = RGBColor(2, 132, 199)
                elif col == "0F172A": r_val.font.color.rgb = RGBColor(15, 23, 42)
                else: r_val.font.color.rgb = RGBColor(51, 65, 85)

        # 2- DATOS XERAIS DA REUNIÓN
        doc.add_paragraph('2.- DATOS XERAIS DA REUNIÓN', style=style_h1)
        t_reu = doc.add_table(rows=0, cols=2)
        t_reu.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_reu.autofit = False

        fecha_val = format_date_long_es(acta_data.get('fecha'))
        hora_val = acta_data.get('hora') or '10:00'
        tipo_reu = acta_data.get('tipoModalidad') or acta_data.get('tipoReunion') or 'Presencial'
        lugar_val = acta_data.get('lugar') or 'Caseta de obra'

        fields_reu = [
            [("Data:", fecha_val, True, "0F172A"), ("Hora:", hora_val, True, "0F172A")],
            [("Tipo de reunión:", tipo_reu, True, "1E3A8A"), ("Lugar:", lugar_val, False, "334155")]
        ]
        for row_data in fields_reu:
            row = t_reu.add_row()
            set_row_bottom_border(row, "E2E8F0", "2")
            for col_i in range(2):
                cell = row.cells[col_i]
                cell.width = Inches(3.6)
                set_cell_margins(cell, 35, 35, 40, 40)
                p = cell.paragraphs[0]
                lbl, val, b, col = row_data[col_i]
                r_lbl = p.add_run(lbl + " ")
                r_lbl.font.name = 'Arial'
                r_lbl.font.size = Pt(8.5)
                r_lbl.font.color.rgb = RGBColor(100, 116, 139)
                r_val = p.add_run(val)
                r_val.font.name = 'Arial'
                r_val.font.size = Pt(8.5)
                r_val.bold = b
                if col == "1E3A8A": r_val.font.color.rgb = RGBColor(30, 58, 138)
                else: r_val.font.color.rgb = RGBColor(15, 23, 42)

        # 3- ASISTENTES
        doc.add_paragraph('3.- ASISTENTES', style=style_h1)
        asistentes = [a for a in acta_data.get('asistentes', []) if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste']
        if asistentes:
            t_asist = doc.add_table(rows=1, cols=3)
            t_asist.alignment = WD_TABLE_ALIGNMENT.CENTER
            t_asist.autofit = False

            h_row = t_asist.rows[0]
            set_row_bottom_border(h_row, "0284C7", "6")
            headers = [("Nome e Apelidos", 2.7), ("Cargo / Función", 2.5), ("Entidade Representada", 2.0)]
            for idx, (h_title, w_in) in enumerate(headers):
                c = h_row.cells[idx]
                c.width = Inches(w_in)
                set_cell_shading(c, "F1F5F9")
                set_cell_margins(c, 45, 45, 30, 30)
                p = c.paragraphs[0]
                r = p.add_run(h_title)
                r.bold = True
                r.font.size = Pt(8.5)
                r.font.color.rgb = RGBColor(71, 85, 105)

            for a in asistentes:
                r = t_asist.add_row()
                set_row_bottom_border(r, "E2E8F0", "2")
                nome = a.get('nombre') or a.get('nome') or ''
                cargo = a.get('cargo') or '—'
                entidade = a.get('entidad') or a.get('empresa') or a.get('entidade') or '—'

                c0 = r.cells[0]
                c0.width = Inches(2.7)
                set_cell_margins(c0, 30, 30, 30, 30)
                p0 = c0.paragraphs[0]
                r0 = p0.add_run(nome)
                r0.bold = True
                r0.font.size = Pt(8.5)

                c1 = r.cells[1]
                c1.width = Inches(2.5)
                set_cell_margins(c1, 30, 30, 30, 30)
                p1 = c1.paragraphs[0]
                r1 = p1.add_run(cargo)
                r1.font.size = Pt(8.5)
                r1.font.color.rgb = RGBColor(71, 85, 105)

                c2 = r.cells[2]
                c2.width = Inches(2.0)
                set_cell_margins(c2, 30, 30, 30, 30)
                p2 = c2.paragraphs[0]
                r2 = p2.add_run(entidade)
                r2.font.size = Pt(8.5)
                r2.font.color.rgb = RGBColor(100, 116, 139)

        # 4- CUESTIÓNS TRATADAS NA REUNIÓN
        doc.add_paragraph('4.- CUESTIÓNS TRATADAS NA REUNIÓN', style=style_h1)
        apartados = acta_data.get('apartados') or []
        if apartados:
            for ap_idx, ap in enumerate(apartados, 1):
                clean_ap_title = re.sub(r'^\d+[_.\s]+', '', ap.get('titulo', 'Cuestións')).strip()
                p_ap = doc.add_paragraph(f"4.{ap_idx}.- {clean_ap_title}", style=style_h2)
                for sec_idx, sec in enumerate(ap.get('secciones', []), 1):
                    sec_title = re.sub(r'^\d+(\.\d+)*[_.\s]+', '', sec.get('titulo', '')).strip()
                    if sec_title:
                        p_st = doc.add_paragraph(style='Normal')
                        p_st.paragraph_format.space_before = Pt(4)
                        p_st.paragraph_format.space_after = Pt(2)
                        r_st = p_st.add_run(f"4.{ap_idx}.{sec_idx}.- {sec_title}")
                        r_st.bold = True
                        r_st.font.size = Pt(9)
                    txt = sec.get('texto', '')
                    if txt:
                        p_txt = doc.add_paragraph(style='Normal')
                        p_txt.paragraph_format.space_before = Pt(1)
                        p_txt.paragraph_format.space_after = Pt(4)
                        r_txt = p_txt.add_run(re.sub(r'<[^>]+>', '', txt).strip())
                        r_txt.font.size = Pt(8.5)
        else:
            p_empty = doc.add_paragraph(style='Normal')
            r_emp = p_empty.add_run('Desenvolvemento normal dos acordos acadados na reunión.')
            r_emp.italic = True
            r_emp.font.size = Pt(8.5)

        # 5- FIRMAS (Sólo si hay algún asistente con firma marcada)
        firmantes = [a for a in acta_data.get('asistentes', []) if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste' and a.get('firma')]
        next_sec_reu = 5
        if firmantes:
            doc.add_paragraph(f'{next_sec_reu}.- DILIXENCIA DE FIRMAS', style=style_h1)
            p_f_intro = doc.add_paragraph(style='Normal')
            p_f_intro.paragraph_format.space_after = Pt(8)
            lugar_str = lugar_val or ('Ferrol' if 'ferrol' in situacion.lower() else situacion.split(',')[-1].strip() or 'Ferrol')
            r_fi = p_f_intro.add_run(f"En {lugar_str} a {fecha_val}. Para que así conste e aos efectos oportunos, asinan a presente acta de reunión:")
            r_fi.italic = True
            r_fi.font.size = Pt(8.5)
            r_fi.font.color.rgb = RGBColor(71, 85, 105)

            # Tabla de firmas dinámica (2 firmas por fila)
            t_firmas = doc.add_table(rows=0, cols=2)
            t_firmas.alignment = WD_TABLE_ALIGNMENT.CENTER
            t_firmas.autofit = False

            for f_i in range(0, len(firmantes), 2):
                rf = t_firmas.add_row()
                pair = firmantes[f_i:f_i+2]
                for c_i, signer in enumerate(pair):
                    c_cell = rf.cells[c_i]
                    c_cell.width = Inches(3.6)
                    set_cell_shading(c_cell, "F8FAFC")
                    set_cell_margins(c_cell, 60, 140, 60, 60)
                    p_s = c_cell.paragraphs[0]
                    cargo_s = signer.get('cargo') or 'Asistente'
                    ent_s = signer.get('entidad') or signer.get('empresa') or signer.get('entidade') or ''
                    r_c = p_s.add_run(f"{cargo_s}{f' ({ent_s})' if ent_s else ''}:\n")
                    r_c.bold = True
                    r_c.font.size = Pt(8.5)
                    r_c.font.color.rgb = RGBColor(30, 58, 138)
                    r_n = p_s.add_run(f"{signer.get('nombre') or signer.get('nome') or ''}\n\n\n")
                    r_n.bold = True
                    r_n.font.size = Pt(8.5)
                    r_sig = p_s.add_run("Asdo.: ____________________________")
                    r_sig.font.size = Pt(8)
                    r_sig.font.color.rgb = RGBColor(148, 163, 184)
                if len(pair) == 1:
                    c_empty = rf.cells[1]
                    c_empty.width = Inches(3.6)
            next_sec_reu += 1

    else:
        # ======================================================================
        # DOCUMENTO OFICIAL: ACTA SEMANAL ESTÁNDAR
        # ======================================================================
        # 3. SECCIÓN 1: DATOS XERAIS
        doc.add_paragraph('DATOS XERAIS', style=style_h1)

        t1 = doc.add_table(rows=0, cols=2)
        t1.alignment = WD_TABLE_ALIGNMENT.CENTER
        t1.autofit = False

        fields = [
            [("Proxecto:", obra_titulo, True, "0F172A"), ("Data da visita:", format_date_es(acta_data.get('fecha')), True, "0F172A")],
            [("Emprazamento:", situacion, False, "334155"), ("Expediente nº:", expte, True, "0F172A")],
            [("Contratista:", contratista, True, "0F172A"), ("Estado da acta:", "○ Borrador" if acta_data.get('estado') != 'pechada' else "● Pechada / Emitida", False, "854D0E")],
            [("Dirección de obra:", do_clean, True, "1E3A8A"), ("Dirección de execución:", de_clean, True, "0284C7")],
            [("Coordinador CSS:", css_str, False, "334155"), ("Xefe de Obra:", jo_str, False, "334155")]
        ]

        for row_data in fields:
            row = t1.add_row()
            set_row_bottom_border(row, "E2E8F0", "2")

            # Columna Izquierda
            c1 = row.cells[0]
            c1.width = Inches(3.6)
            set_cell_margins(c1, 35, 35, 40, 40)
            p1 = c1.paragraphs[0]
            lbl1, val1, b1, col1 = row_data[0]
            r_lbl1 = p1.add_run(lbl1 + " ")
            r_lbl1.font.name = 'Arial'
            r_lbl1.font.size = Pt(8.5)
            r_lbl1.font.color.rgb = RGBColor(100, 116, 139)
            r_val1 = p1.add_run(val1)
            r_val1.font.name = 'Arial'
            r_val1.font.size = Pt(8.5)
            r_val1.bold = b1
            if col1 == "1E3A8A": r_val1.font.color.rgb = RGBColor(30, 58, 138)
            elif col1 == "0284C7": r_val1.font.color.rgb = RGBColor(2, 132, 199)
            elif col1 == "0F172A": r_val1.font.color.rgb = RGBColor(15, 23, 42)
            elif col1 == "334155": r_val1.font.color.rgb = RGBColor(51, 65, 85)
            elif col1 == "854D0E": r_val1.font.color.rgb = RGBColor(133, 77, 14)

            # Columna Derecha
            c2 = row.cells[1]
            c2.width = Inches(3.6)
            set_cell_margins(c2, 35, 35, 40, 40)
            p2 = c2.paragraphs[0]
            lbl2, val2, b2, col2 = row_data[1]
            r_lbl2 = p2.add_run(lbl2 + " ")
            r_lbl2.font.name = 'Arial'
            r_lbl2.font.size = Pt(8.5)
            r_lbl2.font.color.rgb = RGBColor(100, 116, 139)
            r_val2 = p2.add_run(val2)
            r_val2.font.name = 'Arial'
            r_val2.font.size = Pt(8.5)
            r_val2.bold = b2
            if col2 == "1E3A8A": r_val2.font.color.rgb = RGBColor(30, 58, 138)
            elif col2 == "0284C7": r_val2.font.color.rgb = RGBColor(2, 132, 199)
            elif col2 == "0F172A": r_val2.font.color.rgb = RGBColor(15, 23, 42)
            elif col2 == "334155": r_val2.font.color.rgb = RGBColor(51, 65, 85)
            elif col2 == "854D0E": r_val2.font.color.rgb = RGBColor(133, 77, 14)
        # 4. SECCIÓN 2: ASISTENTES (ACTA SEMANAL)
        doc.add_paragraph('ASISTENTES', style=style_h1)
        asistentes = [a for a in acta_data.get('asistentes', []) if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste']
        if asistentes:
            t2 = doc.add_table(rows=1, cols=3)
            t2.alignment = WD_TABLE_ALIGNMENT.CENTER
            t2.autofit = False

            h_row = t2.rows[0]
            set_row_bottom_border(h_row, "0284C7", "6")
            headers = [("Nome e Apelidos", 2.36), ("Cargo / Función", 2.46), ("Entidade Representada", 1.97)]
            for idx, (h_title, w_in) in enumerate(headers):
                c = h_row.cells[idx]
                c.width = Inches(w_in)
                set_cell_shading(c, "F1F5F9")
                set_cell_margins(c, 45, 45, 30, 30)
                p = c.paragraphs[0]
                r = p.add_run(h_title)
                r.bold = True
                r.font.size = Pt(8.5)
                r.font.color.rgb = RGBColor(71, 85, 105)

            for a in asistentes:
                r = t2.add_row()
                set_row_bottom_border(r, "E2E8F0", "2")
                nome = a.get('nombre') or a.get('nome') or ''
                cargo = a.get('cargo') or '—'
                entidade = a.get('entidad') or a.get('empresa') or a.get('entidade') or '—'

                # Nome
                c0 = r.cells[0]
                c0.width = Inches(2.36)
                set_cell_margins(c0, 30, 30, 30, 30)
                p0 = c0.paragraphs[0]
                r0 = p0.add_run(nome)
                r0.bold = True
                r0.font.size = Pt(8.5)
                r0.font.color.rgb = RGBColor(15, 23, 42)

                # Cargo
                c1 = r.cells[1]
                c1.width = Inches(2.46)
                set_cell_margins(c1, 30, 30, 30, 30)
                p1 = c1.paragraphs[0]
                r1 = p1.add_run(cargo)
                r1.font.size = Pt(8.5)
                r1.font.color.rgb = RGBColor(71, 85, 105)

                # Entidade
                c2 = r.cells[2]
                c2.width = Inches(1.97)
                set_cell_margins(c2, 30, 30, 30, 30)
                p2 = c2.paragraphs[0]
                r2 = p2.add_run(entidade)
                r2.font.size = Pt(8.5)
                r2.font.color.rgb = RGBColor(100, 116, 139)

        # 5. SECCIÓN 3: CUESTIÓNS TRATADAS NA VISITA / REUNIÓN
        doc.add_paragraph('CUESTIÓNS TRATADAS NA VISITA / REUNIÓN', style=style_h1)
        apartados = acta_data.get('apartados') or []
        cuestiones = acta_data.get('cuestionesTratadas') or []

        if apartados:
            for ap in apartados:
                clean_title = re.sub(r'^\d+[_.\s]+', '', ap.get('titulo', 'Apartado')).strip()
                doc.add_paragraph(clean_title, style=style_h2)
                for sec in ap.get('secciones', []):
                    sec_title = re.sub(r'^\d+(\.\d+)*[_.\s]+', '', sec.get('titulo', '')).strip()
                    if sec_title:
                        p_st = doc.add_paragraph(style='Normal')
                        p_st.paragraph_format.space_before = Pt(4)
                        p_st.paragraph_format.space_after = Pt(2)
                        r_st = p_st.add_run(sec_title)
                        r_st.bold = True
                        r_st.font.size = Pt(9)
                    txt = sec.get('texto', '')
                    if txt:
                        p_txt = doc.add_paragraph(style='Normal')
                        p_txt.paragraph_format.space_before = Pt(1)
                        p_txt.paragraph_format.space_after = Pt(4)
                        r_txt = p_txt.add_run(re.sub(r'<[^>]+>', '', txt).strip())
                        r_txt.font.size = Pt(8.5)
        elif cuestiones:
            for c in cuestiones:
                doc.add_paragraph(c.get('subtitulo', 'Tema tratado'), style=style_h2)
                puntos = c.get('puntos', [])
                if isinstance(puntos, str):
                    puntos = [p.strip() for p in puntos.split('\n') if p.strip()]
                for pt in puntos:
                    p_pt = doc.add_paragraph(style='Normal')
                    p_pt.paragraph_format.left_indent = Inches(0.2)
                    p_pt.paragraph_format.space_before = Pt(2)
                    p_pt.paragraph_format.space_after = Pt(3)
                    r_b = p_pt.add_run('• ')
                    r_b.bold = True
                    r_t = p_pt.add_run(pt)
                    r_t.font.size = Pt(8.5)
                    r_t.font.color.rgb = RGBColor(30, 41, 59)
        else:
            p_empty = doc.add_paragraph(style='Normal')
            r_emp = p_empty.add_run('Desenvolvemento normal dos traballos conforme ao previsto.')
            r_emp.italic = True
            r_emp.font.size = Pt(8.5)
            r_emp.font.color.rgb = RGBColor(100, 116, 139)

        # 6. SECCIÓN 4: INDICACIÓNS CSS (Si existen)
        ind_css = acta_data.get('indicacionesSeguridad', [])
        if isinstance(ind_css, str):
            ind_css = [p.strip() for p in ind_css.split('\n') if p.strip()]
        if ind_css:
            doc.add_paragraph('INDICACIÓNS DO COORDINADOR DE SEGURIDADE E SAÚDE (CSS)', style=style_h1)
            for pt in ind_css:
                p_pt = doc.add_paragraph(style='Normal')
                p_pt.paragraph_format.left_indent = Inches(0.2)
                p_pt.paragraph_format.space_before = Pt(2)
                p_pt.paragraph_format.space_after = Pt(3)
                r_b = p_pt.add_run('• ')
                r_b.bold = True
                r_t = p_pt.add_run(pt)
                r_t.font.size = Pt(8.5)
                r_t.font.color.rgb = RGBColor(30, 41, 59)

        # 7. SECCIÓN 5: PRÓXIMAS ACTUACIÓNS PREVISTAS (Si existen)
        act_prev = acta_data.get('actuacionesPrevistas', [])
        if isinstance(act_prev, str):
            act_prev = [p.strip() for p in act_prev.split('\n') if p.strip()]
        if act_prev:
            doc.add_paragraph('PRÓXIMAS ACTUACIÓNS PREVISTAS', style=style_h1)
            for pt in act_prev:
                p_pt = doc.add_paragraph(style='Normal')
                p_pt.paragraph_format.left_indent = Inches(0.2)
                p_pt.paragraph_format.space_before = Pt(2)
                p_pt.paragraph_format.space_after = Pt(3)
                r_b = p_pt.add_run('• ')
                r_b.bold = True
                r_t = p_pt.add_run(pt)
                r_t.font.size = Pt(8.5)
                r_t.font.color.rgb = RGBColor(30, 41, 59)

        # 8. SECCIÓN 6: DILIXENCIA DE FIRMAS
        asistentes_raw = acta_data.get('asistentes', [])
        firmantes_acta = [a for a in asistentes_raw if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste' and a.get('firma')]

        if firmantes_acta:
            doc.add_paragraph('DILIXENCIA DE FIRMAS', style=style_h1)
            p_f_intro = doc.add_paragraph(style='Normal')
            p_f_intro.paragraph_format.space_after = Pt(8)
            lugar = 'Ferrol' if 'ferrol' in situacion.lower() else situacion.split(',')[-1].strip() or 'Ferrol'
            r_fi = p_f_intro.add_run(f"En {lugar} a {format_date_long_es(acta_data.get('fecha'))}. Para que así conste e aos efectos oportunos, asinan a presente acta:")
            r_fi.italic = True
            r_fi.font.size = Pt(8.5)
            r_fi.font.color.rgb = RGBColor(71, 85, 105)

            t_f = doc.add_table(rows=0, cols=2)
            t_f.alignment = WD_TABLE_ALIGNMENT.CENTER
            t_f.autofit = False

            for f_i in range(0, len(firmantes_acta), 2):
                rf = t_f.add_row()
                pair = firmantes_acta[f_i:f_i+2]
                for c_i, signer in enumerate(pair):
                    c_cell = rf.cells[c_i]
                    c_cell.width = Inches(3.6)
                    set_cell_shading(c_cell, "F8FAFC")
                    set_cell_margins(c_cell, 60, 140, 60, 60)
                    p_s = c_cell.paragraphs[0]
                    cargo_s = signer.get('cargo') or 'Asistente'
                    ent_s = signer.get('entidad') or signer.get('empresa') or signer.get('entidade') or ''
                    r_c = p_s.add_run(f"{cargo_s}{f' ({ent_s})' if ent_s else ''}:\n")
                    r_c.bold = True
                    r_c.font.size = Pt(8.5)
                    r_c.font.color.rgb = RGBColor(30, 58, 138)
                    r_n = p_s.add_run(f"{signer.get('nombre') or signer.get('nome') or ''}\n\n\n")
                    r_n.bold = True
                    r_n.font.size = Pt(8.5)
                    r_sig = p_s.add_run("Asdo.: ____________________________")
                    r_sig.font.size = Pt(8)
                    r_sig.font.color.rgb = RGBColor(148, 163, 184)
                if len(pair) == 1:
                    c_empty = rf.cells[1]
                    c_empty.width = Inches(3.6)

    # 9. SECCIÓN 7: ANEXO REPORTAXE FOTOGRÁFICO (Cuadrícula 2x2 preservando proporciones)
    fotos = acta_data.get('fotos', [])
    if fotos:
        if es_reunion:
            doc.add_paragraph(f'{next_sec_reu}.- ANEXO REPORTAXE FOTOGRÁFICO', style=style_h1)
            next_sec_reu += 1
        else:
            doc.add_paragraph('ANEXO REPORTAXE FOTOGRÁFICO', style=style_h1)
        for i in range(0, len(fotos), 2):
            t_foto = doc.add_table(rows=1, cols=2)
            t_foto.alignment = WD_TABLE_ALIGNMENT.CENTER
            t_foto.autofit = False
            row_p = t_foto.rows[0]

            for col_idx, f_idx in enumerate([i, i + 1]):
                cell = row_p.cells[col_idx]
                cell.width = Inches(3.6)
                set_cell_shading(cell, "FAFAFA")
                set_cell_margins(cell, 40, 40, 40, 40)

                if f_idx < len(fotos):
                    foto = fotos[f_idx]
                    img_path = decode_image_data(foto.get('url'))
                    if img_path and os.path.exists(img_path):
                        try:
                            if Image is not None:
                                with Image.open(img_path) as im:
                                    nw, nh = im.size
                            else:
                                nw, nh = 800, 600
                            max_w = 3.2
                            max_h = 2.1
                            w_in = max_w
                            h_in = w_in * (nh / max(1, nw))
                            if h_in > max_h:
                                h_in = max_h
                                w_in = h_in * (nw / max(1, nh))

                            p_img = cell.paragraphs[0]
                            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            r_img = p_img.add_run()
                            r_img.add_picture(img_path, width=Inches(w_in), height=Inches(h_in))
                        except Exception as e_im:
                            sys.stderr.write(f"Error insertando foto {f_idx}: {e_im}\n")

                    p_lbl = cell.add_paragraph()
                    p_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_lbl.paragraph_format.space_before = Pt(4)
                    r_fnum = p_lbl.add_run(f"Foto {f_idx + 1} ")
                    r_fnum.bold = True
                    r_fnum.font.size = Pt(8)
                    r_fnum.font.color.rgb = RGBColor(30, 58, 138)
                    if foto.get('fecha'):
                        r_fdate = p_lbl.add_run(f"[{format_date_es(foto.get('fecha'))}] ")
                        r_fdate.font.size = Pt(7.5)
                        r_fdate.font.color.rgb = RGBColor(100, 116, 139)
                    r_fdesc = p_lbl.add_run(foto.get('descripcion') or 'Imaxe da obra')
                    r_fdesc.font.size = Pt(8)

    # 10. SECCIÓN 8: ANEXO DOCUMENTACIÓN COMPLEMENTARIA
    anexos = acta_data.get('anexosPdf') or acta_data.get('anexos') or []
    if anexos:
        if es_reunion:
            doc.add_paragraph(f'{next_sec_reu}.- ANEXO DOCUMENTACIÓN COMPLEMENTARIA', style=style_h1)
            next_sec_reu += 1
        else:
            doc.add_paragraph('ANEXO DOCUMENTACIÓN COMPLEMENTARIA', style=style_h1)
        t_anx = doc.add_table(rows=1, cols=3)
        t_anx.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_anx.autofit = False

        h_anx = t_anx.rows[0]
        set_row_bottom_border(h_anx, "0284C7", "6")
        for idx, (h_title, w_in) in enumerate([("#", 0.6), ("Documento / Arquivo", 4.8), ("Tamaño", 1.8)]):
            c = h_anx.cells[idx]
            c.width = Inches(w_in)
            set_cell_shading(c, "F1F5F9")
            set_cell_margins(c, 40, 40, 30, 30)
            p = c.paragraphs[0]
            if idx == 0: p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif idx == 2: p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(h_title)
            r.bold = True
            r.font.size = Pt(8)
            r.font.color.rgb = RGBColor(71, 85, 105)

        for a_idx, anx in enumerate(anexos):
            r = t_anx.add_row()
            set_row_bottom_border(r, "E2E8F0", "2")

            c0 = r.cells[0]
            c0.width = Inches(0.6)
            set_cell_margins(c0, 30, 30, 20, 20)
            p0 = c0.paragraphs[0]
            p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r0 = p0.add_run(str(a_idx + 1))
            r0.font.size = Pt(8)

            c1 = r.cells[1]
            c1.width = Inches(4.8)
            set_cell_margins(c1, 30, 30, 30, 30)
            p1 = c1.paragraphs[0]
            anx_titulo = anx.get('nombre') or anx.get('titulo') or anx.get('nome') or 'Documento Anexo'
            anx_desc = (anx.get('descripcion') or '').strip()
            anx_archivo = anx.get('archivo') or ''

            r1 = p1.add_run(anx_titulo)
            r1.bold = True
            r1.font.size = Pt(8.5)
            r1.font.color.rgb = RGBColor(15, 71, 97)

            if anx_desc:
                p_desc = c1.add_paragraph()
                p_desc.paragraph_format.space_before = Pt(1)
                p_desc.paragraph_format.space_after = Pt(1)
                r_desc = p_desc.add_run(anx_desc)
                r_desc.font.size = Pt(8)
                r_desc.font.italic = True
                r_desc.font.color.rgb = RGBColor(51, 65, 85)

            if anx_archivo and anx_archivo != anx_titulo:
                p_arch = c1.add_paragraph()
                p_arch.paragraph_format.space_before = Pt(1)
                p_arch.paragraph_format.space_after = Pt(1)
                r_arch = p_arch.add_run(f"Ficheiro: {anx_archivo}")
                r_arch.font.size = Pt(7.5)
                r_arch.font.color.rgb = RGBColor(100, 116, 139)

            c2 = r.cells[2]
            c2.width = Inches(1.8)
            set_cell_margins(c2, 30, 30, 20, 20)
            p2 = c2.paragraphs[0]
            p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            tam = anx.get('tamano') or anx.get('size') or 0
            tam_str = f"{tam / (1024*1024):.1f} MB" if tam >= 1024*1024 else (f"{tam / 1024:.0f} KB" if tam >= 1024 else f"{tam} B")
            r2 = p2.add_run(tam_str)
            r2.font.size = Pt(8)
            r2.font.color.rgb = RGBColor(100, 116, 139)

    doc.save(output_docx)

    # 11. EXPORTACIÓN A PDF Y FUSIÓN DE SEPARATAS CON ANEXOS
    pdf_result = None
    if output_pdf:
        try:
            import win32com.client
            import pythoncom
            pythoncom.CoInitialize()
            word = win32com.client.DispatchEx('Word.Application')
            word.Visible = False
            word.DisplayAlerts = False
            try:
                doc_w = word.Documents.Open(os.path.abspath(output_docx))
                doc_w.SaveAs(os.path.abspath(output_pdf), FileFormat=17) # 17 = wdFormatPDF
                doc_w.Close(False)
                pdf_result = output_pdf
            finally:
                word.Quit()
                pythoncom.CoUninitialize()
        except Exception as e:
            sys.stderr.write(f"Aviso al exportar a PDF con Word COM: {e}\n")
            try:
                from docx2pdf import convert
                convert(output_docx, output_pdf)
                pdf_result = output_pdf
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

        anexos_pdf = acta_data.get('anexosPdf') or []
        if pdf_result and os.path.exists(pdf_result) and anexos_pdf:
            try:
                writer = pypdf.PdfWriter()
                writer.append(pdf_result)
                temp_pdf_files = []

                try:
                    from generar_separata import generar_separata_pdf
                except ImportError:
                    from src.py.generar_separata import generar_separata_pdf

                for idx, anexo in enumerate(anexos_pdf):
                    anexo_data = anexo.get('data') or anexo.get('dataUrl') or anexo.get('url') if isinstance(anexo, dict) else anexo
                    anexo_nombre = anexo.get('nombre') or anexo.get('titulo') if isinstance(anexo, dict) else f"Documento Anexo {idx + 1}"
                    anexo_desc = (anexo.get('descripcion') or '').strip() if isinstance(anexo, dict) else ''
                    anexo_archivo = anexo.get('archivo') or '' if isinstance(anexo, dict) else ''
                    if not anexo_data:
                        continue

                    # Separata institucional previa
                    try:
                        sep_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                        detalles = [f"Nome do documento: {anexo_nombre}"]
                        if anexo_desc:
                            detalles.append(f"Descrición: {anexo_desc}")
                        if anexo_archivo and anexo_archivo != anexo_nombre:
                            detalles.append(f"Arquivo adxunto: {anexo_archivo}")

                        sep_payload = {
                            "tipo": "documento_anexo",
                            "titulo": f"ANEXO: {(anexo_nombre or f'Documento {idx+1}').upper()}",
                            "subtitulo": anexo_desc or f"Documentación complementaria incorporada á Acta de Obra nº {acta_data.get('numero', '')}.",
                            "obra": obra_titulo,
                            "expediente": expte,
                            "tipo_doc": "ACTA SEMANAL",
                            "numero": str(acta_data.get('numero', '1')),
                            "fecha": format_date_es(acta_data.get('fecha', ''))
                        }
                        generar_separata_pdf(sep_payload, sep_tmp)
                        temp_pdf_files.append(sep_tmp)
                        writer.append(sep_tmp)
                    except Exception as se:
                        sys.stderr.write(f"Aviso generando separata para anexo {idx}: {se}\n")

                    if isinstance(anexo_data, str) and os.path.exists(anexo_data):
                        writer.append(anexo_data)
                    elif isinstance(anexo_data, str) and ';base64,' in anexo_data:
                        _, b64 = anexo_data.split(';base64,', 1)
                        pdf_bytes = base64.b64decode(b64)
                        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                        tmp.write(pdf_bytes)
                        tmp.close()
                        temp_pdf_files.append(tmp.name)
                        writer.append(tmp.name)
                    elif isinstance(anexo_data, str) and anexo_data.startswith('%PDF'):
                        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                        tmp.write(anexo_data.encode('latin1'))
                        tmp.close()
                        temp_pdf_files.append(tmp.name)
                        writer.append(tmp.name)

                tmp_merged = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                writer.write(tmp_merged)
                writer.close()
                shutil.copyfile(tmp_merged, pdf_result)
                try: os.remove(tmp_merged)
                except Exception: pass
                for tf in temp_pdf_files:
                    try: os.remove(tf)
                    except Exception: pass
            except Exception as pe:
                sys.stderr.write(f"Aviso adjuntando anexos PDF con separatas: {pe}\n")

    return {
        "success": True,
        "docx": output_docx,
        "pdf": pdf_result
    }


def main():
    parser = argparse.ArgumentParser(description="Generar acta DOCX y PDF a partir de plantilla")
    parser.add_argument('--data', help="Ruta al archivo JSON con los datos del acta")
    parser.add_argument('--json-str', help="String JSON con los datos del acta")
    parser.add_argument('--output-docx', help="Ruta de destino del archivo .docx")
    parser.add_argument('--output-pdf', help="Ruta de destino del archivo .pdf")
    parser.add_argument('--plantilla', default='ejemplo_modificado_acta_semanal.docx', help="Ruta a ejemplo_modificado_acta_semanal.docx")
    args = parser.parse_args()

    acta_data = None
    if args.data and os.path.exists(args.data):
        with open(args.data, 'r', encoding='utf-8') as f:
            acta_data = json.load(f)
    elif args.json_str:
        acta_data = json.loads(args.json_str)

    if not acta_data:
        print(json.dumps({"success": False, "error": "No se proporcionaron datos de acta válidos"}))
        sys.exit(1)

    numero = acta_data.get('numero', 'acta')
    fecha = acta_data.get('fecha', 'fecha')
    out_docx = args.output_docx or os.path.abspath(f"dist_actas/Acta_{numero}_{fecha}.docx")
    out_pdf = args.output_pdf or os.path.abspath(f"dist_actas/Acta_{numero}_{fecha}.pdf")

    try:
        res = generar_acta_desde_plantilla(acta_data, out_docx, out_pdf, args.plantilla)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
