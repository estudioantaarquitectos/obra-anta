/* ==========================================================================
   ANTA OBRA - Copias de Seguridade e Sistema
   Xestión de copias de seguridade, restauración de datos e estado do sistema
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';
import { isSupabaseConfigured } from '../supabaseClient.js';
import { API_BASE } from '../exportDocx.js';

export function renderSettings(container, router) {
  if (!auth.can('backup:manage') && !auth.can('settings:manage') && !auth.isAdmin()) {
    container.innerHTML = `
      <div class="content-wrapper">
        <div class="empty-state">
          <div class="empty-title" style="color: var(--color-danger);">Acceso restringido</div>
          <div class="empty-desc">O seu grupo de usuario non dispón de permisos para acceder ás Copias de Seguridade e Mantemento do Sistema.</div>
          <button class="btn btn-primary" id="btn-restricted-back">Volver</button>
        </div>
      </div>
    `;
    const backBtn = container.querySelector('#btn-restricted-back');
    if (backBtn) backBtn.onclick = () => router.back('dashboard');
    return;
  }

  function render() {
    let backupSizeBytes = 0;
    try {
      const backupJson = JSON.stringify(db.exportBackup());
      backupSizeBytes = new Blob([backupJson]).size;
    } catch (e) {
      console.warn('Erro calculando tamaño do backup:', e);
    }
    const backupSizeFormatted = backupSizeBytes < 1024 * 1024 
      ? (backupSizeBytes / 1024).toFixed(1) + ' KB' 
      : (backupSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';

    container.innerHTML = `
      <div class="content-wrapper">
        
        <!-- Header -->
        <div style="margin-bottom: 1.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span class="badge badge-primary" style="font-weight: 700;">PANEL DE CONTROL</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">•</span>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Mantemento e Respaldo</span>
          </div>
          <h1 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
            Copias de Seguridade e Sistema
          </h1>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 800px;">
            Exporte ou importe copias de seguridade completas de tódolos expedientes de obra, actas, informes, notas e fotografías.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; max-width: 900px;">
          
          <!-- Backup & Data Recovery Card -->
          <div class="card">
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div class="card-title" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Copias de Seguridade e Restauración Integral
              </div>
            </div>
            <div class="card-body">
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5;">
                Xere un arquivo de respaldo completo en formato JSON con tódalas obras, actas semanais, informes mensuais, directrices de seguridade, fotografías e usuarios da plataforma. Pode gardar este arquivo no seu ordenador ou importalo en calquera intre para restaurar o sistema.
              </p>

              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
                <button class="btn btn-primary" id="btn-export-backup">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Descargar Copia de Seguridade (JSON)
                </button>

                <label class="btn btn-secondary" style="cursor: pointer; margin: 0; display: inline-flex; align-items: center; gap: 0.5rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Restaurar desde Arquivo JSON
                  <input type="file" id="backup-file-input" accept=".json" style="display: none;" />
                </label>

                <button class="btn btn-danger btn-sm" id="btn-reset-defaults" style="margin-left: auto;">
                  Restablecer Datos Iniciais
                </button>
              </div>

              <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-light); display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                <span>Volume de datos almacenados localmente:</span>
                <span style="font-weight: 700; color: var(--text-main); font-family: monospace;">${backupSizeFormatted}</span>
              </div>
            </div>
          </div>

          <!-- Cloud Services Status Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                Estado da Infraestrutura na Nube (Produción)
              </div>
            </div>
            <div class="card-body">
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 6px #16a34a;"></div>
                    <div>
                      <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">Base de Datos PostgreSQL (Supabase)</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">Sincronización multiusuario en tempo real e almacenamento de ficheiros</div>
                    </div>
                  </div>
                  <span class="badge badge-success" style="font-size: 0.75rem;">Conectado</span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 6px #16a34a;"></div>
                    <div>
                      <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">Motor de Documentos Oficials (Render Docker)</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">LibreOffice Headless + Word COM 1:1 + ReportLab Separatas</div>
                    </div>
                  </div>
                  <span class="badge badge-success" style="font-size: 0.75rem;">Activo</span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 6px #16a34a;"></div>
                    <div>
                      <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">Aloxamento Web e CDN Edge (Vercel)</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">Despregue continuo automático desde GitHub (obra-anta)</div>
                    </div>
                  </div>
                  <span class="badge badge-success" style="font-size: 0.75rem;">anta-obra.vercel.app</span>
                </div>

              </div>
            </div>
          </div>

          <!-- Quota & Cost Control Monitoring Card (0 € / mes) -->
          <div class="card">
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div class="card-title" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                Monitorización de Cuotas e Gastos (0 € / mes)
              </div>
              <span class="badge badge-success" style="font-weight: 700; font-size: 0.75rem;">100% GRATUÍTO</span>
            </div>
            <div class="card-body">
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5;">
                A arquitectura de ANTA OBRA opera sobre servizos <strong>Free Tier permanentes</strong> sen tarxeta de crédito vinculada para sobrecustos. Pode consultar o consumo exacto de ancho de banda, disco e horas nos paneis oficiais con acceso directo:
              </p>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                
                <!-- Vercel Usage Box -->
                <div style="padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-main); margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
                      <span>Vercel (Web & CDN)</span>
                      <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">Hobby</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem; line-height: 1.45;">
                      • Límite: <strong>100 GB / mes</strong> de tráfico<br>
                      • 1.000.000 de peticións Edge/mes<br>
                      • Despregue automático gratuíto
                    </div>
                  </div>
                  <a href="https://vercel.com/dashboard/usage" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.8rem; text-decoration: none;">
                    <span>Ver Consumo en Vercel</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </div>

                <!-- Supabase Usage Box -->
                <div style="padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-main); margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
                      <span>Supabase (BD & Storage)</span>
                      <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">Free Plan</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem; line-height: 1.45;">
                      • Límite: <strong>500 MB</strong> Base de Datos<br>
                      • <strong>1 GB</strong> de almacenamento de fotos<br>
                      • 2 GB / mes de transferencia
                    </div>
                  </div>
                  <a href="https://supabase.com/dashboard/project/oovkvqrhbxjdxjqpsome/settings/billing/usage" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.8rem; text-decoration: none;">
                    <span>Ver Consumo en Supabase</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </div>

                <!-- Render Usage Box -->
                <div style="padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-main); margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
                      <span>Render (Motor PDF/DOCX)</span>
                      <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">Free Tier</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem; line-height: 1.45;">
                      • Límite: <strong>750 horas / mes</strong> gratis<br>
                      • <strong>100 GB / mes</strong> de ancho de banda<br>
                      • Suspensión automática por inactividade
                    </div>
                  </div>
                  <a href="https://dashboard.render.com" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.8rem; text-decoration: none;">
                    <span>Ver Métricas en Render</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </div>

              </div>

              <div style="padding: 0.75rem 1rem; background: rgba(34, 197, 94, 0.08); border-left: 3px solid #16a34a; border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4;">
                <strong>Garantía de Custo Cero:</strong> Ningún dos tres provedores conta con tarxeta de crédito con tarificación automática por uso. No hipotético caso de achegarse a un límite, o servizo notifica por correo electrónico ou limita temporalmente o exceso ata a renovación do mes seguinte, sen sorpresas nin cargos na conta.
              </div>
            </div>
          </div>

        </div>

      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
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
      showToast('Copia de seguridade descargada con éxito', 'success');
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
              message: '¿Está seguro/a de importar esta copia de seguridade? Sobreescribiranse os datos actuais da aplicación.',
              onConfirm: () => {
                db.importBackup(parsed);
                showToast('Copia restaurada correctamente', 'success');
                window.location.reload();
              }
            });
          } catch (err) {
            showToast('O arquivo seleccionado non é un formato JSON válido', 'error');
          }
        };
        reader.readAsText(file);
      };
    }

    // Reset Defaults
    container.querySelector('#btn-reset-defaults').onclick = () => {
      modal.confirmDelete({
        title: 'Restablecer Datos Iniciais',
        message: '¿Está seguro/a de restablecer tódolos datos iniciais de fábrica? Perderanse os cambios non gardados.',
        onConfirm: () => {
          db.resetToDefaults();
          showToast('Datos restablecidos con éxito', 'success');
          window.location.reload();
        }
      });
    };
  }

  render();
}
