/* ==========================================================================
   ANTA OBRA - Acta Official View & Print Layout (Modern Template)
   Strictly matches the institutional composition of the Informe Mensual (DT-05)
   - Vipugal 3-Column Header
   - Section 1: Datos Xerais (Separated Dirección de Obra and Dirección de Execución)
   - Section 2: Asistentes e Convocados (Avatars and Badges)
   - Section 3: Cuestións Tratadas na Visita / Reunión
   - Section 4: Dilixencia de Firmas
   - Section 5: Anexo Reportaxe Fotográfico (Cuadrícula 2x2 manteniendo proporción exacta)
   - Section 6: Anexo Documentos PDF (Con separata oficial por anexo)
   ========================================================================== */

import { db, normalizeActa } from '../db.js';
import { auth } from '../auth.js';
import { showToast } from '../modal.js';
import { renderAgentAvatarHtml } from '../utils/avatar.js';

export function renderActaPrint(container, router, params = {}) {
  const actaId = params.id;
  const isReunionParam = Boolean(params && (params.isReunion || params.tipoDocumento === 'reunion'));
  const rawActa = (isReunionParam ? db.getReunionById(actaId) : (db.getActaById(actaId) || db.getReunionById(actaId))) || db.getReunionById(actaId) || db.getActaById(actaId);

  if (!rawActa) {
    showToast(isReunionParam ? 'Reunión non atopada' : 'Acta non atopada', 'error');
    router.navigate('dashboard');
    return;
  }

  const isReunion = Boolean(isReunionParam || rawActa.tipoDocumento === 'reunion' || rawActa.esReunion === true || String(actaId).startsWith('reu-'));
  const acta = normalizeActa(rawActa);
  const canEdit = auth.can('actas:edit');

  const obraId = acta.obraId || db.getActiveObraId();
  const currentObra = db.getObraById(obraId) || db.getActiveObra();
  const obraTitulo = currentObra?.titulo || acta.obraTitulo || acta.obra || 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';

  // Separación estricta de Dirección de Obra y Dirección de Ejecución (Audio 4)
  const rawDO = currentObra?.direccionObra || 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO)';
  const doClean = rawDO.includes(' / ') ? rawDO.split(' / ')[0].trim() : rawDO;
  const deClean = currentObra?.direccionEjecucion || (rawDO.includes(' / ') ? rawDO.split(' / ')[1].trim() : '—');
  const coordinadorCSSStr = currentObra?.coordinadorCSS || '';
  const jefeObraStr = currentObra?.jefeObra || '';

  const asistentes = acta.asistentes || [];
  const asistentesFirmantes = asistentes.filter(a => a.asistio !== false && a.asiste !== false && a.estado !== 'non_asiste' && Boolean(a.firma));
  
  // Regla: Si no hay ningún asistente con firma marcada, desaparece el punto de firmas en el resultado final
  const firmantes = isReunion
    ? asistentesFirmantes
    : (asistentesFirmantes.length > 0
        ? asistentesFirmantes
        : ((acta.firmas && acta.firmas.length > 0 && !asistentes.some(a => a.firma === false))
            ? acta.firmas
            : (asistentes.length > 0 && !asistentes.some(a => a.firma === false) ? asistentes.slice(0, 2) : [])));

  const hasFirmas = firmantes.length > 0;
  const fotos = acta.fotos || [];
  const anexosPdf = acta.anexosPdf || [];

  let nextSec = isReunion ? 5 : 4;
  const hasCSS = !isReunion && Boolean(acta.indicacionesSeguridad && (Array.isArray(acta.indicacionesSeguridad) ? acta.indicacionesSeguridad.length : acta.indicacionesSeguridad.trim()));
  const numCSS = hasCSS ? nextSec++ : null;

  const hasPrevistas = !isReunion && Boolean(acta.actuacionesPrevistas && (Array.isArray(acta.actuacionesPrevistas) ? acta.actuacionesPrevistas.length : acta.actuacionesPrevistas.trim()));
  const numPrevistas = hasPrevistas ? nextSec++ : null;

  const numFirmas = hasFirmas ? nextSec++ : null;
  const numFotos = (fotos && fotos.length > 0) ? nextSec++ : null;
  const numAnexos = (anexosPdf && anexosPdf.length > 0) ? nextSec++ : null;

  container.innerHTML = `
    <div class="content-wrapper">
      <div class="document-preview-container">

        <!-- Toolbar for Screen Mode (Hidden during Print) -->
        <div class="document-preview-toolbar">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button class="btn btn-secondary btn-sm" id="btn-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Volver al Expediente
            </button>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
              ${isReunion ? 'Reunión' : 'Acta'} nº ${acta.numero} • Plantilla Oficial de Obra
            </span>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${canEdit ? `
              <button class="btn btn-secondary btn-sm" id="btn-edit-current">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                ${isReunion ? 'Editar Reunión' : 'Editar Acta'}
              </button>
            ` : ''}

            <button class="btn btn-secondary btn-sm" id="btn-export-docx" title="Exportar documento a formato Microsoft Word (.docx)" style="font-weight: 600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span>DOCX</span>
            </button>

            <button class="btn btn-primary btn-sm" id="btn-export-pdf" title="Xerar e descargar PDF Oficial Completo con Anexos e Separatas" style="font-weight: 600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <span>${anexosPdf.length > 0 ? 'Descargar PDF con Anexos' : 'Descargar PDF'}</span>
            </button>

            <button class="btn btn-secondary btn-sm" id="btn-trigger-print" title="Imprimir directamente desde o navegador">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        <!-- Official Paper Container (Matching DT-05 Layout Composition) -->
        <div class="document-paper" id="printable-acta">

          <!-- 1. VIPUGAL / INSTITUTIONAL 3-COLUMN HEADER (Audio 3) -->
          <div class="dt05-doc-header">
            <div class="dt05-logo-left">
              <img src="VIPUGAL_LOGO.png" alt="Sociedade de Vivenda Pública de Galicia" />
            </div>

            <div class="dt05-header-title">
              <div style="font-weight: 600; font-size: 8.5pt; color: #1e293b; line-height: 1.35;">
                ${escapeHtml(obraTitulo)}
              </div>
              <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">
                (EXPTE: ${escapeHtml(acta.expediente || currentObra?.expediente || '—')})
              </div>
            </div>

            <div class="dt05-header-meta">
              <div class="dt05-meta-label">
                ${isReunion ? 'REUNIÓN' : 'ACTA SEMANAL'}
              </div>
              <div class="dt05-meta-row">
                <span class="dt05-meta-num">${escapeHtml(String(acta.numero || ''))}</span>
                <span class="dt05-meta-date">${formatHeaderDate(acta.fecha)}</span>
              </div>
            </div>
          </div>

                    ${isReunion ? `
            <!-- 1. SECTION: DATOS XERAIS -->
            <div class="dt05-section">
              <div class="dt05-sec-header">DATOS XERAIS</div>
              <table class="dt05-table-accent1" style="margin-top: 8px;">
                <tbody>
                  <tr>
                    <td style="width: 25%; font-weight: bold; color: #475569;">Proxecto:</td>
                    <td colspan="3" style="font-weight: bold; color: #0F172A;">${escapeHtml(obraTitulo)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Emprazamento:</td>
                    <td colspan="3">${escapeHtml(acta.situacion || currentObra?.situacion || '—')}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Expediente:</td>
                    <td colspan="3" style="font-weight: bold; color: #0F172A;">${escapeHtml(acta.expediente || currentObra?.expediente || '—')}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Dirección de obra (DO):</td>
                    <td style="font-weight: bold; color: #1E3A8A;">${escapeHtml(doClean)}</td>
                    <td style="width: 25%; font-weight: bold; color: #475569;">Dirección de Execución (DE):</td>
                    <td style="font-weight: bold; color: #0284C7;">${escapeHtml(deClean)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;"></td>
                    <td></td>
                    <td style="font-weight: bold; color: #475569;">Coordinador de seguridade e saúde (CSS):</td>
                    <td>${escapeHtml(coordinadorCSSStr || '—')}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Contratista:</td>
                    <td style="font-weight: bold; color: #0F172A;">${escapeHtml(currentObra?.contratista || '—')}</td>
                    <td style="font-weight: bold; color: #475569;">Xefe de obra (XO):</td>
                    <td>${escapeHtml(jefeObraStr || '—')}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Data da reunión:</td>
                    <td style="font-weight: bold; color: #0F172A;">${formatDate(acta.fecha)}</td>
                    <td style="font-weight: bold; color: #475569;">Tipo:</td>
                    <td style="font-weight: bold; color: #1E3A8A;">${escapeHtml(acta.tipoModalidad || 'Presencial')}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Lugar da reunión:</td>
                    <td colspan="3">${escapeHtml(acta.lugar || (currentObra?.situacion || 'Caseta de obra'))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 2. SECTION: ASISTENTES -->
            <div class="dt05-section" style="margin-top: 14px;">
              <div class="dt05-sec-header">ASISTENTES</div>
              <table class="dt05-table-accent1" style="margin-top: 8px;">
                <thead>
                  <tr>
                    <th style="width: 35%;">Nome e Apelidos</th>
                    <th style="width: 36%;">Cargo / Función</th>
                    <th style="width: 29%;">Entidade Representada</th>
                  </tr>
                </thead>
                <tbody>
                  ${asistentes.filter(a => a.asistio !== false && a.asiste !== false && a.estado !== 'non_asiste').length === 0 ? `
                    <tr>
                      <td colspan="3" style="font-style: italic; color: #64748b; text-align: center; padding: 10px;">
                        Non constan asistentes rexistrados.
                      </td>
                    </tr>
                  ` : asistentes.filter(a => a.asistio !== false && a.asiste !== false && a.estado !== 'non_asiste').map(asist => `
                    <tr>
                      <td style="font-weight: 600; color: #0f172a; vertical-align: middle;">
                        ${escapeHtml(asist.nombre || asist.nome || '')}
                      </td>
                      <td style="color: #475569; vertical-align: middle;">
                        ${escapeHtml(asist.cargo || '—')}
                      </td>
                      <td style="color: #64748b; vertical-align: middle;">
                        ${escapeHtml(asist.entidad || asist.empresa || '—')}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- 3. SECTION: CUESTIÓNS TRATADAS NA VISITA / REUNIÓN -->
            <div class="dt05-section" style="margin-top: 14px;">
              <div class="dt05-sec-header">CUESTIÓNS TRATADAS NA VISITA / REUNIÓN</div>
              ${renderApartadosHtmlModern(acta, 3)}
            </div>

            <!-- 4. SECTION: DILIXENCIA DE FIRMAS -->
            ${hasFirmas ? `
              <div class="dt05-section" style="margin-top: 18px; page-break-inside: avoid;">
                <div class="dt05-sec-header">DILIXENCIA DE FIRMAS</div>
                <div style="font-size: 8.5pt; color: #475569; margin-bottom: 8px; font-style: italic;">
                  En ${getLugar(acta.situacion)} a ${formatDateLong(acta.fecha)}. Para que así conste e aos efectos oportunos, asinan a presente acta de reunión:
                </div>
                <div class="acta-modern-firmas-grid">
                  ${firmantes.map(f => `
                    <div class="acta-modern-firma-card">
                      <div>
                        <div class="acta-modern-firma-role">${escapeHtml(f.cargo || 'Asistente')}${f.entidad ? ` (${escapeHtml(f.entidad)})` : ''}:</div>
                        <div class="acta-modern-firma-name">${escapeHtml(f.nombre || f.texto || '')}</div>
                      </div>
                      <div class="acta-modern-firma-space"></div>
                      <div style="font-size: 8pt; color: #94a3b8; margin-top: 2px;">Asdo.: ____________________________</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          ` : `
            <!-- 1. SECTION: DATOS XERAIS -->
            <div class="dt05-section">
              <div class="dt05-sec-header">DATOS XERAIS</div>
              <table class="dt05-table-accent1" style="margin-top: 8px;">
                <tbody>
                  <tr>
                    <td style="width: 25%; font-weight: bold; color: #475569;">Proxecto:</td>
                    <td colspan="3" style="font-weight: bold; color: #0F172A;">${escapeHtml(obraTitulo)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Emprazamento:</td>
                    <td colspan="3">${escapeHtml(acta.situacion || currentObra?.situacion || '—')}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Expediente:</td>
                    <td style="font-weight: bold; color: #0F172A;">${escapeHtml(acta.expediente || currentObra?.expediente || '—')}</td>
                    <td style="width: 25%; font-weight: bold; color: #475569;">Data da acta:</td>
                    <td style="font-weight: bold; color: #0F172A;">${formatDate(acta.fecha)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Dirección de obra (DO):</td>
                    <td style="font-weight: bold; color: #1E3A8A;">${escapeHtml(doClean)}</td>
                    <td style="width: 25%; font-weight: bold; color: #475569;">Dirección de Execución (DE):</td>
                    <td style="font-weight: bold; color: #0284C7;">${escapeHtml(deClean)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;"></td>
                    <td></td>
                    <td style="font-weight: bold; color: #475569;">Coordinador de seguridade e saúde (CSS):</td>
                    <td>${escapeHtml(coordinadorCSSStr || '—')}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #475569;">Contratista:</td>
                    <td style="font-weight: bold; color: #0F172A;">${escapeHtml(currentObra?.contratista || '—')}</td>
                    <td style="font-weight: bold; color: #475569;">Xefe de obra (XO):</td>
                    <td>${escapeHtml(jefeObraStr || '—')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 2. SECTION: ASISTENTES -->
            <div class="dt05-section" style="margin-top: 14px;">
              <div class="dt05-sec-header">ASISTENTES</div>
              <table class="dt05-table-accent1" style="margin-top: 8px;">
                <thead>
                  <tr>
                    <th style="width: 35%;">Nome e Apelidos</th>
                    <th style="width: 36%;">Cargo / Función</th>
                    <th style="width: 29%;">Entidade Representada</th>
                  </tr>
                </thead>
                <tbody>
                  ${asistentes.filter(a => a.asistio !== false && a.asiste !== false && a.estado !== 'non_asiste').length === 0 ? `
                    <tr>
                      <td colspan="3" style="font-style: italic; color: #64748b; text-align: center; padding: 10px;">
                        Non constan asistentes rexistrados.
                      </td>
                    </tr>
                  ` : asistentes.filter(a => a.asistio !== false && a.asiste !== false && a.estado !== 'non_asiste').map(asist => `
                    <tr>
                      <td style="font-weight: 600; color: #0f172a; vertical-align: middle;">
                        ${escapeHtml(asist.nombre || asist.nome || '')}
                      </td>
                      <td style="color: #475569; vertical-align: middle;">
                        ${escapeHtml(asist.cargo || '—')}
                      </td>
                      <td style="color: #64748b; vertical-align: middle;">
                        ${escapeHtml(asist.entidad || asist.empresa || '—')}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- 3. SECTION: CUESTIÓNS TRATADAS NA VISITA / REUNIÓN -->
            <div class="dt05-section" style="margin-top: 14px;">
              <div class="dt05-sec-header">CUESTIÓNS TRATADAS NA VISITA / REUNIÓN</div>
              ${renderApartadosHtmlModern(acta, 3)}
            </div>

            <!-- 4. SECTION: DILIXENCIA DE FIRMAS -->
            ${hasFirmas ? `
              <div class="dt05-section" style="margin-top: 18px; page-break-inside: avoid;">
                <div class="dt05-sec-header">DILIXENCIA DE FIRMAS</div>
                <div style="font-size: 8.5pt; color: #475569; margin-bottom: 8px; font-style: italic;">
                  En ${getLugar(acta.situacion)} a ${formatDateLong(acta.fecha)}. Para que así conste e aos efectos oportunos, asinan a presente acta:
                </div>
                <div class="acta-modern-firmas-grid">
                  ${firmantes.map(f => `
                    <div class="acta-modern-firma-card">
                      <div>
                        <div class="acta-modern-firma-role">${escapeHtml(f.cargo || 'Asistente')}${f.entidad ? ` (${escapeHtml(f.entidad)})` : ''}:</div>
                        <div class="acta-modern-firma-name">${escapeHtml(f.nombre || f.texto || '')}</div>
                      </div>
                      <div class="acta-modern-firma-space"></div>
                      <div style="font-size: 8pt; color: #94a3b8; margin-top: 2px;">Asdo.: ____________________________</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          `}

          <!-- 8. ANEXO REPORTAXE FOTOGRÁFICO EN MODO GRID 2x2 (Audio 2) -->
          ${numFotos ? `
            <div class="dt05-section" style="margin-top: 22px; page-break-before: auto;">
              <div class="dt05-sec-header">ANEXO REPORTAXE FOTOGRÁFICO</div>
              <div style="font-size: 8pt; color: #64748b; margin-bottom: 6px;">
                Imaxes capturadas na visita de obra (distribución uniforme en cuadrícula de 4 fotos por páxina, respectando a proporción orixinal):
              </div>
              
              <div class="acta-photos-grid-modern">
                ${fotos.map((foto, idx) => `
                  <div class="acta-photo-card">
                    <div class="acta-photo-img-wrapper">
                      <img src="${foto.url}" alt="Foto ${idx + 1}" loading="lazy" />
                    </div>
                    <div class="acta-photo-caption">
                      <span class="acta-photo-badge">Foto ${idx + 1} [${formatDate(foto.fecha || acta.fecha)}]</span>
                      <span>${escapeHtml(foto.descripcion || 'Sen descrición adicional')}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 9. ANEXO DOCUMENTOS PDF ADXUNTOS (Audio 1) -->
          ${numAnexos ? `
            <div class="dt05-section" style="margin-top: 22px; page-break-inside: avoid;">
              <div class="dt05-sec-header">ANEXO DOCUMENTOS PDF ADXUNTOS</div>
              <div style="font-size: 8pt; color: #64748b; margin-bottom: 8px;">
                Relación de documentos complementarios incorporados correlativamente ao final do PDF oficial, cada un precedido pola súa folla de separata institucional:
              </div>
              
              <table class="dt05-table-accent1">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">Nº</th>
                    <th>Nome do Documento Adxunto</th>
                    <th style="width: 110px; text-align: center;">Tamaño</th>
                    <th style="width: 140px; text-align: center;">Estado no PDF</th>
                  </tr>
                </thead>
                <tbody>
                  ${anexosPdf.map((pdf, pIdx) => `
                    <tr>
                      <td style="text-align: center; font-weight: 700; color: #1e3a8a;">${pIdx + 1}</td>
                      <td style="color: #0f172a;">
                        <div style="font-weight: 700; color: #0f4761; font-size: 8.5pt;">📎 ${escapeHtml(pdf.nombre || `Documento_${pIdx + 1}`)}</div>
                        ${pdf.descripcion ? `<div style="font-size: 7.8pt; color: #475569; font-style: italic; margin-top: 1px;">${escapeHtml(pdf.descripcion)}</div>` : ''}
                        ${pdf.archivo && pdf.archivo !== pdf.nombre ? `<div style="font-size: 7.2pt; color: #94a3b8; margin-top: 1px;">Arquivo: ${escapeHtml(pdf.archivo)}</div>` : ''}
                      </td>
                      <td style="text-align: center; color: #64748b; font-size: 8pt;">${formatFileSize(pdf.tamano)}</td>
                      <td style="text-align: center;">
                        <span class="dt05-status-pill" style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; font-size: 7.5pt;">
                          + Folla de Separata
                        </span>
                      </td>
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

  // UI Event Handlers
  const btnBack = container.querySelector('#btn-back');
  const btnEdit = container.querySelector('#btn-edit-current');
  const btnExportDocx = container.querySelector('#btn-export-docx');
  const btnExportPdf = container.querySelector('#btn-export-pdf');
  const btnPrint = container.querySelector('#btn-trigger-print');

  btnBack.onclick = () => {
    router.navigate('expediente', { id: acta.obraId || db.getActiveObraId(), tab: isReunion ? 'reuniones' : 'actas' });
  };

  if (btnEdit) {
    btnEdit.onclick = () => {
      router.navigate(isReunion ? 'reunion-editor' : 'acta-editor', { id: acta.id, obraId: acta.obraId || db.getActiveObraId() });
    };
  }

  if (btnPrint) {
    btnPrint.onclick = () => {
      window.print();
    };
  }

  const fullActaData = {
    ...acta,
    currentObra,
    obraTitulo,
    situacion: acta.situacion || currentObra?.situacion,
    expediente: acta.expediente || currentObra?.expediente,
    contratista: currentObra?.contratista,
    doClean,
    deClean,
    coordinadorCSSStr,
    jefeObraStr
  };

  // Export DOCX
  if (btnExportDocx) {
    btnExportDocx.onclick = async () => {
      const origHTML = btnExportDocx.innerHTML;
      try {
        btnExportDocx.disabled = true;
        btnExportDocx.innerHTML = `
          <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
          <span>Xerando Word...</span>
        `;
        showToast('Xerando documento Word (.docx)...', 'info');
        const { exportActaToDocx } = await import('../exportDocx.js');
        const fname = await exportActaToDocx(fullActaData);
        showToast(`Documento ${fname} descargado con éxito`, 'success');
      } catch (err) {
        console.error('Erro ao exportar a Word:', err);
        showToast('Erro ao exportar o documento a Word', 'error');
      } finally {
        btnExportDocx.disabled = false;
        btnExportDocx.innerHTML = origHTML;
      }
    };
  }

  // Export PDF Completo con Anexos y Separatas
  if (btnExportPdf) {
    btnExportPdf.onclick = async () => {
      const origHTML = btnExportPdf.innerHTML;
      try {
        btnExportPdf.disabled = true;
        btnExportPdf.innerHTML = `
          <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
          <span>Compilando PDF e Separatas...</span>
        `;
        showToast('Xerando PDF Oficial da Acta con separatas de anexos...', 'info');
        const { exportActaToPdf } = await import('../exportDocx.js');
        const fname = await exportActaToPdf(fullActaData);
        showToast(`Documento PDF ${fname} descargado con éxito`, 'success');
      } catch (err) {
        console.error('Erro ao xerar PDF oficial:', err);
        showToast(err.message || 'Erro ao xerar o PDF con anexos', 'error');
      } finally {
        btnExportPdf.disabled = false;
        btnExportPdf.innerHTML = origHTML;
      }
    };
  }
}

function renderApartadosHtmlModern(acta, secBase = 3) {
  const apartados = acta.apartados || [];
  if (apartados.length > 0) {
    return apartados.map((ap, apIdx) => {
      const cleanTitle = (ap.titulo || `APARTADO ${apIdx + 1}`).replace(/^\d+(\.\d+)*[_.\s-]+/, '').trim();
      return `
        <div class="dt05-apartado-block" style="margin-top: 12px; margin-bottom: 8px;">
          <div class="dt05-h2-header">
            ${escapeHtml(cleanTitle)}
          </div>
          ${(ap.secciones || []).map((sec) => {
            const cleanSec = (sec.titulo || '').replace(/^\d+(\.\d+)*[_.\s-]+/, '').trim();
            return `
              <div class="dt05-seccion-block" style="margin-top: 6px;">
                ${cleanSec ? `
                  <div class="dt05-h3-header">
                    ${escapeHtml(cleanSec)}
                  </div>
                ` : ''}
                <div class="dt05-normal-p">
                  ${renderSectionTextModern(sec.texto)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('');
  }

  // Fallback para cuestionesTratadas legadas
  let out = '';
  if (acta.cuestionesTratadas && acta.cuestionesTratadas.length) {
    out += `
      <div style="margin-top: 10px;">
        ${acta.cuestionesTratadas.map((c, i) => `
          <div class="dt05-apartado-block" style="margin-top: 10px;">
            <div class="dt05-h2-header">
              ${escapeHtml((c.subtitulo || 'Tema tratado').replace(/^\d+(\.\d+)*[_.\s-]+/, '').trim())}
            </div>
            <div class="dt05-normal-p">
              ${(Array.isArray(c.puntos) ? c.puntos : (c.puntos || '').split('\n')).filter(Boolean).map(p => `
                <div style="margin-bottom: 4px;">• ${escapeHtml(p)}</div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  return out || '<div class="dt05-normal-p" style="font-style: italic; color: #94a3b8;">Non se rexistraron cuestións específicas nesta visita.</div>';
}

function renderSectionTextModern(text) {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return `<div class="dt05-rich-content">${text}</div>`;
  }
  return text.split('\n').filter(Boolean).map(line => `
    <p style="margin: 0 0 4px 0;">${escapeHtml(line)}</p>
  `).join('');
}

function renderListOrText(content) {
  if (!content) return '';
  if (Array.isArray(content)) {
    return content.filter(Boolean).map(item => `<div style="margin-bottom: 3px;">• ${escapeHtml(item)}</div>`).join('');
  }
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }
  return content.split('\n').filter(Boolean).map(line => `<div style="margin-bottom: 3px;">• ${escapeHtml(line)}</div>`).join('');
}

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

function getLugar(situacion) {
  if (!situacion) return 'Ferrol';
  if (situacion.toLowerCase().includes('ferrol')) return 'Ferrol';
  const parts = situacion.split(',');
  return parts[parts.length - 1].trim() || 'Ferrol';
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
