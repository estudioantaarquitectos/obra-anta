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

        # Celda central: Proyecto y Expediente manteniendo el estilo exacto de la plantilla (Texto, sin sangría)
        c_proj = t_head.cell(0, 1)
        for p in list(c_proj.paragraphs):
            p._element.getparent().remove(p._element)

        style_header_txt = 'Texto' if 'Texto' in doc.styles else 'Normal'

        p1 = c_proj.add_paragraph(style=style_header_txt)
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(0)
        p1.paragraph_format.left_indent = Pt(0)
        p1.add_run(obra_titulo)

        p2 = c_proj.add_paragraph(style=style_header_txt)
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(0)
        p2.paragraph_format.left_indent = Pt(0)
        r2 = p2.add_run(f"(EXPTE: {expte})")
        r2.font.size = Pt(9)

        # Celda título: ACTA SEMANAL o REUNIÓN según tipo de documento
        es_reunion = acta_data.get('tipoDocumento') == 'reunion' or acta_data.get('tipo') == 'reunion' or acta_data.get('esReunion') is True
        for col_t in (2, 3):
            try:
                c_title = t_head.cell(0, col_t)
                if c_title.paragraphs:
                    p = c_title.paragraphs[0]
                    p.paragraph_format.space_before = Pt(0)
                    p.paragraph_format.left_indent = Pt(0)
                    p.text = "REUNIÓN" if es_reunion else "ACTA SEMANAL"
                    if p.runs:
                        p.runs[0].bold = True
                        p.runs[0].font.size = Pt(11)
            except Exception:
                pass

        # Celda número
        c_num = t_head.cell(1, 2)
        if c_num.paragraphs:
            p = c_num.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.left_indent = Pt(0)
            p.text = str(acta_data.get('numero') or '')
            if p.runs:
                p.runs[0].bold = True
                p.runs[0].font.size = Pt(18)

        # Celda fecha
        c_date = t_head.cell(1, 3)
        if c_date.paragraphs:
            p_d = c_date.paragraphs[0]
            p_d.paragraph_format.space_before = Pt(0)
            p_d.paragraph_format.left_indent = Pt(0)
            p_d.text = format_date_es(acta_data.get('fecha', ''))

    # 2. LIMPIAR PÁRRAFOS E TABLAS DE MUESTRA DEL CUERPO
    for p in list(doc.paragraphs):
        p._element.getparent().remove(p._element)
    for t in list(doc.tables):
        t._element.getparent().remove(t._element)

    # Eliminar cualquier borde inferior azul de página (w:pgBorders) en todas las secciones
    for s in doc.sections:
        for b in s._sectPr.xpath('./w:pgBorders'):
            s._sectPr.remove(b)

    # Helper para estilos disponibles en la plantilla oficial modificada
    style_h1 = 'Heading 1' if 'Heading 1' in doc.styles else ('Ttulo1' if 'Ttulo1' in doc.styles else 'Heading 1')
    style_h2 = 'Heading 2' if 'Heading 2' in doc.styles else ('Ttulo2' if 'Ttulo2' in doc.styles else 'Heading 2')
    style_h3 = 'Heading 3' if 'Heading 3' in doc.styles else ('Ttulo3' if 'Ttulo3' in doc.styles else 'Heading 3')
    style_grid_accent1 = 'Grid Table 1 Light Accent 1' if 'Grid Table 1 Light Accent 1' in doc.styles else None

    co = acta_data.get('currentObra') or {}
    situacion = acta_data.get('situacion') or co.get('situacion') or '—'
    contratista = acta_data.get('contratista') or co.get('contratista') or '—'
    raw_do = acta_data.get('doClean') or co.get('direccionObra') or acta_data.get('direccionObra') or ''
    do_clean = raw_do.split(' / ')[0].strip() if ' / ' in raw_do else (raw_do or '—')
    de_clean = acta_data.get('deClean') or co.get('direccionEjecucion') or acta_data.get('direccionEjecucion') or (raw_do.split(' / ')[1].strip() if ' / ' in raw_do else '—')
    css_str = acta_data.get('coordinadorCSSStr') or co.get('coordinadorCSS') or acta_data.get('coordinadorCSS') or '—'
    jo_str = acta_data.get('jefeObraStr') or co.get('jefeObra') or acta_data.get('jefeObra') or '—'
    es_reunion = acta_data.get('tipoDocumento') == 'reunion' or acta_data.get('tipo') == 'reunion' or acta_data.get('esReunion') is True

    def set_table_cell_p_format(p, left_dxa=107, before_dxa=0, after_dxa=0):
        pPr = p._p.get_or_add_pPr()
        for old_spc in pPr.xpath('./w:spacing'):
            pPr.remove(old_spc)
        for old_ind in pPr.xpath('./w:ind'):
            pPr.remove(old_ind)
        pPr.append(parse_xml(f'<w:spacing {nsdecls("w")} w:before="{before_dxa}" w:after="{after_dxa}"/>'))
        pPr.append(parse_xml(f'<w:ind {nsdecls("w")} w:left="{left_dxa}"/>'))

    def build_datos_table(fields_rows):
        tbl = doc.add_table(rows=0, cols=2)
        tbl.autofit = False
        tblPr = tbl._tbl.tblPr
        for old_w in tblPr.xpath('./w:tblW'):
            tblPr.remove(old_w)
        tblPr.append(parse_xml(f'<w:tblW {nsdecls("w")} w:w="9842" w:type="dxa"/>'))
        tblPr.append(parse_xml(f'<w:tblLayout {nsdecls("w")} w:type="fixed"/>'))
        tblPr.append(parse_xml(f'<w:tblLook {nsdecls("w")} w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'))

        col_dxa = [5245, 4597]
        for row_data in fields_rows:
            row = tbl.add_row()
            set_row_bottom_border(row, "E2E8F0", "2")
            for col_i in range(2):
                cell = row.cells[col_i]
                tcPr = cell._tc.get_or_add_tcPr()
                for old_tcw in tcPr.xpath('./w:tcW'):
                    tcPr.remove(old_tcw)
                tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="{col_dxa[col_i]}" w:type="dxa"/>'))
                set_cell_margins(cell, 35, 35, 40, 40)
                tcPr.append(parse_xml(f'<w:vAlign {nsdecls("w")} w:val="center"/>'))

                p = cell.paragraphs[0]
                set_table_cell_p_format(p, left_dxa=107, before_dxa=0, after_dxa=0)
                lbl, val, b, col = row_data[col_i]
                r_lbl = p.add_run(lbl + " ")
                r_lbl.font.color.rgb = RGBColor(100, 116, 139)
                r_val = p.add_run(val)
                if b:
                    r_val.bold = True
                if col == "1E3A8A":
                    r_val.font.color.rgb = RGBColor(30, 58, 138)
                elif col == "0284C7":
                    r_val.font.color.rgb = RGBColor(2, 132, 199)
                elif col == "854D0E":
                    r_val.font.color.rgb = RGBColor(133, 77, 14)
                elif col == "166534":
                    r_val.font.color.rgb = RGBColor(22, 101, 52)
        return tbl

    def build_asistentes_table(asistentes_list):
        if not asistentes_list:
            return None
        tbl = doc.add_table(rows=1, cols=3)
        if style_grid_accent1:
            tbl.style = style_grid_accent1
        tbl.autofit = False
        tblPr = tbl._tbl.tblPr
        for old_w in tblPr.xpath('./w:tblW'):
            tblPr.remove(old_w)
        tblPr.append(parse_xml(f'<w:tblW {nsdecls("w")} w:w="9781" w:type="dxa"/>'))
        tblPr.append(parse_xml(f'<w:tblLayout {nsdecls("w")} w:type="fixed"/>'))
        for old_look in tblPr.xpath('./w:tblLook'):
            tblPr.remove(old_look)
        tblPr.append(parse_xml(f'<w:tblLook {nsdecls("w")} w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'))

        col_dxa = [3402, 3544, 2835]
        headers = ["Nome e Apelidos", "Cargo / Función", "Entidade Representada"]
        h_row = tbl.rows[0]
        for idx, h_title in enumerate(headers):
            c = h_row.cells[idx]
            tcPr = c._tc.get_or_add_tcPr()
            for old_tcw in tcPr.xpath('./w:tcW'):
                tcPr.remove(old_tcw)
            tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="{col_dxa[idx]}" w:type="dxa"/>'))
            tcPr.append(parse_xml(f'<w:vAlign {nsdecls("w")} w:val="center"/>'))
            p = c.paragraphs[0]
            set_table_cell_p_format(p, left_dxa=107, before_dxa=0, after_dxa=0)
            r = p.add_run(h_title)
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(71, 85, 105)

        for a in asistentes_list:
            r = tbl.add_row()
            nome = a.get('nombre') or a.get('nome') or ''
            cargo = a.get('cargo') or '—'
            entidade = a.get('entidad') or a.get('empresa') or a.get('entidade') or '—'
            vals = [
                (nome, RGBColor(15, 23, 42)),
                (cargo, RGBColor(71, 85, 105)),
                (entidade, RGBColor(100, 116, 139))
            ]
            for idx, (val_str, col_rgb) in enumerate(vals):
                c = r.cells[idx]
                tcPr = c._tc.get_or_add_tcPr()
                for old_tcw in tcPr.xpath('./w:tcW'):
                    tcPr.remove(old_tcw)
                tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="{col_dxa[idx]}" w:type="dxa"/>'))
                tcPr.append(parse_xml(f'<w:vAlign {nsdecls("w")} w:val="center"/>'))
                p = c.paragraphs[0]
                set_table_cell_p_format(p, left_dxa=107, before_dxa=0, after_dxa=0)
                run = p.add_run(val_str)
                run.font.size = Pt(8.5)
                run.font.color.rgb = col_rgb
        return tbl

    def render_apartados_and_cuestiones(apartados_list, cuestiones_list, empty_msg):
        if apartados_list:
            for ap in apartados_list:
                clean_title = re.sub(r'^\d+(\.\d+)*[_.\s-]+', '', ap.get('titulo', 'Apartado')).strip()
                doc.add_paragraph(clean_title, style=style_h2)
                for sec in ap.get('secciones', []):
                    sec_title = re.sub(r'^\d+(\.\d+)*[_.\s-]+', '', sec.get('titulo', '')).strip()
                    if sec_title:
                        doc.add_paragraph(sec_title, style=style_h3)
                    txt = sec.get('texto', '')
                    if txt:
                        clean_txt = re.sub(r'<\s*br\s*/?\s*>', '\n', txt, flags=re.IGNORECASE)
                        clean_txt = re.sub(r'</\s*(p|div|li)\s*>', '\n', clean_txt, flags=re.IGNORECASE)
                        clean_txt = re.sub(r'<[^>]+>', '', clean_txt)
                        lines = [ln.strip() for ln in clean_txt.split('\n') if ln.strip()]
                        for ln in lines:
                            doc.add_paragraph(ln, style='Normal')
        elif cuestiones_list:
            for c in cuestiones_list:
                doc.add_paragraph(c.get('subtitulo', 'Tema tratado'), style=style_h2)
                puntos = c.get('puntos', [])
                if isinstance(puntos, str):
                    puntos = [p.strip() for p in puntos.split('\n') if p.strip()]
                for pt in puntos:
                    doc.add_paragraph(f"• {pt}", style='Normal')
        else:
            p_empty = doc.add_paragraph(style='Normal')
            r_emp = p_empty.add_run(empty_msg)
            r_emp.italic = True
            r_emp.font.color.rgb = RGBColor(100, 116, 139)

    def render_firmas_section(firmantes_list, intro_text):
        if not firmantes_list:
            return
        doc.add_paragraph('DILIXENCIA DE FIRMAS', style=style_h1)
        p_f_intro = doc.add_paragraph(style='Normal')
        r_fi = p_f_intro.add_run(intro_text)
        r_fi.italic = True
        r_fi.font.color.rgb = RGBColor(71, 85, 105)

        t_f = doc.add_table(rows=0, cols=2)
        t_f.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_f.autofit = False

        for f_i in range(0, len(firmantes_list), 2):
            rf = t_f.add_row()
            pair = firmantes_list[f_i:f_i+2]
            for c_i, signer in enumerate(pair):
                c_cell = rf.cells[c_i]
                tcPr = c_cell._tc.get_or_add_tcPr()
                for old_tcw in tcPr.xpath('./w:tcW'):
                    tcPr.remove(old_tcw)
                tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="5184" w:type="dxa"/>'))
                set_cell_shading(c_cell, "F8FAFC")
                set_cell_margins(c_cell, 60, 140, 60, 60)
                p_s = c_cell.paragraphs[0]
                set_table_cell_p_format(p_s, left_dxa=0, before_dxa=0, after_dxa=0)
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
                tcPr_e = c_empty._tc.get_or_add_tcPr()
                tcPr_e.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="5184" w:type="dxa"/>'))

    if es_reunion:
        # ======================================================================
        # DOCUMENTO OFICIAL: REUNIÓN (Mismos estilos que Acta Semanal)
        # ======================================================================
        # 1- DATOS XERAIS DA OBRA
        doc.add_paragraph('DATOS XERAIS DA OBRA', style=style_h1)
        fields_obra = [
            [("Proxecto:", obra_titulo, True, None), ("Emprazamento:", situacion, False, None)],
            [("Expediente nº:", expte, True, None), ("Contratista:", contratista, True, None)],
            [("Dirección de obra:", do_clean, True, "1E3A8A"), ("Dirección de execución:", de_clean, True, "0284C7")],
            [("Coordinador CSS:", css_str, False, None), ("Xefe de Obra:", jo_str, False, None)]
        ]
        build_datos_table(fields_obra)

        # 2- DATOS XERAIS DA REUNIÓN
        doc.add_paragraph('DATOS XERAIS DA REUNIÓN', style=style_h1)
        fecha_val = format_date_long_es(acta_data.get('fecha'))
        hora_val = acta_data.get('hora') or '10:00'
        tipo_reu = acta_data.get('tipoModalidad') or acta_data.get('tipoReunion') or 'Presencial'
        lugar_val = acta_data.get('lugar') or 'Caseta de obra'

        fields_reu = [
            [("Data:", fecha_val, True, None), ("Hora:", hora_val, True, None)],
            [("Tipo de reunión:", tipo_reu, True, "1E3A8A"), ("Lugar:", lugar_val, False, None)]
        ]
        build_datos_table(fields_reu)

        # 3- ASISTENTES
        doc.add_paragraph('ASISTENTES', style=style_h1)
        asistentes = [a for a in acta_data.get('asistentes', []) if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste']
        build_asistentes_table(asistentes)

        # 4- CUESTIÓNS TRATADAS NA REUNIÓN
        doc.add_paragraph('CUESTIÓNS TRATADAS NA REUNIÓN', style=style_h1)
        render_apartados_and_cuestiones(
            acta_data.get('apartados') or [],
            acta_data.get('cuestionesTratadas') or [],
            'Desenvolvemento normal dos acordos acadados na reunión.'
        )

        # 5- FIRMAS (Sólo si hay algún asistente con firma marcada)
        firmantes = [a for a in acta_data.get('asistentes', []) if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste' and a.get('firma')]
        lugar_str = lugar_val or ('Ferrol' if 'ferrol' in situacion.lower() else situacion.split(',')[-1].strip() or 'Ferrol')
        render_firmas_section(
            firmantes,
            f"En {lugar_str} a {fecha_val}. Para que así conste e aos efectos oportunos, asinan a presente acta de reunión:"
        )

    else:
        # ======================================================================
        # DOCUMENTO OFICIAL: ACTA SEMANAL ESTÁNDAR
        # ======================================================================
        # 3. SECCIÓN 1: DATOS XERAIS
        doc.add_paragraph('DATOS XERAIS', style=style_h1)
        fields = [
            [("Proxecto:", obra_titulo, True, None), ("Data da visita:", format_date_es(acta_data.get('fecha')), True, None)],
            [("Emprazamento:", situacion, False, None), ("Expediente nº:", expte, True, None)],
            [("Contratista:", contratista, True, None), ("Estado da acta:", "○ Borrador" if acta_data.get('estado') != 'pechada' else "● Pechada / Emitida", False, None)],
            [("Dirección de obra:", do_clean, True, "1E3A8A"), ("Dirección de execución:", de_clean, True, "0284C7")],
            [("Coordinador CSS:", css_str, False, None), ("Xefe de Obra:", jo_str, False, None)]
        ]
        build_datos_table(fields)

        # 4. SECCIÓN 2: ASISTENTES (ACTA SEMANAL)
        doc.add_paragraph('ASISTENTES', style=style_h1)
        asistentes = [a for a in acta_data.get('asistentes', []) if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste']
        build_asistentes_table(asistentes)

        # 5. SECCIÓN 3: CUESTIÓNS TRATADAS NA VISITA / REUNIÓN
        doc.add_paragraph('CUESTIÓNS TRATADAS NA VISITA / REUNIÓN', style=style_h1)
        render_apartados_and_cuestiones(
            acta_data.get('apartados') or [],
            acta_data.get('cuestionesTratadas') or [],
            'Desenvolvemento normal dos traballos conforme ao previsto.'
        )

        # 6. SECCIÓN 4: INDICACIÓNS CSS (Si existen)
        ind_css = acta_data.get('indicacionesSeguridad', [])
        if isinstance(ind_css, str):
            ind_css = [p.strip() for p in ind_css.split('\n') if p.strip()]
        if ind_css:
            doc.add_paragraph('INDICACIÓNS DO COORDINADOR DE SEGURIDADE E SAÚDE (CSS)', style=style_h1)
            for pt in ind_css:
                doc.add_paragraph(f"• {pt}", style='Normal')

        # 7. SECCIÓN 5: PRÓXIMAS ACTUACIÓNS PREVISTAS (Si existen)
        act_prev = acta_data.get('actuacionesPrevistas', [])
        if isinstance(act_prev, str):
            act_prev = [p.strip() for p in act_prev.split('\n') if p.strip()]
        if act_prev:
            doc.add_paragraph('PRÓXIMAS ACTUACIÓNS PREVISTAS', style=style_h1)
            for pt in act_prev:
                doc.add_paragraph(f"• {pt}", style='Normal')

        # 8. SECCIÓN 6: DILIXENCIA DE FIRMAS
        asistentes_raw = acta_data.get('asistentes', [])
        firmantes_acta = [a for a in asistentes_raw if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste' and a.get('firma')]
        lugar = 'Ferrol' if 'ferrol' in situacion.lower() else situacion.split(',')[-1].strip() or 'Ferrol'
        render_firmas_section(
            firmantes_acta,
            f"En {lugar} a {format_date_long_es(acta_data.get('fecha'))}. Para que así conste e aos efectos oportunos, asinan a presente acta:"
        )

    # 9. SECCIÓN 7: ANEXO REPORTAXE FOTOGRÁFICO (Cuadrícula 2x2 preservando proporciones)
    fotos = acta_data.get('fotos', [])
    if fotos:
        doc.add_paragraph('ANEXO REPORTAXE FOTOGRÁFICO', style=style_h1)
        for i in range(0, len(fotos), 2):
            t_foto = doc.add_table(rows=1, cols=2)
            t_foto.alignment = WD_TABLE_ALIGNMENT.CENTER
            t_foto.autofit = False
            row_p = t_foto.rows[0]

            for col_idx, f_idx in enumerate([i, i + 1]):
                cell = row_p.cells[col_idx]
                tcPr = cell._tc.get_or_add_tcPr()
                for old_tcw in tcPr.xpath('./w:tcW'):
                    tcPr.remove(old_tcw)
                tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="5184" w:type="dxa"/>'))
                set_cell_shading(cell, "FAFAFA")
                set_cell_margins(cell, 40, 40, 40, 40)

                if f_idx < len(fotos):
                    foto = fotos[f_idx]
                    img_path = decode_image_data(foto.get('url'))
                    p_img = cell.paragraphs[0]
                    set_table_cell_p_format(p_img, left_dxa=0, before_dxa=0, after_dxa=0)
                    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
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

                            r_img = p_img.add_run()
                            r_img.add_picture(img_path, width=Inches(w_in), height=Inches(h_in))
                        except Exception as e_im:
                            sys.stderr.write(f"Error insertando foto {f_idx}: {e_im}\n")

                    p_lbl = cell.add_paragraph()
                    set_table_cell_p_format(p_lbl, left_dxa=0, before_dxa=80, after_dxa=0)
                    p_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
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
        doc.add_paragraph('ANEXO DOCUMENTACIÓN COMPLEMENTARIA', style=style_h1)
        t_anx = doc.add_table(rows=1, cols=3)
        if style_grid_accent1:
            t_anx.style = style_grid_accent1
        t_anx.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_anx.autofit = False

        h_anx = t_anx.rows[0]
        if not style_grid_accent1:
            set_row_bottom_border(h_anx, "0284C7", "6")
        for idx, (h_title, w_in) in enumerate([("#", 0.6), ("Documento / Arquivo", 4.8), ("Tamaño", 1.8)]):
            c = h_anx.cells[idx]
            c.width = Inches(w_in)
            if not style_grid_accent1:
                set_cell_shading(c, "F1F5F9")
                set_cell_margins(c, 40, 40, 30, 30)
            p = c.paragraphs[0]
            set_table_cell_p_format(p, left_dxa=107, before_dxa=0, after_dxa=0)
            if idx == 0: p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif idx == 2: p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(h_title)
            r.bold = True
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(71, 85, 105)

        for a_idx, anx in enumerate(anexos):
            r = t_anx.add_row()
            if not style_grid_accent1:
                set_row_bottom_border(r, "E2E8F0", "2")

            c0 = r.cells[0]
            c0.width = Inches(0.6)
            p0 = c0.paragraphs[0]
            set_table_cell_p_format(p0, left_dxa=0, before_dxa=0, after_dxa=0)
            p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r0 = p0.add_run(str(a_idx + 1))
            r0.font.size = Pt(8.5)

            c1 = r.cells[1]
            c1.width = Inches(4.8)
            p1 = c1.paragraphs[0]
            set_table_cell_p_format(p1, left_dxa=107, before_dxa=0, after_dxa=0)
            anx_titulo = anx.get('nombre') or anx.get('titulo') or anx.get('nome') or 'Documento Anexo'
            anx_desc = (anx.get('descripcion') or '').strip()
            anx_archivo = anx.get('archivo') or ''

            r1 = p1.add_run(anx_titulo)
            r1.bold = True
            r1.font.size = Pt(8.5)
            r1.font.color.rgb = RGBColor(15, 71, 97)

            if anx_desc:
                p_desc = c1.add_paragraph()
                set_table_cell_p_format(p_desc, left_dxa=107, before_dxa=20, after_dxa=20)
                r_desc = p_desc.add_run(anx_desc)
                r_desc.font.size = Pt(8)
                r_desc.font.italic = True
                r_desc.font.color.rgb = RGBColor(51, 65, 85)

            if anx_archivo and anx_archivo != anx_titulo:
                p_arch = c1.add_paragraph()
                set_table_cell_p_format(p_arch, left_dxa=107, before_dxa=20, after_dxa=20)
                r_arch = p_arch.add_run(f"Ficheiro: {anx_archivo}")
                r_arch.font.size = Pt(7.5)
                r_arch.font.color.rgb = RGBColor(100, 116, 139)

            c2 = r.cells[2]
            c2.width = Inches(1.8)
            p2 = c2.paragraphs[0]
            set_table_cell_p_format(p2, left_dxa=0, before_dxa=0, after_dxa=0)
            p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            tam = anx.get('tamano') or anx.get('size') or 0
            tam_str = f"{tam / (1024*1024):.1f} MB" if tam >= 1024*1024 else (f"{tam / 1024:.0f} KB" if tam >= 1024 else f"{tam} B")
            r2 = p2.add_run(tam_str)
            r2.font.size = Pt(8.5)
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
                            "subtitulo": anexo_desc or f"Documentación complementaria incorporada á {'Reunión' if es_reunion else 'Acta'} de Obra nº {acta_data.get('numero', '')}.",
                            "obra": obra_titulo,
                            "expediente": expte,
                            "tipo_doc": "REUNIÓN" if es_reunion else "ACTA SEMANAL",
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
