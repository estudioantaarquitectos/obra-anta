/* ==========================================================================
   ANTA OBRA - Dashboard View (Actas de Obra)
   Shows all created actas, metrics, search, single & batch deletion with
   strict confirmation dialogs as required.
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';
import { renderUserModifierHtml } from '../utils/avatar.js';

export function renderDashboard(container, router) {
  let actas = db.getActas();
  const informes = db.getInformes();
  const notas = db.getNotas();
  const settings = db.getSettings();

  let selectedIds = new Set();
  let searchQuery = '';

  function getFilteredActas() {
    if (!searchQuery.trim()) return actas;
    const q = searchQuery.toLowerCase().trim();
    return actas.filter(a => {
      const matchNum = String(a.numero).includes(q);
      const matchFecha = String(a.fecha).toLowerCase().includes(q);
      const matchObra = String(a.obra || '').toLowerCase().includes(q);
      const matchAsistentes = (a.asistentes || []).some(asist => 
        (asist.nombre || '').toLowerCase().includes(q) || (asist.cargo || '').toLowerCase().includes(q)
      );
      const matchCuestiones = (a.cuestionesTratadas || []).some(c => 
        (c.subtitulo || '').toLowerCase().includes(q) || (c.puntos || []).some(p => p.toLowerCase().includes(q))
      );
      return matchNum || matchFecha || matchObra || matchAsistentes || matchCuestiones;
    });
  }

  function render() {
    const filtered = getFilteredActas();
    const canCreate = auth.can('actas:create');
    const canEdit = auth.can('actas:edit');
    const canDelete = auth.can('actas:delete');

    // Find last acta date
    const sortedActas = [...actas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const lastActa = sortedActas[0] || null;

    container.innerHTML = `
      <div class="content-wrapper">
        
        <!-- Welcome & Project Title Banner -->
        <div style="margin-bottom: 1.75rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-info" style="font-weight: 700;">EXPTE: ${settings.expediente || 'AVS 03007 25/05'}</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">•</span>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">${settings.situacion || 'Concello de Ferrol'}</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
              Dashboard de Actas de Obra
            </h1>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 800px;">
              ${settings.obraPrincipal || 'Castillo de San Felipe'}
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${canCreate ? `
              <button class="btn btn-primary" id="btn-create-acta">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nueva Acta de Obra
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Metrics Overview Grid -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon-box metric-icon-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Actas de Reunión</div>
              <div class="metric-value">${actas.length}</div>
              <div class="metric-trend">
                <span>Última: ${lastActa ? `Nº ${lastActa.numero} (${lastActa.fecha})` : 'Ninguna'}</span>
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box metric-icon-success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Informes Mensuais</div>
              <div class="metric-value">${informes.length}</div>
              <div class="metric-trend">
                <span>Seguimento mensual de obra</span>
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box metric-icon-warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Notas de Bitácora</div>
              <div class="metric-value">${notas.length}</div>
              <div class="metric-trend">
                <span>Notas rápidas / Incidencias</span>
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box metric-icon-info">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Dirección Facultativa</div>
              <div class="metric-value" style="font-size: 1.15rem; margin-top: 0.35rem; font-weight: 600;">
                DO + DEM + CSS
              </div>
              <div class="metric-trend">
                <span>Cabero Edificaciones S.A.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Toolbar: Search & Actions -->
        <div class="dashboard-toolbar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              id="search-input" 
              class="form-control search-input" 
              placeholder="Buscar por Nº, fecha, asistente o asunto tratado..." 
              value="${searchQuery}"
            />
            ${searchQuery ? `
              <button id="clear-search" class="clear-search-btn" title="Limpiar búsqueda">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            ` : ''}
          </div>

          <div class="filter-actions">
            <button class="btn btn-secondary btn-sm" id="btn-refresh" title="Actualizar lista">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              Actualizar
            </button>
          </div>
        </div>

        <!-- Floating Batch Action Bar (Visible when rows selected) -->
        ${selectedIds.size > 0 ? `
          <div class="batch-action-bar">
            <div class="batch-info">
              <span class="batch-badge">${selectedIds.size}</span>
              <span>${selectedIds.size === 1 ? 'acta seleccionada' : 'actas seleccionadas'}</span>
            </div>
            <div class="batch-buttons">
              <button class="btn btn-ghost btn-sm" id="btn-deselect-all" style="color: #cbd5e1;">
                Deseleccionar
              </button>
              ${canDelete ? `
                <button class="btn btn-danger btn-sm" id="btn-batch-delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Eliminar seleccionadas (${selectedIds.size})
                </button>
              ` : `
                <span style="font-size: 0.78rem; opacity: 0.7;">No tiene permisos para eliminar actas</span>
              `}
            </div>
          </div>
        ` : ''}

        <!-- Table of Actas -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div class="empty-title">No se encontraron Actas de Obra</div>
            <div class="empty-desc">
              ${searchQuery ? `No hay actas que coincidan con la búsqueda "${searchQuery}".` : 'Comience creando la primera acta de obra o visita.'}
            </div>
            ${canCreate ? `
              <button class="btn btn-primary" id="btn-empty-create">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Crear Acta de Obra
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-checkbox">
                    <input 
                      type="checkbox" 
                      id="select-all-checkbox" 
                      ${selectedIds.size === filtered.length && filtered.length > 0 ? 'checked' : ''}
                      title="Seleccionar todas"
                      style="cursor: pointer;"
                    />
                  </th>
                  <th style="width: 100px;">Nº Acta</th>
                  <th style="width: 110px;">Fecha</th>
                  <th>Asuntos Tratados / Obra</th>
                  <th style="width: 150px;">Última Edición</th>
                  <th style="width: 140px;">Asistentes</th>
                  <th style="width: 70px; text-align: center;">Fotos</th>
                  <th style="width: 100px;">Estado</th>
                  <th class="col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(acta => {
                  const isChecked = selectedIds.has(String(acta.id));
                  const fotoCount = (acta.fotos || []).length;
                  const firstTopic = (acta.cuestionesTratadas && acta.cuestionesTratadas[0]) ? acta.cuestionesTratadas[0].subtitulo : '';
                  const totalTopics = (acta.cuestionesTratadas || []).length;

                  return `
                    <tr class="${isChecked ? 'selected' : ''}" data-id="${acta.id}">
                      <td class="col-checkbox">
                        <input 
                          type="checkbox" 
                          class="row-checkbox" 
                          data-id="${acta.id}" 
                          ${isChecked ? 'checked' : ''}
                          style="cursor: pointer;"
                        />
                      </td>

                      <td>
                        <span style="font-family: var(--font-heading); font-weight: 700; color: var(--primary); font-size: 1rem;">
                          Acta #${acta.numero}
                        </span>
                      </td>

                      <td>
                        <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-main);">
                          ${formatDate(acta.fecha)}
                        </span>
                      </td>

                      <td>
                        <div class="acta-title-cell">
                          <span class="acta-name">
                            ${firstTopic ? `${firstTopic} ${totalTopics > 1 ? `<span style="font-size: 0.78rem; font-weight: normal; color: var(--text-muted);">(+${totalTopics - 1} temas más)</span>` : ''}` : `Visita de obra #${acta.numero}`}
                          </span>
                          <span class="acta-sub" title="${acta.obra}">
                            ${acta.obra}
                          </span>
                        </div>
                      </td>

                      <td>
                        ${renderUserModifierHtml(acta.modificadoPor || acta.creadoPor || 'Admin', acta.fechaModificacion || acta.fechaCreacion || acta.fecha)}
                      </td>

                      <td>
                        <div class="attendees-avatars" title="${(acta.asistentes || []).map(a => a.nombre).join(', ')}">
                          ${(acta.asistentes || []).slice(0, 4).map(a => `
                            <span class="avatar-mini" title="${a.nombre} (${a.cargo || ''})">
                              ${getInitials(a.nombre)}
                            </span>
                          `).join('')}
                          ${(acta.asistentes || []).length > 4 ? `
                            <span class="avatar-mini" style="background: var(--primary-light); color: var(--primary);">
                              +${(acta.asistentes || []).length - 4}
                            </span>
                          ` : ''}
                        </div>
                      </td>

                      <td style="text-align: center;">
                        ${fotoCount > 0 ? `
                          <span class="badge badge-neutral" style="font-size: 0.75rem;" title="${fotoCount} fotos adjuntas">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            ${fotoCount}
                          </span>
                        ` : `
                          <span style="color: var(--text-muted); font-size: 0.8rem;">—</span>
                        `}
                      </td>

                      <td>
                        <span class="badge ${acta.estado === 'firmada' ? 'badge-success' : 'badge-warning'}">
                          ${acta.estado === 'firmada' ? 'Firmada' : 'Borrador'}
                        </span>
                      </td>

                      <td class="col-actions">
                        <div class="table-row-actions">
                          <button class="table-action-btn btn-view-print" data-id="${acta.id}" title="Ver e Imprimir Documento Oficial">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>

                          <button class="table-action-btn btn-export-docx-acta" data-id="${acta.id}" title="Descargar Acta en formato Word (.docx)">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          </button>

                          <button class="table-action-btn btn-export-pdf-acta" data-id="${acta.id}" title="Descargar Acta en PDF Oficial (.pdf)">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                          </button>

                          ${canEdit ? `
                            <button class="table-action-btn btn-edit" data-id="${acta.id}" title="Editar Acta">
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                          ` : ''}

                          ${canCreate ? `
                            <button class="table-action-btn btn-clone" data-id="${acta.id}" title="Duplicar para siguiente reunión">
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                          ` : ''}

                          ${canDelete ? `
                            <button class="table-action-btn delete btn-delete" data-id="${acta.id}" title="Eliminar Acta (con confirmación)">
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          ` : ''}
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

    wireEvents();
  }

  function wireEvents() {
    // Search input
    const searchInput = container.querySelector('#search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        searchQuery = e.target.value;
        render();
        const inputNow = container.querySelector('#search-input');
        if (inputNow) {
          inputNow.focus();
          inputNow.setSelectionRange(inputNow.value.length, inputNow.value.length);
        }
      };
    }

    const clearSearch = container.querySelector('#clear-search');
    if (clearSearch) {
      clearSearch.onclick = () => {
        searchQuery = '';
        render();
      };
    }

    const refreshBtn = container.querySelector('#btn-refresh');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        actas = db.getActas();
        render();
        showToast('Lista actualizada', 'info');
      };
    }

    // Create new acta
    const createBtn = container.querySelector('#btn-create-acta');
    if (createBtn) {
      createBtn.onclick = () => router.navigate('acta-editor');
    }
    const emptyCreate = container.querySelector('#btn-empty-create');
    if (emptyCreate) {
      emptyCreate.onclick = () => router.navigate('acta-editor');
    }

    // Select All Checkbox
    const selectAll = container.querySelector('#select-all-checkbox');
    if (selectAll) {
      selectAll.onchange = (e) => {
        const filtered = getFilteredActas();
        if (e.target.checked) {
          filtered.forEach(a => selectedIds.add(String(a.id)));
        } else {
          selectedIds.clear();
        }
        render();
      };
    }

    // Row Checkboxes
    container.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.onchange = (e) => {
        const id = String(e.target.dataset.id);
        if (e.target.checked) {
          selectedIds.add(id);
        } else {
          selectedIds.delete(id);
        }
        render();
      };
    });

    // Deselect All
    const deselectBtn = container.querySelector('#btn-deselect-all');
    if (deselectBtn) {
      deselectBtn.onclick = () => {
        selectedIds.clear();
        render();
      };
    }

    // Batch Delete (strictly with confirmDelete!)
    const batchDeleteBtn = container.querySelector('#btn-batch-delete');
    if (batchDeleteBtn) {
      batchDeleteBtn.onclick = () => {
        modal.confirmDelete({
          title: 'Confirmar Eliminación Múltiple',
          message: '¿Está seguro de que desea eliminar las actas seleccionadas?',
          count: selectedIds.size,
          onConfirm: () => {
            const count = selectedIds.size;
            db.deleteMultipleActas(Array.from(selectedIds));
            selectedIds.clear();
            actas = db.getActas();
            render();
            showToast(`Se han eliminado ${count} actas correctamente`, 'success');
          }
        });
      };
    }

    // Single Row Actions: View/Print
    container.querySelectorAll('.btn-view-print').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        router.navigate('acta-print', { id });
      };
    });

    // Quick Export to DOCX
    container.querySelectorAll('.btn-export-docx-acta').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const acta = db.getActaById(id);
        if (!acta) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
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

    // Quick Export to PDF Oficial
    container.querySelectorAll('.btn-export-pdf-acta').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const acta = db.getActaById(id);
        if (!acta) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
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

    // Edit
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        router.navigate('acta-editor', { id });
      };
    });

    // Clone / Duplicate
    container.querySelectorAll('.btn-clone').forEach(btn => {
      btn.onclick = () => {
        const sourceId = btn.dataset.id;
        const source = db.getActaById(sourceId);
        if (!source) return;

        const nextNum = db.getNextActaNumber();
        const cloned = {
          ...JSON.parse(JSON.stringify(source)),
          id: `acta-${Date.now()}`,
          numero: nextNum,
          fecha: new Date().toISOString().split('T')[0],
          fotos: [],
          estado: 'borrador',
          fechaCreacion: new Date().toISOString()
        };

        db.saveActa(cloned);
        showToast(`Acta #${nextNum} creada a partir del Acta #${source.numero}`, 'success');
        router.navigate('acta-editor', { id: cloned.id });
      };
    });

    // Single Delete (strictly with confirmDelete!)
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const target = db.getActaById(id);
        if (!target) return;

        modal.confirmDelete({
          title: 'Confirmar Eliminación de Acta',
          message: `¿Desea eliminar de forma permanente el Acta nº ${target.numero}?`,
          itemName: `Acta nº ${target.numero} (${target.fecha})`,
          onConfirm: () => {
            db.deleteActa(id);
            selectedIds.delete(String(id));
            actas = db.getActas();
            render();
            showToast(`Acta nº ${target.numero} eliminada`, 'success');
          }
        });
      };
    });
  }

  // Initial render
  render();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getInitials(name) {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}
