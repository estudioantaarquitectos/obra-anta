/* ==========================================================================
   ANTA OBRA - Main Dashboard View: Selector y Gestión de Obras y Expedientes
   First step in the user flow:
   "En el Dashboard principal primero se escogerá la obra correspondiente...
    Podré editar ese expediente con los datos que figuran en las fuentes."
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';
import { openExpedienteEditorModal } from './expedienteEditorModal.js';
import { formatCurrency } from '../utils/currency.js';

export function renderObrasList(container, router) {
  let obras = db.getObras();
  let searchQuery = '';

  function getFilteredObras() {
    if (!searchQuery.trim()) return obras;
    const q = searchQuery.toLowerCase().trim();
    return obras.filter(o => 
      (o.expediente || '').toLowerCase().includes(q) ||
      (o.titulo || '').toLowerCase().includes(q) ||
      (o.situacion || '').toLowerCase().includes(q) ||
      (o.contratista || '').toLowerCase().includes(q) ||
      (o.promotor || '').toLowerCase().includes(q) ||
      (o.direccionObra || '').toLowerCase().includes(q)
    );
  }

  function render() {
    obras = db.getObras();
    const filtered = getFilteredObras();
    const allActas = db.getActas();
    const allInformes = db.getInformes();
    const allNotas = db.getNotas();

    container.innerHTML = `
      <div class="content-wrapper">
        
        <!-- Welcome Hero & Project Selector Header -->
        <div style="margin-bottom: 2rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1.25rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span class="badge badge-info" style="font-weight: 700;">PANEL GENERAL</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">•</span>
              <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 500;">Control y Seguimiento de Obras</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
              Expedientes de Obra
            </h1>
            <p style="font-size: 0.92rem; color: var(--text-muted); margin-top: 0.25rem; max-width: 780px; line-height: 1.5;">
              Seleccione a obra na que desexa intervir para xestionar as súas <strong>Actas de reunión</strong>, 
              <strong>Informes Mensuais</strong> e <strong>Notas de bitácora</strong>, ou edite os datos oficiais do seu expediente.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button class="btn btn-primary" id="btn-create-obra">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Novo Expediente de Obra
            </button>
          </div>
        </div>

        <!-- Global Summary Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon-box metric-icon-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Expedientes Activos</div>
              <div class="metric-value">${obras.length}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box metric-icon-info">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Actas de Obra</div>
              <div class="metric-value">${allActas.length}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box metric-icon-success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-3.5z"></path></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Informes Mensuais</div>
              <div class="metric-value">${allInformes.length}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box metric-icon-warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </div>
            <div class="metric-data">
              <div class="metric-label">Notas de Bitácora</div>
              <div class="metric-value">${allNotas.length}</div>
            </div>
          </div>
        </div>

        <!-- Search Toolbar -->
        <div class="dashboard-toolbar">
          <div class="search-box-wrapper" style="max-width: 480px;">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              id="search-obras-input" 
              class="form-control search-input" 
              placeholder="Buscar por expediente, título, situación ou contrata..." 
              value="${searchQuery}"
            />
            ${searchQuery ? `
              <button id="clear-search" class="clear-search-btn" title="Limpar busca">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            ` : ''}
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">
            Amosando <strong>${filtered.length}</strong> de <strong>${obras.length}</strong> expedientes
          </div>
        </div>

        <!-- Obras List in Rows (Table format) -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            </div>
            <div class="empty-title">Non se atoparon obras</div>
            <div class="empty-desc">Non hai expedientes que coincidan coa busca "${searchQuery}".</div>
            <button class="btn btn-secondary" id="btn-reset-search">Limpar busca</button>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 135px;">Expediente</th>
                  <th style="min-width: 320px;">Título da Obra e Situación</th>
                  <th style="width: 200px;">Axentes Intervinientes</th>
                  <th style="width: 110px; text-align: center;">Documentos</th>
                  <th style="width: 100px; text-align: center;">Estado</th>
                  <th class="col-actions" style="width: 155px; text-align: right;">Accións</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(obra => {
                  const actasCount = db.getActas(obra.id).length;
                  const informesCount = db.getInformes(obra.id).length;
                  const notasCount = db.getNotas(obra.id).length;
                  
                  let statusBadge = `<span class="badge badge-success" style="font-size: 0.76rem; padding: 0.25rem 0.5rem; white-space: nowrap;"><span class="status-dot status-dot-green"></span> En execución</span>`;
                  if (obra.estado === 'con_desviacions') {
                    statusBadge = `<span class="badge badge-warning" style="font-size: 0.76rem; padding: 0.25rem 0.5rem; white-space: nowrap;"><span class="status-dot status-dot-yellow"></span> Con desviacións</span>`;
                  } else if (obra.estado === 'comprometida') {
                    statusBadge = `<span class="badge badge-danger" style="font-size: 0.76rem; padding: 0.25rem 0.5rem; white-space: nowrap;"><span class="status-dot status-dot-red"></span> Comprometida</span>`;
                  } else if (obra.estado === 'finalizada') {
                    statusBadge = `<span class="badge badge-neutral" style="font-size: 0.76rem; padding: 0.25rem 0.5rem; white-space: nowrap;">Finalizada</span>`;
                  }

                  return `
                    <tr class="obra-table-row">
                      <td style="white-space: nowrap;">
                        <span class="badge badge-info" style="font-weight: 700; font-family: monospace; font-size: 0.8rem; letter-spacing: 0.02em;">
                          ${escapeHtml(obra.expediente || 'AVS 03007 25/05')}
                        </span>
                        <div style="font-size: 0.78rem; color: var(--color-success); font-weight: 700; margin-top: 0.25rem;">
                          ${escapeHtml(formatCurrency(obra.presupuestoAdjudicacion || obra.presupuesto || '894.520,00 €'))}
                        </div>
                      </td>

                      <td>
                        <a href="javascript:void(0)" class="btn-enter-obra" data-id="${obra.id}" style="font-family: var(--font-heading); font-size: 0.98rem; font-weight: 700; color: var(--text-main); text-decoration: none; line-height: 1.35; display: block;">
                          ${escapeHtml(obra.titulo)}
                        </a>
                        <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; color: var(--primary);"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          <span>
                            ${escapeHtml(obra.situacion || 'Castillo de San Felipe, 15591. Concello de Ferrol')}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style="font-size: 0.8rem; margin-bottom: 0.2rem; line-height: 1.3;">
                          <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Contrata:</span>
                          <strong style="color: var(--text-main); margin-left: 0.2rem;">${escapeHtml(obra.contratista || 'Cabero Edificaciones')}</strong>
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.3;" title="${escapeHtml(obra.direccionObra || '')}">
                          <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">DO:</span>
                          <span style="margin-left: 0.2rem;">${escapeHtml(obra.direccionObra || 'Rosa Vilas / Sergio Beceiro')}</span>
                        </div>
                      </td>

                      <td style="text-align: center; vertical-align: middle;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                          <span class="badge badge-neutral" title="Actas Semanais" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; width: 100%; max-width: 96px; justify-content: center; white-space: nowrap;">
                            📝 <strong>${actasCount}</strong> actas
                          </span>
                          <span class="badge badge-neutral" title="Informes Mensuais" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; width: 100%; max-width: 96px; justify-content: center; white-space: nowrap;">
                            📊 <strong>${informesCount}</strong> informes
                          </span>
                          <span class="badge badge-neutral" title="Notas de bitácora" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; width: 100%; max-width: 96px; justify-content: center; white-space: nowrap;">
                            📌 <strong>${notasCount}</strong> notas
                          </span>
                        </div>
                      </td>

                      <td style="text-align: center; vertical-align: middle;">
                        ${statusBadge}
                      </td>

                      <td class="col-actions" style="text-align: right; vertical-align: middle;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem;">
                          <button class="btn btn-secondary btn-sm btn-edit-obra" data-id="${obra.id}" title="Editar expediente">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Editar</span>
                          </button>

                          <button class="btn btn-primary btn-sm btn-enter-obra" data-id="${obra.id}" title="Entrar no expediente">
                            <span>Entrar</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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

    wireEvents();
  }

  function wireEvents() {
    // Search input
    const searchInput = container.querySelector('#search-obras-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        searchQuery = e.target.value;
        render();
        // keep focus
        const nextInput = container.querySelector('#search-obras-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      };
    }

    const clearBtn = container.querySelector('#clear-search');
    if (clearBtn) {
      clearBtn.onclick = () => {
        searchQuery = '';
        render();
      };
    }

    const resetBtn = container.querySelector('#btn-reset-search');
    if (resetBtn) {
      resetBtn.onclick = () => {
        searchQuery = '';
        render();
      };
    }

    // New Obra Button
    const newBtn = container.querySelector('#btn-create-obra');
    if (newBtn) {
      newBtn.onclick = () => {
        openExpedienteEditorModal({
          onSaved: (saved) => {
            db.setActiveObraId(saved.id);
            render();
          }
        });
      };
    }

    // Edit Expediente buttons
    container.querySelectorAll('.btn-edit-obra').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openExpedienteEditorModal({
          obraId: id,
          onSaved: () => render(),
          onDeleted: () => render()
        });
      };
    });

    // Enter Obra buttons: sets active obra and navigates into expediente view
    container.querySelectorAll('.btn-enter-obra').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        db.setActiveObraId(id);
        router.navigate('expediente', { id, tab: 'actas' });
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
