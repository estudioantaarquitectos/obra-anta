/* ==========================================================================
   ANTA OBRA - Expediente Workspace View
   Dedicated view once the user enters a specific Obra/Expediente:
   "Una vez entro en ese expediente hay Actas de obra, Informes mensuales y Notas"
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';
import { openExpedienteEditorModal } from './expedienteEditorModal.js';
import { renderAgentAvatarHtml, getApartado1Titulos, renderUserModifierHtml, getUserDisplayName, formatModificationDate } from '../utils/avatar.js';
import { formatCurrency } from '../utils/currency.js';
import { printNota } from '../utils/printNota.js';

export function renderExpedienteView(container, router, params = {}) {
  const obraId = params.id || db.getActiveObraId();
  let obra = db.getObraById(obraId) || db.getActiveObra();

  if (!obra) {
    showToast('El expediente solicitado no existe', 'error');
    router.navigate('dashboard');
    return;
  }

  // Ensure active in storage
  db.setActiveObraId(obra.id);

  let activeTab = params.tab || 'actas'; // 'actas' | 'reuniones' | 'informes' | 'notas' | 'ficha'
  let actasSearchQuery = '';
  let selectedActas = new Set();
  let expandedActas = new Set();
  let reunionesSearchQuery = '';
  let expandedReuniones = new Set();
  let notasCategoryFilter = 'todas';
  let notasViewMode = 'rows'; // 'rows' | 'cards'

  function render() {
    obra = db.getObraById(obraId) || db.getActiveObra();
    const actas = db.getActas(obra.id);
    const reuniones = db.getReuniones(obra.id);
    const informes = db.getInformes(obra.id);
    const notas = db.getNotas(obra.id);
    const allAgentes = db.getAgentes();

    const canCreateActa = auth.can('actas:create');
    const canCreateInforme = auth.can('informes:create');
    const canCreateNota = auth.can('notas:create');

    // Obra status badge
    let statusBadge = `<span class="badge badge-success"><span class="status-dot status-dot-green"></span> En ejecución</span>`;
    if (obra.estado === 'con_desviacions') {
      statusBadge = `<span class="badge badge-warning"><span class="status-dot status-dot-yellow"></span> Con desviacións</span>`;
    } else if (obra.estado === 'comprometida') {
      statusBadge = `<span class="badge badge-danger"><span class="status-dot status-dot-red"></span> Comprometida</span>`;
    } else if (obra.estado === 'finalizada') {
      statusBadge = `<span class="badge badge-neutral">Finalizada</span>`;
    }

    container.innerHTML = `
      <div class="content-wrapper">

        <!-- Top Navigation & Return Link -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" id="btn-back-obras">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Volver al Selector de Obras
          </button>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" id="btn-edit-expediente-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Editar Datos del Expediente
            </button>
          </div>
        </div>

        <!-- Expediente Banner Card -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-xs);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
              <span class="badge badge-info" style="font-size: 0.82rem; font-weight: 700; font-family: monospace;">
                EXPTE: ${obra.expediente || 'AVS 03007 25/05'}
              </span>
              ${statusBadge}
              <span style="font-size: 0.82rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                ${obra.situacion || 'Castillo de San Felipe, 15591. Concello de Ferrol'}
              </span>
            </div>
            
            <div style="font-size: 0.82rem; color: var(--text-muted);">
              Presupuesto: <strong style="color: var(--color-success);">${formatCurrency(obra.presupuestoAdjudicacion || obra.presupuesto || '894.520,00 €')}</strong>
            </div>
          </div>

          <h2 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.5rem 0; line-height: 1.35;">
            ${obra.titulo}
          </h2>

          <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; font-size: 0.84rem; color: var(--text-secondary); padding-top: 0.5rem; border-top: 1px solid var(--border-light); margin-top: 0.75rem;">
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Contratista:</span>
              <strong style="color: var(--text-main); margin-left: 0.25rem;">${obra.contratista || 'Cabero Edificaciones, S.A.'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">DO:</span>
              <strong style="color: var(--text-main); margin-left: 0.25rem;">${obra.direccionObra || 'Rosa Vilas / Sergio Beceiro'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Promotor:</span>
              <span style="color: var(--text-main); margin-left: 0.25rem;">${obra.promotor || 'Concello de Ferrol / MITECO'}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs: Actas, Reunións, Informes mensuales, Notas -->
        <div class="expediente-nav-tabs" style="display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-light); margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 2px;">
          <button class="tab-btn ${activeTab === 'actas' ? 'active' : ''}" data-tab="actas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            <span>Actas Semanales</span>
            <span class="tab-count-badge">${actas.length}</span>
          </button>

          <button class="tab-btn ${activeTab === 'reuniones' ? 'active' : ''}" data-tab="reuniones">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Reunións</span>
            <span class="tab-count-badge">${reuniones.length}</span>
          </button>

          <button class="tab-btn ${activeTab === 'informes' ? 'active' : ''}" data-tab="informes">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-3.5z"></path></svg>
            <span>Informes Mensuales</span>
            <span class="tab-count-badge">${informes.length}</span>
          </button>

          <button class="tab-btn ${activeTab === 'notas' ? 'active' : ''}" data-tab="notas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span>Notas</span>
            <span class="tab-count-badge">${notas.length}</span>
          </button>
        </div>

        <!-- Tab Body Content -->
        <div id="tab-content-area">
          ${renderTabContent({ activeTab, obra, actas, reuniones, informes, notas, allAgentes, canCreateActa, canCreateInforme, canCreateNota })}
        </div>

      </div>
    `;

    wireEvents();
  }

  function renderTabContent({ activeTab, obra, actas, reuniones, informes, notas, allAgentes, canCreateActa, canCreateInforme, canCreateNota }) {
    switch (activeTab) {
      case 'actas':
        return renderActasSection({ obra, actas, allAgentes, canCreateActa });
      case 'reuniones':
        return renderReunionesSection({ obra, reuniones, allAgentes, canCreateActa });
      case 'informes':
        return renderInformesSection({ obra, informes, canCreateInforme });
      case 'notas':
        return renderNotasSection({ obra, notas, canCreateNota });
      default:
        return renderActasSection({ obra, actas, allAgentes, canCreateActa });
    }
  }

  /* ----------------- TAB 1: ACTAS DE OBRA ----------------- */
  function renderActasSection({ obra, actas, allAgentes = db.getAgentes(), canCreateActa }) {
    let filteredActas = actas;
    if (actasSearchQuery.trim()) {
      const q = actasSearchQuery.toLowerCase().trim();
      filteredActas = actas.filter(a => 
        String(a.numero).includes(q) ||
        String(a.fecha).includes(q) ||
        (a.cuestionesTratadas || []).some(c => (c.subtitulo || '').toLowerCase().includes(q) || (c.puntos || []).some(p => p.toLowerCase().includes(q))) ||
        (a.asistentes || []).some(as => (as.nombre || '').toLowerCase().includes(q) || (as.cargo || '').toLowerCase().includes(q))
      );
    }

    return `
      <div>
        <!-- Toolbar for Actas -->
        <div class="dashboard-toolbar" style="margin-bottom: 1.25rem;">
          <div class="search-box-wrapper" style="max-width: 440px;">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              id="search-actas-input" 
              class="form-control search-input" 
              placeholder="Buscar por Nº, fecha, asistente o asunto..." 
              value="${actasSearchQuery}"
            />
            ${actasSearchQuery ? `
              <button id="clear-actas-search" class="clear-search-btn" title="Limpiar búsqueda">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            ` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${canCreateActa ? `
              <button class="btn btn-primary" id="btn-create-acta">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nueva Acta de Obra
              </button>
            ` : ''}
          </div>
        </div>

        ${filteredActas.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div class="empty-title">Non hai actas rexistradas</div>
            <div class="empty-desc">
              ${actasSearchQuery ? `Ningún acta coincide coa busca "${actasSearchQuery}".` : 'Non se atoparon actas de reunión ou visita nesta obra.'}
            </div>
            ${canCreateActa && !actasSearchQuery ? `
              <button class="btn btn-primary" id="btn-empty-create-acta">Crear Acta de Obra</button>
            ` : ''}
          </div>
        ` : `
          <!-- Header de Lista de Actas -->
          <div class="actas-list-header">
            <div>Acta / Data</div>
            <div style="padding: 0 0.75rem;">Asistentes</div>
            <div>Última Edición</div>
            <div style="text-align: center;">Estado</div>
            <div style="text-align: right; padding-right: 32px;">Accións</div>
          </div>

          <!-- Contenedor Acordeón de Actas -->
          <div class="actas-accordion-list">
            ${filteredActas.map(acta => {
              const isExpanded = expandedActas.has(String(acta.id));
              const asistentesValidos = (acta.asistentes || []).filter(a => a.asistio !== false);
              const puntosTratados = getApartado1Titulos(acta);
              const ap1Titulo = (acta.apartados && acta.apartados[0]?.titulo) || 'CUESTIÓNS TRATADAS EN REUNIÓN';
              const isFirmada = acta.estado === 'firmada' || acta.estado === 'cerrada';

              return `
                <div class="acta-accordion-card ${isExpanded ? 'is-expanded' : ''}" id="acta-card-${acta.id}">
                  
                  <!-- Fila Colapsada / Principal -->
                  <div class="acta-row-main" data-id="${acta.id}">
                    
                    <!-- Acta nº e Data -->
                    <div class="acta-col-toggle" data-id="${acta.id}" style="cursor: pointer;">
                      <span style="font-family: var(--font-heading); font-weight: 700; color: var(--primary); font-size: 1rem; display: block;">
                        Acta nº ${acta.numero}
                      </span>
                      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                        ${acta.fecha}
                      </div>
                    </div>

                    <!-- Asistentes: Simplemente as imaxes de perfil -->
                    <div class="acta-col-toggle" data-id="${acta.id}" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 0 0.75rem; cursor: pointer;">
                      ${asistentesValidos.length === 0 ? `
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Sen asistentes</span>
                      ` : asistentesValidos.map(as => {
                        const ag = db.getAgenteById(as.id) || allAgentes.find(a => a.nombre.trim().toLowerCase() === (as.nombre || '').trim().toLowerCase());
                        return renderAgentAvatarHtml(ag || as, { size: 32, cargo: as.cargo });
                      }).join('')}
                    </div>

                    <!-- Última Edición -->
                    <div class="acta-col-toggle" data-id="${acta.id}" style="cursor: pointer;">
                      ${renderUserModifierHtml(acta.modificadoPor || acta.creadoPor || 'Admin', acta.fechaModificacion || acta.fechaCreacion || acta.fecha)}
                    </div>

                    <!-- Estado (Borrador / Cerrada) -->
                    <div style="text-align: center;">
                      ${isFirmada ? `
                        <span class="badge badge-success" style="font-size: 0.78rem;"><span class="status-dot status-dot-green"></span> Cerrada</span>
                      ` : `
                        <span class="badge badge-warning" style="font-size: 0.78rem;"><span class="status-dot status-dot-yellow"></span> Borrador</span>
                      `}
                    </div>

                    <!-- Botóns uniformes: Ver / PDF, DOCX, PDF, Editar, Copiar, Eliminar + Botón de despliegue -->
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem;">
                      <button class="btn btn-secondary btn-sm btn-print-acta" data-id="${acta.id}" title="Ver documento oficial para imprimir ou exportar a PDF">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        <span>Ver / PDF</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-export-acta-docx" data-id="${acta.id}" title="Descargar documento en formato Word (.docx)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        <span>DOCX</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-export-acta-pdf" data-id="${acta.id}" title="Descargar directamente o PDF Oficial con Anexos">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                        <span>PDF</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-edit-acta" data-id="${acta.id}" title="Editar contido da acta">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>Editar</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-duplicate-acta" data-id="${acta.id}" title="Copiar e crear nova acta a partir desta">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Copiar</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-delete-acta" data-id="${acta.id}" data-num="${acta.numero}" title="Eliminar acta" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.35);">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>Eliminar</span>
                      </button>

                      <!-- Botón de despliegue á dereita -->
                      <button class="btn btn-ghost btn-sm btn-toggle-acta-expand" data-id="${acta.id}" title="${isExpanded ? 'Colapsar detalles da acta' : 'Despregar detalles da acta'}" style="width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--text-secondary); margin-left: 2px;">
                        <svg class="expand-chevron-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                    </div>

                  </div>

                  <!-- Fila Expandida / Detalles -->
                  ${isExpanded ? `
                    <div class="acta-row-details">
                      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; padding: 0.5rem 0.85rem; background: rgba(241, 245, 249, 0.75); border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.78rem; color: var(--text-secondary);">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="color: var(--text-muted);">Última modificación:</span>
                          <strong style="color: var(--text-main);">${escapeHtml(getUserDisplayName(acta.modificadoPor || acta.creadoPor || 'Admin'))}</strong>
                          <span style="color: var(--text-muted); font-size: 0.74rem;">${formatModificationDate(acta.fechaModificacion || acta.fechaCreacion)}</span>
                        </div>
                        ${acta.creadoPor ? `<div style="font-size: 0.74rem; color: var(--text-muted);">Creada por: <strong>${escapeHtml(getUserDisplayName(acta.creadoPor))}</strong></div>` : ''}
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1.35fr; gap: 1.5rem; margin-bottom: 1.25rem;">
                        
                        <!-- Columna Asistentes con nomes á dereita do avatar -->
                        <div>
                          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.6rem;">
                            Asistentes (${asistentesValidos.length})
                          </div>
                          ${asistentesValidos.length === 0 ? `
                            <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Non hai asistentes rexistrados nesta acta.</div>
                          ` : `
                            <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                              ${asistentesValidos.map(as => {
                                const ag = db.getAgenteById(as.id) || allAgentes.find(a => a.nombre.trim().toLowerCase() === (as.nombre || '').trim().toLowerCase());
                                return `
                                  <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 0.45rem 0.65rem;">
                                    ${renderAgentAvatarHtml(ag || as, { size: 36, cargo: as.cargo })}
                                    <div style="min-width: 0; flex: 1;">
                                      <div style="font-size: 0.86rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${escapeHtml(as.nombre)}
                                      </div>
                                      <div style="font-size: 0.74rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${escapeHtml(as.cargo || ag?.cargoHabitual || 'Asistente')} ${as.entidad ? '• ' + escapeHtml(as.entidad) : ''}
                                      </div>
                                    </div>
                                  </div>
                                `;
                              }).join('')}
                            </div>
                          `}
                        </div>

                        <!-- Columna Puntos Tratados (títulos das seccións do apartado 1) -->
                        <div>
                          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.6rem;">
                            Puntos Tratados (Apartado 1 • ${escapeHtml(ap1Titulo)})
                          </div>
                          ${puntosTratados.length === 0 ? `
                            <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; background: var(--bg-surface); padding: 0.75rem; border-radius: 8px; border: 1px dashed var(--border-light);">
                              Non hai temas ou seccións detalladas no Apartado 1.
                            </div>
                          ` : `
                            <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 0.75rem 1rem;">
                              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.45rem;">
                                ${puntosTratados.map(title => `
                                  <li style="font-size: 0.86rem; font-weight: 600; color: var(--text-main); line-height: 1.35;">
                                    ${escapeHtml(title)}
                                  </li>
                                `).join('')}
                              </ul>
                            </div>
                          `}
                        </div>

                      </div>

                      <!-- Barra inferior expandida: Estado e Todos os Botóns de Acción -->
                      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                          <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Estado:</span>
                          ${isFirmada ? `
                            <span class="badge badge-success"><span class="status-dot status-dot-green"></span> Cerrada</span>
                          ` : `
                            <span class="badge badge-warning"><span class="status-dot status-dot-yellow"></span> Borrador</span>
                          `}
                        </div>

                        <!-- Botóns: Editar, Previsualizar PDF, Descargar DOCX, Descargar PDF, Borrar -->
                        <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                          <button class="btn btn-secondary btn-sm btn-edit-acta" data-id="${acta.id}" title="Editar contido da acta">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Editar</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-print-acta" data-id="${acta.id}" title="Previsualizar PDF Oficial xerado desde a plantilla de Word">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            <span>Previsualizar PDF</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-export-acta-docx" data-id="${acta.id}" title="Descargar documento en formato Word (.docx)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            <span>Descargar DOCX</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-export-acta-pdf" data-id="${acta.id}" title="Descargar directamente o arquivo PDF Oficial (.pdf)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            <span>Descargar PDF</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-duplicate-acta" data-id="${acta.id}" title="Duplicar e crear nova acta a partir desta">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Copiar</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-delete-acta" data-id="${acta.id}" data-num="${acta.numero}" title="Eliminar acta" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.35);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Borrar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  /* ----------------- TAB: REUNIÓNNS DE OBRA ----------------- */
  function renderReunionesSection({ obra, reuniones, allAgentes = db.getAgentes(), canCreateActa }) {
    let filteredReuniones = reuniones;
    if (reunionesSearchQuery.trim()) {
      const q = reunionesSearchQuery.toLowerCase().trim();
      filteredReuniones = reuniones.filter(r => 
        String(r.numero).includes(q) ||
        (r.fecha && r.fecha.toLowerCase().includes(q)) ||
        (r.lugar && r.lugar.toLowerCase().includes(q)) ||
        (r.tipoModalidad && r.tipoModalidad.toLowerCase().includes(q)) ||
        (r.apartados && r.apartados.some(ap => (ap.titulo && ap.titulo.toLowerCase().includes(q)) || (ap.secciones && ap.secciones.some(s => (s.titulo && s.titulo.toLowerCase().includes(q)))))) ||
        (r.asistentes && r.asistentes.some(as => (as.nombre && as.nombre.toLowerCase().includes(q)) || (as.cargo && as.cargo.toLowerCase().includes(q))))
      );
    }

    return `
      <div>
        <!-- Toolbar con buscador e botón de creación -->
        <div class="dashboard-toolbar" style="margin-bottom: 1.25rem;">
          <div class="search-box" style="max-width: 420px; flex: 1;">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              id="reuniones-search-input" 
              class="form-control" 
              placeholder="Buscar por Nº, data, asistente ou asunto..." 
              value="${escapeHtml(reunionesSearchQuery)}"
            />
            ${reunionesSearchQuery ? `
              <button class="search-clear-btn" id="btn-clear-reuniones-search" title="Limpar busca">✕</button>
            ` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${canCreateActa ? `
              <button class="btn btn-primary" id="btn-create-reunion">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nova Reunión
              </button>
            ` : ''}
          </div>
        </div>

        ${filteredReuniones.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div class="empty-title">Non hai reunións rexistradas</div>
            <div class="empty-desc">
              ${reunionesSearchQuery ? `Ningunha reunión coincide coa busca "${reunionesSearchQuery}".` : 'Non se atoparon reunións de obra específicas rexistradas neste expediente.'}
            </div>
            ${canCreateActa && !reunionesSearchQuery ? `
              <button class="btn btn-primary" id="btn-empty-create-reunion">Crear Primeira Reunión</button>
            ` : ''}
          </div>
        ` : `
          <!-- Header de Lista de Reunións -->
          <div class="actas-list-header">
            <div>Reunión / Data</div>
            <div style="padding: 0 0.75rem;">Asistentes</div>
            <div>Última Edición</div>
            <div style="text-align: center;">Estado</div>
            <div style="text-align: right; padding-right: 32px;">Accións</div>
          </div>

          <!-- Contenedor Acordeón de Reunións -->
          <div class="actas-accordion-list">
            ${filteredReuniones.map(reu => {
              const isExpanded = expandedReuniones.has(String(reu.id));
              const asistentesValidos = (reu.asistentes || []).filter(a => a.asistio !== false);
              const isFirmada = reu.estado === 'firmada' || reu.estado === 'cerrada';

              return `
                <div class="acta-accordion-card ${isExpanded ? 'is-expanded' : ''}" id="reunion-card-${reu.id}">
                  
                  <!-- Fila Colapsada / Principal -->
                  <div class="acta-row-main" data-id="${reu.id}" data-type="reunion">
                    
                    <!-- Reunión nº e Data -->
                    <div class="reunion-col-toggle" data-id="${reu.id}" style="cursor: pointer;">
                      <span style="font-family: var(--font-heading); font-weight: 700; color: var(--primary); font-size: 1rem; display: block;">
                        Reunión nº ${reu.numero}
                      </span>
                      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                        ${reu.fecha || '—'} ${reu.hora ? `• ${reu.hora}` : ''}
                      </div>
                    </div>

                    <!-- Asistentes: Avatares -->
                    <div class="reunion-col-toggle" data-id="${reu.id}" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 0 0.75rem; cursor: pointer;">
                      ${asistentesValidos.length === 0 ? `
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Sen asistentes</span>
                      ` : asistentesValidos.map(as => {
                        const ag = db.getAgenteById(as.id) || allAgentes.find(a => a.nombre.trim().toLowerCase() === (as.nombre || '').trim().toLowerCase());
                        return renderAgentAvatarHtml(ag || as, { size: 32, cargo: as.cargo });
                      }).join('')}
                    </div>

                    <!-- Última Edición -->
                    <div class="reunion-col-toggle" data-id="${reu.id}" style="cursor: pointer;">
                      ${renderUserModifierHtml(reu.modificadoPor || reu.creadoPor || 'Admin', reu.fechaModificacion || reu.fechaCreacion || reu.fecha)}
                    </div>

                    <!-- Estado (Borrador / Cerrada) -->
                    <div style="text-align: center;">
                      ${isFirmada ? `
                        <span class="badge badge-success" style="font-size: 0.78rem;"><span class="status-dot status-dot-green"></span> Cerrada</span>
                      ` : `
                        <span class="badge badge-warning" style="font-size: 0.78rem;"><span class="status-dot status-dot-yellow"></span> Borrador</span>
                      `}
                    </div>

                    <!-- Botóns uniformes: Ver / PDF, DOCX, PDF, Editar, Copiar, Eliminar + Botón de despliegue -->
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem;">
                      <button class="btn btn-secondary btn-sm btn-print-reunion" data-id="${reu.id}" title="Ver documento oficial de reunión para imprimir ou exportar a PDF">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        <span>Ver / PDF</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-export-reunion-docx" data-id="${reu.id}" title="Descargar documento de reunión en formato Word (.docx)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        <span>DOCX</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-export-reunion-pdf" data-id="${reu.id}" title="Descargar directamente o PDF Oficial de reunión">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                        <span>PDF</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-edit-reunion" data-id="${reu.id}" title="Editar contido da reunión">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>Editar</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-duplicate-reunion" data-id="${reu.id}" title="Copiar e crear nova reunión a partir desta">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Copiar</span>
                      </button>

                      <button class="btn btn-secondary btn-sm btn-delete-reunion" data-id="${reu.id}" data-num="${reu.numero}" title="Eliminar reunión" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.35);">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>Eliminar</span>
                      </button>

                      <!-- Botón de despliegue á dereita -->
                      <button class="btn btn-ghost btn-sm btn-toggle-reunion-expand" data-id="${reu.id}" title="${isExpanded ? 'Colapsar detalles' : 'Despregar detalles'}" style="width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--text-secondary); margin-left: 2px;">
                        <svg class="expand-chevron-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                    </div>

                  </div>

                  <!-- Fila Expandida / Detalles da Reunión -->
                  ${isExpanded ? `
                    <div class="acta-row-details">
                      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; padding: 0.5rem 0.85rem; background: rgba(241, 245, 249, 0.75); border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.78rem; color: var(--text-secondary);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span style="color: var(--text-muted);">Modalidade:</span>
                          <strong style="color: #1e3a8a;">${escapeHtml(reu.tipoModalidad || 'Presencial')}</strong>
                          <span style="color: var(--text-muted); margin-left: 0.5rem;">Lugar / Canle:</span>
                          <strong style="color: var(--text-main);">${escapeHtml(reu.lugar || 'Caseta de obra')}</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="color: var(--text-muted);">Última modificación:</span>
                          <strong style="color: var(--text-main);">${escapeHtml(getUserDisplayName(reu.modificadoPor || reu.creadoPor || 'Admin'))}</strong>
                          <span style="color: var(--text-muted); font-size: 0.74rem;">${formatModificationDate(reu.fechaModificacion || reu.fechaCreacion)}</span>
                        </div>
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1.35fr; gap: 1.5rem; margin-bottom: 1.25rem;">
                        
                        <!-- Columna Asistentes -->
                        <div>
                          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.6rem;">
                            Asistentes (${asistentesValidos.length})
                          </div>
                          ${asistentesValidos.length === 0 ? `
                            <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Non hai asistentes rexistrados nesta reunión.</div>
                          ` : `
                            <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                              ${asistentesValidos.map(as => {
                                const ag = db.getAgenteById(as.id) || allAgentes.find(a => a.nombre.trim().toLowerCase() === (as.nombre || '').trim().toLowerCase());
                                return `
                                  <div style="display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.55rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px;">
                                    ${renderAgentAvatarHtml(ag || as, { size: 28, cargo: as.cargo })}
                                    <div style="flex: 1; min-width: 0;">
                                      <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${escapeHtml(as.nombre)}
                                      </div>
                                      <div style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${escapeHtml(as.cargo || '—')} ${as.entidad ? `• ${escapeHtml(as.entidad)}` : ''}
                                      </div>
                                    </div>
                                    ${as.firma ? `<span style="font-size: 0.7rem; color: #1e3a8a; font-weight: 700; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">Asina</span>` : ''}
                                  </div>
                                `;
                              }).join('')}
                            </div>
                          `}
                        </div>

                        <!-- Columna Cuestións Tratadas -->
                        <div>
                          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.6rem;">
                            Cuestións Tratadas na Reunión
                          </div>
                          ${(reu.apartados && reu.apartados.length > 0) ? `
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                              ${reu.apartados.map((ap, apI) => `
                                <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px; padding: 0.65rem 0.85rem;">
                                  <div style="font-size: 0.82rem; font-weight: 700; color: #1e3a8a; margin-bottom: 0.25rem;">
                                    4.${apI + 1}.- ${escapeHtml(ap.titulo || 'Apartado')}
                                  </div>
                                  ${(ap.secciones || []).map(sec => `
                                    <div style="font-size: 0.78rem; color: var(--text-main); margin-left: 0.5rem; margin-top: 2px;">
                                      • <strong>${escapeHtml(sec.titulo || '')}:</strong> <span style="color: var(--text-muted);">${escapeHtml(sec.texto ? sec.texto.replace(/<[^>]+>/g, ' ').slice(0, 100) : '')}...</span>
                                    </div>
                                  `).join('')}
                                </div>
                              `).join('')}
                            </div>
                          ` : `
                            <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Non se detallaron apartados nesta reunión.</div>
                          `}
                        </div>

                      </div>

                      <!-- Footer con botóns na fila expandida -->
                      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
                        <button class="btn btn-secondary btn-sm btn-print-reunion" data-id="${reu.id}">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                          <span>Ver Documento Oficial</span>
                        </button>
                        <button class="btn btn-secondary btn-sm btn-export-reunion-docx" data-id="${reu.id}">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                          <span>Descargar Word</span>
                        </button>
                        <button class="btn btn-primary btn-sm btn-export-reunion-pdf" data-id="${reu.id}">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                          <span>Descargar PDF</span>
                        </button>
                        <button class="btn btn-secondary btn-sm btn-edit-reunion" data-id="${reu.id}">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          <span>Editar Reunión</span>
                        </button>
                      </div>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  /* ----------------- TAB 2: INFORMES MENSUALES DT-05 ----------------- */
  function renderInformesSection({ obra, informes, canCreateInforme }) {
    return `
      <div>
        <div class="dashboard-toolbar" style="margin-bottom: 1.25rem;">
          <div>
            <span style="font-weight: 700; color: var(--text-main); font-size: 1.05rem;">
              Informes de Seguimento Mensual
            </span>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Achegados coa certificación periódica conforme ao prego e directrices institucionais.
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${canCreateInforme ? `
              <button class="btn btn-primary" id="btn-create-informe">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Novo Informe Mensual
              </button>
            ` : ''}
          </div>
        </div>

        ${informes.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-3.5z"></path></svg>
            </div>
            <div class="empty-title">Non hai informes mensuais nesta obra</div>
            <div class="empty-desc">Xere o primeiro informe mensual de seguimento para enviar xunto coa certificación.</div>
            ${canCreateInforme ? `
              <button class="btn btn-primary" id="btn-empty-create-informe">Crear Primeiro Informe Mensual</button>
            ` : ''}
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 130px;">Nº Informe</th>
                  <th style="width: 160px;">Período / Mes</th>
                  <th style="width: 150px;">Avance Executado</th>
                  <th style="width: 130px;">Estado Xeral</th>
                  <th style="width: 160px;">Última Edición</th>
                  <th style="width: 105px;">Data Emisión</th>
                  <th class="col-actions">Accións</th>
                </tr>
              </thead>
              <tbody>
                ${informes.map(inf => {
                  const est = inf.resumoExecutivo?.estadoXeral || 'en_prazo';
                  let statusBadge = `<span class="badge badge-success"><span class="status-dot status-dot-green"></span> En prazo</span>`;
                  if (est === 'con_desviacions') {
                    statusBadge = `<span class="badge badge-warning"><span class="status-dot status-dot-yellow"></span> Con desviacións</span>`;
                  } else if (est === 'comprometida') {
                    statusBadge = `<span class="badge badge-danger"><span class="status-dot status-dot-red"></span> Comprometida</span>`;
                  }

                  const prev = inf.resumoExecutivo?.avancePrevisto || 0;
                  const exec = inf.resumoExecutivo?.avanceExecutado || 0;

                  return `
                    <tr>
                      <td>
                        <span style="font-family: var(--font-heading); font-weight: 800; color: var(--primary); font-size: 1.05rem;">
                          Informe nº ${inf.numero ?? '-'}
                        </span>
                        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">
                          Informe Mensual
                        </div>
                      </td>

                      <td>
                        <span style="font-weight: 600; color: var(--text-main); font-size: 0.92rem;">
                          ${inf.datosXerais?.mesInformado || 'Período non indicado'}
                        </span>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                          ${inf.datosXerais?.dataInforme ? formatDate(inf.datosXerais.dataInforme) : ''}
                        </div>
                      </td>

                      <td>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                          <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${exec}%</span>
                          <span style="font-size: 0.75rem; color: var(--text-muted);">Previsto: ${prev}%</span>
                        </div>
                        <div class="progress-bar-container">
                          <div class="progress-bar-fill" style="width: ${Math.min(100, Math.max(0, exec))}%;"></div>
                        </div>
                      </td>

                      <td>${statusBadge}</td>

                      <td>
                        ${renderUserModifierHtml(inf.modificadoPor || inf.creadoPor || 'Rosa Vilas Romalde', inf.fechaModificacion || inf.fechaCreacion || inf.datosXerais?.dataInforme)}
                      </td>

                      <td style="font-size: 0.85rem; color: var(--text-secondary);">
                        ${inf.datosXerais?.dataInforme || '-'}
                      </td>

                      <td class="col-actions">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem;">
                          <button class="btn btn-secondary btn-sm btn-print-informe" data-id="${inf.id}" title="Ver documento oficial para imprimir ou exportar a PDF">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            <span>Ver / PDF</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-export-informe-docx" data-id="${inf.id}" title="Descargar documento en formato Word (.docx)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            <span>DOCX</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-export-informe-pdf" data-id="${inf.id}" title="Descargar directamente o PDF Oficial con Anexos">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            <span>PDF</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-edit-informe" data-id="${inf.id}" title="Editar informe mensual">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Editar</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-duplicate-informe" data-id="${inf.id}" title="Copiar e crear novo informe a partir deste">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Copiar</span>
                          </button>

                          <button class="btn btn-secondary btn-sm btn-delete-informe" data-id="${inf.id}" data-num="Nº ${inf.numero || inf.id}" title="Eliminar informe" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.35);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  /* ----------------- TAB 3: NOTAS DE BITÁCORA ----------------- */
  function renderNotasSection({ obra, notas, canCreateNota }) {
    let filteredNotas = notas;
    if (notasCategoryFilter !== 'todas') {
      filteredNotas = notas.filter(n => n.categoria === notasCategoryFilter);
    }

    return `
      <div>
        <div class="dashboard-toolbar" style="margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Filtrar:</span>
            <button class="btn ${notasCategoryFilter === 'todas' ? 'btn-primary' : 'btn-secondary'} btn-sm btn-filter-nota" data-cat="todas">Todas (${notas.length})</button>
            <button class="btn ${notasCategoryFilter === 'llamada' ? 'btn-primary' : 'btn-secondary'} btn-sm btn-filter-nota" data-cat="llamada">Chamadas</button>
            <button class="btn ${notasCategoryFilter === 'incidencia' ? 'btn-primary' : 'btn-secondary'} btn-sm btn-filter-nota" data-cat="incidencia">Incidencias</button>
            <button class="btn ${notasCategoryFilter === 'recordatorio' ? 'btn-primary' : 'btn-secondary'} btn-sm btn-filter-nota" data-cat="recordatorio">Recordatorios</button>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <!-- Selector de Vista: Filas vs Tarxetas -->
            <div style="display: inline-flex; align-items: center; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px; padding: 2px;">
              <button class="btn ${notasViewMode === 'rows' ? 'btn-primary' : 'btn-ghost'} btn-sm btn-toggle-notas-view" data-mode="rows" title="Ver en filas" style="padding: 4px 10px; font-size: 0.78rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                <span>Filas</span>
              </button>
              <button class="btn ${notasViewMode === 'cards' ? 'btn-primary' : 'btn-ghost'} btn-sm btn-toggle-notas-view" data-mode="cards" title="Ver en tarxetas" style="padding: 4px 10px; font-size: 0.78rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span>Tarxetas</span>
              </button>
            </div>

            ${canCreateNota ? `
              <button class="btn btn-primary" id="btn-create-nota">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nova Nota de Obra
              </button>
            ` : ''}
          </div>
        </div>

        ${filteredNotas.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path></svg>
            </div>
            <div class="empty-title">Non hai notas de bitácora nesta sección</div>
            <div class="empty-desc">Rexistre chamadas telefónicas, incidencias inmediatas ou avisos con este caderno.</div>
            ${canCreateNota ? `<button class="btn btn-primary" id="btn-empty-create-nota">Crear Nota</button>` : ''}
          </div>
        ` : notasViewMode === 'rows' ? `
          <!-- Vista en Filas (Táboa) -->
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 105px;">Data</th>
                  <th style="width: 140px;">Categoría</th>
                  <th style="width: 100px;">Urxencia</th>
                  <th>Título e Contido</th>
                  <th style="width: 130px;">Autor</th>
                  <th style="width: 160px;">Última Edición</th>
                  <th class="col-actions" style="width: 250px; text-align: right;">Accións</th>
                </tr>
              </thead>
              <tbody>
                ${filteredNotas.map(nota => {
                  let urgBadge = `<span class="badge badge-neutral">Baixa</span>`;
                  if (nota.urgencia === 'media') urgBadge = `<span class="badge badge-warning">Media</span>`;
                  if (nota.urgencia === 'alta') urgBadge = `<span class="badge badge-danger">Urxente</span>`;

                  let catName = 'Nota';
                  if (nota.categoria === 'llamada') catName = 'Chamada Telefónica';
                  if (nota.categoria === 'incidencia') catName = 'Incidencia';
                  if (nota.categoria === 'recordatorio') catName = 'Recordatorio';
                  if (nota.categoria === 'orden_direccion') catName = 'Orde Dirección';

                  return `
                    <tr>
                      <td style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">
                        ${formatDate(nota.fecha)}
                      </td>
                      <td>
                        <span class="badge badge-info" style="font-size: 0.72rem;">${catName}</span>
                      </td>
                      <td>
                        ${urgBadge}
                      </td>
                      <td>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem; margin-bottom: 2px;">
                          ${escapeHtml(nota.titulo)}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                          ${escapeHtml(nota.contenido)}
                        </div>
                      </td>
                      <td style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);">
                        ${escapeHtml(nota.autor || 'DO')}
                      </td>
                      <td>
                        ${renderUserModifierHtml(nota.modificadoPor || nota.autor, nota.fechaModificacion || nota.fecha)}
                      </td>
                      <td class="col-actions">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem;">
                          <button class="btn btn-secondary btn-sm btn-print-nota" data-id="${nota.id}" title="Imprimir nota en formato oficial">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            <span>Imprimir</span>
                          </button>
                          <button class="btn btn-secondary btn-sm btn-edit-nota" data-id="${nota.id}" title="Editar nota">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Editar</span>
                          </button>
                          <button class="btn btn-secondary btn-sm btn-duplicate-nota" data-id="${nota.id}" title="Copiar nota">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Copiar</span>
                          </button>
                          <button class="btn btn-secondary btn-sm btn-delete-nota" data-id="${nota.id}" title="Eliminar nota" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.35);">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <!-- Vista en Tarxetas -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
            ${filteredNotas.map(nota => {
              let urgBadge = `<span class="badge badge-neutral">Baixa</span>`;
              if (nota.urgencia === 'media') urgBadge = `<span class="badge badge-warning">Media</span>`;
              if (nota.urgencia === 'alta') urgBadge = `<span class="badge badge-danger">Urxente</span>`;

              let catName = 'Nota';
              if (nota.categoria === 'llamada') catName = 'Chamada Telefónica';
              if (nota.categoria === 'incidencia') catName = 'Incidencia';
              if (nota.categoria === 'recordatorio') catName = 'Recordatorio';
              if (nota.categoria === 'orden_direccion') catName = 'Orde Dirección';

              return `
                <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                  <div class="card-header" style="padding: 1rem 1.25rem;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem;">
                        <span class="badge badge-info" style="font-size: 0.72rem;">${catName}</span>
                        ${urgBadge}
                      </div>
                      <div class="card-title" style="font-size: 0.95rem; margin-top: 0.2rem;">${escapeHtml(nota.titulo)}</div>
                    </div>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">${formatDate(nota.fecha)}</span>
                  </div>

                  <div class="card-body" style="padding: 1rem 1.25rem; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
                    ${escapeHtml(nota.contenido)}
                  </div>

                  <div class="card-footer" style="padding: 0.75rem 1.25rem; justify-content: space-between; align-items: flex-end; gap: 0.5rem;">
                    <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem; min-width: 0;">
                      <div>Autor: <strong style="color: var(--text-main);">${escapeHtml(nota.autor || 'DO')}</strong></div>
                      <div style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem;">
                        <span style="color: var(--text-muted); font-size: 0.71rem;">Modificado:</span>
                        ${renderUserModifierHtml(nota.modificadoPor || nota.autor, nota.fechaModificacion || nota.fecha)}
                      </div>
                    </div>

                    <div style="display: flex; gap: 0.35rem; flex-shrink: 0;">
                      <button class="btn btn-ghost btn-sm btn-print-nota" data-id="${nota.id}" title="Imprimir nota">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-duplicate-nota" data-id="${nota.id}" title="Copiar nota">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-edit-nota" data-id="${nota.id}" title="Editar nota">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-delete-nota" data-id="${nota.id}" style="color: var(--color-danger);" title="Eliminar nota">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  /* ----------------- TAB 4: FICHA DEL EXPEDIENTE ----------------- */
  function renderFichaSection({ obra }) {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        
        <div class="card">
          <div class="card-header">
            <div class="card-title">Datos Administrativos y Económicos</div>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Nº de Expediente</div>
              <div style="font-weight: 700; color: var(--primary); font-size: 1.05rem;">${obra.expediente || 'AVS 03007 25/05'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Título Oficial</div>
              <div style="color: var(--text-main); font-weight: 600;">${obra.titulo}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Situación / Concello</div>
              <div style="color: var(--text-secondary);">${obra.situacion || 'Castillo de San Felipe, 15591. Concello de Ferrol'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Entidad Promotora</div>
              <div style="color: var(--text-secondary);">${obra.promotor || 'Concello de Ferrol / MITECO'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Financiación / Marco</div>
              <div style="color: var(--text-secondary);">${obra.financiacion || 'Plan de Recuperación, Transformación y Resiliencia – Next Generation EU'}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Presupuesto Adjudicación</div>
                <div style="color: var(--color-success); font-weight: 700;">${formatCurrency(obra.presupuestoAdjudicacion || obra.presupuesto || '894.520,00 €')}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Plazo Contratado</div>
                <div style="color: var(--text-main); font-weight: 600;">${obra.plazoMeses || 12} meses</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
            <div class="card-title">Agentes Intervinientes y Equipo Técnico</div>
            <span class="badge badge-primary">${(obra.agentes || []).length} axentes asignados</span>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Empresa Contratista Principal</div>
              <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${escapeHtml(obra.contratista || 'Cabero Edificaciones, S.A.')}</div>
              ${(!obra.agentes || obra.agentes.length === 0) && obra.jefeObra ? `
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.1rem;">Jefe de Obra: ${escapeHtml(obra.jefeObra)}</div>
              ` : ''}
            </div>

            ${obra.agentes && obra.agentes.length > 0 ? `
              <div style="border-top: 1px solid var(--border-light); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.65rem;">
                <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 0.1rem;">
                  Equipo Técnico Asignado dende a Base de Datos
                </div>
                ${obra.agentes.map(ag => `
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; background: var(--bg-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
                    <div>
                      <div style="font-weight: 700; color: var(--text-main); font-size: 0.88rem;">${escapeHtml(ag.nombre)}</div>
                      <div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(ag.cargo || '')} ${ag.entidad ? '• ' + escapeHtml(ag.entidad) : ''}</div>
                      ${ag.telefono || ag.email ? `
                        <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem;">
                          ${ag.telefono ? `<span>📞 ${escapeHtml(ag.telefono)}</span>` : ''}
                          ${ag.email ? `<span style="margin-left: 0.35rem;">✉️ ${escapeHtml(ag.email)}</span>` : ''}
                        </div>
                      ` : ''}
                    </div>
                    <span class="badge badge-info" style="font-size: 0.72rem; white-space: nowrap;">
                      ${escapeHtml(getRolLabel(ag.rol))}
                    </span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="border-top: 1px solid var(--border-light); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.65rem;">
                <div>
                  <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Dirección Facultativa (DO)</div>
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(obra.direccionObra || 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro')}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Dirección de Ejecución Material (DEM)</div>
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(obra.direccionEjecucion || 'Ana Gallego Núñez')}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Coordinación de Seguridad y Salud (CSS)</div>
                  <div style="color: var(--text-secondary);">${escapeHtml(obra.coordinadorCSS || 'Juan Carlos Bello Criado')}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Supervisión Municipal</div>
                  <div style="color: var(--text-secondary);">${escapeHtml(obra.arquitectaMunicipal || 'María José González Novo')}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Arqueología y Patrimonio</div>
                  <div style="color: var(--text-secondary);">${escapeHtml(obra.arqueologo || 'Joaquín Ferrer Cruz')}</div>
                </div>
              </div>
            `}
          </div>
          <div class="card-footer">
            <button class="btn btn-secondary btn-sm" id="btn-ficha-edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Editar Ficha e Agentes
            </button>
          </div>
        </div>

      </div>
    `;
  }

  function wireEvents() {
    // Back to Obras selector
    const backBtn = container.querySelector('#btn-back-obras');
    if (backBtn) {
      backBtn.onclick = () => router.navigate('dashboard');
    }

    // Edit Expediente buttons
    const editExpHeader = container.querySelector('#btn-edit-expediente-header');
    if (editExpHeader) {
      editExpHeader.onclick = () => {
        openExpedienteEditorModal({
          obraId: obra.id,
          onSaved: () => render(),
          onDeleted: () => router.navigate('dashboard')
        });
      };
    }

    const editFicha = container.querySelector('#btn-ficha-edit');
    if (editFicha) {
      editFicha.onclick = () => {
        openExpedienteEditorModal({
          obraId: obra.id,
          onSaved: () => render(),
          onDeleted: () => router.navigate('dashboard')
        });
      };
    }

    // Tab buttons
    container.querySelectorAll('.expediente-nav-tabs .tab-btn').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        router.navigate('expediente', { id: obra.id, tab });
      };
    });

    // --- Wire Tab 1 (Actas) ---
    const searchActas = container.querySelector('#search-actas-input');
    if (searchActas) {
      searchActas.oninput = (e) => {
        actasSearchQuery = e.target.value;
        render();
        const nextInput = container.querySelector('#search-actas-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(actasSearchQuery.length, actasSearchQuery.length);
        }
      };
    }

    const clearSearch = container.querySelector('#clear-actas-search');
    if (clearSearch) {
      clearSearch.onclick = () => {
        actasSearchQuery = '';
        render();
      };
    }

    const createActaBtn = container.querySelector('#btn-create-acta');
    if (createActaBtn) {
      createActaBtn.onclick = () => router.navigate('acta-editor', { obraId: obra.id });
    }

    const emptyCreateActa = container.querySelector('#btn-empty-create-acta');
    if (emptyCreateActa) {
      emptyCreateActa.onclick = () => router.navigate('acta-editor', { obraId: obra.id });
    }

    // Toggle expandable actas
    container.querySelectorAll('.btn-toggle-acta-expand, .acta-col-toggle').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const id = String(el.dataset.id);
        if (expandedActas.has(id)) {
          expandedActas.delete(id);
        } else {
          expandedActas.add(id);
        }
        render();
      };
    });

    container.querySelectorAll('.btn-print-acta').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        router.navigate('acta-print', { id: btn.dataset.id });
      };
    });

    container.querySelectorAll('.btn-export-acta-docx').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const acta = db.getActaById(id);
        if (!acta) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<span>...</span>`;
          showToast('Xerando documento Word (.docx)...', 'info');
          const { exportActaToDocx } = await import('../exportDocx.js');
          const fname = await exportActaToDocx(acta);
          showToast(`Documento ${fname} descargado con éxito`, 'success');
        } catch (err) {
          console.error('Erro ao exportar a Word:', err);
          showToast('Erro ao exportar o documento a Word', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      };
    });

    container.querySelectorAll('.btn-export-acta-pdf').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const acta = db.getActaById(id);
        if (!acta) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<span>...</span>`;
          showToast('Xerando documento PDF oficial desde o modelo Word...', 'info');
          const { exportActaToPdf } = await import('../exportDocx.js');
          const fname = await exportActaToPdf(acta);
          showToast(`Documento ${fname} descargado con éxito`, 'success');
        } catch (err) {
          console.error('Erro ao exportar a PDF:', err);
          showToast(err.message || 'Erro ao exportar o documento a PDF', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      };
    });

    container.querySelectorAll('.btn-edit-acta').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        router.navigate('acta-editor', { id: btn.dataset.id, obraId: obra.id });
      };
    });

    container.querySelectorAll('.btn-delete-acta').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const num = btn.dataset.num;
        modal.confirmDelete({
          title: 'Eliminar Acta de Obra',
          message: `¿Está seguro de que desea eliminar definitivamente el Acta nº ${num}?`,
          itemName: `Acta de Obra nº ${num}`,
          confirmText: 'Sí, Eliminar Acta',
          onConfirm: () => {
            db.deleteActa(id);
            showToast(`Acta nº ${num} eliminada correctamente`, 'info');
            render();
          }
        });
      };
    });

    container.querySelectorAll('.btn-duplicate-acta').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const src = db.getActaById(id);
        if (!src) return;

        const allActas = db.getActas(obra.id);
        const maxNum = allActas.reduce((m, a) => Math.max(m, parseInt(a.numero, 10) || 0), 0);
        const nextNum = maxNum + 1;

        modal.confirmSave({
          title: 'Duplicar Acta de Obra',
          message: `¿Desexa crear a Acta nº ${nextNum} copiando o contido, apartados e asistentes da Acta nº ${src.numero}?`,
          onConfirm: () => {
            const newActa = {
              ...JSON.parse(JSON.stringify(src)),
              id: `acta-${Date.now()}`,
              obraId: obra.id,
              numero: nextNum,
              fecha: new Date().toISOString().split('T')[0],
              estado: 'borrador',
              firmas: [],
              asistentes: (src.asistentes || []).map(a => ({ ...a, firmo: false, firmaBase64: null }))
            };
            db.saveActa(newActa);
            showToast(`Acta nº ${nextNum} creada con éxito`, 'success');
            router.navigate('acta-editor', { id: newActa.id, obraId: obra.id });
          }
        });
      };
    });

    // --- Wire Tab 2 (Informes) ---
    const createInfBtn = container.querySelector('#btn-create-informe');
    if (createInfBtn) {
      createInfBtn.onclick = () => router.navigate('informe-editor', { obraId: obra.id });
    }

    const emptyCreateInf = container.querySelector('#btn-empty-create-informe');
    if (emptyCreateInf) {
      emptyCreateInf.onclick = () => router.navigate('informe-editor', { obraId: obra.id });
    }

    container.querySelectorAll('.btn-print-informe').forEach(btn => {
      btn.onclick = () => router.navigate('informe-print', { id: btn.dataset.id });
    });

    container.querySelectorAll('.btn-export-informe-docx').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const inf = db.getInformeById(id);
        if (!inf) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<span>...</span>`;
          showToast('Xerando documento Word (.docx)...', 'info');
          const { exportInformeToDocx } = await import('../exportDocx.js');
          const fname = await exportInformeToDocx(inf);
          showToast(`Documento ${fname} descargado con éxito`, 'success');
        } catch (err) {
          console.error('Erro ao exportar a Word:', err);
          showToast('Erro ao exportar o documento a Word', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      };
    });

    container.querySelectorAll('.btn-export-informe-pdf').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const inf = db.getInformeById(id);
        if (!inf) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<span>...</span>`;
          showToast('Xerando documento PDF Oficial con anexos...', 'info');
          const { exportInformeCompletoPdf } = await import('../exportDocx.js');
          const fname = await exportInformeCompletoPdf(inf);
          showToast(`Documento ${fname} descargado con éxito`, 'success');
        } catch (err) {
          console.error('Erro ao exportar a PDF:', err);
          showToast(err.message || 'Erro ao exportar o documento a PDF', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      };
    });

    container.querySelectorAll('.btn-edit-informe').forEach(btn => {
      btn.onclick = () => router.navigate('informe-editor', { id: btn.dataset.id, obraId: obra.id });
    });

    container.querySelectorAll('.btn-delete-informe').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const num = btn.dataset.num;
        modal.confirmDelete({
          title: 'Eliminar Informe Mensual',
          message: `¿Está seguro de que desea eliminar el informe "${num}"?`,
          itemName: `Informe Mensual ${num}`,
          confirmText: 'Sí, Eliminar Informe',
          onConfirm: () => {
            db.deleteInforme(id);
            showToast(`Informe eliminado correctamente`, 'info');
            render();
          }
        });
      };
    });

    container.querySelectorAll('.btn-duplicate-informe').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const src = db.getInformeById(id);
        if (!src) return;

        const allInfs = db.getInformes(obra.id);
        const maxNum = allInfs.reduce((m, i) => Math.max(m, parseInt(i.numero, 10) || 0), 0);
        const nextNum = maxNum + 1;

        modal.confirmSave({
          title: 'Duplicar Informe Mensual',
          message: `¿Desexa crear un novo Informe Mensual (Nº ${nextNum}) copiando a estrutura e táboas do Informe nº ${src.numero || id}?`,
          onConfirm: () => {
            const newInf = JSON.parse(JSON.stringify(src));
            newInf.id = `inf-${Date.now()}`;
            newInf.obraId = obra.id;
            newInf.numero = nextNum;
            if (newInf.datosXerais) {
              newInf.datosXerais.numeroInforme = nextNum;
              newInf.datosXerais.dataInforme = new Date().toISOString().split('T')[0];
            }
            newInf.estado = 'borrador';
            newInf.firmas = [];
            db.saveInforme(newInf);
            showToast(`Informe nº ${nextNum} creado con éxito`, 'success');
            router.navigate('informe-editor', { id: newInf.id, obraId: obra.id });
          }
        });
      };
    });

    // --- Wire Tab: Reunións ---
    const searchReuniones = container.querySelector('#reuniones-search-input');
    if (searchReuniones) {
      searchReuniones.oninput = (e) => {
        reunionesSearchQuery = e.target.value;
        render();
        const nextInput = container.querySelector('#reuniones-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(reunionesSearchQuery.length, reunionesSearchQuery.length);
        }
      };
    }

    const clearReunionesSearch = container.querySelector('#btn-clear-reuniones-search');
    if (clearReunionesSearch) {
      clearReunionesSearch.onclick = () => {
        reunionesSearchQuery = '';
        render();
      };
    }

    const createReunionBtn = container.querySelector('#btn-create-reunion');
    if (createReunionBtn) {
      createReunionBtn.onclick = () => router.navigate('reunion-editor', { obraId: obra.id, isReunion: true });
    }

    const emptyCreateReunion = container.querySelector('#btn-empty-create-reunion');
    if (emptyCreateReunion) {
      emptyCreateReunion.onclick = () => router.navigate('reunion-editor', { obraId: obra.id, isReunion: true });
    }

    // Toggle expandable reuniones
    container.querySelectorAll('.btn-toggle-reunion-expand, .reunion-col-toggle').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const id = String(el.dataset.id);
        if (expandedReuniones.has(id)) {
          expandedReuniones.delete(id);
        } else {
          expandedReuniones.add(id);
        }
        render();
      };
    });

    container.querySelectorAll('.btn-print-reunion').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        router.navigate('reunion-print', { id: btn.dataset.id, obraId: obra.id, isReunion: true });
      };
    });

    container.querySelectorAll('.btn-export-reunion-docx').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const reunion = db.getReunionById(id);
        if (!reunion) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<span>...</span>`;
          showToast('Xerando documento Word (.docx) de reunión...', 'info');
          const { exportActaToDocx } = await import('../exportDocx.js');
          const fname = await exportActaToDocx(reunion);
          showToast(`Documento ${fname} descargado con éxito`, 'success');
        } catch (err) {
          console.error('Erro ao exportar a Word:', err);
          showToast('Erro ao exportar o documento a Word', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      };
    });

    container.querySelectorAll('.btn-export-reunion-pdf').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const reunion = db.getReunionById(id);
        if (!reunion) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<span>...</span>`;
          showToast('Xerando documento PDF Oficial de reunión...', 'info');
          const { exportActaToPdf } = await import('../exportDocx.js');
          const fname = await exportActaToPdf(reunion);
          showToast(`Documento ${fname} descargado con éxito`, 'success');
        } catch (err) {
          console.error('Erro ao exportar a PDF:', err);
          showToast(err.message || 'Erro ao exportar o documento a PDF', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      };
    });

    container.querySelectorAll('.btn-edit-reunion').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        router.navigate('reunion-editor', { id: btn.dataset.id, obraId: obra.id, isReunion: true });
      };
    });

    container.querySelectorAll('.btn-delete-reunion').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const num = btn.dataset.num;
        modal.confirmDelete({
          title: 'Eliminar Reunión de Obra',
          message: `¿Está seguro de que desea eliminar definitivamente la Reunión nº ${num}?`,
          itemName: `Reunión de Obra nº ${num}`,
          confirmText: 'Sí, Eliminar Reunión',
          onConfirm: () => {
            db.deleteReunion(id);
            showToast(`Reunión nº ${num} eliminada correctamente`, 'info');
            render();
          }
        });
      };
    });

    container.querySelectorAll('.btn-duplicate-reunion').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const src = db.getReunionById(id);
        if (!src) return;

        const allReus = db.getReuniones(obra.id);
        const maxNum = allReus.reduce((m, r) => Math.max(m, parseInt(r.numero, 10) || 0), 0);
        const nextNum = maxNum + 1;

        modal.confirmSave({
          title: 'Duplicar Reunión de Obra',
          message: `¿Desexa crear a Reunión nº ${nextNum} copiando o contido, apartados e asistentes da Reunión nº ${src.numero}?`,
          onConfirm: () => {
            const newReunion = {
              ...JSON.parse(JSON.stringify(src)),
              id: `reu-${Date.now()}`,
              obraId: obra.id,
              numero: nextNum,
              fecha: new Date().toISOString().split('T')[0],
              estado: 'borrador',
              firmas: [],
              asistentes: (src.asistentes || []).map(a => ({ ...a, firmo: false, firmaBase64: null }))
            };
            db.saveReunion(newReunion);
            showToast(`Reunión nº ${nextNum} creada con éxito`, 'success');
            router.navigate('reunion-editor', { id: newReunion.id, obraId: obra.id, isReunion: true });
          }
        });
      };
    });

    // --- Wire Tab 3 (Notas) ---
    container.querySelectorAll('.btn-filter-nota').forEach(btn => {
      btn.onclick = () => {
        notasCategoryFilter = btn.dataset.cat;
        render();
      };
    });

    container.querySelectorAll('.btn-toggle-notas-view').forEach(btn => {
      btn.onclick = () => {
        notasViewMode = btn.dataset.mode;
        render();
      };
    });

    container.querySelectorAll('.btn-print-nota').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const nota = db.getNotaById(btn.dataset.id);
        if (nota) {
          printNota(nota, obra);
        }
      };
    });

    const openNotaModal = (existing = null) => {
      const isEdit = Boolean(existing);
      const user = auth.getUser();
      const actas = db.getActas(obra.id);

      const contentHtml = `
        <form id="nota-form">
          <div class="form-group">
            <label class="form-label required">Título do Aviso / Incidencia</label>
            <input type="text" id="modal-nota-titulo" class="form-control" value="${escapeHtml(existing?.titulo || '')}" placeholder="Ex: Aviso urxente retirada fibrocemento..." required />
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label required">Data</label>
              <input type="date" id="modal-nota-fecha" class="form-control" value="${existing?.fecha || new Date().toISOString().split('T')[0]}" required />
            </div>
            <div class="form-group">
              <label class="form-label required">Categoría</label>
              <select id="modal-nota-cat" class="form-control">
                <option value="llamada" ${existing?.categoria === 'llamada' ? 'selected' : ''}>Chamada Telefónica</option>
                <option value="incidencia" ${existing?.categoria === 'incidencia' ? 'selected' : ''}>Incidencia / Seguridade</option>
                <option value="orden_direccion" ${existing?.categoria === 'orden_direccion' ? 'selected' : ''}>Orde de Dirección</option>
                <option value="recordatorio" ${existing?.categoria === 'recordatorio' ? 'selected' : ''}>Recordatorio</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Urxencia</label>
              <select id="modal-nota-urg" class="form-control">
                <option value="baja" ${existing?.urgencia === 'baja' ? 'selected' : ''}>Baixa</option>
                <option value="media" ${existing?.urgencia === 'media' || !existing ? 'selected' : ''}>Media</option>
                <option value="alta" ${existing?.urgencia === 'alta' ? 'selected' : ''}>Alta / Urxente</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Contido da Nota</label>
            <textarea id="modal-nota-contenido" class="form-control" rows="4" placeholder="Describa a instrución, observación ou acordo..." required>${escapeHtml(existing?.contenido || '')}</textarea>
          </div>

          <div class="form-grid-2">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Autor</label>
              <input type="text" id="modal-nota-autor" class="form-control" value="${escapeHtml(existing?.autor || user?.name || 'Dirección de Obra')}" />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Vincular a Acta</label>
              <select id="modal-nota-vinculo" class="form-control">
                <option value="">Ningunha acta vinculada</option>
                ${actas.map(a => `
                  <option value="${a.id}" ${existing?.vinculadoA === a.id ? 'selected' : ''}>Acta #${a.numero} (${a.fecha})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </form>
      `;

      const footerHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div>
            ${isEdit ? `
              <button type="button" class="btn btn-secondary" id="modal-nota-print-btn" title="Imprimir esta nota en formato oficial">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Imprimir Nota</span>
              </button>
            ` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn btn-secondary" id="modal-nota-cancel-btn">Cancelar</button>
            <button class="btn btn-primary" id="modal-nota-save-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ${isEdit ? 'Gardar Cambios' : 'Crear Nota'}
            </button>
          </div>
        </div>
      `;

      const modalInstance = modal.open({
        title: isEdit ? 'Editar Nota de Obra' : 'Nova Nota de Obra / Bitácora',
        contentHtml,
        footerHtml
      });

      const printBtn = modalInstance.backdrop.querySelector('#modal-nota-print-btn');
      if (printBtn) {
        printBtn.onclick = () => {
          const currentNota = {
            ...(existing || {}),
            id: existing?.id || 'temp',
            obraId: obra.id,
            titulo: modalInstance.backdrop.querySelector('#modal-nota-titulo')?.value || existing?.titulo || '',
            fecha: modalInstance.backdrop.querySelector('#modal-nota-fecha')?.value || existing?.fecha || '',
            categoria: modalInstance.backdrop.querySelector('#modal-nota-cat')?.value || existing?.categoria || '',
            urgencia: modalInstance.backdrop.querySelector('#modal-nota-urg')?.value || existing?.urgencia || '',
            contenido: modalInstance.backdrop.querySelector('#modal-nota-contenido')?.value || existing?.contenido || '',
            autor: modalInstance.backdrop.querySelector('#modal-nota-autor')?.value || existing?.autor || '',
            modificadoPor: auth.getUser()?.name || existing?.modificadoPor || 'DO',
            fechaModificacion: new Date().toISOString()
          };
          printNota(currentNota, obra);
        };
      }

      modalInstance.backdrop.querySelector('#modal-nota-cancel-btn').onclick = () => modalInstance.close();
      modalInstance.backdrop.querySelector('#modal-nota-save-btn').onclick = () => {
        const form = modalInstance.backdrop.querySelector('#nota-form');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const titulo = modalInstance.backdrop.querySelector('#modal-nota-titulo').value.trim();
        const fecha = modalInstance.backdrop.querySelector('#modal-nota-fecha').value;
        const categoria = modalInstance.backdrop.querySelector('#modal-nota-cat').value;
        const urgencia = modalInstance.backdrop.querySelector('#modal-nota-urg').value;
        const contenido = modalInstance.backdrop.querySelector('#modal-nota-contenido').value.trim();
        const autor = modalInstance.backdrop.querySelector('#modal-nota-autor').value.trim();
        const vinculadoA = modalInstance.backdrop.querySelector('#modal-nota-vinculo').value;

        modal.confirmSave({
          title: isEdit ? 'Confirmar Modificación de Nota' : 'Confirmar Creación de Nota',
          message: `¿Desea gardar esta nota "${titulo}" no caderno de bitácora?`,
          onConfirm: () => {
            modalInstance.close();
            db.saveNota({
              id: existing ? existing.id : `not-${Date.now()}`,
              obraId: obra.id,
              titulo,
              fecha,
              categoria,
              urgencia,
              contenido,
              autor,
              vinculadoA
            });
            showToast('Nota gardada con éxito', 'success');
            render();
          }
        });
      };
    };

    const createNotaBtn = container.querySelector('#btn-create-nota');
    if (createNotaBtn) createNotaBtn.onclick = () => openNotaModal();

    const emptyCreateNota = container.querySelector('#btn-empty-create-nota');
    if (emptyCreateNota) emptyCreateNota.onclick = () => openNotaModal();

    container.querySelectorAll('.btn-edit-nota').forEach(btn => {
      btn.onclick = () => {
        const nota = db.getNotaById(btn.dataset.id);
        if (nota) openNotaModal(nota);
      };
    });

    container.querySelectorAll('.btn-delete-nota').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        modal.confirmDelete({
          title: 'Eliminar Nota',
          message: '¿Está seguro de que desexa eliminar esta nota de bitácora?',
          confirmText: 'Eliminar Nota',
          onConfirm: () => {
            db.deleteNota(id);
            showToast('Nota eliminada', 'info');
            render();
          }
        });
      };
    });

    container.querySelectorAll('.btn-duplicate-nota').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const src = db.getNotaById(id);
        if (!src) return;

        modal.confirmSave({
          title: 'Duplicar Nota',
          message: `¿Desexa duplicar a nota "${src.titulo}"?`,
          onConfirm: () => {
            const newNota = {
              ...JSON.parse(JSON.stringify(src)),
              id: `not-${Date.now()}`,
              obraId: obra.id,
              titulo: `${src.titulo} (Copia)`,
              fecha: new Date().toISOString().split('T')[0]
            };
            db.saveNota(newNota);
            showToast('Nota duplicada con éxito', 'success');
            render();
          }
        });
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
    .replace(/'/g, '&#39;');
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

