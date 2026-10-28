/* ==========================================================================
   ANTA OBRA - Official Note Print / PDF Preview
   Institutional printable layout for site notes, incidents and calls
   ========================================================================== */

import { escapeHtml } from './richEditor.js';
import { db } from '../db.js';

export function printNota(nota, obra = null) {
  if (!nota) return;
  const currentObra = obra || (nota.obraId ? db.getObraById(nota.obraId) : db.getActiveObra()) || {};
  const obraTitulo = currentObra.titulo || 'Refundido de actuaciones en el castillo de San Felipe';
  const expediente = currentObra.expediente || 'AVS 03007 25/05';
  const situacion = currentObra.situacion || '—';

  let catLabel = 'Nota de Obra';
  if (nota.categoria === 'llamada') catLabel = 'Chamada Telefónica';
  else if (nota.categoria === 'incidencia') catLabel = 'Incidencia / Seguridade';
  else if (nota.categoria === 'orden_direccion') catLabel = 'Orde de Dirección';
  else if (nota.categoria === 'recordatorio') catLabel = 'Recordatorio';

  let urgLabel = 'Normal';
  let urgColor = '#0284c7';
  if (nota.urgencia === 'alta') {
    urgLabel = 'Urxente';
    urgColor = '#dc2626';
  } else if (nota.urgencia === 'media') {
    urgLabel = 'Media';
    urgColor = '#d97706';
  }

  const printHtml = `
    <!DOCTYPE html>
    <html lang="gl">
    <head>
      <meta charset="utf-8" />
      <title>Nota de Obra - ${escapeHtml(nota.titulo)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 18mm 20mm 20mm 20mm;
        }
        * {
          box-sizing: border-box;
          font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 24px;
          color: #0f172a;
          background: #ffffff;
          font-size: 10pt;
          line-height: 1.5;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 12px;
        }
        .header-table td {
          vertical-align: middle;
        }
        .logo-box {
          width: 150px;
        }
        .logo-box img {
          max-width: 140px;
          max-height: 50px;
          object-fit: contain;
        }
        .header-title-box {
          text-align: center;
          padding: 0 12px;
        }
        .header-title-box .proj-title {
          font-size: 9pt;
          font-weight: 700;
          color: #1e293b;
          text-transform: uppercase;
          line-height: 1.3;
        }
        .header-title-box .exp-num {
          font-size: 8pt;
          color: #64748b;
          margin-top: 4px;
        }
        .header-meta-box {
          width: 130px;
          text-align: right;
        }
        .meta-badge {
          display: inline-block;
          font-size: 8pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #f1f5f9;
          color: #1e3a8a;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
        }
        .meta-date {
          font-size: 8pt;
          color: #475569;
          margin-top: 4px;
        }
        .note-card {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .note-header {
          background: #f8fafc;
          border-bottom: 1px solid #cbd5e1;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .note-title {
          font-size: 13pt;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0;
        }
        .pill {
          display: inline-block;
          padding: 3px 8px;
          font-size: 8pt;
          font-weight: 700;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .info-grid {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          border: 1px solid #e2e8f0;
        }
        .info-grid td {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          font-size: 9pt;
        }
        .info-grid .lbl {
          font-weight: 700;
          color: #64748b;
          width: 25%;
          background: #f8fafc;
        }
        .info-grid .val {
          color: #0f172a;
        }
        .note-content-box {
          padding: 16px;
          font-size: 10.5pt;
          color: #1e293b;
          white-space: pre-wrap;
          line-height: 1.6;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background: #ffffff;
          min-height: 140px;
          margin-bottom: 24px;
        }
        .footer-signatures {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sig-box {
          width: 45%;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          border-radius: 6px;
          padding: 14px;
          font-size: 8.5pt;
        }
        .sig-title {
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 40px;
        }
        .sig-line {
          border-top: 1px dashed #94a3b8;
          padding-top: 4px;
          color: #64748b;
          font-size: 8pt;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="logo-box">
            <img src="${window.location.origin}/VIPUGAL_LOGO.png" alt="Sociedade de Vivenda Pública de Galicia" onerror="this.style.display='none'" />
          </td>
          <td class="header-title-box">
            <div class="proj-title">${escapeHtml(obraTitulo)}</div>
            <div class="exp-num">EXPEDIENTE: ${escapeHtml(expediente)} • ${escapeHtml(situacion)}</div>
          </td>
          <td class="header-meta-box">
            <div class="meta-badge">CADERNO DE BITÁCORA</div>
            <div class="meta-date">Data: ${escapeHtml(nota.fecha || '—')}</div>
          </td>
        </tr>
      </table>

      <h1 class="note-title" style="margin-bottom: 12px;">${escapeHtml(nota.titulo)}</h1>

      <table class="info-grid">
        <tr>
          <td class="lbl">Tipo / Categoría:</td>
          <td class="val"><strong>${escapeHtml(catLabel)}</strong></td>
          <td class="lbl">Nivel de Urxencia:</td>
          <td class="val"><span style="color: ${urgColor}; font-weight: 800;">${escapeHtml(urgLabel)}</span></td>
        </tr>
        <tr>
          <td class="lbl">Autor da Nota:</td>
          <td class="val">${escapeHtml(nota.autor || 'Dirección de Obra')}</td>
          <td class="lbl">Última Modificación:</td>
          <td class="val">${escapeHtml(nota.modificadoPor || nota.autor || '—')} (${escapeHtml(nota.fechaModificacion ? nota.fechaModificacion.split('T')[0] : (nota.fecha || '—'))})</td>
        </tr>
        ${nota.vinculadoA ? `
          <tr>
            <td class="lbl">Vencellada a Acta:</td>
            <td class="val" colspan="3">${escapeHtml(nota.vinculadoA)}</td>
          </tr>
        ` : ''}
      </table>

      <div style="font-weight: 700; color: #475569; font-size: 9pt; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
        Contido do Rexistro / Indicación:
      </div>
      <div class="note-content-box">${escapeHtml(nota.contenido)}</div>

      <div class="footer-signatures">
        <div class="sig-box">
          <div class="sig-title">Dirección de Obra / Autor do Rexistro</div>
          <div class="sig-line">Asdo.: ${escapeHtml(nota.autor || 'Dirección de Obra')}</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Recepción / Constancia de Obra</div>
          <div class="sig-line">Asdo.: ____________________________________</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    // If popups blocked, use hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 60000);
      } catch (e) {
        console.warn('Print iframe error:', e);
      }
    }, 400);
  }
}
