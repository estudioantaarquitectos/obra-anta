/* ==========================================================================
   ANTA OBRA - Previsualización Oficial de Informe Semanal (1:1 con Plantilla DOCX)
   plantilla_informe_semanal.docx
   ========================================================================== */

import { db } from '../db.js';
import { exportInformeToDocx, exportInformeCompletoPdf } from '../exportDocx.js';

export function renderInformeSemanalPrint(container, router, params = {}) {
  const currentObra = db.getActiveObra();
  const informeId = params.id;
  const informe = db.getInformeById(informeId);

  if (!informe) {
    container.innerHTML = `
      <div class="content-wrapper" style="padding: 2rem; text-align: center;">
        <p>Non se atopou o informe semanal solicitado.</p>
        <button class="btn btn-primary" id="btn-back-exp">Volver ao Expediente</button>
      </div>
    `;
    container.querySelector('#btn-back-exp').onclick = () => {
      router.navigate('expediente', { id: currentObra?.id, tab: 'informes-semanais' });
    };
    return;
  }

  const numDisplay = informe.numero || 1;
  const rawDate = informe.fecha || '';
  const dateFormatted = formatDateLong(rawDate);
  const dateShort = formatDateShort(rawDate);

  const obraTitulo = currentObra?.titulo || informe.obraTitulo || 'Expediente de Obra';
  const expte = currentObra?.expediente || informe.expediente || '—';
  const situacion = currentObra?.situacion || '—';
  const contratista = currentObra?.contratista || '—';

  // Directores
  const doAgentes = (currentObra?.agentes || []).filter(a => a.rol === 'DO');
  const deAgentes = (currentObra?.agentes || []).filter(a => a.rol === 'DEM' || a.rol === 'DE');
  const cssAgentes = (currentObra?.agentes || []).filter(a => a.rol === 'CSS');
  const joAgentes = (currentObra?.agentes || []).filter(a => a.rol === 'JO');

  const doClean = doAgentes.map(a => a.nombre).join(', ') || currentObra?.direccionObra || '—';
  const deClean = deAgentes.map(a => a.nombre).join(', ') || currentObra?.direccionEjecucion || '—';
  const cssStr = cssAgentes.map(a => a.nombre).join(', ') || currentObra?.coordinadorCSS || '—';
  const joStr = joAgentes.map(a => a.nombre).join(', ') || currentObra?.jefeObra || '—';

  const relacion = Array.isArray(informe.relacion) ? informe.relacion : [];

  // Individual signers (cada persoa ten o seu propio caixetín de firma)
  const signers = [];
  if (Array.isArray(informe.firmas) && informe.firmas.length > 0) {
    informe.firmas.forEach(f => signers.push(f));
  } else {
    if (doAgentes.length > 0) {
      doAgentes.forEach(a => {
        signers.push({
          nombre: a.nombre,
          cargo: 'DIRECCIÓN DE OBRA (DO)',
          entidad: a.entidad || 'UTE ANTA-BOG'
        });
      });
    } else if (currentObra?.direccionObra) {
      const names = currentObra.direccionObra.replace(/\s+(?:e|y|and)\s+/g, ', ').split(',').map(s => s.trim()).filter(Boolean);
      names.forEach(n => signers.push({ nombre: n, cargo: 'DIRECCIÓN DE OBRA (DO)', entidad: 'UTE ANTA-BOG' }));
    }

    if (deAgentes.length > 0) {
      deAgentes.forEach(a => {
        signers.push({
          nombre: a.nombre,
          cargo: 'DIRECCIÓN DE EXECUCIÓN (DE)',
          entidad: a.entidad || ''
        });
      });
    } else if (currentObra?.direccionEjecucion) {
      const names = currentObra.direccionEjecucion.replace(/\s+(?:e|y|and)\s+/g, ', ').split(',').map(s => s.trim()).filter(Boolean);
      names.forEach(n => signers.push({ nombre: n, cargo: 'DIRECCIÓN DE EXECUCIÓN (DE)', entidad: '' }));
    }
  }

  const anexosPdf = Array.isArray(informe.anexosPdf) ? informe.anexosPdf : [];

  container.innerHTML = `
    <div class="content-wrapper">
      <div class="document-viewer-container" style="max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem;">
        
        <!-- Viewer Action Toolbar -->
        <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn btn-ghost btn-sm" id="btn-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              Volver
            </button>
            <span style="font-weight: 700; color: var(--text-main);">Informe Semanal nº ${numDisplay}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-ghost btn-sm" id="btn-edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Editar
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-export-docx">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Descargar DOCX
            </button>
            <button class="btn btn-primary btn-sm" id="btn-export-pdf">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="10 9 9 9 8 9"></polyline></svg>
              Descargar PDF Oficial 1:1
            </button>
          </div>
        </div>

        <!-- A4 Paper Document -->
        <div class="document-paper" style="background: #ffffff; padding: 2.2cm 1.9cm; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border-radius: 4px; font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #1e293b;">
          
          <!-- Encabezado Oficial Vipugal a 3 columnas -->
          <div style="border-bottom: 2px solid #0F4761; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 150px; vertical-align: middle;">
                  <img src="/VIPUGAL_LOGO.png" alt="VIPUGAL" style="max-height: 48px; max-width: 140px; object-fit: contain;" />
                </td>
                <td style="vertical-align: middle; padding: 0 1rem; text-align: left;">
                  <div style="font-size: 8.5pt; font-weight: 700; color: #0F4761; line-height: 1.25;">
                    ${escapeHtml(obraTitulo)}
                  </div>
                  <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
                    (EXPTE: ${escapeHtml(expte)})
                  </div>
                </td>
                <td style="width: 170px; vertical-align: middle; text-align: right;">
                  <div style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; padding: 0.4rem 0.6rem; text-align: center;">
                    <div style="font-size: 7.5pt; font-weight: 700; color: #0F4761; text-transform: uppercase; letter-spacing: 0.5px;">INFORME SEMANAL</div>
                    <div style="font-size: 16pt; font-weight: 800; color: #0F4761; line-height: 1.1; margin: 2px 0;">Nº ${numDisplay}</div>
                    <div style="font-size: 7.5pt; color: #475569;">${dateShort}</div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- 1. DATOS XERAIS E RESUME EXECUTIVO -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 11pt; font-weight: 700; color: #0F4761; border-bottom: 1px solid #4C94D8; padding-bottom: 3px; margin-bottom: 0.75rem;">
              DATOS XERAIS E RESUME EXECUTIVO
            </div>

            <!-- Tabla 0: Datos do contrato -->
            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #CBD5E1; margin-bottom: 0.75rem;">
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem; width: 22%;">PROXECTO</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem; font-weight: 600;">${escapeHtml(obraTitulo)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem;">EMPRAZAMENTO</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem;">${escapeHtml(situacion)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem;">EXPEDIENTE</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem; font-weight: 600; color: #0F4761;">${escapeHtml(expte)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem;">CONTRATISTA</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem; font-weight: 600;">${escapeHtml(contratista)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem;">DIRECCIÓN DE OBRA</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem; color: #1e3a8a; font-weight: 600;">${escapeHtml(doClean)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem;">DIRECCIÓN DE EXECUCIÓN</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem; color: #0284c7; font-weight: 600;">${escapeHtml(deClean)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem;">COORDINADOR CSS</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem;">${escapeHtml(cssStr)}</td>
              </tr>
              <tr>
                <td style="background: #F8FAFC; font-weight: 700; color: #0F4761; padding: 0.45rem 0.6rem;">XEFE DE OBRA</td>
                <td colspan="3" style="padding: 0.45rem 0.6rem;">${escapeHtml(joStr)}</td>
              </tr>
            </table>

            ${informe.resumo ? `
              <div style="background: #F8FAFC; border-left: 3px solid #0F4761; padding: 0.75rem 1rem; margin-top: 0.5rem; font-size: 9pt; color: #334155;">
                <div style="font-weight: 700; color: #0F4761; font-size: 8pt; text-transform: uppercase; margin-bottom: 0.25rem;">RESUMO EXECUTIVO:</div>
                ${escapeHtml(informe.resumo)}
              </div>
            ` : ''}
          </div>

          <!-- 2. RELACIÓN DE VISITAS E REUNIÓNS EN OBRA -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 11pt; font-weight: 700; color: #0F4761; border-bottom: 1px solid #4C94D8; padding-bottom: 3px; margin-bottom: 0.75rem;">
              RELACIÓN DE VISITAS E REUNIÓNS EN OBRA
            </div>
            <p style="font-size: 9.5pt; color: #334155; margin-bottom: 0.75rem;">
              Durante a presente semana, realizáronse as seguintes reunións e visitas á obra:
            </p>

            <table style="width: 100%; border-collapse: collapse; font-size: 9pt; border: 1px solid #CBD5E1;">
              <thead>
                <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1; color: #0F4761; font-weight: 700;">
                  <th style="padding: 0.5rem 0.75rem; text-align: left; width: 140px;">Fecha</th>
                  <th style="padding: 0.5rem 0.75rem; text-align: left;">Tipo visita / reunión</th>
                  <th style="padding: 0.5rem 0.75rem; text-align: center; width: 90px;">Nº</th>
                </tr>
              </thead>
              <tbody>
                ${relacion.length === 0 ? `
                  <tr>
                    <td colspan="3" style="padding: 1rem; text-align: center; color: #64748b; font-style: italic;">
                      Non se rexistraron visitas nin reunións específicas nesta semana.
                    </td>
                  </tr>
                ` : relacion.map(item => `
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 0.5rem 0.75rem;">${formatDateShort(item.fecha)}</td>
                    <td style="padding: 0.5rem 0.75rem; font-weight: 600;">${escapeHtml(item.tipo)}</td>
                    <td style="padding: 0.5rem 0.75rem; text-align: center; font-weight: 700; color: #0F4761;">${item.numero || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <p style="font-size: 9pt; color: #475569; font-style: italic; margin-top: 0.75rem;">
              Adxúntanse a este informe, como anexos, as actas correspondentes de ditas visitas e reunións.
            </p>
          </div>

          <!-- 3. DILIXENCIA DE FIRMAS (CADA PERSOA TEN O SEU PROPIO CAIXETÍN) -->
          <div style="margin-top: 2rem; page-break-inside: avoid;">
            <div style="font-size: 11pt; font-weight: 700; color: #0F4761; border-bottom: 1px solid #4C94D8; padding-bottom: 3px; margin-bottom: 0.75rem;">
              DILIXENCIA DE FIRMAS
            </div>
            <p style="font-size: 9pt; color: #475569; margin-bottom: 1rem; font-style: italic;">
              En Ferrol a ${dateFormatted}. Para que así conste e aos efectos oportunos, asinan a presente dilixencia de informe semanal:
            </p>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem;">
              ${signers.map(s => `
                <div style="border: 1px solid #CBD5E1; border-radius: 4px; padding: 0.85rem; background: #F8FAFC; text-align: center; min-height: 120px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="font-size: 8pt; font-weight: 700; color: ${s.cargo?.includes('OBRA') || s.cargo?.includes('DO') ? '#1e3a8a' : '#0284c7'}; text-transform: uppercase;">
                      ${escapeHtml(s.cargo || 'Dirección Facultativa')}
                    </div>
                    <div style="font-size: 8.5pt; font-weight: 700; color: #1e293b; margin-top: 3px;">
                      ${escapeHtml(s.nombre)}
                    </div>
                    ${s.entidad ? `<div style="font-size: 7.5pt; color: #64748b; margin-top: 1px;">${escapeHtml(s.entidad)}</div>` : ''}
                  </div>
                  <div style="font-size: 7.5pt; color: #64748b; margin-top: 1.5rem; border-top: 1px dashed #CBD5E1; padding-top: 4px;">
                    Asdo.: ____________________________
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 4. ANEXOS DOCUMENTAIS DO INFORME -->
          ${anexosPdf.length > 0 ? `
            <div style="margin-top: 2rem; page-break-inside: avoid;">
              <div style="font-size: 11pt; font-weight: 700; color: #0F4761; border-bottom: 1px solid #4C94D8; padding-bottom: 3px; margin-bottom: 0.75rem;">
                4. ANEXOS DOCUMENTAIS DO INFORME
              </div>
              <p style="font-size: 9pt; color: #475569; margin-bottom: 0.75rem;">
                A continuación incorpóranse os seguintes documentos e actas concatenadas mediante separata oficial:
              </p>
              <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #CBD5E1;">
                <thead>
                  <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1; color: #0F4761; font-weight: 700;">
                    <th style="padding: 0.45rem 0.6rem; text-align: center; width: 45px;">Nº</th>
                    <th style="padding: 0.45rem 0.6rem; text-align: left;">Título do Documento Anexo</th>
                    <th style="padding: 0.45rem 0.6rem; text-align: left;">Nome do Ficheiro</th>
                    <th style="padding: 0.45rem 0.6rem; text-align: center; width: 90px;">Tamaño</th>
                  </tr>
                </thead>
                <tbody>
                  ${anexosPdf.map((anx, aIdx) => `
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 700; color: #0F4761;">${aIdx + 1}</td>
                      <td style="padding: 0.45rem 0.6rem; font-weight: 600;">${escapeHtml(anx.titulo || anx.nombre || `Anexo ${aIdx + 1}`)}</td>
                      <td style="padding: 0.45rem 0.6rem; color: #64748b; font-family: monospace; font-size: 8pt;">${escapeHtml(anx.nombre || 'documento.pdf')}</td>
                      <td style="padding: 0.45rem 0.6rem; text-align: center; color: #64748b;">${anx.size ? `${(anx.size / 1024).toFixed(0)} KB` : '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

        </div>

      </div>
    </div>
  `;

  // Events
  container.querySelector('#btn-back').onclick = () => {
    router.navigate('expediente', { id: currentObra?.id, tab: 'informes-semanais' });
  };
  container.querySelector('#btn-edit').onclick = () => {
    router.navigate('informe-semanal-editor', { id: informe.id });
  };
  container.querySelector('#btn-export-docx').onclick = async () => {
    await exportInformeToDocx(informe);
  };
  container.querySelector('#btn-export-pdf').onclick = async () => {
    await exportInformeCompletoPdf(informe);
  };
}

function formatDateShort(str) {
  if (!str) return '—';
  try {
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return str;
  } catch (e) {
    return str;
  }
}

function formatDateLong(str) {
  if (!str) return 'a data de emisión';
  const months = ['', 'xaneiro', 'febreiro', 'marzo', 'abril', 'maio', 'xuño', 'xullo', 'agosto', 'setembro', 'outubro', 'novembro', 'decembro'];
  try {
    const parts = str.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[0], 10);
      const mName = months[m] || str;
      return `${d} de ${mName} de ${y}`;
    }
    return str;
  } catch (e) {
    return str;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
