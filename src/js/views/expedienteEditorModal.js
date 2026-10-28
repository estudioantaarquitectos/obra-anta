/* ==========================================================================
   ANTA OBRA - Expediente Editor Modal
   Enables viewing and editing all official obra & expediente parameters
   with centralized Agentes & Technical Team management (Dual-Column Transfer).
   ========================================================================== */

import { db } from '../db.js';
import { modal, showToast } from '../modal.js';
import { getRolLabel } from './agentes.js';
import { formatCurrency, parseCurrency } from '../utils/currency.js';

export const AGENTE_ROLES = [
  { id: 'DO', label: 'Dirección de Obra (DO)' },
  { id: 'DEM', label: 'Dirección de Ejecución Material (DEM)' },
  { id: 'CSS', label: 'Coordinador de Seguridad y Salud (CSS)' },
  { id: 'JO', label: 'Jefe de Obra (JO)' },
  { id: 'Municipal', label: 'Supervisión Municipal / Concello' },
  { id: 'Arqueoloxía', label: 'Arqueología / Patrimonio Cultural' },
  { id: 'Especialista', label: 'Asistencia Técnica / Especialista' },
  { id: 'Outro', label: 'Otro Agente Interviniente' }
];

export function openExpedienteEditorModal({ obraId = null, onSaved = null, onDeleted = null } = {}) {
  const isEditing = Boolean(obraId);
  const obra = isEditing ? db.getObraById(obraId) : null;

  const defaultData = obra || {
    id: `obra-${Date.now()}`,
    expediente: 'AVS 03007 25/05',
    titulo: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
    situacion: 'Castillo de San Felipe, 15591. Concello de Ferrol',
    promotor: 'Concello de Ferrol / MITECO - Instituto para la Transición Justa',
    contratista: 'Cabero Edificaciones, S.A.',
    jefeObra: 'Miguel López Rodríguez',
    direccionObra: 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO)',
    direccionEjecucion: 'Ana Gallego Núñez (DEM)',
    coordinadorCSS: 'Juan Carlos Bello Criado (CSS)',
    arquitectaMunicipal: 'María José González Novo',
    arqueologo: 'Joaquín Ferrer Cruz',
    presupuestoAdjudicacion: '894.520,00 €',
    financiacion: 'Plan de Recuperación, Transformación y Resiliencia – Financiado por la Unión Europea – Next Generation EU',
    fechaInicio: '2025-01-15',
    plazoMeses: 12,
    estado: 'en_ejecucion',
    descripcion: 'Actuaciones de rehabilitación, consolidación de fábricas de cantería, reposición de carpinterías exteriores de iroko y puesta en valor del Castillo de San Felipe.',
    agentes: []
  };

  // Clone or migrate assigned agentes
  let assignedAgentes = (defaultData.agentes && Array.isArray(defaultData.agentes) && defaultData.agentes.length > 0)
    ? JSON.parse(JSON.stringify(defaultData.agentes))
    : [];

  // Fallback: If empty, seed from active default obra or all available DB agents matching roles
  if (assignedAgentes.length === 0) {
    const allAgentes = db.getAgentes();
    if (allAgentes.length > 0) {
      allAgentes.forEach(ag => {
        let matchedRol = 'Outro';
        const ch = (ag.cargoHabitual || '').toUpperCase();
        if (ch.includes('DIRECTORA DE OBRA') || ch.includes('DIRECTOR DE OBRA') || ch.includes('(DO)')) matchedRol = 'DO';
        else if (ch.includes('EXECUCIÓN') || ch.includes('EJECUCIÓN') || ch.includes('(DEM)')) matchedRol = 'DEM';
        else if (ch.includes('SEGURIDADE') || ch.includes('SEGURIDAD') || ch.includes('(CSS)')) matchedRol = 'CSS';
        else if (ch.includes('JEFE DE OBRA') || ch.includes('XEFE DE OBRA') || ch.includes('(JO)')) matchedRol = 'JO';
        else if (ch.includes('MUNICIPAL') || ch.includes('CONCELLO')) matchedRol = 'Municipal';
        else if (ch.includes('ARQUEÓLOG') || ch.includes('PATRIMONIO')) matchedRol = 'Arqueoloxía';

        assignedAgentes.push({
          agenteId: ag.id,
          rol: matchedRol,
          nombre: ag.nombre,
          cargo: ag.cargoHabitual,
          entidad: ag.entidad,
          telefono: ag.telefono,
          email: ag.email
        });
      });
    }
  }

  const contentHtml = `
    <form id="form-expediente" style="display: flex; flex-direction: column; gap: 1.25rem;">
      
      <!-- Section 1: Identificación del Expediente -->
      <div style="background: var(--bg-subtle); padding: 1rem 1.25rem; border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
        <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; font-weight: 700; color: var(--primary);">
          1. Identificación Oficial del Expediente
        </h4>
        
        <div class="form-grid-2">
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label required">Nº de Expediente</label>
            <input type="text" id="exp-codigo" class="form-control" value="${escapeHtml(defaultData.expediente || '')}" required />
          </div>
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label required">Estado Actual</label>
            <select id="exp-estado" class="form-control">
              <option value="en_ejecucion" ${defaultData.estado === 'en_ejecucion' ? 'selected' : ''}>En ejecución activa</option>
              <option value="en_prazo" ${defaultData.estado === 'en_prazo' ? 'selected' : ''}>En plazo e controlada</option>
              <option value="con_desviacions" ${defaultData.estado === 'con_desviacions' ? 'selected' : ''}>Con desviacións</option>
              <option value="comprometida" ${defaultData.estado === 'comprometida' ? 'selected' : ''}>Comprometida</option>
              <option value="finalizada" ${defaultData.estado === 'finalizada' ? 'selected' : ''}>Finalizada / Recepcionada</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0.75rem;">
          <label class="form-label required">Título Oficial de la Obra / Proyecto</label>
          <textarea id="exp-titulo" class="form-control" rows="2" required>${escapeHtml(defaultData.titulo || '')}</textarea>
        </div>

        <div class="form-grid-2">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label required">Situación / Emplazamiento</label>
            <input type="text" id="exp-situacion" class="form-control" value="${escapeHtml(defaultData.situacion || '')}" required />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label required">Entidad Promotora / Cliente</label>
            <input type="text" id="exp-promotor" class="form-control" value="${escapeHtml(defaultData.promotor || '')}" required />
          </div>
        </div>
      </div>

      <!-- Section 2: Contratista Principal y Economía -->
      <div style="background: var(--bg-subtle); padding: 1rem 1.25rem; border-radius: var(--radius-sm); border-left: 4px solid var(--color-success);">
        <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; font-weight: 700; color: var(--color-success);">
          2. Empresa Contratista, Plazos y Presupuesto
        </h4>
        
        <div class="form-group" style="margin-bottom: 0.75rem;">
          <label class="form-label required">Empresa Contratista Principal</label>
          <input type="text" id="exp-contratista" class="form-control" value="${escapeHtml(defaultData.contratista || '')}" required />
        </div>

        <div class="form-grid-2">
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label">Presupuesto de Adjudicación</label>
            <input 
              type="text" 
              id="exp-presupuesto" 
              class="form-control" 
              value="${escapeHtml(defaultData.presupuestoAdjudicacion || defaultData.presupuesto ? formatCurrency(defaultData.presupuestoAdjudicacion || defaultData.presupuesto) : '')}" 
              placeholder="8.121.870,27 €" 
            />
          </div>
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label">Financiación / Programa</label>
            <input type="text" id="exp-financiacion" class="form-control" value="${escapeHtml(defaultData.financiacion || '')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Fecha de Inicio de Obra</label>
            <input type="date" id="exp-fechaInicio" class="form-control" value="${escapeHtml(defaultData.fechaInicio || '')}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Plazo Previsto (Meses)</label>
            <input type="number" id="exp-plazoMeses" class="form-control" value="${defaultData.plazoMeses || 12}" min="1" max="120" />
          </div>
        </div>
      </div>

      <!-- Section 3: Equipo Técnico y Agentes de la Obra (Conectado a la Base de Datos) -->
      <div style="background: var(--bg-subtle); padding: 1.15rem 1.25rem; border-radius: var(--radius-sm); border-left: 4px solid var(--color-warning);">
        
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
          <div>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #b45309; display: flex; align-items: center; gap: 0.4rem;">
              <span>3. Equipo Técnico y Agentes de la Obra</span>
              <span class="badge badge-warning" style="font-size: 0.7rem; font-weight: 600;">Base de Datos de Agentes</span>
            </h4>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
              Asigne los agentes correspondientes a esta obra desde la base de datos o cree uno nuevo directamente.
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <!-- Blue square button: Personas Icon to open transfer selector screen -->
            <button type="button" class="btn btn-secondary btn-sm" id="btn-open-agentes-selector" title="Abrir pantalla de selección de axentes da base de datos (pasar á dereita)" style="display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 34px; padding: 0; border: 1.5px solid var(--primary); color: var(--primary); background: var(--bg-surface); border-radius: var(--radius-sm); cursor: pointer;" onmouseover="this.style.background='rgba(37,99,235,0.08)';" onmouseout="this.style.background='var(--bg-surface)';">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </button>

            <!-- Quick Create Button -->
            <button type="button" class="btn btn-primary btn-sm" id="btn-toggle-quick-new-agente" style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Crear Novo Axente
            </button>
          </div>
        </div>

        <!-- Quick Create New Agent Inline Panel (Initially Hidden) -->
        <div id="quick-new-agente-panel" style="display: none; background: var(--bg-surface); border: 1px solid var(--primary); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              <span>Rexistrar Novo Axente na Base de Datos e Asignar á Obra</span>
            </div>
            <button type="button" class="btn-ghost btn-sm" id="btn-cancel-quick-new-agente" style="padding: 0.2rem 0.4rem; font-size: 0.8rem;">✕ Pechar</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="form-grid-2">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label required" style="font-size: 0.78rem;">Nome e Apelidos do Profesional</label>
                <input type="text" id="ag-quick-nombre" class="form-control" style="font-size: 0.85rem;" placeholder="Ex: Rosa Vilas Romalde" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label required" style="font-size: 0.78rem;">Cargo Habitual / Especialidade</label>
                <input type="text" id="ag-quick-cargo" class="form-control" style="font-size: 0.85rem;" placeholder="Ex: Arquitecto / Asesor Estruturas" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.78rem;">Entidade / Empresa</label>
                <input type="text" id="ag-quick-entidad" class="form-control" style="font-size: 0.85rem;" placeholder="Ex: Dirección Facultativa / Concello" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label required" style="font-size: 0.78rem;">Rol a Asignar nesta Obra</label>
                <select id="ag-quick-rol" class="form-control" style="font-size: 0.85rem;">
                  ${AGENTE_ROLES.map(r => `<option value="${r.id}">${escapeHtml(r.label)}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.78rem;">Teléfono de Contacto</label>
                <input type="tel" id="ag-quick-telefono" class="form-control" style="font-size: 0.85rem;" placeholder="600 00 00 00" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.78rem;">Correo Electrónico</label>
                <input type="email" id="ag-quick-email" class="form-control" style="font-size: 0.85rem;" placeholder="profesional@estudio.gal" />
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.35rem;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-quick-sub">Cancelar</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-save-quick-new-agente">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Crear e Asignar á Obra
              </button>
            </div>
          </div>
        </div>

        <!-- Table / List of Assigned Agents in this Project -->
        <div id="assigned-agentes-container" style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); margin-bottom: 0; overflow: hidden;">
          <!-- Dynamically populated -->
        </div>

      </div>

      <!-- Section 4: Descripción y Alcance -->
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label">Descripción general de las actuaciones y alcance</label>
        <textarea id="exp-descripcion" class="form-control" rows="2">${escapeHtml(defaultData.descripcion || '')}</textarea>
      </div>

    </form>
  `;

  const footerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
      <div>
        ${isEditing ? `
          <button type="button" class="btn btn-outline-danger" id="btn-delete-expediente" style="color: #dc2626; border: 1.5px solid #fca5a5; background: #fff5f5; display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 0.95rem; font-size: 0.88rem; font-weight: 600; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s ease;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Eliminar Expediente</span>
          </button>
        ` : '<div></div>'}
      </div>
      <div style="display: flex; gap: 0.6rem;">
        <button type="button" class="btn btn-secondary" id="btn-cancel-expediente">Cancelar</button>
        <button type="button" class="btn btn-primary" id="btn-save-expediente">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ${isEditing ? 'Guardar Cambios del Expediente' : 'Crear Nuevo Expediente'}
        </button>
      </div>
    </div>
  `;

  const modalInstance = modal.open({
    title: isEditing ? `Edición de Expediente • ${defaultData.expediente}` : 'Nuevo Expediente de Obra',
    contentHtml,
    footerHtml,
    size: 'lg',
    closeOnBackdrop: false
  });

  const backdrop = modalInstance.backdrop;

  /* ----------------- Assigned Agents Rendering & Event Wiring ----------------- */
  function renderAssignedAgentesList() {
    const listContainer = backdrop.querySelector('#assigned-agentes-container');
    if (!listContainer) return;

    if (assignedAgentes.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Non hai ningún axente técnico asignado a esta obra actualmente. Prema no botón con icona de <strong>Personas</strong> arriba para seleccionar axentes da base de datos.
        </div>
      `;
    } else {
      listContainer.innerHTML = `
        <table class="data-table" style="margin: 0; font-size: 0.84rem;">
          <thead>
            <tr style="background: var(--bg-subtle);">
              <th style="padding: 0.55rem 0.85rem;">Axente / Profesional</th>
              <th style="padding: 0.55rem 0.85rem; width: 230px;">Rol nesta Obra</th>
              <th style="padding: 0.55rem 0.85rem;">Entidade / Contacto</th>
              <th style="padding: 0.55rem 0.85rem; width: 45px; text-align: center;"></th>
            </tr>
          </thead>
          <tbody>
            ${assignedAgentes.map((asig, index) => {
              const initials = getInitials(asig.nombre);
              const rolColor = getRolColor(asig.rol);

              return `
                <tr data-index="${index}">
                  <td style="padding: 0.6rem 0.85rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                      <div style="width: 28px; height: 28px; border-radius: 6px; background: ${rolColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0;">
                        ${initials}
                      </div>
                      <div>
                        <div style="font-weight: 700; color: var(--text-main); line-height: 1.2;">
                          ${escapeHtml(asig.nombre)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">
                          ${escapeHtml(asig.cargo || 'Técnico')}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style="padding: 0.6rem 0.85rem;">
                    <select class="form-control select-agent-role" data-index="${index}" style="font-size: 0.82rem; padding: 0.3rem 0.5rem; font-weight: 600; color: var(--text-main);">
                      ${AGENTE_ROLES.map(r => `
                        <option value="${r.id}" ${asig.rol === r.id ? 'selected' : ''}>${escapeHtml(r.label)}</option>
                      `).join('')}
                    </select>
                  </td>

                  <td style="padding: 0.6rem 0.85rem; font-size: 0.8rem; color: var(--text-secondary);">
                    <div style="font-weight: 500; color: var(--text-main);">${escapeHtml(asig.entidad || '-')}</div>
                    ${asig.email || asig.telefono ? `
                      <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">
                        ${asig.telefono ? `<span>📞 ${escapeHtml(asig.telefono)}</span>` : ''}
                        ${asig.email ? `<span style="margin-left: 0.3rem;">✉️ ${escapeHtml(asig.email)}</span>` : ''}
                      </div>
                    ` : ''}
                  </td>

                  <td style="padding: 0.6rem 0.85rem; text-align: center;">
                    <button type="button" class="btn btn-ghost btn-sm btn-remove-agente" data-index="${index}" title="Quitar axente desta obra" style="color: var(--color-danger); padding: 0.25rem 0.4rem;">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // Wire table controls
    listContainer.querySelectorAll('.select-agent-role').forEach(select => {
      select.onchange = (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (!isNaN(idx) && assignedAgentes[idx]) {
          assignedAgentes[idx].rol = e.target.value;
        }
      };
    });

    listContainer.querySelectorAll('.btn-remove-agente').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) {
          const removed = assignedAgentes.splice(idx, 1);
          showToast(`Axente "${removed[0]?.nombre || ''}" desasignado da obra`, 'info');
          renderAssignedAgentesList();
        }
      };
    });
  }

  // Initial render of assigned agents
  renderAssignedAgentesList();

  // Wire Open Transfer Modal (Personas Button in blue square)
  const openSelectorBtn = backdrop.querySelector('#btn-open-agentes-selector');
  if (openSelectorBtn) {
    openSelectorBtn.onclick = () => {
      openAgentesTransferModal({
        assignedAgentes,
        obraExpediente: defaultData.expediente || defaultData.titulo,
        onApply: (updatedList) => {
          assignedAgentes = updatedList;
          renderAssignedAgentesList();
        }
      });
    };
  }

  // Quick New Agent toggle panel in main modal
  const toggleQuickBtn = backdrop.querySelector('#btn-toggle-quick-new-agente');
  const quickPanel = backdrop.querySelector('#quick-new-agente-panel');
  const closeQuickBtn = backdrop.querySelector('#btn-cancel-quick-new-agente');
  const cancelQuickSub = backdrop.querySelector('#btn-cancel-quick-sub');
  const saveQuickBtn = backdrop.querySelector('#btn-save-quick-new-agente');

  function openQuickPanel() {
    if (quickPanel) {
      quickPanel.style.display = 'block';
      const nameInput = backdrop.querySelector('#ag-quick-nombre');
      if (nameInput) nameInput.focus();
    }
  }

  function closeQuickPanel() {
    if (quickPanel) {
      quickPanel.style.display = 'none';
      ['#ag-quick-nombre', '#ag-quick-cargo', '#ag-quick-entidad', '#ag-quick-telefono', '#ag-quick-email'].forEach(sel => {
        const inp = backdrop.querySelector(sel);
        if (inp) inp.value = '';
      });
    }
  }

  if (toggleQuickBtn) toggleQuickBtn.onclick = openQuickPanel;
  if (closeQuickBtn) closeQuickBtn.onclick = closeQuickPanel;
  if (cancelQuickSub) cancelQuickSub.onclick = closeQuickPanel;

  if (saveQuickBtn) {
    saveQuickBtn.onclick = () => {
      const nombre = backdrop.querySelector('#ag-quick-nombre')?.value.trim();
      const cargo = backdrop.querySelector('#ag-quick-cargo')?.value.trim();
      const entidad = backdrop.querySelector('#ag-quick-entidad')?.value.trim();
      const telefono = backdrop.querySelector('#ag-quick-telefono')?.value.trim();
      const email = backdrop.querySelector('#ag-quick-email')?.value.trim();
      const rol = backdrop.querySelector('#ag-quick-rol')?.value || 'DO';

      if (!nombre || !cargo) {
        showToast('Debe indicar o nome e cargo do novo axente', 'warning');
        return;
      }

      // Save into permanent agents database
      const newAgente = db.saveAgente({
        nombre,
        cargoHabitual: cargo,
        entidad,
        telefono,
        email,
        notas: `Rexistrado dende o expediente ${defaultData.expediente || ''}`
      });

      // Assign immediately to current obra
      assignedAgentes.push({
        agenteId: newAgente.id,
        rol,
        nombre: newAgente.nombre,
        cargo: newAgente.cargoHabitual,
        entidad: newAgente.entidad,
        telefono: newAgente.telefono,
        email: newAgente.email
      });

      closeQuickPanel();
      renderAssignedAgentesList();
      showToast(`Novo axente "${newAgente.nombre}" creado e asignado á obra`, 'success');
    };
  }

  // Auto-format Presupuesto input on blur
  const presInput = backdrop.querySelector('#exp-presupuesto');
  if (presInput) {
    presInput.addEventListener('blur', () => {
      const val = presInput.value.trim();
      if (val) {
        presInput.value = formatCurrency(val);
      }
    });
  }

  // Cancel Expediente Modal
  backdrop.querySelector('#btn-cancel-expediente').onclick = () => modalInstance.close();

  // Save Expediente Modal
  backdrop.querySelector('#btn-save-expediente').onclick = () => {
    const form = backdrop.querySelector('#form-expediente');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Synthesize legacy fields from assigned agents for 100% backwards compatibility
    const doAgentes = assignedAgentes.filter(a => a.rol === 'DO');
    const demAgentes = assignedAgentes.filter(a => a.rol === 'DEM');
    const cssAgentes = assignedAgentes.filter(a => a.rol === 'CSS');
    const joAgentes = assignedAgentes.filter(a => a.rol === 'JO');
    const munAgentes = assignedAgentes.filter(a => a.rol === 'Municipal');
    const arqAgentes = assignedAgentes.filter(a => a.rol === 'Arqueoloxía');

    const direccionObraStr = doAgentes.length > 0
      ? doAgentes.map(a => a.nombre).join(' e ') + ' (DO)'
      : (defaultData.direccionObra || 'Dirección de Obra');

    const direccionEjecucionStr = demAgentes.length > 0
      ? demAgentes.map(a => a.nombre).join(' e ') + ' (DEM)'
      : (defaultData.direccionEjecucion || 'Dirección de Execución');

    const coordinadorCSSStr = cssAgentes.length > 0
      ? cssAgentes.map(a => a.nombre).join(', ') + ' (CSS)'
      : (defaultData.coordinadorCSS || '');

    const jefeObraStr = joAgentes.length > 0
      ? joAgentes.map(a => a.nombre).join(', ')
      : (defaultData.jefeObra || '');

    const arquitectaMunicipalStr = munAgentes.length > 0
      ? munAgentes.map(a => a.nombre).join(', ')
      : (defaultData.arquitectaMunicipal || '');

    const arqueologoStr = arqAgentes.length > 0
      ? arqAgentes.map(a => a.nombre).join(', ')
      : (defaultData.arqueologo || '');

    const rawPresupuesto = backdrop.querySelector('#exp-presupuesto').value.trim();
    const formattedPresupuesto = rawPresupuesto ? formatCurrency(rawPresupuesto) : '';
    const numericPresupuesto = rawPresupuesto ? parseCurrency(rawPresupuesto) : 0;

    const payload = {
      id: defaultData.id,
      expediente: backdrop.querySelector('#exp-codigo').value.trim(),
      titulo: backdrop.querySelector('#exp-titulo').value.trim(),
      situacion: backdrop.querySelector('#exp-situacion').value.trim(),
      promotor: backdrop.querySelector('#exp-promotor').value.trim(),
      estado: backdrop.querySelector('#exp-estado').value,
      contratista: backdrop.querySelector('#exp-contratista').value.trim(),
      jefeObra: jefeObraStr,
      presupuestoAdjudicacion: formattedPresupuesto,
      presupuesto: numericPresupuesto,
      financiacion: backdrop.querySelector('#exp-financiacion').value.trim(),
      fechaInicio: backdrop.querySelector('#exp-fechaInicio').value,
      plazoMeses: parseInt(backdrop.querySelector('#exp-plazoMeses').value, 10) || 12,
      agentes: assignedAgentes,
      direccionObra: direccionObraStr,
      direccionEjecucion: direccionEjecucionStr,
      coordinadorCSS: coordinadorCSSStr,
      arquitectaMunicipal: arquitectaMunicipalStr,
      arqueologo: arqueologoStr,
      descripcion: backdrop.querySelector('#exp-descripcion').value.trim()
    };

    // User confirmation
    modal.confirmSave({
      title: 'Confirmar Actualización de Expediente',
      message: `¿Confirma os datos do expediente "${payload.expediente}" e a asignación de ${assignedAgentes.length} axentes técnicos?`,
      details: `Obra: ${payload.titulo}`,
      confirmText: 'Sí, Guardar Expediente',
      onConfirm: () => {
        const saved = db.saveObra(payload);
        modalInstance.close();
        showToast('Expediente e axentes gardados correctamente', 'success');
        if (typeof onSaved === 'function') {
          onSaved(saved);
        }
      }
    });
  };

  // Wire delete expediente button with text verification
  const deleteBtn = backdrop.querySelector('#btn-delete-expediente');
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      const allObras = db.getObras();
      if (allObras.length <= 1) {
        showToast('Debe existir al menos un expediente de obra en el sistema.', 'warning');
        return;
      }

      modal.confirmTextVerification({
        title: 'Eliminar Expediente Definitivamente',
        message: `¿Está seguro de que desea eliminar el expediente <strong>${escapeHtml(defaultData.expediente || defaultData.titulo)}</strong>?<br><span style="font-size: 0.86rem; color: var(--text-muted); display: block; margin-top: 0.35rem;">«${escapeHtml(defaultData.titulo || '')}»</span>`,
        details: 'Se eliminarán también de forma permanente todas las actas de obra, informes mensuales y notas de bitácora vinculadas a este expediente.',
        verificationKeyword: 'ELIMINAR',
        confirmText: 'Eliminar Expediente Definitivamente',
        onConfirm: () => {
          try {
            db.deleteObra(defaultData.id);
            modalInstance.close();
            showToast('Expediente y documentos asociados eliminados correctamente', 'success');
            if (typeof onDeleted === 'function') {
              onDeleted(defaultData.id);
            } else if (window.appRouter) {
              window.appRouter.navigate('dashboard');
            }
          } catch (err) {
            showToast(err.message || 'Error al eliminar el expediente', 'error');
          }
        }
      });
    };
  }
}

/**
 * Dual-Column Transfer Modal:
 * Left: All Agents from Database + Create Agent on Left
 * Right: Assigned Agents for current project with Role Picker
 */
export function openAgentesTransferModal({ assignedAgentes = [], obraExpediente = '', onApply = null } = {}) {
  let workingAssigned = JSON.parse(JSON.stringify(assignedAgentes));
  let searchTerm = '';

  const contentHtml = `
    <div id="agentes-transfer-modal-body" style="display: flex; flex-direction: column; gap: 0.85rem;">
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: -0.25rem;">
        Transfira profesionais da columna esquerda (Base de Datos) á dereita (Expediente en curso). Pode crear novos axentes directamente na columna esquerda.
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; min-height: 480px; max-height: 62vh;">
        
        <!-- LEFT COLUMN: AGENTES EN LA BD -->
        <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; overflow: hidden;">
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.4rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="font-weight: 700; font-size: 0.92rem; color: var(--text-main);">1. Axentes na Base de Datos</span>
              <span class="badge badge-info" id="left-db-count" style="font-size: 0.72rem;"></span>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-toggle-left-create" style="font-size: 0.76rem; padding: 0.22rem 0.55rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Novo Axente na BD
            </button>
          </div>

          <!-- Quick Creation Box on Left (Accordion) -->
          <div id="left-create-panel" style="display: none; background: var(--bg-surface); border: 1.5px solid var(--primary); border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 0.75rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.45rem;">
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--primary);">Rexistrar Novo Axente na BD</span>
              <button type="button" class="btn-ghost btn-sm" id="btn-close-left-create" style="padding: 0.1rem 0.35rem; font-size: 0.75rem;">✕</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.8rem;">
              <div>
                <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.1rem;">Nome e Apelidos *</label>
                <input type="text" id="left-new-nombre" class="form-control" style="font-size: 0.8rem; padding: 0.25rem 0.45rem;" placeholder="Ex: Rosa Vilas Romalde" />
              </div>
              <div>
                <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.1rem;">Cargo / Especialidade *</label>
                <input type="text" id="left-new-cargo" class="form-control" style="font-size: 0.8rem; padding: 0.25rem 0.45rem;" placeholder="Ex: Arquitecta Directora de Obra" />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem;">
                <div>
                  <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.1rem;">Entidade / Empresa</label>
                  <input type="text" id="left-new-entidad" class="form-control" style="font-size: 0.8rem; padding: 0.25rem 0.45rem;" placeholder="Ex: Dirección Facultativa" />
                </div>
                <div>
                  <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.1rem;">Rol nesta Obra</label>
                  <select id="left-new-rol" class="form-control" style="font-size: 0.8rem; padding: 0.25rem 0.45rem;">
                    ${AGENTE_ROLES.map(r => `<option value="${r.id}">${escapeHtml(r.label)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem;">
                <div>
                  <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.1rem;">Teléfono</label>
                  <input type="tel" id="left-new-telefono" class="form-control" style="font-size: 0.8rem; padding: 0.25rem 0.45rem;" placeholder="600 00 00 00" />
                </div>
                <div>
                  <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.1rem;">Email</label>
                  <input type="email" id="left-new-email" class="form-control" style="font-size: 0.8rem; padding: 0.25rem 0.45rem;" placeholder="profesional@estudio.gal" />
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 0.4rem; margin-top: 0.2rem;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-left-create-sub" style="font-size: 0.76rem; padding: 0.2rem 0.45rem;">Cancelar</button>
                <button type="button" class="btn btn-primary btn-sm" id="btn-save-left-new" style="font-size: 0.76rem; padding: 0.2rem 0.55rem;">
                  Gardar e Pasar á Dereita →
                </button>
              </div>
            </div>
          </div>

          <!-- Search Filter on Left -->
          <div style="margin-bottom: 0.65rem;">
            <input type="text" id="left-search-input" class="form-control" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" placeholder="🔍 Filtrar axentes por nome, cargo ou entidade..." />
          </div>

          <!-- Scrollable Agents List on Left -->
          <div id="left-agentes-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.25rem;">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- RIGHT COLUMN: AGENTES DO EXPEDIENTE -->
        <div style="background: var(--bg-surface); border: 1.5px solid var(--primary); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-xs);">
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="font-weight: 700; font-size: 0.92rem; color: var(--primary);">2. Axentes do Expediente</span>
              <span class="badge badge-primary" id="right-assigned-count" style="font-size: 0.72rem;"></span>
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">
              Roles nesta obra
            </div>
          </div>

          <!-- Scrollable Assigned List on Right -->
          <div id="right-assigned-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.25rem;">
            <!-- Populated dynamically -->
          </div>

        </div>

      </div>
    </div>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" id="btn-cancel-transfer-modal">Cancelar</button>
    <button class="btn btn-primary" id="btn-apply-transfer-modal">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
      ✓ Aplicar Asignación ao Expediente
    </button>
  `;

  const transferModalInstance = modal.open({
    title: `Selección de Agentes para o Expediente • ${obraExpediente}`,
    contentHtml,
    footerHtml,
    size: 'xl',
    closePrevious: false // Stacks gracefully on top of main editor modal!
  });

  const subBackdrop = transferModalInstance.backdrop;

  function renderBothColumns() {
    const allDbAgentes = db.getAgentes();
    const assignedIds = new Set(workingAssigned.map(a => String(a.agenteId)));

    // 1. Render Left Column
    const leftCountEl = subBackdrop.querySelector('#left-db-count');
    const leftListEl = subBackdrop.querySelector('#left-agentes-list');

    const filteredLeft = allDbAgentes.filter(ag => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (ag.nombre || '').toLowerCase().includes(term) ||
             (ag.cargoHabitual || '').toLowerCase().includes(term) ||
             (ag.entidad || '').toLowerCase().includes(term);
    });

    if (leftCountEl) leftCountEl.textContent = `${allDbAgentes.length} axentes`;

    if (leftListEl) {
      if (filteredLeft.length === 0) {
        leftListEl.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.83rem;">
            Non se atoparon axentes na base de datos con ese criterio de busca.
          </div>
        `;
      } else {
        leftListEl.innerHTML = filteredLeft.map(ag => {
          const isAssigned = assignedIds.has(String(ag.id));
          const initials = getInitials(ag.nombre);

          return `
            <div style="background: var(--bg-surface); border: 1px solid ${isAssigned ? 'rgba(5, 150, 105, 0.4)' : 'var(--border-light)'}; border-radius: var(--radius-sm); padding: 0.65rem 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; transition: all 0.15s ease;">
              <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 0;">
                <div style="width: 32px; height: 32px; border-radius: 6px; background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.78rem; flex-shrink: 0;">
                  ${initials}
                </div>
                <div style="min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.86rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(ag.nombre)}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(ag.cargoHabitual || 'Técnico')} ${ag.entidad ? '• ' + escapeHtml(ag.entidad) : ''}
                  </div>
                  ${ag.telefono || ag.email ? `
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.1rem;">
                      ${ag.telefono ? `<span>📞 ${escapeHtml(ag.telefono)}</span>` : ''}
                      ${ag.email ? `<span style="margin-left: 0.35rem;">✉️ ${escapeHtml(ag.email)}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>

              <div style="flex-shrink: 0;">
                ${isAssigned ? `
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span class="badge badge-success" style="font-size: 0.72rem; padding: 0.15rem 0.4rem;">✓ No expediente</span>
                    <button type="button" class="btn btn-secondary btn-sm btn-transfer-item" data-id="${ag.id}" title="Engadir de novo con outro rol" style="padding: 0.15rem 0.35rem; font-size: 0.72rem;">+</button>
                  </div>
                ` : `
                  <button type="button" class="btn btn-primary btn-sm btn-transfer-item" data-id="${ag.id}" style="padding: 0.25rem 0.55rem; font-size: 0.76rem; white-space: nowrap;">
                    Pasar á dereita →
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Render Right Column
    const rightCountEl = subBackdrop.querySelector('#right-assigned-count');
    const rightListEl = subBackdrop.querySelector('#right-assigned-list');

    if (rightCountEl) rightCountEl.textContent = `${workingAssigned.length} asignados`;

    if (rightListEl) {
      if (workingAssigned.length === 0) {
        rightListEl.innerHTML = `
          <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; opacity: 0.5;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <div>Ningún axente seleccionado para este expediente.</div>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.25rem;">Faga clic en <strong>"Pasar á dereita →"</strong> nos axentes da columna esquerda para engadilos.</div>
          </div>
        `;
      } else {
        rightListEl.innerHTML = workingAssigned.map((asig, index) => {
          const initials = getInitials(asig.nombre);
          const rolColor = getRolColor(asig.rol);

          return `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-medium); border-left: 3px solid ${rolColor}; border-radius: var(--radius-sm); padding: 0.65rem 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;">
              <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 0; flex: 1;">
                <div style="width: 32px; height: 32px; border-radius: 6px; background: ${rolColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.78rem; flex-shrink: 0;">
                  ${initials}
                </div>
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 700; font-size: 0.86rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(asig.nombre)}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(asig.cargo || 'Técnico')} ${asig.entidad ? '• ' + escapeHtml(asig.entidad) : ''}
                  </div>
                </div>
              </div>

              <!-- Rol selector on right -->
              <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
                <select class="form-control select-working-role" data-index="${index}" style="font-size: 0.78rem; padding: 0.22rem 0.45rem; width: auto; max-width: 170px; font-weight: 600;">
                  ${AGENTE_ROLES.map(r => `
                    <option value="${r.id}" ${asig.rol === r.id ? 'selected' : ''}>${escapeHtml(r.label)}</option>
                  `).join('')}
                </select>

                <button type="button" class="btn btn-ghost btn-sm btn-remove-working-item" data-index="${index}" title="Quitar deste expediente" style="color: var(--color-danger); padding: 0.2rem 0.4rem; font-size: 0.85rem;">
                  ✕
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Wire Transfer Right Buttons
    subBackdrop.querySelectorAll('.btn-transfer-item').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const ag = db.getAgenteById(id);
        if (ag) {
          // Detect best initial role
          let defaultRol = 'Outro';
          const ch = (ag.cargoHabitual || '').toUpperCase();
          if (ch.includes('DIRECTORA DE OBRA') || ch.includes('DIRECTOR DE OBRA') || ch.includes('(DO)')) defaultRol = 'DO';
          else if (ch.includes('EXECUCIÓN') || ch.includes('EJECUCIÓN') || ch.includes('(DEM)')) defaultRol = 'DEM';
          else if (ch.includes('SEGURIDADE') || ch.includes('SEGURIDAD') || ch.includes('(CSS)')) defaultRol = 'CSS';
          else if (ch.includes('JEFE DE OBRA') || ch.includes('XEFE DE OBRA') || ch.includes('(JO)')) defaultRol = 'JO';
          else if (ch.includes('MUNICIPAL') || ch.includes('CONCELLO')) defaultRol = 'Municipal';
          else if (ch.includes('ARQUEÓLOG') || ch.includes('PATRIMONIO')) defaultRol = 'Arqueoloxía';

          workingAssigned.push({
            agenteId: ag.id,
            rol: defaultRol,
            nombre: ag.nombre,
            cargo: ag.cargoHabitual,
            entidad: ag.entidad,
            telefono: ag.telefono,
            email: ag.email
          });
          renderBothColumns();
        }
      };
    });

    // Wire Right Role Changes
    subBackdrop.querySelectorAll('.select-working-role').forEach(select => {
      select.onchange = (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (!isNaN(idx) && workingAssigned[idx]) {
          workingAssigned[idx].rol = e.target.value;
        }
      };
    });

    // Wire Right Remove Buttons
    subBackdrop.querySelectorAll('.btn-remove-working-item').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) {
          workingAssigned.splice(idx, 1);
          renderBothColumns();
        }
      };
    });
  }

  // Initial render of both columns
  renderBothColumns();

  // Search input on Left
  const searchInput = subBackdrop.querySelector('#left-search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchTerm = e.target.value;
      renderBothColumns();
      const reInp = subBackdrop.querySelector('#left-search-input');
      if (reInp) {
        reInp.focus();
        reInp.setSelectionRange(reInp.value.length, reInp.value.length);
      }
    };
  }

  // Toggle Left Create Panel
  const toggleLeftCreateBtn = subBackdrop.querySelector('#btn-toggle-left-create');
  const leftCreatePanel = subBackdrop.querySelector('#left-create-panel');
  const closeLeftCreateBtn = subBackdrop.querySelector('#btn-close-left-create');
  const cancelLeftCreateSub = subBackdrop.querySelector('#btn-cancel-left-create-sub');
  const saveLeftNewBtn = subBackdrop.querySelector('#btn-save-left-new');

  function openLeftCreate() {
    if (leftCreatePanel) {
      leftCreatePanel.style.display = 'block';
      const nameInp = subBackdrop.querySelector('#left-new-nombre');
      if (nameInp) nameInp.focus();
    }
  }

  function closeLeftCreate() {
    if (leftCreatePanel) {
      leftCreatePanel.style.display = 'none';
      ['#left-new-nombre', '#left-new-cargo', '#left-new-entidad', '#left-new-telefono', '#left-new-email'].forEach(sel => {
        const inp = subBackdrop.querySelector(sel);
        if (inp) inp.value = '';
      });
    }
  }

  if (toggleLeftCreateBtn) toggleLeftCreateBtn.onclick = openLeftCreate;
  if (closeLeftCreateBtn) closeLeftCreateBtn.onclick = closeLeftCreate;
  if (cancelLeftCreateSub) cancelLeftCreateSub.onclick = closeLeftCreate;

  if (saveLeftNewBtn) {
    saveLeftNewBtn.onclick = () => {
      const nombre = subBackdrop.querySelector('#left-new-nombre')?.value.trim();
      const cargo = subBackdrop.querySelector('#left-new-cargo')?.value.trim();
      const entidad = subBackdrop.querySelector('#left-new-entidad')?.value.trim();
      const telefono = subBackdrop.querySelector('#left-new-telefono')?.value.trim();
      const email = subBackdrop.querySelector('#left-new-email')?.value.trim();
      const rol = subBackdrop.querySelector('#left-new-rol')?.value || 'DO';

      if (!nombre || !cargo) {
        showToast('Indique o nome e cargo do novo axente', 'warning');
        return;
      }

      // Save to global agents DB
      const saved = db.saveAgente({
        nombre,
        cargoHabitual: cargo,
        entidad,
        telefono,
        email,
        notas: `Rexistrado dende o selector do expediente ${obraExpediente}`
      });

      // Pass directly to the right!
      workingAssigned.push({
        agenteId: saved.id,
        rol,
        nombre: saved.nombre,
        cargo: saved.cargoHabitual,
        entidad: saved.entidad,
        telefono: saved.telefono,
        email: saved.email
      });

      closeLeftCreate();
      renderBothColumns();
      showToast(`Axente "${saved.nombre}" creado na BD e asignado ao expediente`, 'success');
    };
  }

  // Cancel Transfer Modal
  subBackdrop.querySelector('#btn-cancel-transfer-modal').onclick = () => {
    transferModalInstance.close();
  };

  // Apply Transfer Modal
  subBackdrop.querySelector('#btn-apply-transfer-modal').onclick = () => {
    if (typeof onApply === 'function') {
      onApply(workingAssigned);
    }
    transferModalInstance.close();
    showToast(`Asignación de ${workingAssigned.length} axentes actualizada no expediente`, 'success');
  };
}

function getRolColor(rol) {
  const map = {
    'DO': '#2563eb',
    'DEM': '#059669',
    'CSS': '#d97706',
    'JO': '#7c3aed',
    'Municipal': '#0891b2',
    'Arqueoloxía': '#c05621',
    'Especialista': '#4b5563',
    'Outro': '#6b7280'
  };
  return map[rol] || '#2563eb';
}

function getInitials(name) {
  if (!name) return 'AG';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
