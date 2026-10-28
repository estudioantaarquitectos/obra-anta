/* ==========================================================================
   ANTA OBRA - Agentes y Equipo Técnico (Directorio General)
   Base de datos centralizada de agentes intervinientes, técnicos,
   direcciones facultativas, contratas y administraciones públicas.
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';
import { renderAgentAvatarHtml } from '../utils/avatar.js';

export function renderAgentes(container, router) {
  if (!auth.can('agentes:view') && !auth.isAdmin()) {
    container.innerHTML = `
      <div class="content-wrapper">
        <div class="empty-state">
          <div class="empty-title" style="color: var(--color-danger);">Acceso restringido</div>
          <div class="empty-desc">O seu grupo de usuario non dispón de permisos para acceder ao Directorio de Agentes.</div>
          <button class="btn btn-primary" id="btn-restricted-back">Volver</button>
        </div>
      </div>
    `;
    const backBtn = container.querySelector('#btn-restricted-back');
    if (backBtn) backBtn.onclick = () => router.back('dashboard');
    return;
  }

  let searchTerm = '';
  let entityFilter = 'todas';

  function render() {
    const canManageAgentes = auth.can('agentes:manage') || auth.isAdmin();
    const agentes = db.getAgentes();
    const obras = db.getObras();

    // Unique entities for filter
    const entities = Array.from(new Set(agentes.map(a => a.entidad).filter(Boolean))).sort();

    // Filter agents
    const filtered = agentes.filter(agente => {
      const matchSearch = !searchTerm || (
        (agente.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agente.cargoHabitual || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agente.entidad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agente.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agente.telefono || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agente.colegiado || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchEntity = entityFilter === 'todas' || agente.entidad === entityFilter;
      return matchSearch && matchEntity;
    });

    container.innerHTML = `
      <div class="content-wrapper">
        
        <!-- Header -->
        <div style="margin-bottom: 1.5rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-primary" style="font-weight: 700;">BASE DE DATOS DE AGENTES</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">•</span>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Directorio Centralizado</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
              Agentes y Equipo Técnico de Obra
            </h1>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 800px;">
              Directorio oficial de profesionales, direcciones facultativas, aparejadores, coordinadores de seguridad, constructoras y administraciones públicas. Estos agentes se asignan a cada expediente de obra.
            </p>
          </div>

          ${canManageAgentes ? `
            <div>
              <button class="btn btn-primary" id="btn-create-agente">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                Novo Agente
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="dashboard-toolbar" style="margin-bottom: 1.5rem;">
          <div class="search-box" style="flex: 1; max-width: 420px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="input-search-agente" placeholder="Buscar por nombre, cargo, entidad o teléfono..." value="${escapeHtml(searchTerm)}" />
            ${searchTerm ? `<button class="btn-clear-search" id="btn-clear-search-agente">✕</button>` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Entidad:</span>
              <select class="form-control" id="select-entity-filter" style="width: auto; min-width: 170px; padding: 0.35rem 0.6rem; font-size: 0.85rem;">
                <option value="todas">Todas las entidades (${agentes.length})</option>
                ${entities.map(ent => `
                  <option value="${escapeHtml(ent)}" ${entityFilter === ent ? 'selected' : ''}>${escapeHtml(ent)}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Agentes Grid -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div class="empty-title">Non se atoparon axentes</div>
            <div class="empty-desc">${searchTerm || entityFilter !== 'todas' ? 'Non hai ningún axente que coincida cos filtros de busca.' : 'Aínda non se rexistrou ningún axente na base de datos.'}</div>
            <button class="btn btn-primary" id="btn-empty-create-agente">Crear Primeiro Axente</button>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.25rem;">
            ${filtered.map(agente => {
              const assignedObras = db.getObrasByAgenteId(agente.id);

              return `
                <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
                  
                  <div style="padding: 1.25rem;">
                    <!-- Agent Header -->
                    <div style="display: flex; align-items: flex-start; gap: 0.85rem; margin-bottom: 0.85rem;">
                      ${renderAgentAvatarHtml(agente, { size: 48, extraClass: 'agent-card-avatar' })}
                      <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                          <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(agente.nombre)}">
                            ${escapeHtml(agente.nombre)}
                          </h3>
                        </div>
                        <div style="font-size: 0.83rem; font-weight: 600; color: var(--primary); margin-top: 0.15rem;">
                          ${escapeHtml(agente.cargoHabitual || 'Técnico de Obra')}
                        </div>
                        ${agente.entidad ? `
                          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.1rem; display: flex; align-items: center; gap: 0.3rem;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path></svg>
                            <span>${escapeHtml(agente.entidad)}</span>
                            ${agente.colegiado ? `<span class="badge badge-neutral" style="font-size: 0.68rem; padding: 0.1rem 0.35rem;">${escapeHtml(agente.colegiado)}</span>` : ''}
                          </div>
                        ` : ''}
                      </div>
                    </div>

                    <!-- Contact details -->
                    <div style="background: var(--bg-subtle); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.85rem;">
                      ${agente.telefono ? `
                        <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--text-secondary);">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          <a href="tel:${escapeHtml(agente.telefono)}" style="color: var(--text-main); font-weight: 500;">${escapeHtml(agente.telefono)}</a>
                        </div>
                      ` : ''}
                      ${agente.email ? `
                        <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--text-secondary);">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          <a href="mailto:${escapeHtml(agente.email)}" style="color: var(--primary); text-decoration: underline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(agente.email)}</a>
                        </div>
                      ` : ''}
                      ${!agente.telefono && !agente.email ? `
                        <span style="color: var(--text-muted); font-style: italic;">Sen datos de contacto directos</span>
                      ` : ''}
                    </div>

                    <!-- Assigned Obras -->
                    <div>
                      <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem; display: flex; align-items: center; justify-content: space-between;">
                        <span>Participación en Obras</span>
                        <span class="badge badge-info" style="font-size: 0.68rem;">${assignedObras.length}</span>
                      </div>
                      ${assignedObras.length === 0 ? `
                        <div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
                          Dispoñible para asignar en novos expedientes
                        </div>
                      ` : `
                        <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                          ${assignedObras.map(o => {
                            const asignacion = (o.agentes || []).find(a => String(a.agenteId) === String(agente.id));
                            const rolLabel = getRolLabel(asignacion?.rol);
                            return `
                              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); border: 1px solid var(--border-light); padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.76rem;">
                                <div style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${escapeHtml(o.titulo)}">
                                  ${escapeHtml(o.expediente || o.titulo)}
                                </div>
                                <span class="badge badge-primary" style="font-size: 0.68rem; padding: 0.15rem 0.4rem;">
                                  ${escapeHtml(rolLabel)}
                                </span>
                              </div>
                            `;
                          }).join('')}
                        </div>
                      `}
                    </div>

                  </div>

                  <!-- Footer Actions (solo si canManageAgentes) -->
                  ${canManageAgentes ? `
                    <div class="card-footer" style="padding: 0.75rem 1.25rem; display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; border-top: 1px solid var(--border-light);">
                      <button class="btn btn-secondary btn-sm btn-edit-agente" data-id="${agente.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Editar
                      </button>
                      <button class="btn btn-secondary btn-sm btn-delete-agente" data-id="${agente.id}" data-name="${escapeHtml(agente.nombre)}" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.35);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Eliminar
                      </button>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    // Search input
    const searchInput = container.querySelector('#input-search-agente');
    if (searchInput) {
      searchInput.oninput = (e) => {
        searchTerm = e.target.value;
        render();
        // re-focus input
        const reInput = container.querySelector('#input-search-agente');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      };
    }

    const clearBtn = container.querySelector('#btn-clear-search-agente');
    if (clearBtn) {
      clearBtn.onclick = () => {
        searchTerm = '';
        render();
      };
    }

    // Entity filter
    const entitySelect = container.querySelector('#select-entity-filter');
    if (entitySelect) {
      entitySelect.onchange = (e) => {
        entityFilter = e.target.value;
        render();
      };
    }

    // Create buttons
    const createBtn = container.querySelector('#btn-create-agente');
    if (createBtn) createBtn.onclick = () => openAgenteModal({ onSaved: () => render() });

    const emptyCreateBtn = container.querySelector('#btn-empty-create-agente');
    if (emptyCreateBtn) emptyCreateBtn.onclick = () => openAgenteModal({ onSaved: () => render() });

    // Edit buttons
    container.querySelectorAll('.btn-edit-agente').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        openAgenteModal({ agenteId: id, onSaved: () => render() });
      };
    });

    // Delete buttons
    container.querySelectorAll('.btn-delete-agente').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const assignedObras = db.getObrasByAgenteId(id);

        let details = '';
        if (assignedObras.length > 0) {
          details = `Atención: Este axente está asignado en ${assignedObras.length} obra(s) (${assignedObras.map(o => o.expediente || o.titulo).join(', ')}). Ao eliminalo, desvincularase deses expedientes.`;
        }

        modal.confirmSave({
          title: 'Confirmar Eliminación de Agente',
          message: `¿Está seguro de que desexa eliminar a "${name}" da base de datos de axentes?`,
          details,
          confirmText: 'Si, Eliminar Axente',
          onConfirm: () => {
            db.deleteAgente(id);
            showToast(`Axente "${name}" eliminado correctamente`, 'success');
            render();
          }
        });
      };
    });
  }

  render();
}

/**
 * Open Modal to Create or Edit an Agent
 */
export function openAgenteModal({ agenteId = null, onSaved = null } = {}) {
  const isEditing = Boolean(agenteId);
  const agente = isEditing ? db.getAgenteById(agenteId) : null;

  const defaultData = agente || {
    id: `ag-${Date.now()}`,
    nombre: '',
    cargoHabitual: '',
    entidad: '',
    colegiado: '',
    telefono: '',
    email: '',
    colorFondo: '',
    notas: ''
  };

  const contentHtml = `
    <form id="form-agente-modal" style="display: flex; flex-direction: column; gap: 1rem;">
      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label required">Nome e Apelidos do Profesional</label>
          <input type="text" id="ag-nombre" class="form-control" placeholder="Ex: Rosa Vilas Romalde" value="${escapeHtml(defaultData.nombre)}" required />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label required">Cargo / Titulación Habitual</label>
          <input type="text" id="ag-cargoHabitual" class="form-control" placeholder="Ex: Arquitecta Directora de Obra (DO)" value="${escapeHtml(defaultData.cargoHabitual)}" required />
        </div>
      </div>

      <!-- Avatar & Background Color Configuration -->
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label">Imaxe de Perfil e Cor de Fondo (Avatar)</label>
        <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; background: var(--bg-subtle); padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
          <div id="ag-avatar-preview-box" style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
            <div id="ag-avatar-preview">
              ${renderAgentAvatarHtml(defaultData, { size: 52 })}
            </div>
            <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600;">Vista previa</span>
          </div>

          <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 0.5rem;">
            <div>
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-main); display: block; margin-bottom: 0.3rem;">
                Cores predefinidas segundo o cargo:
              </span>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <button type="button" class="btn-color-preset" data-color="#1e3a8a" title="Azul escuro (DO - Directores de Obra)" style="display: flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.55rem; border-radius: 6px; background-color: #1e3a8a; color: white; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                  <span style="width: 10px; height: 10px; border-radius: 2px; background: white; display: inline-block;"></span>
                  DO (Azul escuro)
                </button>
                <button type="button" class="btn-color-preset" data-color="#38bdf8" title="Azul claro (DE - Directores de Execución)" style="display: flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.55rem; border-radius: 6px; background-color: #38bdf8; color: white; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                  <span style="width: 10px; height: 10px; border-radius: 2px; background: white; display: inline-block;"></span>
                  DE (Azul claro)
                </button>
                <button type="button" class="btn-color-preset" data-color="#e0f2fe" title="Azul case branco (CSS - Seguridade e Saúde)" style="display: flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.55rem; border-radius: 6px; background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                  <span style="width: 10px; height: 10px; border-radius: 2px; background: #0369a1; display: inline-block;"></span>
                  CSS (Case branco)
                </button>
                <button type="button" class="btn-color-preset" data-color="#ffffff" title="Branco por defecto (Resto axentes)" style="display: flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.55rem; border-radius: 6px; background-color: #ffffff; color: #1e293b; border: 1.5px solid #cbd5e1; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                  <span style="width: 10px; height: 10px; border-radius: 2px; background: #1e293b; display: inline-block;"></span>
                  Branco (Resto)
                </button>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">Iniciales do avatar:</span>
                <input type="text" id="ag-iniciales" class="form-control" placeholder="Auto" maxlength="4" value="${escapeHtml(defaultData.iniciales || '')}" style="width: 72px; font-size: 0.82rem; font-weight: 700; text-align: center; text-transform: uppercase; padding: 0.25rem 0.4rem;" />
                <button type="button" id="btn-iniciales-auto" class="btn btn-ghost btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.4rem;" title="Recalcular automaticamente segundo o nome">
                  ↺ Auto
                </button>
              </div>

              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">Cor personalizada:</span>
                <input type="color" id="ag-color-picker" value="${defaultData.colorFondo || '#1e3a8a'}" title="Preme para escoller calquera cor" style="width: 28px; height: 28px; padding: 0; border: none; border-radius: 6px; cursor: pointer; background: transparent;" />
                <input type="text" id="ag-colorFondo" class="form-control" placeholder="#1e3a8a" value="${escapeHtml(defaultData.colorFondo || '')}" style="width: 105px; font-size: 0.8rem; padding: 0.25rem 0.5rem;" />
                <button type="button" id="btn-color-auto" class="btn btn-ghost btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.4rem;" title="Restablecer ao valor por defecto segundo o cargo">
                  ↺ Auto
                </button>
              </div>
            </div>
          </div>
        </div>
        <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 0.3rem;">
          Cores por defecto: <strong>DO</strong> Azul escuro, <strong>DE</strong> Azul claro, <strong>CSS</strong> Azul case branco, resto <strong>Branco</strong>.
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Entidade, Empresa ou Organismo</label>
          <input type="text" id="ag-entidad" class="form-control" placeholder="Ex: Dirección Facultativa / Cabero / Concello" value="${escapeHtml(defaultData.entidad)}" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Nº de Colexiado / Acreditación</label>
          <input type="text" id="ag-colegiado" class="form-control" placeholder="Ex: COAG 2.415" value="${escapeHtml(defaultData.colegiado)}" />
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Teléfono de Contacto</label>
          <input type="tel" id="ag-telefono" class="form-control" placeholder="Ex: 981 12 34 56 / 600 00 00 00" value="${escapeHtml(defaultData.telefono)}" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Correo Electrónico Oficial</label>
          <input type="email" id="ag-email" class="form-control" placeholder="Ex: profesional@estudio.gal" value="${escapeHtml(defaultData.email)}" />
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label">Observacións / Notas de Especialidade</label>
        <textarea id="ag-notas" class="form-control" rows="2" placeholder="Notas internas ou especialidade..."> ${escapeHtml(defaultData.notas || '')}</textarea>
      </div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" id="btn-cancel-agente-modal">Cancelar</button>
    <button class="btn btn-primary" id="btn-save-agente-modal">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
      ${isEditing ? 'Gardar Cambios' : 'Crear Novo Axente'}
    </button>
  `;

  const modalInstance = modal.open({
    title: isEditing ? `Editar Axente • ${defaultData.nombre}` : 'Novo Axente na Base de Datos',
    contentHtml,
    footerHtml,
    size: 'md'
  });

  const backdrop = modalInstance.backdrop;
  backdrop.querySelector('#btn-cancel-agente-modal').onclick = () => modalInstance.close();

  // Wire live avatar preview updates
  const previewContainer = backdrop.querySelector('#ag-avatar-preview');
  const nameInput = backdrop.querySelector('#ag-nombre');
  const cargoInput = backdrop.querySelector('#ag-cargoHabitual');
  const initialsInput = backdrop.querySelector('#ag-iniciales');
  const colorTextInput = backdrop.querySelector('#ag-colorFondo');
  const colorPickerInput = backdrop.querySelector('#ag-color-picker');

  function updateAvatarPreview() {
    const curName = nameInput.value.trim() || 'AG';
    const curCargo = cargoInput.value.trim();
    const curColor = colorTextInput.value.trim();
    const curInitials = initialsInput ? initialsInput.value.trim().toUpperCase() : '';
    if (previewContainer) {
      previewContainer.innerHTML = renderAgentAvatarHtml(
        { nombre: curName, cargoHabitual: curCargo, colorFondo: curColor, iniciales: curInitials },
        { size: 52 }
      );
    }
  }

  nameInput.oninput = updateAvatarPreview;
  cargoInput.oninput = updateAvatarPreview;

  if (initialsInput) {
    initialsInput.oninput = (e) => {
      e.target.value = e.target.value.toUpperCase();
      updateAvatarPreview();
    };
  }

  const autoInitialsBtn = backdrop.querySelector('#btn-iniciales-auto');
  if (autoInitialsBtn) {
    autoInitialsBtn.onclick = () => {
      if (initialsInput) {
        initialsInput.value = '';
        updateAvatarPreview();
      }
    };
  }

  colorTextInput.oninput = (e) => {
    if (colorPickerInput && /^#[0-9a-fA-F]{6}$/.test(e.target.value.trim())) {
      colorPickerInput.value = e.target.value.trim();
    }
    updateAvatarPreview();
  };

  colorPickerInput.oninput = (e) => {
    colorTextInput.value = e.target.value;
    updateAvatarPreview();
  };

  backdrop.querySelectorAll('.btn-color-preset').forEach(presetBtn => {
    presetBtn.onclick = () => {
      const color = presetBtn.dataset.color;
      colorTextInput.value = color;
      if (color && colorPickerInput && /^#[0-9a-fA-F]{6}$/.test(color)) {
        colorPickerInput.value = color;
      }
      updateAvatarPreview();
    };
  });

  const autoBtn = backdrop.querySelector('#btn-color-auto');
  if (autoBtn) {
    autoBtn.onclick = () => {
      colorTextInput.value = '';
      updateAvatarPreview();
    };
  }

  backdrop.querySelector('#btn-save-agente-modal').onclick = () => {
    const form = backdrop.querySelector('#form-agente-modal');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      id: defaultData.id,
      nombre: backdrop.querySelector('#ag-nombre').value.trim(),
      cargoHabitual: backdrop.querySelector('#ag-cargoHabitual').value.trim(),
      iniciales: backdrop.querySelector('#ag-iniciales')?.value.trim().toUpperCase() || '',
      colorFondo: backdrop.querySelector('#ag-colorFondo').value.trim(),
      entidad: backdrop.querySelector('#ag-entidad').value.trim(),
      colegiado: backdrop.querySelector('#ag-colegiado').value.trim(),
      telefono: backdrop.querySelector('#ag-telefono').value.trim(),
      email: backdrop.querySelector('#ag-email').value.trim(),
      notas: backdrop.querySelector('#ag-notas').value.trim()
    };

    if (!payload.nombre || !payload.cargoHabitual) {
      showToast('Por favor, complete o nome e o cargo do axente', 'warning');
      return;
    }

    const saved = db.saveAgente(payload);
    modalInstance.close();
    showToast(`Axente "${saved.nombre}" gardado correctamente`, 'success');
    if (typeof onSaved === 'function') {
      onSaved(saved);
    }
  };
}

export function getRolLabel(rolKey) {
  const map = {
    'DO': 'Dirección de Obra (DO)',
    'DEM': 'Dirección de Execución Material (DEM)',
    'CSS': 'Coordinador de Seguridade e Saúde (CSS)',
    'JO': 'Xefe de Obra (JO)',
    'Propiedade': 'Propiedade / Promotor',
    'ControlCalidade': 'Control de Calidade e Ensaios',
    'Municipal': 'Supervisión Municipal / Concello',
    'Arqueoloxía': 'Arqueoloxía / Patrimonio',
    'Especialista': 'Asistencia Técnica / Especialista',
    'Outro': 'Outro Axente Interviniente'
  };
  return map[rolKey] || rolKey || 'Agente';
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
