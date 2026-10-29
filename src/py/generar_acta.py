# -*- coding: utf-8 -*-
"""
==========================================================================
ANTA OBRA - Generador Oficial de Actas de Obra (DOCX y PDF)
Utiliza las plantillas corporativas oficiales:
- ejemplo_modificado_acta_reunión.docx (para Actas de Reunión)
- ejemplo_modificado_acta_semanal.docx (para Actas Semanales de Obra)
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

try:
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.oxml import parse_xml, OxmlElement
    from docx.oxml.ns import nsdecls, qn
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


def set_table_cell_p_format(p, left_dxa=107, before_dxa=0, after_dxa=0):
    pPr = p._p.get_or_add_pPr()
    for old_spc in pPr.xpath('./w:spacing'):
        pPr.remove(old_spc)
    for old_ind in pPr.xpath('./w:ind'):
        pPr.remove(old_ind)
    pPr.append(parse_xml(f'<w:spacing {nsdecls("w")} w:before="{before_dxa}" w:after="{after_dxa}"/>'))
    pPr.append(parse_xml(f'<w:ind {nsdecls("w")} w:left="{left_dxa}"/>'))


def set_cell_clean_value(cell, text, bold=False, color_rgb=None, font_size_pt=8.5, italic=False, left_pt=4):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.left_indent = Pt(left_pt)
    r = p.add_run(str(text or '—'))
    r.font.name = 'Arial'
    r.font.size = Pt(font_size_pt)
    if bold:
        r.bold = True
    if italic:
        r.italic = True
    if color_rgb:
        r.font.color.rgb = color_rgb
    return p


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
            cand = os.path.join(base_dir, 'plantilla_acta.docx')
            if os.path.exists(cand) and cand != path:
                with open(cand, 'rb') as f:
                    return f.read()
            raise


def generar_acta_desde_plantilla(acta_data, output_docx, output_pdf=None, plantilla_path=None):
    """
    Genera un acta en DOCX y opcionalmente PDF utilizando la plantilla oficial correspondiente:
    - Para reunión: ejemplo_modificado_acta_reunión.docx (o plantilla_reunion.docx)
    - Para acta semanal: ejemplo_modificado_acta_semanal.docx (o plantilla_acta.docx)
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    es_reunion = (
        acta_data.get('tipoDocumento') == 'reunion' or
        acta_data.get('tipo') == 'reunion' or
        acta_data.get('esReunion') is True or
        (plantilla_path and 'reuni' in plantilla_path.lower())
    )

    # Resolución inteligente de plantilla oficial
    if not plantilla_path or plantilla_path in ('ejemplo_modificado_acta_semanal.docx', 'plantilla_acta.docx'):
        if es_reunion:
            cand_reunion = [
                os.path.join(base_dir, 'ejemplo_modificado_acta_reunión.docx'),
                os.path.join(base_dir, 'plantilla_reunion.docx')
            ]
            plantilla_path = next((p for p in cand_reunion if os.path.exists(p)), cand_reunion[0])
        else:
            cand_semanal = [
                os.path.join(base_dir, 'ejemplo_modificado_acta_semanal.docx'),
                os.path.join(base_dir, 'plantilla_acta.docx')
            ]
            plantilla_path = next((p for p in cand_semanal if os.path.exists(p)), cand_semanal[0])
    elif not os.path.isabs(plantilla_path):
        plantilla_path = os.path.join(base_dir, plantilla_path)

    if not os.path.exists(plantilla_path):
        raise FileNotFoundError(f"Non se atopou a plantilla oficial en: {plantilla_path}")

    # Abrir plantilla de forma segura
    plantilla_bytes = safe_read_docx_bytes(plantilla_path)
    tmp_plantilla = tempfile.NamedTemporaryFile(delete=False, suffix='.docx').name
    with open(tmp_plantilla, 'wb') as f_out:
        f_out.write(plantilla_bytes)

    doc = docx.Document(tmp_plantilla)
    sec = doc.sections[0]

    # Eliminar cualquier borde inferior azul de página residual (w:pgBorders)
    for s in doc.sections:
        for b in s._sectPr.xpath('./w:pgBorders'):
            s._sectPr.remove(b)

    co = acta_data.get('currentObra') or acta_data.get('obra') or {}
    obra_titulo = co.get('titulo') or acta_data.get('obraTitulo') or 'PROXECTO DE OBRA'
    expte = co.get('expediente') or acta_data.get('expediente') or 'EXPTE-001'
    situacion = acta_data.get('situacion') or co.get('situacion') or '—'
    contratista = acta_data.get('contratista') or co.get('contratista') or '—'
    raw_do = acta_data.get('doClean') or co.get('direccionObra') or acta_data.get('direccionObra') or ''
    do_clean = raw_do.split(' / ')[0].strip() if ' / ' in raw_do else (raw_do or '—')
    de_clean = acta_data.get('deClean') or co.get('direccionEjecucion') or acta_data.get('direccionEjecucion') or (raw_do.split(' / ')[1].strip() if ' / ' in raw_do else '—')
    css_str = acta_data.get('coordinadorCSSStr') or co.get('coordinadorCSS') or acta_data.get('coordinadorCSS') or '—'
    jo_str = acta_data.get('jefeObraStr') or co.get('jefeObra') or acta_data.get('jefeObra') or '—'
    fecha_es = format_date_es(acta_data.get('fecha', ''))

    # ==========================================================================
    # 1. ACTUALIZAR ENCABEZADO OFICIAL DE LA PLANTILLA
    # ==========================================================================
    if sec.header and sec.header.tables:
        t_head = sec.header.tables[0]

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

        # Celda tipo de documento (REUNIÓN o ACTA SEMANAL)
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
            p_d.text = fecha_es

    # ==========================================================================
    # 2. TABLA 0: DATOS XERAIS (Preservación nativa de la plantilla)
    # ==========================================================================
    if len(doc.tables) > 0:
        t0 = doc.tables[0]
        set_cell_clean_value(t0.cell(0, 1), obra_titulo, bold=True)
        set_cell_clean_value(t0.cell(1, 1), situacion)

        if es_reunion:
            # Plantilla de Reunión (8 filas x 4 columnas)
            set_cell_clean_value(t0.cell(2, 1), expte, bold=True)
            set_cell_clean_value(t0.cell(3, 1), do_clean, bold=True, color_rgb=RGBColor(30, 58, 138))
            set_cell_clean_value(t0.cell(3, 3), de_clean, bold=True, color_rgb=RGBColor(2, 132, 199))
            set_cell_clean_value(t0.cell(4, 3), css_str)
            set_cell_clean_value(t0.cell(5, 1), contratista, bold=True)
            set_cell_clean_value(t0.cell(5, 3), jo_str)
            
            tipo_reu = acta_data.get('tipoModalidad') or acta_data.get('tipoReunion') or 'Presencial'
            lugar_reu = acta_data.get('lugar') or 'Caseta de obra'
            set_cell_clean_value(t0.cell(6, 1), fecha_es, bold=True)
            set_cell_clean_value(t0.cell(6, 3), tipo_reu, bold=True, color_rgb=RGBColor(30, 58, 138))
            set_cell_clean_value(t0.cell(7, 1), lugar_reu)
        else:
            # Plantilla de Acta Semanal (6 filas x 4 columnas)
            set_cell_clean_value(t0.cell(2, 1), expte, bold=True)
            set_cell_clean_value(t0.cell(2, 3), fecha_es, bold=True)
            set_cell_clean_value(t0.cell(3, 1), do_clean, bold=True, color_rgb=RGBColor(30, 58, 138))
            set_cell_clean_value(t0.cell(3, 3), de_clean, bold=True, color_rgb=RGBColor(2, 132, 199))
            set_cell_clean_value(t0.cell(4, 3), css_str)
            set_cell_clean_value(t0.cell(5, 1), contratista, bold=True)
            set_cell_clean_value(t0.cell(5, 3), jo_str)

    # ==========================================================================
    # 3. TABLA 1: ASISTENTES (Preservación nativa de la plantilla)
    # ==========================================================================
    if len(doc.tables) > 1:
        t1 = doc.tables[1]
        # Eliminar filas de ejemplo preexistentes (filas 1 en adelante)
        while len(t1.rows) > 1:
            tr = t1.rows[1]._tr
            tr.getparent().remove(tr)

        asistentes_raw = acta_data.get('asistentes', [])
        asistentes = [
            a for a in asistentes_raw
            if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste'
        ]

        if not asistentes:
            r = t1.add_row()
            c = r.cells[0]
            c.merge(r.cells[2])
            set_cell_clean_value(c, "Non constan asistentes rexistrados.", italic=True, color_rgb=RGBColor(100, 116, 139))
        else:
            for a in asistentes:
                r = t1.add_row()
                nome = a.get('nombre') or a.get('nome') or ''
                cargo = a.get('cargo') or '—'
                entidade = a.get('entidad') or a.get('empresa') or a.get('entidade') or '—'
                set_cell_clean_value(r.cells[0], nome, bold=True, color_rgb=RGBColor(15, 23, 42))
                set_cell_clean_value(r.cells[1], cargo, color_rgb=RGBColor(71, 85, 105))
                set_cell_clean_value(r.cells[2], entidade, color_rgb=RGBColor(100, 116, 139))

    # ==========================================================================
    # 4. APARTADOS E CUESTIÓNS TRATADAS
    # ==========================================================================
    cuestiones_p = None
    firmas_p = None
    for p in doc.paragraphs:
        txt_u = p.text.strip().upper()
        if 'CUESTIÓNS TRATADAS' in txt_u or 'CUESTIONS TRATADAS' in txt_u:
            cuestiones_p = p
        elif 'DILIXENCIA DE FIRMAS' in txt_u:
            firmas_p = p
            break

    # Estilos del documento
    style_h2 = 'Heading 2' if 'Heading 2' in doc.styles else 'Heading 2'
    style_h3 = 'Heading 3' if 'Heading 3' in doc.styles else 'Heading 3'

    if cuestiones_p and firmas_p:
        # Eliminar elementos de muestra entre Cuestións e Dilixencia
        c_el = cuestiones_p._element
        f_el = firmas_p._element
        curr = c_el.getnext()
        while curr is not None and curr != f_el:
            next_el = curr.getnext()
            curr.getparent().remove(curr)
            curr = next_el

        # Insertar los apartados y secciones reales antes de Dilixencia de firmas
        apartados = acta_data.get('apartados') or []
        cuestiones = acta_data.get('cuestionesTratadas') or []

        if apartados:
            for ap in apartados:
                clean_title = re.sub(r'^\d+(\.\d+)*[_.\s-]+', '', ap.get('titulo', 'Apartado')).strip()
                firmas_p.insert_paragraph_before(clean_title, style=style_h2)
                for sec_item in ap.get('secciones', []):
                    sec_title = re.sub(r'^\d+(\.\d+)*[_.\s-]+', '', sec_item.get('titulo', '')).strip()
                    if sec_title:
                        firmas_p.insert_paragraph_before(sec_title, style=style_h3)
                    txt = sec_item.get('texto', '')
                    if txt:
                        clean_txt = re.sub(r'<\s*br\s*/?\s*>', '\n', txt, flags=re.IGNORECASE)
                        clean_txt = re.sub(r'</\s*(p|div|li)\s*>', '\n', clean_txt, flags=re.IGNORECASE)
                        clean_txt = re.sub(r'<[^>]+>', '', clean_txt)
                        for ln in [ln.strip() for ln in clean_txt.split('\n') if ln.strip()]:
                            firmas_p.insert_paragraph_before(ln, style='Normal')
        elif cuestiones:
            for c in cuestiones:
                clean_sub = re.sub(r'^\d+(\.\d+)*[_.\s-]+', '', c.get('subtitulo', 'Tema tratado')).strip()
                firmas_p.insert_paragraph_before(clean_sub, style=style_h2)
                puntos = c.get('puntos', [])
                if isinstance(puntos, str):
                    puntos = [p.strip() for p in puntos.split('\n') if p.strip()]
                for pt in puntos:
                    firmas_p.insert_paragraph_before(f"• {pt}", style='Normal')
        else:
            p_emp = firmas_p.insert_paragraph_before("Non se rexistraron cuestións específicas nesta visita.", style='Normal')
            if p_emp.runs:
                p_emp.runs[0].italic = True
                p_emp.runs[0].font.color.rgb = RGBColor(100, 116, 139)

    # ==========================================================================
    # 5. DILIXENCIA DE FIRMAS
    # ==========================================================================
    firmantes = [
        a for a in acta_data.get('asistentes', [])
        if a.get('asistio') is not False and a.get('asiste') is not False and a.get('estado') != 'non_asiste' and a.get('firma')
    ]

    t_firmas = doc.tables[2] if len(doc.tables) > 2 else None

    # Párrafo introductorio de firmas
    if firmas_p:
        intro_p = None
        curr = firmas_p._element.getnext()
        if curr is not None and curr.tag.split('}')[-1] == 'p':
            intro_p = docx.text.paragraph.Paragraph(curr, doc)

        lugar_str = acta_data.get('lugar') or ('Ferrol' if 'ferrol' in situacion.lower() else situacion.split(',')[-1].strip() or 'Ferrol')
        fecha_longa = format_date_long_es(acta_data.get('fecha'))
        tipo_doc_nom = "reunión" if es_reunion else "acta"
        intro_text = f"En {lugar_str} a {fecha_longa}. Para que así conste e aos efectos oportunos, asinan a presente {tipo_doc_nom}:"

        if intro_p:
            intro_p.text = ""
            r_in = intro_p.add_run(intro_text)
            r_in.font.name = 'Arial'
            r_in.font.size = Pt(8.5)
            r_in.italic = True
            r_in.font.color.rgb = RGBColor(71, 85, 105)

    if not firmantes:
        # Si no hay firmantes, eliminar tabla de firmas e intro
        if t_firmas:
            t_firmas._element.getparent().remove(t_firmas._element)
        if intro_p:
            intro_p._element.getparent().remove(intro_p._element)
        if firmas_p:
            firmas_p._element.getparent().remove(firmas_p._element)
    else:
        if t_firmas:
            while len(t_firmas.rows) > 0:
                tr = t_firmas.rows[0]._tr
                tr.getparent().remove(tr)

            for f_i in range(0, len(firmantes), 2):
                rf = t_firmas.add_row()
                pair = firmantes[f_i:f_i+2]
                for c_i, signer in enumerate(pair):
                    c_cell = rf.cells[c_i]
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

    # ==========================================================================
    # 6. ANEXO REPORTAXE FOTOGRÁFICO
    # ==========================================================================
    fotos = acta_data.get('fotos', [])
    fotos_h = None
    for p in doc.paragraphs:
        if 'REPORTAXE FOTOGRÁFICO' in p.text.upper() or 'REPORTAXE FOTOGRAFICO' in p.text.upper():
            fotos_h = p
            break

    # Localizar tabla de fotos (la última o la tabla siguiente a fotos_h)
    t_fotos = None
    if fotos_h:
        curr = fotos_h._element.getnext()
        while curr is not None:
            if curr.tag.split('}')[-1] == 'tbl':
                t_fotos = docx.table.Table(curr, doc)
                break
            curr = curr.getnext()

    if not fotos:
        if t_fotos:
            t_fotos._element.getparent().remove(t_fotos._element)
        if fotos_h:
            fotos_h._element.getparent().remove(fotos_h._element)
    else:
        if t_fotos:
            while len(t_fotos.rows) > 0:
                tr = t_fotos.rows[0]._tr
                tr.getparent().remove(tr)

            for i in range(0, len(fotos), 2):
                row_f = t_fotos.add_row()
                for c_i in range(2):
                    f_idx = i + c_i
                    c_cell = row_f.cells[c_i]
                    set_cell_shading(c_cell, "FAFAFA")
                    set_cell_margins(c_cell, 80, 80, 80, 80)
                    if f_idx < len(fotos):
                        foto = fotos[f_idx]
                        img_path = decode_image_data(foto.get('url'))
                        p_im = c_cell.paragraphs[0]
                        p_im.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        if img_path and os.path.exists(img_path):
                            try:
                                p_im.add_run().add_picture(img_path, width=Inches(3.1))
                            except Exception as e_im:
                                sys.stderr.write(f"Aviso al insertar foto {f_idx}: {e_im}\n")
                        p_lbl = c_cell.add_paragraph()
                        p_lbl.paragraph_format.space_before = Pt(4)
                        p_lbl.paragraph_format.space_after = Pt(2)
                        p_lbl.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        r_fnum = p_lbl.add_run(f"Foto {f_idx + 1} ")
                        r_fnum.bold = True
                        r_fnum.font.size = Pt(8)
                        if foto.get('fecha'):
                            r_fdate = p_lbl.add_run(f"[{format_date_es(foto.get('fecha'))}] ")
                            r_fdate.font.size = Pt(8)
                        r_fdesc = p_lbl.add_run(foto.get('descripcion') or 'Imaxe da visita de obra')
                        r_fdesc.font.size = Pt(8)
                        r_fdesc.font.color.rgb = RGBColor(51, 65, 85)

    # ==========================================================================
    # 7. ANEXO DOCUMENTOS PDF ADXUNTOS
    # ==========================================================================
    anexos_pdf = acta_data.get('anexosPdf') or []
    if anexos_pdf:
        style_h1 = 'Heading 1' if 'Heading 1' in doc.styles else 'Heading 1'
        doc.add_paragraph('ANEXO DOCUMENTOS PDF ADXUNTOS', style=style_h1)
        p_desc_anx = doc.add_paragraph()
        r_da = p_desc_anx.add_run("Relación de documentos complementarios incorporados correlativamente ao final do PDF oficial:")
        r_da.font.size = Pt(8)
        r_da.font.color.rgb = RGBColor(100, 116, 139)

        style_grid_accent1 = 'Grid Table 1 Light Accent 1' if 'Grid Table 1 Light Accent 1' in doc.styles else None
        tbl_anx = doc.add_table(rows=1, cols=3)
        if style_grid_accent1:
            tbl_anx.style = style_grid_accent1
        tbl_anx.autofit = False

        col_dxa = [900, 6000, 2800]
        headers = ["Nº", "Nome do Documento / Ficheiro", "Data de Incorporación"]
        for idx, h_t in enumerate(headers):
            c = tbl_anx.rows[0].cells[idx]
            tcPr = c._tc.get_or_add_tcPr()
            tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="{col_dxa[idx]}" w:type="dxa"/>'))
            set_cell_clean_value(c, h_t, bold=True, color_rgb=RGBColor(71, 85, 105), left_pt=0)

        for a_idx, anx in enumerate(anexos_pdf):
            r = tbl_anx.add_row()
            set_cell_clean_value(r.cells[0], str(a_idx + 1), bold=True, left_pt=0)
            set_cell_clean_value(r.cells[1], anx.get('nombre') or anx.get('titulo') or 'Documento complementario', bold=True, color_rgb=RGBColor(15, 71, 97))
            set_cell_clean_value(r.cells[2], format_date_es(anx.get('fecha') or acta_data.get('fecha')), color_rgb=RGBColor(100, 116, 139))

    # Guardar DOCX oficial
    doc.save(output_docx)

    # ==========================================================================
    # 8. EXPORTACIÓN A PDF Y FUSIÓN 1:1 CON ANEXOS
    # ==========================================================================
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

        # Fusión con separatas institucionales para anexos PDF
        if pdf_result and os.path.exists(pdf_result) and anexos_pdf:
            try:
                from generar_separata import generar_separata_pdf
                writer = pypdf.PdfWriter()
                writer.append(pdf_result)
                temp_pdf_files = []

                for idx, anx in enumerate(anexos_pdf):
                    anx_data = {
                        'titulo': anx.get('nombre') or anx.get('titulo') or f'Documento Anexo {idx + 1}',
                        'descripcion': anx.get('descripcion') or '',
                        'numero': f"{idx + 1:02d}",
                        'obraTitulo': obra_titulo,
                        'expediente': expte,
                        'fecha': format_date_es(anx.get('fecha') or acta_data.get('fecha'))
                    }
                    sep_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                    temp_pdf_files.append(sep_pdf)
                    if generar_separata_pdf(anx_data, sep_pdf):
                        writer.append(sep_pdf)

                    # Anexar el PDF del documento
                    doc_bytes_b64 = anx.get('data') or anx.get('base64') or anx.get('fileData')
                    if doc_bytes_b64:
                        if ';base64,' in doc_bytes_b64:
                            doc_bytes_b64 = doc_bytes_b64.split(';base64,', 1)[1]
                        doc_bytes = base64.b64decode(doc_bytes_b64)
                        doc_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                        temp_pdf_files.append(doc_pdf)
                        with open(doc_pdf, 'wb') as f_dp:
                            f_dp.write(doc_bytes)
                        writer.append(doc_pdf)
                    elif anx.get('path') and os.path.exists(anx.get('path')):
                        writer.append(anx.get('path'))

                merged_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf').name
                with open(merged_tmp, 'wb') as f_out:
                    writer.write(f_out)
                shutil.copyfile(merged_tmp, output_pdf)

                for tf in temp_pdf_files:
                    try:
                        os.remove(tf)
                    except Exception:
                        pass
                try:
                    os.remove(merged_tmp)
                except Exception:
                    pass
            except Exception as e_anx:
                sys.stderr.write(f"Aviso al anexar documentos PDF: {e_anx}\n")

    return {
        "success": True,
        "docx": output_docx,
        "pdf": pdf_result
    }


def main():
    parser = argparse.ArgumentParser(description="Generar acta DOCX y PDF a partir de plantilla oficial")
    parser.add_argument('--data', required=True, help="Ruta al JSON de datos o cadena JSON")
    parser.add_argument('--output-docx', required=True, help="Ruta del archivo DOCX de salida")
    parser.add_argument('--output-pdf', default=None, help="Ruta del archivo PDF de salida")
    parser.add_argument('--plantilla', default=None, help="Ruta a la plantilla oficial de Word")

    args = parser.parse_args()

    try:
        if os.path.exists(args.data):
            with open(args.data, 'r', encoding='utf-8') as f:
                acta_data = json.load(f)
        else:
            acta_data = json.loads(args.data)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Error leyendo JSON de datos: {e}"}))
        sys.exit(1)

    out_docx = os.path.abspath(args.output_docx)
    out_pdf = os.path.abspath(args.output_pdf) if args.output_pdf else None

    try:
        res = generar_acta_desde_plantilla(acta_data, out_docx, out_pdf, args.plantilla)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
