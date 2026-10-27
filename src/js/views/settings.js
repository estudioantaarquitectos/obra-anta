/* ==========================================================================
   ANTA OBRA - Obra Configuration & Backup View
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';

export function renderSettings(container, router) {
  let settings = db.getSettings();

  function render() {
    container.innerHTML = `
      <div class="content-wrapper">
        
        <!-- Header -->
        <div style="margin-bottom: 1.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span class="badge badge-info" style="font-weight: 700;">EXPTE: ${settings.expediente}</span>
          </div>
          <h1 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
            Configuración de la Obra y Copias de Seguridad
          </h1>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 800px;">
            Defina los datos generales predeterminados que heredarán automáticamente las nuevas actas e informes.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; max-width: 900px;">
          
          <!-- General Obra Settings Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Datos Maestros del Proyecto</div>
            </div>
            <div class="card-body">
              <form id="settings-form">
                <div class="form-group">
                  <label class="form-label required">Título Oficial de la Obra / Proyecto</label>
                  <textarea id="set-obra" class="form-control" rows="2" required>${escapeHtml(settings.obraPrincipal || '')}</textarea>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label required">Situación / Ubicación</label>
                    <input type="text" id="set-situacion" class="form-control" value="${escapeHtml(settings.situacion || '')}" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Nº de Expediente</label>
                    <input type="text" id="set-expediente" class="form-control" value="${escapeHtml(settings.expediente || '')}" required />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label required">Empresa Contratista Principal</label>
                    <input type="text" id="set-contratista" class="form-control" value="${escapeHtml(settings.contratista || '')}" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Equipo Técnico de Dirección de Obra</label>
                    <input type="text" id="set-equipo" class="form-control" value="${escapeHtml(settings.equipoTecnico || '')}" required />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Coordinador de Seguridad y Salud (CSS)</label>
                    <input type="text" id="set-css" class="form-control" value="${escapeHtml(settings.coordinadorCSS || '')}" />
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Entidad Promotora / Cliente</label>
                    <input type="text" id="set-promotora" class="form-control" value="${escapeHtml(settings.entidadPromotora || '')}" />
                  </div>
                </div>
              </form>
            </div>
            <div class="card-footer">
              <button class="btn btn-primary" id="btn-save-settings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Guardar Configuración
              </button>
            </div>
          </div>

          <!-- Backup & Data Recovery Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Copias de Seguridad y Restauración</div>
            </div>
            <div class="card-body">
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5;">
                Exporte todo el contenido de la aplicación (actas, informes DT-05, fotos, notas y usuarios) a un archivo JSON para respaldo o importación en otro equipo.
              </p>

              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" id="btn-export-backup">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Exportar Copia de Seguridad (JSON)
                </button>

                <label class="btn btn-secondary" style="cursor: pointer; margin: 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Importar Copia de Seguridad
                  <input type="file" id="backup-file-input" accept=".json" style="display: none;" />
                </label>

                <button class="btn btn-danger" id="btn-reset-defaults" style="margin-left: auto;">
                  Restablecer Datos Iniciales
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    // Save Settings
    container.querySelector('#btn-save-settings').onclick = () => {
      const updated = {
        obraPrincipal: container.querySelector('#set-obra').value.trim(),
        situacion: container.querySelector('#set-situacion').value.trim(),
        expediente: container.querySelector('#set-expediente').value.trim(),
        contratista: container.querySelector('#set-contratista').value.trim(),
        equipoTecnico: container.querySelector('#set-equipo').value.trim(),
        coordinadorCSS: container.querySelector('#set-css').value.trim(),
        entidadPromotora: container.querySelector('#set-promotora').value.trim(),
        logosHeader: 'default'
      };

      modal.confirmSave({
        title: 'Confirmar Guardado de Configuración',
        message: '¿Desea actualizar los datos maestros de la obra?',
        onConfirm: () => {
          db.saveSettings(updated);
          settings = updated;
          showToast('Configuración actualizada correctamente', 'success');
          render();
        }
      });
    };

    // Export Backup
    container.querySelector('#btn-export-backup').onclick = () => {
      const data = db.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ANTA_OBRA_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Copia de seguridad descargada', 'success');
    };

    // Import Backup
    const fileInput = container.querySelector('#backup-file-input');
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            modal.confirmSave({
              title: 'Confirmar Restauración de Copia',
              message: '¿Está seguro de importar esta copia? Se sobreescribirán los datos actuales.',
              onConfirm: () => {
                db.importBackup(parsed);
                showToast('Copia restaurada correctamente', 'success');
                window.location.reload();
              }
            });
          } catch {
            showToast('El archivo seleccionado no es un JSON válido', 'error');
          }
        };
        reader.readAsText(file);
      };
    }

    // Reset Defaults
    container.querySelector('#btn-reset-defaults').onclick = () => {
      modal.confirmDelete({
        title: 'Restablecer Datos de Demostración',
        message: '¿Desea restablecer todos los datos a la versión inicial con el Acta 17 y el Informe DT-05 de muestra?',
        itemName: 'Todos los datos personalizados',
        confirmText: 'Restablecer Ahora',
        onConfirm: () => {
          db.resetToDefaults();
          showToast('Datos iniciales restablecidos', 'success');
          window.location.reload();
        }
      });
    };
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
