/* ==========================================================================
   ANTA OBRA - Informes DT-05 View
   List of Monthly and Weekly Supervision Reports following DT-05 Xestur
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';

export function renderInformes(container, router) {
  let informes = db.getInformes();
  const settings = db.getSettings();

  function render() {
    const canCreate = auth.can('informes:create');
    const canEdit = auth.can('informes:edit');
    const canDelete = auth.can('informes:delete');

    container.innerHTML = `
      <div class="content-wrapper">
        
        <!-- Header -->
        <div style="margin-bottom: 1.75rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-info" style="font-weight: 700;">INFORMES MENSUAIS</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">•</span>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Sociedade de Vivenda Pública de Galicia - Xestur S.A.</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
              Informes Mensuais de Seguimento de Obra
            </h1>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 800px;">
              Seguimento mensual estrito do grao de execución, calidade, prazo, orzamento e seguridade.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${canCreate ? `
              <button class="btn btn-primary" id="btn-create-informe">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Novo Informe Mensual
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Table of Informes -->
        ${informes.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div class="empty-title">Non hai informes mensuais creados</div>
            <div class="empty-desc">
              Xere o primeiro informe de seguimento mensual para remitir coa certificación.
            </div>
            ${canCreate ? `
              <button class="btn btn-primary" id="btn-empty-create">
                Crear Primeiro Informe Mensual
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 130px;">Nº Informe</th>
                  <th style="width: 160px;">Período / Mes</th>
                  <th>Proxecto e Emplazamento</th>
                  <th style="width: 170px;">Avance Executado</th>
                  <th style="width: 150px;">Estado Xeral</th>
                  <th style="width: 110px;">Data Emisión</th>
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
                        <div class="acta-title-cell">
                          <span class="acta-name">
                            ${inf.datosXerais?.proxecto || settings.obraPrincipal}
                          </span>
                          <span class="acta-sub">
                            ${inf.datosXerais?.contratista || 'Cabero Edificaciones'} • ${inf.datosXerais?.emprazamento || settings.situacion}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600;">
                            <span>${exec}% executado</span>
                            <span style="color: var(--text-muted);">${prev}% previsto</span>
                          </div>
                          <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                            <div style="width: ${Math.min(exec, 100)}%; height: 100%; background: ${exec >= prev ? 'var(--color-success)' : 'var(--color-warning)'};"></div>
                          </div>
                        </div>
                      </td>

                      <td>
                        ${statusBadge}
                      </td>

                      <td>
                        <span style="font-size: 0.85rem; color: var(--text-main);">
                          ${formatDate(inf.datosXerais?.dataInforme)}
                        </span>
                      </td>

                      <td class="col-actions">
                        <div class="table-row-actions">
                          <button class="table-action-btn btn-view-informe" data-id="${inf.id}" title="Ver e Imprimir Informe Mensual Oficial">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>

                          <button class="table-action-btn btn-export-docx-informe" data-id="${inf.id}" title="Descargar informe en formato Word (.docx)">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          </button>

                          <button class="table-action-btn btn-export-pdf-informe" data-id="${inf.id}" title="Descargar PDF Oficial con Anexos">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                          </button>

                          ${canEdit ? `
                            <button class="table-action-btn btn-edit-informe" data-id="${inf.id}" title="Editar Informe">
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>

                            <button class="table-action-btn btn-duplicate-informe" data-id="${inf.id}" title="Duplicar Informe Mensual">
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                          ` : ''}

                          ${canDelete ? `
                            <button class="table-action-btn delete btn-delete-informe" data-id="${inf.id}" title="Eliminar Informe (con confirmación)">
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
    const createBtn = container.querySelector('#btn-create-informe');
    if (createBtn) createBtn.onclick = () => router.navigate('informe-editor');

    const emptyBtn = container.querySelector('#btn-empty-create');
    if (emptyBtn) emptyBtn.onclick = () => router.navigate('informe-editor');

    container.querySelectorAll('.btn-view-informe').forEach(btn => {
      btn.onclick = () => router.navigate('informe-print', { id: btn.dataset.id });
    });

    container.querySelectorAll('.btn-export-docx-informe').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const inf = db.getInformeById(id);
        if (!inf) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
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

    container.querySelectorAll('.btn-export-pdf-informe').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const inf = db.getInformeById(id);
        if (!inf) return;
        const origHTML = btn.innerHTML;
        try {
          btn.disabled = true;
          btn.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
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
      btn.onclick = () => router.navigate('informe-editor', { id: btn.dataset.id });
    });

    container.querySelectorAll('.btn-duplicate-informe').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const src = db.getInformeById(id);
        if (!src) return;

        const allInfs = db.getInformes(src.obraId);
        const maxNum = allInfs.reduce((m, i) => Math.max(m, parseInt(i.numero, 10) || 0), 0);
        const nextNum = maxNum + 1;

        modal.confirmSave({
          title: 'Duplicar Informe Mensual',
          message: `¿Desexa crear un novo Informe Mensual (Nº ${nextNum}) copiando o Informe nº ${src.numero || id}?`,
          onConfirm: () => {
            const newInf = JSON.parse(JSON.stringify(src));
            newInf.id = `inf-${Date.now()}`;
            newInf.numero = nextNum;
            if (newInf.datosXerais) {
              newInf.datosXerais.numeroInforme = nextNum;
              newInf.datosXerais.dataInforme = new Date().toISOString().split('T')[0];
            }
            newInf.estado = 'borrador';
            newInf.firmas = [];
            db.saveInforme(newInf);
            showToast(`Informe nº ${nextNum} creado con éxito`, 'success');
            router.navigate('informe-editor', { id: newInf.id, obraId: newInf.obraId });
          }
        });
      };
    });

    container.querySelectorAll('.btn-delete-informe').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const target = db.getInformeById(id);
        if (!target) return;

        modal.confirmDelete({
          title: 'Confirmar Eliminación de Informe Mensual',
          message: `¿Desea eliminar definitivamente el informe de ${target.datosXerais?.mesInformado || target.numero}?`,
          itemName: `Informe Mensual (${target.datosXerais?.mesInformado || target.id})`,
          onConfirm: () => {
            db.deleteInforme(id);
            informes = db.getInformes();
            render();
            showToast('Informe mensual eliminado correctamente', 'success');
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
