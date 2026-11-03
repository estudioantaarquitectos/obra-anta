/* ==========================================================================
   ANTA OBRA - Editor de Informes Semanais (Visitas e Reunións)
   Integración estrita 1:1 coa plantilla oficial: plantilla_informe_semanal.docx
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { showToast } from '../modal.js';
import { exportInformeToDocx, exportInformeCompletoPdf } from '../exportDocx.js';

export function renderInformeSemanalEditor(container, router, params = {}) {
  const currentObra = db.getActiveObra();
  if (!currentObra) {
    showToast('Non hai ningún expediente activo seleccionado', 'warning');
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
      anexosPdf: []
    };
  }

  function render() {
    const numDisplay = infData.numero || 1;
    const projectTitle = currentObra.titulo || 'Expediente sen título';
    const expte = currentObra.expediente || '—';
    const situacion = currentObra.situacion || '—';
    const contratista = currentObra.contratista || '—';

    // Directores y agentes
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
                  <button type="button" class="btn btn-primary btn-sm" id="btn-add-visita" title="Engadir visita da obra rexistrada">
                    + Engadir Visita da obra
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-add-reunion" title="Engadir reunión de obra rexistrada">
                    + Engadir Reunión de obra
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-add-manual" title="Engadir liña manual">
                    + Liña manual
                  </button>
                </div>
              </div>
              <div class="editor-section-body">
                <div id="relacion-items-container">
                  ${(!infData.relacion || infData.relacion.length === 0) ? `
                    <div style="padding: 1.5rem; text-align: center; background: var(--bg-subtle, #f8fafc); border: 1.5px dashed var(--border-color, #cbd5e1); border-radius: 8px; color: var(--text-muted, #64748b); font-size: 0.9rem;">
                      <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">Non hai visitas nin reunións engadidas a este informe semanal.</div>
                      <div style="font-size: 0.82rem;">Pulse <strong>+ Engadir Visita da obra</strong> ou <strong>+ Engadir Reunión de obra</strong> para incorporar os documentos da semana.</div>
                    </div>
                  ` : `
                    <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                      <thead>
                        <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-light); text-align: left;">
                          <th style="padding: 0.6rem 0.75rem; width: 140px;">Fecha</th>
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
                              <input type="text" class="form-control rel-tipo" value="${escapeHtml(item.tipo || '')}" placeholder="Visita de obra / Reunión de obra" style="font-size: 0.85rem;" />
                            </td>
                            <td style="padding: 0.5rem 0.75rem; text-align: center;">
                              <input type="number" class="form-control rel-num" value="${item.numero || 1}" min="1" style="font-size: 0.85rem; text-align: center;" />
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

            <!-- Bloque 3: Dilixencia de Firmas -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">3</span>
                    Dilixencia de Firmas
                  </div>
                  <div class="editor-section-desc">Cajetíns de firma da Dirección de Obra (DO) e Dirección de Execución (DE)</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                  <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px; padding: 1rem;">
                    <div style="font-weight: 700; color: #1e3a8a; font-size: 0.9rem; margin-bottom: 0.25rem;">DIRECCIÓN DE OBRA (DO)</div>
                    <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">${escapeHtml(doNames)}</div>
                    <div style="margin-top: 1.5rem; border-top: 1px dashed var(--border-light); padding-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted); text-align: center;">
                      Asdo.: ____________________________
                    </div>
                  </div>
                  <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px; padding: 1rem;">
                    <div style="font-weight: 700; color: #0284c7; font-size: 0.9rem; margin-bottom: 0.25rem;">DIRECCIÓN DE EXECUCIÓN (DE)</div>
                    <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">${escapeHtml(deNames)}</div>
                    <div style="margin-top: 1.5rem; border-top: 1px dashed var(--border-light); padding-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted); text-align: center;">
                      Asdo.: ____________________________
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Action Bar -->
            <div class="editor-bottom-bar" style="display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; padding: 1.5rem 0; margin-top: 2rem; border-top: 1px solid var(--border-light);">
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

    const rows = container.querySelectorAll('.relacion-row');
    const relacion = [];
    rows.forEach(r => {
      const fecha = r.querySelector('.rel-fecha').value;
      const tipo = r.querySelector('.rel-tipo').value.trim();
      const num = parseInt(r.querySelector('.rel-num').value, 10) || 1;
      if (tipo || fecha) {
        relacion.push({ fecha, tipo: tipo || 'Visita de obra', numero: num });
      }
    });
    infData.relacion = relacion;
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

  function wireEvents() {
    // Cancel
    const btnCancel = container.querySelector('#btn-cancel');
    if (btnCancel) {
      btnCancel.onclick = () => {
        router.navigate('expediente', { id: currentObra.id, tab: 'informes-semanais' });
      };
    }

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

    // Add Visita
    const btnAddVisita = container.querySelector('#btn-add-visita');
    if (btnAddVisita) {
      btnAddVisita.onclick = () => {
        collectFormData();
        const actas = db.getActas(currentObra.id) || [];
        const latestActa = actas[0];
        infData.relacion.push({
          fecha: latestActa?.fecha || new Date().toISOString().split('T')[0],
          tipo: 'Visita de obra',
          numero: latestActa?.numero || (infData.relacion.filter(r => r.tipo.includes('Visita')).length + 1)
        });
        render();
      };
    }

    // Add Reunión
    const btnAddReunion = container.querySelector('#btn-add-reunion');
    if (btnAddReunion) {
      btnAddReunion.onclick = () => {
        collectFormData();
        const reuniones = db.getReuniones(currentObra.id) || [];
        const latestReu = reuniones[0];
        infData.relacion.push({
          fecha: latestReu?.fecha || new Date().toISOString().split('T')[0],
          tipo: 'Reunión de obra',
          numero: latestReu?.numero || (infData.relacion.filter(r => r.tipo.includes('Reunión')).length + 1)
        });
        render();
      };
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

    // Remove item
    container.querySelectorAll('.remove-rel-item').forEach(btn => {
      btn.onclick = (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        collectFormData();
        infData.relacion.splice(idx, 1);
        render();
      };
    });
  }

  render();
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
