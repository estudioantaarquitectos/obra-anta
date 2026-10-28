/* ==========================================================================
   ANTA OBRA - Official Document Export to Microsoft Word (.docx)
   Supports:
   - Actas de Obra (Strict layout with institutional header, attendees,
     numbered sections, signature block, and photographic annex)
   - Informes de Seguimento de Obra DT-05 (Xestur S.A. / Vivenda Pública de Galicia)
   ========================================================================== */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  ImageRun
} from 'docx';
import { stripHtml } from './utils/richEditor.js';
import { db } from './db.js';
import { getAgentInitials, getAgentAvatarColors } from './utils/avatar.js';


// Colors & Styling Constants
const COLOR_PRIMARY = '1E3A8A';   // Dark Blue
const COLOR_SECONDARY = '0284C7'; // Blue Accent
const COLOR_TEXT = '1E293B';      // Dark Slate
const COLOR_MUTED = '64748B';     // Gray
const COLOR_BORDER = 'CBD5E1';    // Table Border Gray
const COLOR_BG_LIGHT = 'F8FAFC';  // Cell Light Fill
const COLOR_HEADER_BG = 'F1F5F9'; // Header Fill

const TABLE_BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: COLOR_BORDER,
};

const TABLE_BORDERS = {
  top: TABLE_BORDER_STYLE,
  bottom: TABLE_BORDER_STYLE,
  left: TABLE_BORDER_STYLE,
  right: TABLE_BORDER_STYLE,
  insideHorizontal: TABLE_BORDER_STYLE,
  insideVertical: TABLE_BORDER_STYLE,
};

export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '') : '';

/**
 * Trigger native browser download from an HTTP endpoint
 */
export function triggerDownload(downloadUrl, filename) {
  const link = document.createElement('a');
  link.style.display = 'none';
  const targetUrl = (API_BASE && downloadUrl && downloadUrl.startsWith('/')) ? `${API_BASE}${downloadUrl}` : downloadUrl;
  link.href = targetUrl;
  if (filename) {
    link.download = filename;
    link.setAttribute('download', filename);
  }
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      if (link.parentNode) document.body.removeChild(link);
    } catch (e) {}
  }, 60000);
}

/**
 * Helper to download Blob as file in browser, routing through the local server to guarantee
 * that Chrome's native download manager receives valid Content-Disposition headers.
 */
export async function downloadBlob(blob, filename) {
  const ext = String(filename).split('.').pop().toLowerCase();
  let mimeType = 'application/octet-stream';
  if (ext === 'pdf') mimeType = 'application/pdf';
  else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  // 1. Send blob to local server store so the browser downloads it via HTTP with Content-Disposition
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob instanceof Blob ? blob : new Blob([blob], { type: mimeType }));
    });

    const res = await fetch('/api/store-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, filename, contentType: mimeType })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.downloadUrl) {
        triggerDownload(data.downloadUrl, data.filename || filename);
        return;
      }
    }
  } catch (e) {
    console.warn('Fallback to direct blob URL download:', e);
  }

  // 2. Direct client-side blob fallback if backend endpoint unreachable
  const safeBlob = (blob instanceof Blob && blob.type === mimeType) 
    ? blob 
    : new Blob([blob], { type: mimeType });

  const url = URL.createObjectURL(safeBlob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {}
  }, 120000);
}

/**
 * Format date string YYYY-MM-DD to DD/MM/YYYY
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatDateLong(dateStr) {
  if (!dateStr) return 'a data da reunión';
  const months = [
    '', 'xaneiro', 'febreiro', 'marzo', 'abril', 'maio', 'xuño',
    'xullo', 'agosto', 'setembro', 'outubro', 'novembro', 'decembro'
  ];
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[0], 10);
      const mName = months[m] || String(m);
      return `${d} de ${mName} de ${y}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format numbers as EUR currency
 */
function formatEuros(val) {
  if (val === undefined || val === null || isNaN(val)) return '0,00 €';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(unitIdx > 0 ? 1 : 0)} ${units[unitIdx]}`;
}

/**
 * Safely convert any image/SVG dataUrl to PNG Uint8Array for docx ImageRun
 */
async function getPhotoBytes(url, targetMaxW = 540, targetMaxH = 340) {
  if (!url) return null;
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const natW = img.naturalWidth || 400;
          const natH = img.naturalHeight || 300;
          const scale = Math.min(1, targetMaxW / natW, targetMaxH / natH);
          const w = Math.round(natW * scale);
          const h = Math.round(natH * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (!blob) { resolve(null); return; }
            blob.arrayBuffer().then((buf) => {
              resolve({
                bytes: new Uint8Array(buf),
                width: w,
                height: h
              });
            }).catch(() => resolve(null));
          }, 'image/png');
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/* ==========================================================================
   1. EXPORT ACTA DE OBRA TO DOCX AND PDF
   ========================================================================== */

/**
 * Exports Acta to DOCX using the official plantilla_acta.docx template
 */
export async function exportActaToDocx(acta) {
  const { db } = await import('./db.js');
  const numStr = String(acta.numero || 'acta').padStart(2, '0');
  const dateStr = (acta.fecha || '').replace(/-/g, '');
  const filename = `Acta_${numStr}_${dateStr || 'reunion'}.docx`;

  const obraId = acta.obraId || (typeof db !== 'undefined' && db.getActiveObraId ? db.getActiveObraId() : null);
  const currentObra = acta.currentObra || (typeof db !== 'undefined' && db.getObraById ? (db.getObraById(obraId) || db.getActiveObra()) : null) || {};
  const obraTitulo = currentObra?.titulo || acta.obraTitulo || (typeof acta.obra === 'string' ? acta.obra : null) || 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';
  const expediente = currentObra?.expediente || acta.expediente || 'AVS 03007 25/05';
  const situacion = currentObra?.situacion || acta.situacion || '—';
  const contratista = currentObra?.contratista || acta.contratista || '—';

  const enrichedActa = {
    ...acta,
    obraTitulo,
    obra: obraTitulo,
    expediente,
    situacion,
    contratista,
    currentObra
  };
  if (acta.anexosPdf && acta.anexosPdf.length > 0) {
    const list = [];
    for (const item of acta.anexosPdf) {
      let b64 = item.url || item.dataUrl || item.data;
      if (!b64 && item.id && db?.getPdfFile) {
        const stored = await db.getPdfFile(item.id);
        b64 = stored ? stored.dataUrl : null;
      }
      list.push({
        nombre: item.nombre || item.archivo || 'Documento',
        descripcion: item.descripcion || '',
        archivo: item.archivo || item.nombre || 'documento.pdf',
        tamano: item.tamano || 0,
        dataUrl: b64,
        url: b64,
        data: b64
      });
    }
    enrichedActa.anexosPdf = list;
  }

  // 1. Prioritize Python backend with official plantilla_acta.docx
  try {
    const res = await fetch(`${API_BASE}/api/export-acta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acta: enrichedActa, format: 'docx', responseType: 'token', filename })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.downloadUrl) {
        triggerDownload(data.downloadUrl, data.filename || filename);
        return data.filename || filename;
      }
    }
  } catch (err) {
    console.warn('Backend export-acta docx failed, fallback to client:', err);
  }

  // 2. Client-side fallback
  const doc = await buildModernActaDocx(enrichedActa);
  if (typeof window !== 'undefined') {
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
  }
  return filename;
}

/**
 * Exports Acta to official PDF generated from plantilla_acta.docx with annexes and separatas
 */
export async function exportActaToPdf(acta) {
  const { db } = await import('./db.js');
  const numStr = String(acta.numero || 'acta').padStart(2, '0');
  const dateStr = (acta.fecha || '').replace(/-/g, '');
  const filename = `Acta_${numStr}_${dateStr || 'reunion'}.pdf`;

  const obraId = acta.obraId || (typeof db !== 'undefined' && db.getActiveObraId ? db.getActiveObraId() : null);
  const currentObra = acta.currentObra || (typeof db !== 'undefined' && db.getObraById ? (db.getObraById(obraId) || db.getActiveObra()) : null) || {};
  const obraTitulo = currentObra?.titulo || acta.obraTitulo || (typeof acta.obra === 'string' ? acta.obra : null) || 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';
  const expediente = currentObra?.expediente || acta.expediente || 'AVS 03007 25/05';
  const situacion = currentObra?.situacion || acta.situacion || '—';
  const contratista = currentObra?.contratista || acta.contratista || '—';

  const enrichedActa = {
    ...acta,
    obraTitulo,
    obra: obraTitulo,
    expediente,
    situacion,
    contratista,
    currentObra
  };
  if (acta.anexosPdf && acta.anexosPdf.length > 0) {
    const list = [];
    for (const item of acta.anexosPdf) {
      let b64 = item.url || item.dataUrl || item.data;
      if (!b64 && item.id && db?.getPdfFile) {
        const stored = await db.getPdfFile(item.id);
        b64 = stored ? stored.dataUrl : null;
      }
      list.push({
        nombre: item.nombre || item.archivo || 'Documento',
        descripcion: item.descripcion || '',
        archivo: item.archivo || item.nombre || 'documento.pdf',
        tamano: item.tamano || 0,
        dataUrl: b64,
        url: b64,
        data: b64
      });
    }
    enrichedActa.anexosPdf = list;
  }

  // 1. Prioritize Python backend with official plantilla_acta.docx + Word COM + separatas
  try {
    const res = await fetch(`${API_BASE}/api/export-acta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acta: enrichedActa, format: 'pdf', responseType: 'token', filename })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.downloadUrl) {
        triggerDownload(data.downloadUrl, data.filename || filename);
        return data.filename || filename;
      }
    }
  } catch (err) {
    console.warn('Backend export-acta pdf failed, fallback to client:', err);
  }

  // 2. Client-side fallback
  const doc = await buildModernActaDocx(enrichedActa);
  const docxBlob = await Packer.toBlob(doc);

  const docxBase64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(docxBlob);
  });

  const pdfRes = await fetch('/api/convert-docx-to-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docxBase64 })
  });

  if (!pdfRes.ok) {
    const errData = await pdfRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Non se puido converter o documento a PDF');
  }

  const actaPdfBlob = await pdfRes.blob();
  const actaPdfB64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(actaPdfBlob);
  });

  const pdfListToMerge = [actaPdfB64];

  // Audio 1: Anexos PDF precedidos de separata oficial
  if (acta.anexosPdf && acta.anexosPdf.length > 0) {
    for (const anexo of acta.anexosPdf) {
      let b64 = anexo.url || anexo.dataUrl;
      if (!b64 && anexo.id) {
        const stored = await db.getPdfFile(anexo.id);
        b64 = stored ? stored.dataUrl : null;
      }
      if (b64) {
        pdfListToMerge.push({
          type: 'separata',
          tipo: 'documento_anexo',
          titulo: `ANEXO DOCUMENTAL: ${(anexo.nombre || 'DOCUMENTO').toUpperCase()}`,
          subtitulo: `Documentación complementaria incorporada á Acta de Obra nº ${acta.numero}.`,
          tipo_doc: 'ACTA SEMANAL',
          obra: obraTitulo,
          expediente: expediente,
          fecha: formatDate(acta.fecha),
          detalles: [`Nome do arquivo: ${anexo.nombre}`, `Tamaño: ${formatFileSize(anexo.tamano)}`]
        });
        pdfListToMerge.push(b64);
      }
    }
  }


  if (pdfListToMerge.length > 1) {
    const mergeRes = await fetch('/api/merge-pdfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfs: pdfListToMerge, filename })
    });
    if (mergeRes.ok) {
      const mergedBlob = await mergeRes.blob();
      downloadBlob(mergedBlob, filename);
      return filename;
    }
  }

  downloadBlob(actaPdfBlob, filename);
  return filename;
}

export async function buildModernActaDocx(acta) {
  const children = [];

  const rawNum = String(acta.numero || '1').trim();
  const rawDate = acta.fecha || '';
  let formattedDate = rawDate;
  if (rawDate && rawDate.includes('-')) {
    const parts = rawDate.split('-');
    if (parts.length === 3) formattedDate = `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }

  // Extract full obra and actors data (from acta, currentObra, or db)
  const obraId = acta.obraId || (typeof db !== 'undefined' && db.getActiveObraId ? db.getActiveObraId() : null);
  const currentObra = acta.currentObra || (typeof db !== 'undefined' && db.getObraById ? (db.getObraById(obraId) || db.getActiveObra()) : null) || {};

  const obraTitulo = acta.obraTitulo || (typeof acta.obra === 'string' ? acta.obra : null) || currentObra.titulo || 'SEGUIMENTO E CONTROL DE OBRA';
  const expediente = acta.expediente || currentObra.expediente || '—';
  const situacion = acta.situacion || currentObra.situacion || '—';
  const contratista = currentObra.contratista || acta.contratista || '—';

  const rawDO = currentObra.direccionObra || acta.direccionObra || 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO)';
  const doClean = acta.doClean || (rawDO.includes(' / ') ? rawDO.split(' / ')[0].trim() : rawDO);
  const deClean = acta.deClean || currentObra.direccionEjecucion || acta.direccionEjecucion || (rawDO.includes(' / ') ? rawDO.split(' / ')[1].trim() : 'Ana Gallego Núñez (DEM)');
  const coordinadorCSSStr = acta.coordinadorCSSStr || currentObra.coordinadorCSS || '';
  const jefeObraStr = acta.jefeObraStr || currentObra.jefeObra || '';

  // 1. Official 3-Column Header (Vipugal Style matching Captura 2)
  let logoData = await getPhotoBytes('/VIPUGAL_LOGO.png', 1600, 600);
  if (!logoData) {
    logoData = await getPhotoBytes('VIPUGAL_LOGO.png', 1600, 600);
  }

  const leftLogoCellChildren = [];
  if (logoData) {
    leftLogoCellChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoData.bytes,
            transformation: { width: 160, height: 45.5 },
          }),
        ],
      })
    );
  } else {
    leftLogoCellChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SOCIEDADE DE\nVIVENDA PÚBLICA\nDE GALICIA',
            bold: true,
            size: 15,
            color: COLOR_PRIMARY,
          }),
        ],
      })
    );
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              margins: { top: 40, bottom: 40, left: 20, right: 20 },
              children: leftLogoCellChildren,
            }),
            new TableCell({
              width: { size: 48, type: WidthType.PERCENTAGE },
              margins: { top: 40, bottom: 40, left: 20, right: 20 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: obraTitulo,
                      font: 'Arial',
                      size: 17, // 8.5 pt
                      bold: true,
                      color: '0F172A',
                    }),
                  ],
                  spacing: { before: 0, after: 20 },
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `(EXPTE: ${expediente})`,
                      font: 'Arial',
                      size: 16, // 8.0 pt
                      color: '64748B',
                    }),
                  ],
                  spacing: { before: 0, after: 0 },
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              margins: { top: 40, bottom: 40, left: 20, right: 20 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'ACTA SEMANAL',
                      bold: true,
                      size: 15,
                      color: '0F172A',
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${rawNum}  `,
                      bold: true,
                      size: 44,
                      color: '0F172A',
                    }),
                    new TextRun({
                      text: formattedDate,
                      size: 14,
                      color: COLOR_MUTED,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Section header helper with blue underline bar (matching Captura 2)
  const addModernSectionHeader = (title) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 18,
            color: COLOR_PRIMARY,
          }),
        ],
        border: {
          bottom: {
            color: COLOR_SECONDARY,
            space: 4,
            style: BorderStyle.SINGLE,
            size: 10,
          },
        },
        spacing: { before: 180, after: 80 },
      })
    );
  };

  // 1. DATOS XERAIS (Clean key-value grid matching Captura 2)
  addModernSectionHeader('1.- DATOS XERAIS:');

  const gridRows = [
    [
      { label: 'Proxecto:', val: obraTitulo, bold: true },
      { label: 'Data da visita:', val: formatDate(acta.fecha), bold: true },
    ],
    [
      { label: 'Emprazamento:', val: situacion, bold: false },
      { label: 'Expediente nº:', val: expediente, bold: true },
    ],
    [
      { label: 'Contratista:', val: contratista, bold: true },
      { label: 'Estado da acta:', val: acta.estado === 'pechada' ? '● Pechada / Emitida' : '○ Borrador', bold: false, color: acta.estado === 'pechada' ? '166534' : '854D0E' },
    ],
    [
      { label: 'Dirección de obra:', val: doClean, bold: true, color: COLOR_PRIMARY },
      { label: 'Dirección de execución:', val: deClean, bold: true, color: COLOR_SECONDARY },
    ],
  ];

  if (coordinadorCSSStr || jefeObraStr) {
    gridRows.push([
      { label: 'Coordinador CSS:', val: coordinadorCSSStr || '—', bold: false },
      { label: 'Xefe de Obra:', val: jefeObraStr || '—', bold: false },
    ]);
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
      },
      rows: gridRows.map(([c1, c2]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 35, bottom: 35, left: 10, right: 30 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: c1.label + ' ', size: 14, color: COLOR_MUTED }),
                    new TextRun({ text: c1.val || '—', bold: c1.bold, size: 14, color: c1.color || COLOR_TEXT }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 35, bottom: 35, left: 30, right: 10 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: c2.label + ' ', size: 14, color: COLOR_MUTED }),
                    new TextRun({ text: c2.val || '—', bold: c2.bold, size: 14, color: c2.color || COLOR_TEXT }),
                  ],
                }),
              ],
            }),
          ],
        })
      ),
    })
  );

  // 2. ASISTENTES (3 Columns: Nome e Apelidos, Cargo / Función, Entidade Representada)
  addModernSectionHeader('2.- ASISTENTES:');
  const asistentes = (acta.asistentes || []).filter(a => a.asistio !== false && a.asiste !== false && a.estado !== 'non_asiste');
  if (asistentes.length > 0) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_SECONDARY },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 38, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                margins: { top: 40, bottom: 40, left: 30, right: 30 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Nome e Apelidos', bold: true, size: 13, color: '475569' })] })],
              }),
              new TableCell({
                width: { size: 32, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                margins: { top: 40, bottom: 40, left: 30, right: 30 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Cargo / Función', bold: true, size: 13, color: '475569' })] })],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                margins: { top: 40, bottom: 40, left: 30, right: 30 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Entidade Representada', bold: true, size: 13, color: '475569' })] })],
              }),
            ],
          }),
          ...asistentes.map((asist) => {
            return new TableRow({
              children: [
                new TableCell({
                  margins: { top: 35, bottom: 35, left: 30, right: 30 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: asist.nombre || asist.nome || '—', bold: true, size: 14, color: '0F172A' })],
                    }),
                  ],
                }),
                new TableCell({
                  margins: { top: 35, bottom: 35, left: 30, right: 30 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: asist.cargo || '—', size: 13, color: '475569' })],
                    }),
                  ],
                }),
                new TableCell({
                  margins: { top: 35, bottom: 35, left: 30, right: 30 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: asist.entidad || asist.entidade || asist.empresa || '—', size: 13, color: '64748B' })],
                    }),
                  ],
                }),
              ],
            });
          }),
        ],
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Non constan asistentes rexistrados.', italics: true, size: 14, color: COLOR_MUTED })],
        spacing: { after: 60 },
      })
    );
  }

  // 3. CUESTIÓNS TRATADAS NA VISITA / REUNIÓN (Apartados / Cuestiones / Bullets)
  addModernSectionHeader('3.- CUESTIÓNS TRATADAS NA VISITA / REUNIÓN:');
  const apartados = acta.apartados || [];
  const cuestionesTratadas = acta.cuestionesTratadas || [];
  const items = acta.items || acta.cuestiones || acta.puntosTratados || [];

  if (apartados.length > 0) {
    apartados.forEach((ap, apIdx) => {
      const cleanTitle = (ap.titulo || `APARTADO ${apIdx + 1}`).replace(/^\d+[_.\s]+/, '');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${apIdx + 1}.- ${cleanTitle}`, bold: true, size: 15, color: COLOR_PRIMARY })],
          spacing: { before: 80, after: 30 },
        })
      );
      (ap.secciones || []).forEach((sec, secIdx) => {
        const cleanSec = (sec.titulo || `Sección ${apIdx + 1}.${secIdx + 1}`).replace(/^\d+(\.\d+)*[_.\s]+/, '');
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${apIdx + 1}.${secIdx + 1}.- ${cleanSec}`, bold: true, size: 14, color: '0F172A' })],
            spacing: { before: 50, after: 20 },
          }),
          new Paragraph({
            children: [new TextRun({ text: stripHtml(sec.texto || ''), size: 14, color: '334155' })],
            indent: { left: 240 },
            spacing: { after: 50 },
          })
        );
      });
    });
  } else if (cuestionesTratadas.length > 0) {
    cuestionesTratadas.forEach((c, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `3.${i + 1}.- ${c.subtitulo || 'Tema tratado'}`, bold: true, size: 15, color: '0F172A' }),
          ],
          spacing: { before: 80, after: 30 },
        })
      );
      const pts = Array.isArray(c.puntos) ? c.puntos : (c.puntos || '').split('\n').filter(Boolean);
      pts.forEach((p) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${stripHtml(p)}`, size: 14, color: '334155' })],
            indent: { left: 240 },
            spacing: { after: 30 },
          })
        );
      });
    });
  } else if (items.length > 0) {
    items.forEach((item, idx) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${idx + 1}. ${item.titulo || item.pregunta || 'Punto de control'}`, bold: true, size: 15, color: COLOR_SECONDARY })],
          spacing: { before: 80, after: 30 },
        }),
        new Paragraph({
          children: [new TextRun({ text: stripHtml(item.texto || item.resposta || item.descripcion || item.observaciones || 'Sen incidencias salientables.'), size: 14, color: '334155' })],
          indent: { left: 240 },
          spacing: { after: 50 },
        })
      );
    });
  } else if (acta.resumen || acta.observaciones) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: stripHtml(acta.resumen || acta.observaciones), size: 14, color: '334155' })],
        spacing: { after: 50 },
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Desenvolvemento normal dos traballos conforme ao previsto.', italics: true, size: 14, color: COLOR_MUTED })],
        spacing: { after: 50 },
      })
    );
  }

  let currentSec = 4;

  // 4. INDICACIÓNS DO COORDINADOR DE SEGURIDADE E SAÚDE (CSS)
  const indCSS = acta.indicacionesSeguridad;
  const hasCSS = indCSS && (Array.isArray(indCSS) ? indCSS.length > 0 : String(indCSS).trim().length > 0);
  if (hasCSS) {
    addModernSectionHeader(`${currentSec++}.- INDICACIÓNS DO COORDINADOR DE SEGURIDADE E SAÚDE (CSS):`);
    const ptsCSS = Array.isArray(indCSS) ? indCSS : String(indCSS).split('\n').filter(Boolean);
    ptsCSS.forEach((p) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${stripHtml(p)}`, size: 14, color: '334155' })],
          indent: { left: 240 },
          spacing: { after: 30 },
        })
      );
    });
  }

  // 5. PRÓXIMAS ACTUACIÓNS PREVISTAS
  const proxAct = acta.actuacionesPrevistas;
  const hasProx = proxAct && (Array.isArray(proxAct) ? proxAct.length > 0 : String(proxAct).trim().length > 0);
  if (hasProx) {
    addModernSectionHeader(`${currentSec++}.- PRÓXIMAS ACTUACIÓNS PREVISTAS:`);
    const ptsProx = Array.isArray(proxAct) ? proxAct : String(proxAct).split('\n').filter(Boolean);
    ptsProx.forEach((p) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${stripHtml(p)}`, size: 14, color: '334155' })],
          indent: { left: 240 },
          spacing: { after: 30 },
        })
      );
    });
  }

  // 6. DILIXENCIA DE FIRMAS (Sólo si hay firmantes marcados)
  const isReunion = acta.tipo === 'reunion' || acta.tipoDocumento === 'reunion';
  const asistentesRaw = acta.asistentes || [];
  const asistentesFirmantes = asistentesRaw.filter(a => a.asistio !== false && a.asiste !== false && a.estado !== 'non_asiste' && Boolean(a.firma));
  let hasFirmas = true;
  if (isReunion) {
    hasFirmas = asistentesFirmantes.length > 0;
  } else if (asistentesRaw.length > 0 && asistentesRaw.some(a => 'firma' in a)) {
    hasFirmas = asistentesFirmantes.length > 0;
  }

  if (hasFirmas) {
    addModernSectionHeader(`${currentSec++}.- DILIXENCIA DE FIRMAS:`);
    const lugarStr = situacion.includes('Ferrol') ? 'Ferrol' : (situacion.split(',').pop()?.trim() || 'Ferrol');
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `En ${lugarStr} a ${formatDateLong(acta.fecha)}. Para que así conste e aos efectos oportunos, asinan a presente acta:`,
            italics: true,
            size: 14,
            color: '475569',
          }),
        ],
        spacing: { after: 80 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          insideHorizontal: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { fill: 'F8FAFC' },
                margins: { top: 60, bottom: 140, left: 60, right: 60 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'Pola Dirección de Obra (DO):', bold: true, size: 14, color: COLOR_PRIMARY })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: doClean || 'Dirección de Obra', bold: true, size: 14, color: '0F172A' })],
                    spacing: { before: 20, after: 140 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'Asdo.: ____________________________', size: 14, color: '94A3B8' })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { fill: 'F8FAFC' },
                margins: { top: 60, bottom: 140, left: 60, right: 60 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'Pola Dirección de Execución (DE):', bold: true, size: 14, color: COLOR_SECONDARY })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: deClean || 'Dirección de Execución Material', bold: true, size: 14, color: '0F172A' })],
                    spacing: { before: 20, after: 140 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'Asdo.: ____________________________', size: 14, color: '94A3B8' })],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  // 7. ANEXO REPORTAXE FOTOGRÁFICO (2x2 Grid)
  const fotos = acta.fotos || [];
  if (fotos.length > 0) {
    addModernSectionHeader(`${currentSec++}.- ANEXO REPORTAXE FOTOGRÁFICO:`);

    for (let i = 0; i < fotos.length; i += 2) {
      const f1 = fotos[i];
      const f2 = fotos[i + 1] || null;

      const p1Data = await getPhotoBytes(f1.url, 230, 160);
      const p2Data = f2 ? await getPhotoBytes(f2.url, 230, 160) : null;

      const cell1Children = [];
      if (p1Data) {
        cell1Children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: p1Data.bytes,
                transformation: { width: p1Data.width, height: p1Data.height },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 30, after: 30 },
          })
        );
      }
      cell1Children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Foto ${i + 1} `, bold: true, size: 13, color: COLOR_PRIMARY }),
            new TextRun({ text: f1.fecha ? `[${formatDate(f1.fecha)}] ` : '', size: 12, color: COLOR_MUTED }),
            new TextRun({ text: f1.descripcion || 'Imaxe da obra', size: 13 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 30 },
        })
      );

      const cell2Children = [];
      if (f2) {
        if (p2Data) {
          cell2Children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: p2Data.bytes,
                  transformation: { width: p2Data.width, height: p2Data.height },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 30, after: 30 },
            })
          );
        }
        cell2Children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Foto ${i + 2} `, bold: true, size: 13, color: COLOR_PRIMARY }),
              new TextRun({ text: f2.fecha ? `[${formatDate(f2.fecha)}] ` : '', size: 12, color: COLOR_MUTED }),
              new TextRun({ text: f2.descripcion || 'Imaxe da obra', size: 13 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
          })
        );
      }

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
            left: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
            right: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
            insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
            insideHorizontal: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  shading: { fill: 'FAFAFA' },
                  margins: { top: 30, bottom: 30, left: 30, right: 30 },
                  children: cell1Children,
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  shading: { fill: 'FAFAFA' },
                  margins: { top: 30, bottom: 30, left: 30, right: 30 },
                  children: cell2Children.length > 0 ? cell2Children : [new Paragraph({})],
                }),
              ],
            }),
          ],
        })
      );
    }
  }

  // 8. ANEXO DOCUMENTACIÓN COMPLEMENTARIA
  const anexos = acta.anexosPdf || acta.anexos || [];
  if (anexos.length > 0) {
    addModernSectionHeader(`${currentSec++}.- ANEXO DOCUMENTACIÓN COMPLEMENTARIA:`);
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_SECONDARY },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 10, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                margins: { top: 40, bottom: 40, left: 30, right: 30 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '#', bold: true, size: 13 })] })],
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                margins: { top: 40, bottom: 40, left: 30, right: 30 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Documento / Arquivo', bold: true, size: 13 })] })],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                margins: { top: 40, bottom: 40, left: 30, right: 30 },
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Tamaño', bold: true, size: 13 })] })],
              }),
            ],
          }),
          ...anexos.map((anexo, idx) =>
            new TableRow({
              children: [
                new TableCell({
                  margins: { top: 30, bottom: 30, left: 30, right: 30 },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 13 })] })],
                }),
                new TableCell({
                  margins: { top: 30, bottom: 30, left: 30, right: 30 },
                  children: [new Paragraph({ children: [new TextRun({ text: anexo.nombre || anexo.nome || 'Documento Anexo', size: 13 })] })],
                }),
                new TableCell({
                  margins: { top: 30, bottom: 30, left: 30, right: 30 },
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatFileSize(anexo.tamano || anexo.size || 0), size: 13, color: COLOR_MUTED })] })],
                }),
              ],
            })
          ),
        ],
      })
    );
  }

  // Document Assembly
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 18,
            color: COLOR_TEXT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Acta Oficial de Obra  |  Páxina ',
                    size: 13,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 13,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 13,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 13,
                    color: COLOR_MUTED,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return doc;
}

export async function exportActaToDocxClient(acta) {
  return exportActaToDocx(acta);
}


/* ==========================================================================
   2. EXPORT INFORME DT-05 TO DOCX
   ========================================================================== */
export async function buildInformeDocx(inf) {
  const children = [];

  const rawNum = String(inf.numero || '1').trim();
  const reportNum = rawNum.includes('/') ? rawNum.split('/')[0].replace(/^0+/, '') || rawNum : rawNum.replace(/^0+/, '') || rawNum;
  const rawDate = inf.datosXerais?.dataInforme || '';
  let formattedDate = rawDate;
  if (rawDate && rawDate.includes('-')) {
    const parts = rawDate.split('-');
    if (parts.length === 3) formattedDate = `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }

  // 1. Official Header (3-Column Layout: Left Logo/Agency, Center Project Title, Right Report info)
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'SOCIEDADE DE\nVIVENDA PÚBLICA\nDE GALICIA',
                      bold: true,
                      size: 16,
                      color: COLOR_PRIMARY,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 48, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: inf.datosXerais?.proxecto || '',
                      size: 15,
                      color: COLOR_SECONDARY,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `INFORME ${(inf.tipo || 'MENSUAL').toUpperCase()}`,
                      bold: true,
                      size: 16,
                      color: COLOR_SECONDARY,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${reportNum}   `,
                      bold: true,
                      size: 26,
                      color: COLOR_SECONDARY,
                    }),
                    new TextRun({
                      text: formattedDate,
                      size: 15,
                      color: COLOR_MUTED,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Helper for Section Titles
  function addSectionHeader(title) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 19,
            color: COLOR_PRIMARY,
          }),
        ],
        spacing: { before: 200, after: 80 },
        border: { bottom: { color: COLOR_PRIMARY, size: 6, style: BorderStyle.SINGLE } },
      })
    );
  }

  // 1.- DATOS XERAIS
  addSectionHeader('1.- DATOS XERAIS:');

  const rawDO = inf.datosXerais?.direccionObra || '';
  const doClean = rawDO.includes(' / ') ? rawDO.split(' / ')[0].trim() : rawDO;
  const deClean = inf.datosXerais?.direccionEjecucion || (rawDO.includes(' / ') ? rawDO.split(' / ')[1].trim() : '');

  const datosRows = [
    ['Proxecto:', inf.datosXerais?.proxecto || '', 'Mes informado:', inf.datosXerais?.mesInformado || ''],
    ['Emprazamento:', inf.datosXerais?.emprazamento || '', 'Data informe:', formatDate(inf.datosXerais?.dataInforme)],
    ['Contratista:', inf.datosXerais?.contratista || '', 'Dirección de obra:', doClean],
    ['Expediente nº:', inf.datosXerais?.expediente || '', 'Dirección de execución:', deClean],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: datosRows.map(([l1, v1, l2, v2]) => {
        return new TableRow({
          children: [
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              shading: { fill: COLOR_BG_LIGHT },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: l1, bold: true, size: 16, color: COLOR_MUTED })] })],
            }),
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: v1, bold: true, size: 16, color: COLOR_TEXT })] })],
            }),
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              shading: { fill: COLOR_BG_LIGHT },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: l2, bold: true, size: 16, color: COLOR_MUTED })] })],
            }),
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: v2, size: 16, color: COLOR_TEXT })] })],
            }),
          ],
        });
      }),
    })
  );

  // Resumo Executivo Box
  const res = inf.resumoExecutivo || {};
  const estadoLabel = res.estadoXeral === 'en_prazo'
    ? '[X] En prazo e controlada   [ ] Con desviacións   [ ] Comprometida'
    : res.estadoXeral === 'con_desviacions'
    ? '[ ] En prazo e controlada   [X] Con desviacións   [ ] Comprometida'
    : '[ ] En prazo e controlada   [ ] Con desviacións   [X] Comprometida';

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'RESUMO EXECUTIVO:', bold: true, size: 17, color: COLOR_TEXT })],
      spacing: { before: 140, after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Estado xeral: ', bold: true, size: 16 }),
        new TextRun({ text: estadoLabel, size: 16, color: COLOR_PRIMARY }),
      ],
      spacing: { before: 30, after: 30 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Avance executado: ', bold: true, size: 16 }),
        new TextRun({ text: `${res.avanceExecutado || 0}% executado  (vs ${res.avancePrevisto || 0}% previsto)`, size: 16 }),
      ],
      spacing: { before: 30, after: 30 },
    })
  );

  if (res.principaisFitos) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Principais fitos: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(res.principaisFitos), size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }
  if (res.principaisIncidencias) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Principais incidencias: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(res.principaisIncidencias), size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }
  if (res.riscosDetectados) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Riscos detectados: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(res.riscosDetectados), size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }

  // 2.- TRABALLOS EXECUTADOS
  addSectionHeader('2.- TRABALLOS EXECUTADOS:');
  const trab = inf.traballosExecutados || {};
  const trabItems = [
    ['Traballos executados no mes', trab.executadosMes || '—'],
    ['Traballos en curso', trab.enCurso || '—'],
    ['Traballos previstos próximo mes', trab.previstosProximoMes || '—'],
    ['Control xeométrico e cualitativo', trab.controlXeometricoCualitativo || '—'],
    ['Coordinación con organismos / subministradoras', trab.coordinacionOrganismos || '—'],
    ['A obra non acreditada', trab.obraNonAcreditada || 'Non hai.'],
  ];
  trabItems.forEach(([label, val]) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `• ${label}: `, bold: true, size: 16, color: COLOR_TEXT }),
          new TextRun({ text: stripHtml(val), size: 16, color: COLOR_TEXT }),
        ],
        spacing: { before: 40, after: 40 },
      })
    );
  });

  // 3.- CONDICIONANTES, MODIFICACIÓNS E OUTRAS INCIDENCIAS
  addSectionHeader('3.- CONDICIONANTES, MODIFICACIÓNS E OUTRAS INCIDENCIAS:');
  const cond = inf.condicionantesModificacions || {};
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '• Circunstancias sobrevidas / novas unidades: ', bold: true, size: 16 }),
        new TextRun({ text: stripHtml(cond.circunstanciasSobrevidas || 'Non se rexistran.'), size: 16 }),
      ],
      spacing: { before: 40, after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Desfases nas medicións: ', bold: true, size: 16 }),
        new TextRun({ text: stripHtml(cond.desfasesMedicions || 'Non se rexistran.'), size: 16 }),
      ],
      spacing: { before: 40, after: 40 },
    })
  );

  const prevMod = cond.previsionModificados || {};
  const modSit = prevMod.situacion === 'non_hai'
    ? '[X] Non hai   [ ] En estudo   [ ] En tramitación'
    : prevMod.situacion === 'en_estudo'
    ? '[ ] Non hai   [X] En estudo   [ ] En tramitación'
    : prevMod.situacion === 'en_tramitacion'
    ? '[ ] Non hai   [ ] En estudo   [X] En tramitación'
    : '[X] Non hai';

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '• Previsión de modificados: ', bold: true, size: 16 }),
        new TextRun({ text: modSit, size: 16, color: COLOR_PRIMARY }),
      ],
      spacing: { before: 40, after: 40 },
    })
  );
  if (prevMod.descricionBreve) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '   Descrición: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(prevMod.descricionBreve), size: 16 }),
        ],
        spacing: { before: 20, after: 20 },
      })
    );
  }
  if (prevMod.impactoPrazoCusto) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '   Impacto en prazo e custo: ', bold: true, size: 16, color: 'DC2626' }),
          new TextRun({ text: stripHtml(prevMod.impactoPrazoCusto), size: 16, color: 'DC2626' }),
        ],
        spacing: { before: 20, after: 20 },
      })
    );
  }

  // 4.- SEGUIMENTO ORZAMENTARIO E DA PROGRAMACIÓN
  addSectionHeader('4.- SEGUIMENTO ORZAMENTARIO E DA PROGRAMACIÓN:');
  const eco = inf.seguimentoOrzamentario?.controlEconomico || {};
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '4.1.- CONTROL ECONÓMICO:', bold: true, size: 17 })],
      spacing: { before: 100, after: 60 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          children: [
            'Orzamento adxudicación',
            'Importe certif. acumulado',
            '% Certificado',
            'Certificación do mes',
            'Desviación estimada'
          ].map((h) => {
            return new TableCell({
              shading: { fill: COLOR_HEADER_BG },
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 15, color: COLOR_PRIMARY })], alignment: AlignmentType.CENTER })],
            });
          }),
        }),
        new TableRow({
          children: [
            formatEuros(eco.orzamentoAdxudicacion),
            formatEuros(eco.importeCertificadoAcumulado),
            `${Number(eco.porcentaxeAcumulada || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`,
            formatEuros(eco.certificacionMes),
            eco.desviacionEstimada || '0.0%'
          ].map((val) => {
            return new TableCell({
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: val, size: 16, bold: true, color: COLOR_TEXT })], alignment: AlignmentType.CENTER })],
            });
          }),
        }),
      ],
    })
  );

  const prazo = inf.seguimentoOrzamentario?.controlPrazo || {};
  const prazoSit = prazo.situacion === 'en_prazo'
    ? '[X] En prazo   [ ] Atraso leve   [ ] Atraso significativo'
    : prazo.situacion === 'atraso_leve'
    ? '[ ] En prazo   [X] Atraso leve   [ ] Atraso significativo'
    : '[ ] En prazo   [ ] Atraso leve   [X] Atraso significativo';

  children.push(
    new Paragraph({
      children: [new TextRun({ text: '4.2.- CONTROL DE PRAZO:', bold: true, size: 17 })],
      spacing: { before: 120, after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Situación: ', bold: true, size: 16 }),
        new TextRun({ text: prazoSit, size: 16, color: COLOR_PRIMARY }),
      ],
      spacing: { before: 30, after: 30 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Desviación estimada: ', bold: true, size: 16 }),
        new TextRun({ text: `${prazo.desviacionSemanas || 0} semanas`, size: 16 }),
      ],
      spacing: { before: 30, after: 30 },
    })
  );
  if (prazo.causas) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Causas: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(prazo.causas), size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }
  if (prazo.medidasCorrectoras) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Medidas correctoras: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(prazo.medidasCorrectoras), size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }
  if (prazo.previsionReestimacion) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Previsión e reestimación de prazos: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(prazo.previsionReestimacion), size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }
  if (prazo.actualizacionPrograma) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Actualización do programa de traballos: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(prazo.actualizacionPrograma), size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }
  if (prazo.necesariaAmpliacion) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '⚠️ É necesaria unha ampliación do prazo da obra: ', bold: true, size: 16, color: 'DC2626' }),
          new TextRun({ text: `Si. ${stripHtml(prazo.xustificacionAmpliacion || '')}`, size: 16, color: 'DC2626' }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }

  // 5.- CONTROL DE CALIDADE
  addSectionHeader('5.- CONTROL DE CALIDADE:');
  const cal = inf.controlCalidade || {};
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '• Resumo ensaios executados no mes: ', bold: true, size: 16 }),
        new TextRun({ text: stripHtml(cal.resumoEnsaios || 'Conforme a prego.'), size: 16 }),
      ],
      spacing: { before: 40, after: 40 },
    })
  );
  if (cal.incidenciasSolucions) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Incidencias e solucións: ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(cal.incidenciasSolucions), size: 16 }),
        ],
        spacing: { before: 40, after: 40 },
      })
    );
  }

  // 6.- SEGURIDADE E SAÚDE
  addSectionHeader('6.- SEGURIDADE E SAÚDE:');
  const seg = inf.seguridadeSaude || {};
  const segSit = seg.situacionXeral === 'correcta' ? '[X] Correcta   [ ] Con incidencias' : '[ ] Correcta   [X] Con incidencias';
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '• Situación xeral: ', bold: true, size: 16 }),
        new TextRun({ text: segSit, size: 16, color: COLOR_PRIMARY }),
      ],
      spacing: { before: 40, after: 40 },
    })
  );
  if (seg.incidenciasRelevantes) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Incidencias relevantes (CSS): ', bold: true, size: 16 }),
          new TextRun({ text: stripHtml(seg.incidenciasRelevantes), size: 16 }),
        ],
        spacing: { before: 40, after: 40 },
      })
    );
  }

  // 7.- REPORTAXE FOTOGRÁFICA
  const fotos = inf.reportaxeFotografica || [];
  if (fotos.length > 0) {
    addSectionHeader('7.- REPORTAXE FOTOGRÁFICA:');
    for (let idx = 0; idx < fotos.length; idx++) {
      const foto = fotos[idx];
      const photoData = await getPhotoBytes(foto.url);
      if (photoData) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: photoData.bytes,
                transformation: { width: photoData.width, height: photoData.height },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 60 },
          })
        );
      }
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Imaxe ${idx + 1} `, bold: true, size: 17, color: COLOR_PRIMARY }),
            new TextRun({
              text: `${foto.data ? `[${formatDate(foto.data)}] ` : ''}${foto.descripcion || 'Sen descrición'}`,
              size: 16,
              color: COLOR_MUTED,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
        })
      );
    }
  }

  // 8.- OUTROS
  addSectionHeader('8.- OUTROS:');
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: stripHtml(inf.outros?.modificacionCondicions || 'Non se produciron modificacións relevantes das condicións iniciais do contrato.'),
          size: 16,
        }),
      ],
      spacing: { before: 40, after: 40 },
    })
  );

  // 9.- CONCLUSIÓN
  addSectionHeader('9.- CONCLUSIÓN:');
  const conc = inf.conclusion || {};
  const concSit = conc.estado === 'favorable'
    ? '[X] Favorable   [ ] Con atención requirida   [ ] Comprometido'
    : conc.estado === 'atencion_requirida'
    ? '[ ] Favorable   [X] Con atención requirida   [ ] Comprometido'
    : '[ ] Favorable   [ ] Con atención requirida   [X] Comprometido';

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '• Estado de conclusión: ', bold: true, size: 16 }),
        new TextRun({ text: concSit, size: 16, color: COLOR_PRIMARY }),
      ],
      spacing: { before: 40, after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: stripHtml(conc.comentariosFinais || 'A dirección de obra valora axeitadamente a marcha dos traballos.'),
          italics: true,
          size: 16,
          color: COLOR_MUTED,
        }),
      ],
      spacing: { before: 40, after: 80 },
    })
  );

  // 10.- ANEXOS
  addSectionHeader('10.- ANEXOS:');
  const anex = inf.anexos || {};
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${anex.actasVisitas ? '[X]' : '[ ]'} Actas de visitas semanais á obra     `, size: 16 }),
        new TextRun({ text: `${anex.planObraActualizado ? '[X]' : '[ ]'} Plan de obra actualizado     `, size: 16 }),
        new TextRun({ text: `${anex.informesEnsaios ? '[X]' : '[ ]'} Informes dos ensaios`, size: 16 }),
      ],
      spacing: { before: 40, after: 40 },
    })
  );
  if (anex.outrosAnexos) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Outros anexos: ', bold: true, size: 16 }),
          new TextRun({ text: anex.outrosAnexos, size: 16 }),
        ],
        spacing: { before: 30, after: 30 },
      })
    );
  }

  // Create Document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 18,
            color: COLOR_TEXT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `INFORME MENSUAL • ${inf.datosXerais?.mesInformado || 'Informe de Obra'}`,
                    size: 14,
                    color: COLOR_MUTED,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Informe Mensual Oficial  |  Páxina ',
                    size: 14,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 14,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 14,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 14,
                    color: COLOR_MUTED,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return doc;
}

export async function exportInformeToDocx(inf) {
  const { db } = await import('./db.js');
  const numStr = inf.numero ? `N${inf.numero}_` : '';
  const rawName = inf.datosXerais?.mesInformado || inf.numero || 'seguimento';
  const cleanName = String(rawName)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
  const tipoPrefix = (inf.tipo === 'semanal' || inf.tipo === 'informe_semanal') ? 'Informe_Semanal' : 'Informe_Mensual';
  const filename = `${tipoPrefix}_${numStr}${cleanName || 'DT05'}.docx`;

  const obraId = inf.obraId || (typeof db !== 'undefined' && db.getActiveObraId ? db.getActiveObraId() : null);
  const currentObra = (typeof db !== 'undefined' && db.getObraById ? (db.getObraById(obraId) || db.getActiveObra()) : null) || {};
  const obraTitulo = currentObra?.titulo || inf.obraTitulo || (typeof inf.obra === 'string' ? inf.obra : null) || currentObra?.nombre || inf.datosXerais?.proxecto || 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';
  const expte = currentObra?.expediente || inf.expediente || inf.datosXerais?.expediente || 'AVS 03007 25/05';

  const enrichedInf = {
    ...inf,
    obraTitulo,
    obra: obraTitulo,
    expediente: expte,
    datosXerais: {
      ...(inf.datosXerais || {}),
      proxecto: obraTitulo,
      expediente: expte,
      situacion: currentObra?.situacion || inf.datosXerais?.situacion || currentObra?.ubicacion || '',
      contratista: currentObra?.contratista || inf.datosXerais?.contratista || '',
      direccionObra: currentObra?.direccionObra || inf.datosXerais?.direccionObra || '',
      direccionEjecucion: currentObra?.direccionEjecucion || inf.datosXerais?.direccionEjecucion || ''
    }
  };

  if (inf.actasPdf && inf.actasPdf.length > 0) {
    enrichedInf.actasPdf = inf.actasPdf.map(item => ({
      nombre: item.nombre || item.archivo || 'Acta de Visita',
      fecha: item.fecha || '',
      descripcion: item.descripcion || '',
      archivo: item.archivo || item.nombre || 'acta.pdf',
      tamano: item.tamano || 0
    }));
  } else if (inf.actasAnexasIds && inf.actasAnexasIds.length > 0) {
    enrichedInf.actasAnexas = inf.actasAnexasIds.map(id => db.getActaById(id)).filter(Boolean);
  }
  if (inf.anexosPdf && inf.anexosPdf.length > 0) {
    enrichedInf.anexosPdf = inf.anexosPdf.map(item => ({
      nombre: item.nombre || item.archivo || 'Documento',
      descripcion: item.descripcion || '',
      archivo: item.archivo || item.nombre || 'documento.pdf',
      tamano: item.tamano || 0
    }));
  }

  // 1. Prioritize official backend generation with plantilla_informe.docx
  try {
    const res = await fetch(`${API_BASE}/api/export-informe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ informe: enrichedInf, format: 'docx', responseType: 'token', filename })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.downloadUrl) {
        triggerDownload(data.downloadUrl, data.filename || filename);
        return data.filename || filename;
      }
    }
  } catch (err) {
    console.warn('Backend export-informe docx failed, fallback to client:', err);
  }

  // 2. Client-side fallback
  const doc = await buildInformeDocx(enrichedInf);
  if (typeof window !== 'undefined') {
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
  }
  return filename;
}

export async function exportInformeCompletoPdf(inf) {
  const { db } = await import('./db.js');
  const numStr = inf.numero ? `N${inf.numero}_` : '';
  const rawName = inf.datosXerais?.mesInformado || inf.numero || 'seguimento';
  const cleanName = String(rawName)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
  const tipoPrefix = (inf.tipo === 'semanal' || inf.tipo === 'informe_semanal') ? 'Informe_Semanal' : 'Informe_Mensual';
  const filename = `${tipoPrefix}_Completo_${numStr}${cleanName || 'DT05'}.pdf`;

  const obraId = inf.obraId || (typeof db !== 'undefined' && db.getActiveObraId ? db.getActiveObraId() : null);
  const currentObra = (typeof db !== 'undefined' && db.getObraById ? (db.getObraById(obraId) || db.getActiveObra()) : null) || {};
  const obraTitulo = currentObra?.titulo || inf.obraTitulo || (typeof inf.obra === 'string' ? inf.obra : null) || currentObra?.nombre || inf.datosXerais?.proxecto || 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';
  const expte = currentObra?.expediente || inf.expediente || inf.datosXerais?.expediente || 'AVS 03007 25/05';

  // 1. Enrich data with attached weekly actas and attached PDF annexes
  const enrichedInf = {
    ...inf,
    obraTitulo,
    obra: obraTitulo,
    expediente: expte,
    datosXerais: {
      ...(inf.datosXerais || {}),
      proxecto: obraTitulo,
      expediente: expte,
      situacion: currentObra?.situacion || inf.datosXerais?.situacion || currentObra?.ubicacion || '',
      contratista: currentObra?.contratista || inf.datosXerais?.contratista || '',
      direccionObra: currentObra?.direccionObra || inf.datosXerais?.direccionObra || '',
      direccionEjecucion: currentObra?.direccionEjecucion || inf.datosXerais?.direccionEjecucion || ''
    }
  };

  if (inf.actasPdf && inf.actasPdf.length > 0) {
    const actasList = [];
    for (const item of inf.actasPdf) {
      let b64 = item.url || item.dataUrl;
      if (!b64 && item.id) {
        const stored = await db.getPdfFile(item.id);
        b64 = stored ? stored.dataUrl : null;
      }
      actasList.push({
        nombre: item.nombre || item.archivo || 'Acta de Visita',
        fecha: item.fecha || '',
        descripcion: item.descripcion || '',
        archivo: item.archivo || item.nombre || 'acta.pdf',
        tamano: item.tamano || 0,
        dataUrl: b64,
        url: b64
      });
    }
    enrichedInf.actasPdf = actasList;
  } else if (inf.actasAnexasIds && inf.actasAnexasIds.length > 0) {
    enrichedInf.actasAnexas = inf.actasAnexasIds.map(id => db.getActaById(id)).filter(Boolean);
  }
  if (inf.anexosPdf && inf.anexosPdf.length > 0) {
    const list = [];
    for (const item of inf.anexosPdf) {
      let b64 = item.url || item.dataUrl;
      if (!b64 && item.id) {
        const stored = await db.getPdfFile(item.id);
        b64 = stored ? stored.dataUrl : null;
      }
      list.push({
        nombre: item.nombre || item.archivo || 'Documento',
        descripcion: item.descripcion || '',
        archivo: item.archivo || item.nombre || 'documento.pdf',
        tamano: item.tamano || 0,
        dataUrl: b64,
        url: b64
      });
    }
    enrichedInf.anexosPdf = list;
  }

  // 2. Prioritize official backend generation with Word COM / LibreOffice + official plantilla_informe.docx + separatas
  const res = await fetch(`${API_BASE}/api/export-informe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ informe: enrichedInf, format: 'pdf', responseType: 'token', filename })
  });
  if (res.ok) {
    const data = await res.json();
    if (data.downloadUrl) {
      triggerDownload(data.downloadUrl, data.filename || filename);
      return data.filename || filename;
    }
  }
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.detail || errData.error || `Erro do servidor (${res.status}) ao xerar o PDF oficial do informe`);
}

