import { isAiEnabled, renderAiButtonHtml, openAiAssistantModal } from '../utils/aiAssistant.js';
/* ==========================================================================
   ANTA OBRA - Editor de Informes Semanais (Visitas e Reunións)
   Integración estrita 1:1 coa plantilla oficial: plantilla_informe_semanal.docx
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';
import { exportInformeToDocx, exportInformeCompletoPdf } from '../exportDocx.js';

export function renderInformeSemanalEditor(container, router, params = {}) {
  const currentObra = db.getActiveObra();
  if (!currentObra) {
    showToast('Non hai ningún expediente activo seleccionado', 'warning');
    router.navigate('obras');
    return;
  }

  if (!auth.canAccessObra(currentObra)) {
    showToast('Non ten permisos para acceder a este expediente', 'warning');
    router.navigate('obras');
    return;
  }

  let infData = {};
  const isEditing = Boolean(params.id);

  if (isEditing) {
    const existing = db.getInformeById(params.id);
    if (!existing) {
      showToast('Non se atopou o informe semanal solicitado', 'error');
      router.navigate('expediente', { id: currentObra.id, tab: 'informes-semanais' });
      return;
    }
    infData = JSON.parse(JSON.stringify(existing));
  } else {
    // Novo informe semanal en branco
    const allInformes = db.getInformes(currentObra.id) || [];
    const semanais = allInformes.filter(i => i.tipo === 'semanal');
    const nextNum = semanais.reduce((max, i) => {
      const n = parseInt(i.numero, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0) + 1;

    const today = new Date().toISOString().split('T')[0];
    infData = {
      id: `inf-sem-${Date.now()}`,
      tipo: 'semanal',
      tipoDocumento: 'informe_semanal',
      obraId: currentObra.id,
      numero: nextNum,
      fecha: today,
      estado: 'borrador',
      resumo: '',
      relacion: [],
      anexosPdf: [],
      firmas: []
    };
  }

  // Ensure arrays exist
  infData.relacion = Array.isArray(infData.relacion) ? infData.relacion : [];
  infData.anexosPdf = Array.isArray(infData.anexosPdf) ? infData.anexosPdf : [];

  // Helper to resolve individual signers (one card for EACH person)
  function resolveSigners() {
    const doAgentes = (currentObra.agentes || []).filter(a => a.rol === 'DO');
    const deAgentes = (currentObra.agentes || []).filter(a => a.rol === 'DEM' || a.rol === 'DE');

    const signers = [];
    if (doAgentes.length > 0) {
      doAgentes.forEach(a => {
        signers.push({
          agenteId: a.agenteId || a.id,
          nombre: a.nombre,
          cargo: 'DIRECCIÓN DE OBRA (DO)',
          entidad: a.entidad || 'UTE ANTA-BOG'
        });
      });
    } else if (currentObra.direccionObra) {
      const names = currentObra.direccionObra.replace(/\s+(?:e|y|and)\s+/g, ', ').split(',').map(s => s.trim()).filter(Boolean);
      names.forEach(n => signers.push({ nombre: n, cargo: 'DIRECCIÓN DE OBRA (DO)', entidad: 'UTE ANTA-BOG' }));
    }

    if (deAgentes.length > 0) {
      deAgentes.forEach(a => {
        signers.push({
          agenteId: a.agenteId || a.id,
          nombre: a.nombre,
          cargo: 'DIRECCIÓN DE EXECUCIÓN (DE)',
          entidad: a.entidad || ''
        });
      });
    } else if (currentObra.direccionEjecucion) {
      const names = currentObra.direccionEjecucion.replace(/\s+(?:e|y|and)\s+/g, ', ').split(',').map(s => s.trim()).filter(Boolean);
      names.forEach(n => signers.push({ nombre: n, cargo: 'DIRECCIÓN DE EXECUCIÓN (DE)', entidad: '' }));
    }

    return signers;
  }

  const signers = (infData.firmas && infData.firmas.length > 0) ? infData.firmas : resolveSigners();
  infData.firmas = signers;

  function render() {
    const numDisplay = infData.numero || 1;
    const projectTitle = currentObra.titulo || 'Expediente sen título';
    const expte = currentObra.expediente || '—';
    const situacion = currentObra.situacion || '—';
    const contratista = currentObra.contratista || '—';

    const doAgentes = (currentObra.agentes || []).filter(a => a.rol === 'DO');
    const deAgentes = (currentObra.agentes || []).filter(a => a.rol === 'DEM' || a.rol === 'DE');
    const cssAgentes = (currentObra.agentes || []).filter(a => a.rol === 'CSS');
    const joAgentes = (currentObra.agentes || []).filter(a => a.rol === 'JO');

    const doNames = doAgentes.map(a => a.nombre).join(', ') || currentObra.direccionObra || '—';
    const deNames = deAgentes.map(a => a.nombre).join(', ') || currentObra.direccionEjecucion || '—';
    const cssNames = cssAgentes.map(a => a.nombre).join(', ') || currentObra.coordinadorCSS || '—';
    const joNames = joAgentes.map(a => a.nombre).join(', ') || currentObra.jefeObra || '—';

    container.innerHTML = `
      <div class="content-wrapper">
        <div class="editor-container" style="max-width: 980px; margin: 0 auto; padding: 1.5rem 1rem;">
          
          <!-- Top Sticky Bar -->
          <div class="editor-top-bar" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge" style="background: var(--primary); color: #fff; font-weight: 700; padding: 0.35rem 0.65rem; border-radius: 4px; font-size: 0.8rem;">INFORME SEMANAL</span>
              <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-main);">Informe Semanal nº ${numDisplay}</h2>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-ghost btn-sm" id="btn-cancel">Cancelar</button>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-export-docx" title="Xerar e descargar arquivo DOCX oficial">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                DOCX
              </button>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-export-pdf" title="Xerar e descargar PDF Oficial 1:1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="10 9 9 9 8 9"></polyline></svg>
                PDF Oficial
              </button>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-view-print" title="Previsualizar formato oficial">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Ver Oficial
              </button>
              ${isAiEnabled() ? renderAiButtonHtml("Asistente IA (Voz / Doc)", "btn-ai-semanal-top") : ""}
              <button type="button" class="btn btn-secondary btn-sm" id="btn-save-informe" style="border-color: var(--primary); color: var(--primary); font-weight: 600;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Guardar
              </button>
              <button type="button" class="btn btn-primary" id="btn-save-back-informe">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Guardar y volver
              </button>
            </div>
          </div>

          <form id="informe-semanal-form">
            
            <!-- Bloque 1: Datos Xerais e Resumo Executivo -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">1</span>
                    Datos Xerais e Resumo Executivo
                  </div>
                  <div class="editor-section-desc">Identificación do informe semanal e datos oficiais do contrato</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label required">Nº de Informe Semanal</label>
                    <input type="number" id="input-numero" class="form-control" value="${numDisplay}" required min="1" />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Data de Emisión</label>
                    <input type="date" id="input-fecha" class="form-control" value="${infData.fecha || ''}" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Estado</label>
                    <select id="input-estado" class="form-control form-select">
                      <option value="borrador" ${infData.estado === 'borrador' ? 'selected' : ''}>Borrador en elaboración</option>
                      <option value="emitido" ${infData.estado === 'emitido' ? 'selected' : ''}>Emitido / Oficial</option>
                      <option value="pechado" ${infData.estado === 'pechado' ? 'selected' : ''}>Pechado</option>
                    </select>
                  </div>
                </div>

                <!-- Resumo executivo / Observacións -->
                <div class="form-group" style="margin-top: 1rem;">
                  <label class="form-label">Resumo Executivo da Semana (opcional):</label>
                  <textarea id="input-resumo" class="form-control" rows="3" placeholder="Resumo xeral do desenvolvemento dos traballos e incidencias principais ocorridas na semana...">${escapeHtml(infData.resumo || '')}</textarea>
                </div>

                <!-- Datos informativos da táboa 0 (non editables) -->
                <div style="background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 1rem 1.25rem; margin-top: 1rem;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.85rem; font-size: 0.85rem;">
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Proxecto:</strong> <span style="font-weight: 700; color: var(--text-main);">${escapeHtml(projectTitle)}</span></div>
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Emprazamento:</strong> <span style="color: var(--text-main);">${escapeHtml(situacion)}</span></div>
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Expediente nº:</strong> <span style="font-weight: 700; color: var(--primary);">${escapeHtml(expte)}</span></div>
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Contratista:</strong> <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(contratista)}</span></div>
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Dirección de obra:</strong> <span style="color: #1e3a8a; font-weight: 600;">${escapeHtml(doNames)}</span></div>
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Dirección de execución:</strong> <span style="color: #0284c7; font-weight: 600;">${escapeHtml(deNames)}</span></div>
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Coordinador CSS:</strong> <span style="color: var(--text-main);">${escapeHtml(cssNames)}</span></div>
                    <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; display: block;">Xefe de Obra:</strong> <span style="color: var(--text-main);">${escapeHtml(joNames)}</span></div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Bloque 2: Relación de Visitas e Reunións en Obra -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">2</span>
                    Relación de Visitas e Reunións en Obra
                  </div>
                  <div class="editor-section-desc">Visitas e reunións realizadas durante a presente semana (Táboa 1 da plantilla oficial)</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <button type="button" class="btn btn-primary btn-sm" id="btn-select-docs" title="Seleccionar visitas e reunións rexistradas na obra">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>
                    + Seleccionar da Obra
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-add-manual" title="Engadir liña manual">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    + Liña manual
                  </button>
                </div>
              </div>
              <div class="editor-section-body">
                <div id="relacion-items-container">
                  ${(!infData.relacion || infData.relacion.length === 0) ? `
                    <div style="padding: 1.5rem; text-align: center; background: var(--bg-subtle, #f8fafc); border: 1.5px dashed var(--border-color, #cbd5e1); border-radius: 8px; color: var(--text-muted, #64748b); font-size: 0.9rem;">
                      <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">Non hai visitas nin reunións engadidas a este informe semanal.</div>
                      <div style="font-size: 0.82rem;">Pulse <strong>+ Seleccionar da Obra</strong> para incorporar actas existentes adoptando tipo, data e número.</div>
                    </div>
                  ` : `
                    <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                      <thead>
                        <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-light); text-align: left;">
                          <th style="padding: 0.6rem 0.75rem; width: 145px;">Fecha</th>
                          <th style="padding: 0.6rem 0.75rem;">Tipo visita / reunión</th>
                          <th style="padding: 0.6rem 0.75rem; width: 90px; text-align: center;">Nº</th>
                          <th style="padding: 0.6rem 0.75rem; width: 50px;"></th>
                        </tr>
                      </thead>
                      <tbody id="relacion-tbody">
                        ${infData.relacion.map((item, idx) => `
                          <tr class="relacion-row" data-index="${idx}" style="border-bottom: 1px solid var(--border-light);">
                            <td style="padding: 0.5rem 0.75rem;">
                              <input type="date" class="form-control rel-fecha" value="${item.fecha || ''}" style="font-size: 0.85rem;" />
                            </td>
                            <td style="padding: 0.5rem 0.75rem;">
                              <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <select class="form-control form-select rel-tipo" style="font-size: 0.85rem; font-weight: 600;">
                                  <option value="Visita de obra" ${item.tipo === 'Visita de obra' ? 'selected' : ''}>Visita de obra</option>
                                  <option value="Reunión de obra" ${item.tipo === 'Reunión de obra' ? 'selected' : ''}>Reunión de obra</option>
                                  <option value="Outro" ${item.tipo !== 'Visita de obra' && item.tipo !== 'Reunión de obra' ? 'selected' : ''}>Outro / Extraordinaria</option>
                                </select>
                                ${item.documentoId ? `<span class="badge" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 0.72rem; white-space: nowrap;">Vinculada</span>` : ''}
                              </div>
                            </td>
                            <td style="padding: 0.5rem 0.75rem; text-align: center;">
                              <input type="number" class="form-control rel-num" value="${item.numero || 1}" min="1" style="font-size: 0.85rem; text-align: center; font-weight: 700;" />
                            </td>
                            <td style="padding: 0.5rem 0.75rem; text-align: center;">
                              <button type="button" class="btn btn-ghost btn-sm remove-rel-item" data-index="${idx}" title="Eliminar fila" style="color: var(--color-danger, #ef4444);">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  `}
                </div>
              </div>
            </div>

            <!-- Bloque 3: Dilixencia de Firmas (Individual para CADA PERSOA) -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">3</span>
                    Dilixencia de Firmas
                  </div>
                  <div class="editor-section-desc">Espazo individual de firma para cada persoa integrante da Dirección Facultativa</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
                  ${signers.map((s, sIdx) => `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px; padding: 1rem; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="font-weight: 700; color: ${s.cargo?.includes('OBRA') || s.cargo?.includes('DO') ? '#1e3a8a' : '#0284c7'}; font-size: 0.82rem; text-transform: uppercase;">
                          ${escapeHtml(s.cargo || 'Dirección Facultativa')}
                        </div>
                        <div style="font-size: 0.95rem; color: var(--text-main); font-weight: 700; margin-top: 0.35rem;">
                          ${escapeHtml(s.nombre)}
                        </div>
                        ${s.entidad ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(s.entidad)}</div>` : ''}
                      </div>
                      <div style="margin-top: 1.75rem; border-top: 1px dashed var(--border-light); padding-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted);">
                        Asdo.: ____________________________
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Bloque 4: Anexos Documentais PDF e Separata Oficial -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">4</span>
                    Anexos Documentais PDF e Separata Oficial
                  </div>
                  <div class="editor-section-desc">
                    Adxunte as actas de visitas e reunións ou outros documentos PDF que se concatenarán ao PDF oficial con separata A4 institucional.
                  </div>
                </div>
              </div>
              <div class="editor-section-body">
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.65rem 0.9rem; margin-bottom: 1rem; font-size: 0.82rem; color: #1e40af; display: flex; align-items: center; gap: 0.6rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <span>Cada anexo PDF intercalará automaticamente unha portada/separata oficial en formato A4 con escudo institucional de Vivenda Pública de Galicia.</span>
                </div>

                <!-- PDF Upload Dropzone -->
                <div class="photo-uploader-box" id="pdf-drop-zone" style="border-style: dashed; padding: 1.5rem 1rem; text-align: center; border: 2px dashed var(--border-color, #cbd5e1); border-radius: 8px; cursor: pointer;">
                  <input type="file" id="pdf-file-input" style="display: none;" accept="application/pdf" multiple />
                  <div style="color: #dc2626; margin-bottom: 0.5rem;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.25rem;">
                    Arrastre arquivos PDF aquí ou faga clic para seleccionar
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                    Compatibles con actas de obra, ensaios, fichas técnicas ou planos escaneados.
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-trigger-upload">
                    Seleccionar arquivos PDF
                  </button>
                </div>

                <!-- PDF Annexes List -->
                <div id="pdf-annexes-list" style="margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.65rem;">
                  ${(!infData.anexosPdf || infData.anexosPdf.length === 0) ? `
                    <div style="text-align: center; padding: 1.25rem; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-surface); border: 1px dashed var(--border-light); border-radius: var(--radius-sm);">
                      Non se engadiron documentos PDF anexos aínda.
                    </div>
                  ` : infData.anexosPdf.map((pdf, pIdx) => `
                    <div class="pdf-annex-item" data-index="${pIdx}" style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.85rem 1rem;">
                      <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                        <div style="width: 36px; height: 36px; border-radius: 6px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; margin-top: 4px;">
                          PDF
                        </div>
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.45rem;">
                          <div>
                            <label class="form-hint" style="font-weight: 700; color: var(--text-main); margin-bottom: 2px; display: block;">Título do Anexo (aparecerá na separata oficial):</label>
                            <input type="text" class="form-control annex-nombre-input" value="${escapeHtml(pdf.nombre || '')}" placeholder="Ex: ACTA DE VISITA Nº 17, INFORME DE ENSAIOS..." style="font-weight: 600; font-size: 0.88rem;" />
                          </div>
                          <div>
                            <label class="form-hint" style="margin-bottom: 2px; display: block;">Descrición / Contido do documento:</label>
                            <input type="text" class="form-control annex-desc-input" value="${escapeHtml(pdf.descripcion || '')}" placeholder="Ex: Acta semanal da visita á obra realizada o 25/10/2026..." style="font-size: 0.82rem;" />
                          </div>
                          <div style="font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span>Arquivo: <strong>${escapeHtml(pdf.archivo || pdf.nombre || 'documento.pdf')}</strong></span>
                            ${pdf.tamano ? `<span>•</span><span>${formatFileSize(pdf.tamano)}</span>` : ''}
                            ${pdf.fecha ? `<span>•</span><span>Añadido o ${pdf.fecha}</span>` : ''}
                          </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0;">
                          ${pdf.pdfData ? `
                            <button type="button" class="btn btn-ghost btn-sm btn-view-pdf" data-index="${pIdx}" title="Ver ou descargar PDF">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                              <span>Ver</span>
                            </button>
                          ` : ''}
                          <button type="button" class="btn btn-ghost btn-sm btn-delete-pdf" data-index="${pIdx}" title="Eliminar anexo" style="color: var(--color-danger);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Borrar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>

              </div>
            </div>

            <!-- Bottom Action Bar -->
            <div class="editor-bottom-bar" style="display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; padding: 1.5rem 0; margin-top: 2rem; border-top: 1px solid var(--border-light);">
              ${isAiEnabled() ? renderAiButtonHtml("Asistente IA (Voz / Doc)", "btn-ai-semanal-bot") : ""}
              <button type="button" class="btn btn-secondary btn-sm" id="btn-save-informe-bottom" style="border-color: var(--primary); color: var(--primary); font-weight: 600;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Guardar
              </button>
              <button type="button" class="btn btn-primary" id="btn-save-back-informe-bottom">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Guardar y volver
              </button>
            </div>

          </form>

        </div>
      </div>
    `;

    wireEvents();
  }

  function collectFormData() {
    infData.numero = parseInt(container.querySelector('#input-numero').value, 10) || 1;
    infData.fecha = container.querySelector('#input-fecha').value;
    infData.estado = container.querySelector('#input-estado').value;
    infData.resumo = container.querySelector('#input-resumo').value;

    // Relación rows
    const rows = container.querySelectorAll('.relacion-row');
    const relacion = [];
    rows.forEach(r => {
      const idx = parseInt(r.dataset.index, 10);
      const existingItem = infData.relacion[idx] || {};
      const fecha = r.querySelector('.rel-fecha').value;
      const tipo = r.querySelector('.rel-tipo').value.trim();
      const num = parseInt(r.querySelector('.rel-num').value, 10) || 1;
      if (tipo || fecha) {
        relacion.push({
          ...existingItem,
          fecha,
          tipo: tipo || 'Visita de obra',
          numero: num
        });
      }
    });
    infData.relacion = relacion;

    // Anexos inputs
    const annexItems = container.querySelectorAll('.pdf-annex-item');
    annexItems.forEach(item => {
      const pIdx = parseInt(item.dataset.index, 10);
      if (infData.anexosPdf[pIdx]) {
        const nomInput = item.querySelector('.annex-nombre-input');
        const descInput = item.querySelector('.annex-desc-input');
        if (nomInput) infData.anexosPdf[pIdx].nombre = nomInput.value.trim();
        if (descInput) infData.anexosPdf[pIdx].descripcion = descInput.value.trim();
      }
    });

    infData.firmas = signers;
    return infData;
  }

  function saveDocument(returnToList = false) {
    const data = collectFormData();
    try {
      db.saveInforme(data);
      showToast('Informe semanal gardado correctamente', 'success');
      if (returnToList) {
        router.navigate('expediente', { id: currentObra.id, tab: 'informes-semanais' });
      }
    } catch (e) {
      console.error('Error guardando informe semanal:', e);
      showToast('Erro ao gardar informe semanal', 'error');
    }
  }

  // Modal para seleccionar visitas e reunións existentes
  function openSelectActasReunionesModal() {
    const actas = db.getActas(currentObra.id) || [];
    const reuniones = db.getReuniones(currentObra.id) || [];

    // Combinar documentos
    const allDocs = [
      ...actas.map(a => ({
        id: a.id,
        tipo: 'Visita de obra',
        numero: a.numero,
        fecha: a.fecha,
        titulo: `Visita de Obra nº ${a.numero}`,
        resumo: (a.cuestionesTratadas || []).map(c => c.subtitulo).filter(Boolean).slice(0, 2).join(' • ')
      })),
      ...reuniones.map(r => ({
        id: r.id,
        tipo: 'Reunión de obra',
        numero: r.numero,
        fecha: r.fecha,
        titulo: `Reunión de Obra nº ${r.numero}`,
        resumo: (r.cuestionesTratadas || []).map(c => c.subtitulo).filter(Boolean).slice(0, 2).join(' • ')
      }))
    ];

    allDocs.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    if (allDocs.length === 0) {
      showToast('Non hai visitas nin reunións rexistradas neste expediente aínda.', 'info', 4000);
      return;
    }

    const alreadyAddedIds = new Set(infData.relacion.map(r => String(r.documentoId)).filter(Boolean));

    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45;">
          Seleccione as visitas e reunións celebradas na semana. Incorporaranse automaticamente co seu número, tipo e data oficial.
        </div>

        <div style="max-height: 380px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.5rem;">
          ${allDocs.map(doc => {
            const isAdded = alreadyAddedIds.has(String(doc.id));
            const isVisita = doc.tipo === 'Visita de obra';
            return `
              <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border-light); cursor: ${isAdded ? 'default' : 'pointer'}; background: ${isAdded ? 'var(--bg-subtle)' : '#fff'}; border-radius: 4px; margin-bottom: 2px;">
                <input type="checkbox" class="modal-doc-checkbox" value="${doc.id}" ${isAdded ? 'disabled' : ''} style="width: 17px; height: 17px;" />
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="badge" style="background: ${isVisita ? '#eff6ff' : '#f0fdf4'}; color: ${isVisita ? '#1e3a8a' : '#166534'}; border: 1px solid ${isVisita ? '#bfdbfe' : '#bbf7d0'}; font-weight: 700; font-size: 0.75rem;">
                      ${doc.tipo}
                    </span>
                    <strong style="color: var(--text-main); font-size: 0.9rem;">Nº ${doc.numero}</strong>
                    <span style="color: var(--text-muted); font-size: 0.82rem;">• ${doc.fecha ? doc.fecha.split('-').reverse().join('/') : '—'}</span>
                    ${isAdded ? `<span class="badge badge-neutral" style="font-size: 0.7rem;">Xa engadida</span>` : ''}
                  </div>
                  ${doc.resumo ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(doc.resumo)}</div>` : ''}
                </div>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; width: 100%;">
        <button type="button" class="btn btn-ghost" id="modal-doc-cancel">Cancelar</button>
        <button type="button" class="btn btn-primary" id="modal-doc-confirm">Incorporar seleccionadas</button>
      </div>
    `;

    const { backdrop, close } = modal.open({
      title: 'Seleccionar Visitas e Reunións da Obra',
      contentHtml,
      footerHtml,
      size: 'lg'
    });

    backdrop.querySelector('#modal-doc-cancel').onclick = close;
    backdrop.querySelector('#modal-doc-confirm').onclick = () => {
      const checkboxes = backdrop.querySelectorAll('.modal-doc-checkbox:checked');
      if (checkboxes.length === 0) {
        close();
        return;
      }

      collectFormData();

      checkboxes.forEach(cb => {
        const docId = cb.value;
        const found = allDocs.find(d => String(d.id) === String(docId));
        if (found) {
          infData.relacion.push({
            documentoId: found.id,
            tipo: found.tipo,
            numero: found.numero,
            fecha: found.fecha,
            titulo: found.titulo
          });

          // Adxuntar tamén ao apartado 4 de Anexos Documentais
          const existingAnnex = infData.anexosPdf.find(a => String(a.documentoId) === String(found.id));
          if (!existingAnnex) {
            infData.anexosPdf.push({
              documentoId: found.id,
              nombre: `${found.tipo.toUpperCase()} Nº ${found.numero}`,
              descripcion: `Acta oficial correspondente á ${found.tipo.toLowerCase()} celebrada o ${found.fecha ? found.fecha.split('-').reverse().join('/') : ''}.`,
              archivo: `${found.tipo.replace(/\s+/g, '_')}_N${found.numero}.pdf`,
              fecha: found.fecha
            });
          }
        }
      });

      close();
      render();
      showToast(`Incorporáronse ${checkboxes.length} documento(s) á relación e anexos`, 'success');
    };
  }

  function wireEvents() {
    // Cancel
    const btnCancel = container.querySelector('#btn-cancel');
    if (btnCancel) {
      btnCancel.onclick = () => {
        router.navigate('expediente', { id: currentObra.id, tab: 'informes-semanais' });
      };
    }

    // Asistente IA (Voz e Documentos)
    const handleAiSemanal = () => {
      openAiAssistantModal({
        documentType: 'informe_semanal',
        currentData: infData,
        onApply: (extracted) => {
          collectFormData();
          if (extracted.resumo) {
            const currentResumo = (infData.resumo || '').trim();
            infData.resumo = currentResumo ? `${currentResumo}\n\n${extracted.resumo}` : extracted.resumo;
            const resumoInput = container.querySelector('#input-resumo');
            if (resumoInput) resumoInput.value = infData.resumo;
          }
          if (Array.isArray(extracted.apartados) && extracted.apartados.length > 0) {
            if (!Array.isArray(infData.relacion)) infData.relacion = [];
            extracted.apartados.forEach(ap => {
              const textPuntos = Array.isArray(ap.puntos) ? ap.puntos.join(' • ') : (ap.puntos || '');
              infData.relacion.push({
                numero: infData.relacion.length + 1,
                tipo: 'Visita / Control',
                data: infData.fecha || new Date().toISOString().split('T')[0],
                descricion: `${ap.titulo ? ap.titulo + ': ' : ''}${textPuntos}`,
                asinada: true
              });
            });
          }
          if (Array.isArray(extracted.acuerdos) && extracted.acuerdos.length > 0) {
            if (!Array.isArray(infData.relacion)) infData.relacion = [];
            extracted.acuerdos.forEach(ac => {
              infData.relacion.push({
                numero: infData.relacion.length + 1,
                tipo: 'Orde de Dirección',
                data: infData.fecha || new Date().toISOString().split('T')[0],
                descricion: ac,
                asinada: true
              });
            });
          }
          db.saveInforme(infData);
          showToast('✨ Contido incorporado con éxito polo Asistente IA!', 'success');
          render();
        }
      });
    };

    const btnAiSemTop = container.querySelector('#btn-ai-semanal-top');
    if (btnAiSemTop) btnAiSemTop.onclick = handleAiSemanal;
    const btnAiSemBot = container.querySelector('#btn-ai-semanal-bot');
    if (btnAiSemBot) btnAiSemBot.onclick = handleAiSemanal;

    // Top Save buttons
    const btnSave = container.querySelector('#btn-save-informe');
    if (btnSave) {
      btnSave.onclick = () => saveDocument(false);
    }
    const btnSaveBack = container.querySelector('#btn-save-back-informe');
    if (btnSaveBack) {
      btnSaveBack.onclick = () => saveDocument(true);
    }

    // Bottom Save buttons
    const btnSaveBottom = container.querySelector('#btn-save-informe-bottom');
    if (btnSaveBottom) {
      btnSaveBottom.onclick = () => saveDocument(false);
    }
    const btnSaveBackBottom = container.querySelector('#btn-save-back-informe-bottom');
    if (btnSaveBackBottom) {
      btnSaveBackBottom.onclick = () => saveDocument(true);
    }

    // Export DOCX
    const btnDocx = container.querySelector('#btn-export-docx');
    if (btnDocx) {
      btnDocx.onclick = async () => {
        const data = collectFormData();
        db.saveInforme(data);
        await exportInformeToDocx(data);
      };
    }

    // Export PDF
    const btnPdf = container.querySelector('#btn-export-pdf');
    if (btnPdf) {
      btnPdf.onclick = async () => {
        const data = collectFormData();
        db.saveInforme(data);
        await exportInformeCompletoPdf(data);
      };
    }

    // View Print
    const btnPrint = container.querySelector('#btn-view-print');
    if (btnPrint) {
      btnPrint.onclick = () => {
        const data = collectFormData();
        db.saveInforme(data);
        router.navigate('informe-semanal-print', { id: data.id });
      };
    }

    // Select Visitas & Reunións from Obra
    const btnSelectDocs = container.querySelector('#btn-select-docs');
    if (btnSelectDocs) {
      btnSelectDocs.onclick = openSelectActasReunionesModal;
    }

    // Add Manual Line
    const btnAddManual = container.querySelector('#btn-add-manual');
    if (btnAddManual) {
      btnAddManual.onclick = () => {
        collectFormData();
        infData.relacion.push({
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'Visita de obra',
          numero: infData.relacion.length + 1
        });
        render();
      };
    }

    // Remove Relación item
    container.querySelectorAll('.remove-rel-item').forEach(btn => {
      btn.onclick = (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        collectFormData();
        infData.relacion.splice(idx, 1);
        render();
      };
    });

    // Trigger PDF Upload
    const btnTriggerUpload = container.querySelector('#btn-trigger-upload');
    const pdfFileInput = container.querySelector('#pdf-file-input');
    const pdfDropZone = container.querySelector('#pdf-drop-zone');

    if (btnTriggerUpload && pdfFileInput) {
      btnTriggerUpload.onclick = (e) => {
        e.stopPropagation();
        pdfFileInput.click();
      };
    }
    if (pdfDropZone && pdfFileInput) {
      pdfDropZone.onclick = () => pdfFileInput.click();
      pdfDropZone.ondragover = (e) => {
        e.preventDefault();
        pdfDropZone.style.borderColor = 'var(--primary)';
        pdfDropZone.style.background = 'var(--bg-subtle)';
      };
      pdfDropZone.ondragleave = () => {
        pdfDropZone.style.borderColor = 'var(--border-color, #cbd5e1)';
        pdfDropZone.style.background = 'transparent';
      };
      pdfDropZone.ondrop = (e) => {
        e.preventDefault();
        pdfDropZone.style.borderColor = 'var(--border-color, #cbd5e1)';
        pdfDropZone.style.background = 'transparent';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePdfFiles(e.dataTransfer.files);
        }
      };
    }

    if (pdfFileInput) {
      pdfFileInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handlePdfFiles(e.target.files);
        }
      };
    }

    // View PDF Annex
    container.querySelectorAll('.btn-view-pdf').forEach(btn => {
      btn.onclick = (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const item = infData.anexosPdf[idx];
        if (item && item.pdfData) {
          const w = window.open();
          if (w) {
            w.document.write(`<iframe src="${item.pdfData}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
          }
        }
      };
    });

    // Delete PDF Annex
    container.querySelectorAll('.btn-delete-pdf').forEach(btn => {
      btn.onclick = (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        collectFormData();
        infData.anexosPdf.splice(idx, 1);
        render();
        showToast('Anexo eliminado', 'info');
      };
    });
  }

  function handlePdfFiles(fileList) {
    collectFormData();
    Array.from(fileList).forEach(file => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast(`O arquivo ${file.name} non é un PDF`, 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        infData.anexosPdf.push({
          id: `anx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          nombre: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
          descripcion: 'Documento PDF achegado ao informe semanal.',
          archivo: file.name,
          tamano: file.size,
          fecha: new Date().toISOString().split('T')[0],
          pdfData: e.target.result
        });
        render();
        showToast(`Anexo ${file.name} engadido correctamente`, 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  render();
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
