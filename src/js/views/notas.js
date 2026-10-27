/* ==========================================================================
   ANTA OBRA - Notas de Obra / Bitácora View
   Quick site notes, call records, urgency notices, and reminders
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';

export function renderNotas(container, router) {
  let notas = db.getNotas();
  const actas = db.getActas();
  const canCreate = auth.can('notas:create');
  const canEdit = auth.can('notas:edit');
  const canDelete = auth.can('notas:delete');

  function render() {
    container.innerHTML = `
      <div class="content-wrapper">
        
        <!-- Header -->
        <div style="margin-bottom: 1.75rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-warning" style="font-weight: 700;">CUADERNO DE BITÁCORA</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">•</span>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Dirección de Obra</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
              Notas de Obra e Incidencias
            </h1>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 800px;">
              Anotacións rápidas, chamadas telefónicas con Patrimonio, ordes directas de dirección e avisos urxentes.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${canCreate ? `
              <button class="btn btn-primary" id="btn-create-nota">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nova Nota de Obra
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Notes Grid -->
        ${notas.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div class="empty-title">Non hai notas rexistradas</div>
            <div class="empty-desc">Rexistre avisos rápidos de seguridade, chamadas con Patrimonio ou recordatorios de visita.</div>
            ${canCreate ? `<button class="btn btn-primary" id="btn-empty-nota">Crear Nota</button>` : ''}
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
            ${notas.map(nota => {
              let urgBadge = `<span class="badge badge-neutral">Baja</span>`;
              if (nota.urgencia === 'alta') {
                urgBadge = `<span class="badge badge-danger">Urxente</span>`;
              } else if (nota.urgencia === 'media') {
                urgBadge = `<span class="badge badge-warning">Media</span>`;
              }

              let catIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`;
              let catName = 'Nota';
              if (nota.categoria === 'llamada') {
                catIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
                catName = 'Chamada';
              } else if (nota.categoria === 'incidencia') {
                catIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
                catName = 'Incidencia';
              } else if (nota.categoria === 'orden_direccion') {
                catIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
                catName = 'Orde de Obra';
              }

              return `
                <div class="card" style="display: flex; flex-direction: column;">
                  <div class="card-header" style="padding: 1rem 1.25rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <span class="badge badge-neutral" style="gap: 0.35rem; font-size: 0.75rem;">
                        ${catIcon}
                        ${catName}
                      </span>
                      ${urgBadge}
                    </div>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">${formatDate(nota.fecha)}</span>
                  </div>

                  <div class="card-body" style="padding: 1.25rem; flex: 1;">
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem; line-height: 1.35;">
                      ${escapeHtml(nota.titulo)}
                    </h3>
                    <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-line;">
                      ${escapeHtml(nota.contenido)}
                    </p>

                    ${nota.vinculadoA ? `
                      <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-light); font-size: 0.75rem; color: var(--primary);">
                        🔗 Vinculado a: <strong>Acta #17</strong>
                      </div>
                    ` : ''}
                  </div>

                  <div class="card-footer" style="padding: 0.75rem 1.25rem; justify-content: space-between;">
                    <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">
                      ✍️ ${escapeHtml(nota.autor || 'Dirección de Obra')}
                    </span>

                    <div style="display: flex; gap: 0.35rem;">
                      ${canCreate ? `
                        <button class="table-action-btn btn-duplicate-nota" data-id="${nota.id}" title="Duplicar nota">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                      ` : ''}
                      ${canEdit ? `
                        <button class="table-action-btn btn-edit-nota" data-id="${nota.id}" title="Editar nota">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                      ` : ''}
                      ${canDelete ? `
                        <button class="table-action-btn delete btn-delete-nota" data-id="${nota.id}" title="Eliminar nota">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;

    wireEvents();
  }

  function openNotaModal(existing = null) {
    const isEdit = Boolean(existing);
    const currentUser = auth.getUser();

    const contentHtml = `
      <form id="nota-modal-form">
        <div class="form-group">
          <label class="form-label required">Título da Nota / Incidencia</label>
          <input type="text" id="nota-titulo" class="form-control" value="${escapeHtml(existing?.titulo || '')}" placeholder="Ex: Chamada con arqueólogo sobre pozo..." required />
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label required">Data</label>
            <input type="date" id="nota-fecha" class="form-control" value="${existing?.fecha || new Date().toISOString().split('T')[0]}" required />
          </div>
          <div class="form-group">
            <label class="form-label required">Categoría</label>
            <select id="nota-cat" class="form-control form-select">
              <option value="llamada" ${existing?.categoria === 'llamada' ? 'selected' : ''}>Chamada Telefónica</option>
              <option value="incidencia" ${existing?.categoria === 'incidencia' ? 'selected' : ''}>Incidencia / Seguridade</option>
              <option value="orden_direccion" ${existing?.categoria === 'orden_direccion' ? 'selected' : ''}>Orde de Dirección</option>
              <option value="recordatorio" ${existing?.categoria === 'recordatorio' ? 'selected' : ''}>Recordatorio</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Urxencia</label>
            <select id="nota-urg" class="form-control form-select">
              <option value="baja" ${existing?.urgencia === 'baja' ? 'selected' : ''}>Baixa</option>
              <option value="media" ${existing?.urgencia === 'media' || !existing ? 'selected' : ''}>Media</option>
              <option value="alta" ${existing?.urgencia === 'alta' ? 'selected' : ''}>Alta / Urxente</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Contido da Nota</label>
          <textarea id="nota-contenido" class="form-control" rows="4" placeholder="Describa a instrución, observación ou acordo..." required>${escapeHtml(existing?.contenido || '')}</textarea>
        </div>

        <div class="form-grid-2">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Autor</label>
            <input type="text" id="nota-autor" class="form-control" value="${escapeHtml(existing?.autor || currentUser?.name || 'Dirección de Obra')}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Vincular a Acta (opcional)</label>
            <select id="nota-vinculo" class="form-control form-select">
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
      <button class="btn btn-secondary" id="modal-nota-cancel">Cancelar</button>
      <button class="btn btn-primary" id="modal-nota-save">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        ${isEdit ? 'Gardar Cambios' : 'Crear Nota'}
      </button>
    `;

    const { close } = modal.open({
      title: isEdit ? 'Editar Nota de Obra' : 'Nova Nota de Obra / Bitácora',
      contentHtml,
      footerHtml
    });

    document.getElementById('modal-nota-cancel').onclick = close;
    document.getElementById('modal-nota-save').onclick = () => {
      const titulo = document.getElementById('nota-titulo').value.trim();
      const fecha = document.getElementById('nota-fecha').value;
      const categoria = document.getElementById('nota-cat').value;
      const urgencia = document.getElementById('nota-urg').value;
      const contenido = document.getElementById('nota-contenido').value.trim();
      const autor = document.getElementById('nota-autor').value.trim();
      const vinculadoA = document.getElementById('nota-vinculo').value;

      if (!titulo || !contenido) {
        showToast('Complete os campos obrigatorios', 'error');
        return;
      }

      // Mandatory Save Confirmation!
      modal.confirmSave({
        title: isEdit ? 'Confirmar Modificación' : 'Confirmar Creación de Nota',
        message: `¿Desea gardar esta nota "${titulo}" no caderno de bitácora?`,
        onConfirm: () => {
          close();
          const noteObj = {
            id: existing ? existing.id : `not-${Date.now()}`,
            titulo,
            fecha,
            categoria,
            urgencia,
            contenido,
            autor,
            vinculadoA
          };
          db.saveNota(noteObj);
          notas = db.getNotas();
          render();
          showToast('Nota gardada con éxito', 'success');
        }
      });
    };
  }

  function wireEvents() {
    const createBtn = container.querySelector('#btn-create-nota');
    if (createBtn) createBtn.onclick = () => openNotaModal();

    const emptyBtn = container.querySelector('#btn-empty-nota');
    if (emptyBtn) emptyBtn.onclick = () => openNotaModal();

    container.querySelectorAll('.btn-edit-nota').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const nota = db.getNotaById(id);
        if (nota) openNotaModal(nota);
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
              titulo: `${src.titulo} (Copia)`,
              fecha: new Date().toISOString().split('T')[0]
            };
            db.saveNota(newNota);
            notas = db.getNotas();
            render();
            showToast('Nota duplicada con éxito', 'success');
          }
        });
      };
    });

    container.querySelectorAll('.btn-delete-nota').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const nota = db.getNotaById(id);
        if (!nota) return;

        modal.confirmDelete({
          title: 'Confirmar Eliminación de Nota',
          message: `¿Desea eliminar a nota "${nota.titulo}"?`,
          itemName: nota.titulo,
          onConfirm: () => {
            db.deleteNota(id);
            notas = db.getNotas();
            render();
            showToast('Nota eliminada', 'success');
          }
        });
      };
    });
  }

  render();
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
