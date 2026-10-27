/* ==========================================================================
   ANTA OBRA - User & Group Management View (Admin Exclusive)
   "Habrá un usuario llamado Admin, con contraseña 0000 que podrá utilizar
   todas las funciones. Podrá crear grupos de usuarios, y limitar su operativa.
   Podrá crear usuarios, editarlos y eliminarlos."
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';

const AVAILABLE_PERMISSIONS = [
  { id: 'actas:view', label: 'Ver Actas de Obra', module: 'Actas' },
  { id: 'actas:create', label: 'Crear nuevas Actas', module: 'Actas' },
  { id: 'actas:edit', label: 'Editar Actas existentes', module: 'Actas' },
  { id: 'actas:delete', label: 'Eliminar Actas', module: 'Actas' },
  { id: 'actas:export', label: 'Imprimir / Exportar PDF e DOCX de Actas', module: 'Actas' },

  { id: 'informes:view', label: 'Ver Informes DT-05', module: 'Informes DT-05' },
  { id: 'informes:create', label: 'Crear nuevos Informes DT-05', module: 'Informes DT-05' },
  { id: 'informes:edit', label: 'Editar Informes DT-05', module: 'Informes DT-05' },
  { id: 'informes:delete', label: 'Eliminar Informes DT-05', module: 'Informes DT-05' },
  { id: 'informes:export', label: 'Imprimir / Exportar PDF e DOCX de Informes', module: 'Informes DT-05' },

  { id: 'notas:view', label: 'Ver Notas de Bitácora', module: 'Notas de Obra' },
  { id: 'notas:create', label: 'Crear Notas de Obra', module: 'Notas de Obra' },
  { id: 'notas:edit', label: 'Editar Notas de Obra', module: 'Notas de Obra' },
  { id: 'notas:delete', label: 'Eliminar Notas de Obra', module: 'Notas de Obra' },

  { id: 'users:manage', label: 'Gestionar Usuarios', module: 'Administración' },
  { id: 'groups:manage', label: 'Gestionar Grupos y Permisos', module: 'Administración' },
  { id: 'settings:manage', label: 'Configuración general de Obra', module: 'Administración' }
];

export function renderUsuarios(container, router) {
  if (!auth.can('users:manage') && !auth.isAdmin()) {
    container.innerHTML = `
      <div class="content-wrapper">
        <div class="empty-state">
          <div class="empty-title" style="color: var(--color-danger);">Acceso restringido</div>
          <div class="empty-desc">Esta sección está reservada exclusivamente para el usuario Administrador y usuarios con permiso de gestión.</div>
          <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
        </div>
      </div>
    `;
    return;
  }

  let users = db.getUsers();
  let groups = db.getGroups();
  let activeTab = 'users'; // 'users' | 'groups'
  let selectedGroupId = groups[0]?.id || 'direccion_obra';

  function render() {
    container.innerHTML = `
      <div class="content-wrapper">

        <!-- Header -->
        <div style="margin-bottom: 1.75rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-primary" style="font-weight: 700;">PANEL DE CONTROL ADMIN</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">•</span>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Control de Acceso y Operativa</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">
              Gestión de Usuarios, Grupos y Permisos
            </h1>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 800px;">
              Cree nuevos usuarios, configure grupos de trabajo y limite de forma granular la operativa permitida.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${activeTab === 'users' ? `
              <button class="btn btn-primary" id="btn-create-user">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                Nuevo Usuario
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-create-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Nuevo Grupo de Usuarios
              </button>
            `}
          </div>
        </div>

        <!-- Tabs -->
        <div style="display: flex; border-bottom: 1px solid var(--border-light); margin-bottom: 1.5rem; gap: 0.5rem;">
          <button class="btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}" id="tab-users" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Usuarios (${users.length})
          </button>
          <button class="btn ${activeTab === 'groups' ? 'btn-primary' : 'btn-ghost'}" id="tab-groups" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Grupos y Matriz de Permisos (${groups.length})
          </button>
        </div>

        <!-- Tab 1: Users Table -->
        ${activeTab === 'users' ? `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre y Apellidos</th>
                  <th>Grupo / Rol</th>
                  <th>Cargo en Obra</th>
                  <th>Empresa / Entidad</th>
                  <th style="width: 100px;">Estado</th>
                  <th class="col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => {
                  const grp = groups.find(g => g.id === u.role);
                  const isMainAdmin = u.username.toLowerCase() === 'admin';

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: var(--primary);">
                          ${escapeHtml(u.username)}
                          ${isMainAdmin ? `<span class="badge badge-primary" style="margin-left: 6px; font-size: 0.68rem;">MASTER</span>` : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(u.email || '')}</div>
                      </td>

                      <td>
                        <strong style="color: var(--text-main);">${escapeHtml(u.name)}</strong>
                      </td>

                      <td>
                        <span class="badge badge-info">
                          ${grp ? grp.name : u.role}
                        </span>
                      </td>

                      <td>
                        <span style="font-size: 0.85rem;">${escapeHtml(u.cargo || '—')}</span>
                      </td>

                      <td>
                        <span style="font-size: 0.85rem;">${escapeHtml(u.empresa || '—')}</span>
                      </td>

                      <td>
                        <span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">
                          ${u.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td class="col-actions">
                        <div class="table-row-actions">
                          <button class="table-action-btn btn-edit-user" data-id="${u.id}" title="Editar usuario">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>

                          ${!isMainAdmin ? `
                            <button class="table-action-btn delete btn-delete-user" data-id="${u.id}" title="Eliminar usuario">
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
        ` : `
          <!-- Tab 2: Groups & Permissions Matrix -->
          <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; align-items: flex-start;">
            
            <!-- Groups Sidebar List -->
            <div class="card">
              <div class="card-header" style="padding: 1rem 1.25rem;">
                <div class="card-title" style="font-size: 0.95rem;">Grupos de Operativa</div>
              </div>
              <div style="padding: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem;">
                ${groups.map(g => `
                  <button 
                    class="nav-item group-select-btn ${g.id === selectedGroupId ? 'active' : ''}" 
                    data-id="${g.id}"
                    style="width: 100%; text-align: left; border: none; justify-content: flex-start;"
                  >
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 600; font-size: 0.88rem;">${escapeHtml(g.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${g.permissions ? g.permissions.length : 0} permisos activos
                      </div>
                    </div>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Permission Matrix for Selected Group -->
            ${(() => {
              const currentGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
              if (!currentGroup) return '';
              const isAdminGroup = currentGroup.id === 'admin';

              // Group permissions by module
              const modules = {};
              AVAILABLE_PERMISSIONS.forEach(p => {
                if (!modules[p.module]) modules[p.module] = [];
                modules[p.module].push(p);
              });

              return `
                <div class="card">
                  <div class="card-header">
                    <div>
                      <div class="card-title">Configuración de: ${escapeHtml(currentGroup.name)}</div>
                      <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                        ${escapeHtml(currentGroup.description || 'Sin descripción')}
                      </div>
                    </div>

                    ${!isAdminGroup ? `
                      <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="btn btn-secondary btn-sm" id="btn-edit-group" data-id="${currentGroup.id}" title="Editar nome e descrición do grupo">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          <span>Editar Nome</span>
                        </button>

                        <button class="btn btn-danger btn-sm" id="btn-delete-group" data-id="${currentGroup.id}" title="Eliminar este grupo">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          <span>Eliminar Grupo</span>
                        </button>
                      </div>
                    ` : `
                      <span class="badge badge-primary" style="font-size: 0.75rem; padding: 0.4rem 0.65rem;">
                        Administrador por Defecto (Inmutable)
                      </span>
                    `}
                  </div>

                  <div class="card-body">
                    ${isAdminGroup ? `
                      <div style="background: var(--primary-light); border: 1px solid var(--primary-border); color: var(--primary); padding: 0.85rem 1rem; border-radius: var(--radius-sm); font-size: 0.88rem; margin-bottom: 1.25rem;">
                        ℹ️ <strong>Grupo Administrador Master:</strong> Este grupo posee todos los permisos del sistema de forma irrevocable.
                      </div>
                    ` : ''}

                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                      ${Object.entries(modules).map(([moduleName, perms]) => `
                        <div>
                          <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem; margin-bottom: 0.75rem;">
                            Módulo: ${moduleName}
                          </div>

                          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.75rem;">
                            ${perms.map(p => {
                              const isChecked = isAdminGroup || (currentGroup.permissions || []).includes(p.id);
                              return `
                                <label style="display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.65rem 0.85rem; background: var(--bg-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-sm); cursor: ${isAdminGroup ? 'not-allowed' : 'pointer'};">
                                  <input 
                                    type="checkbox" 
                                    class="perm-checkbox" 
                                    value="${p.id}" 
                                    ${isChecked ? 'checked' : ''} 
                                    ${isAdminGroup ? 'disabled' : ''}
                                    style="margin-top: 2px;"
                                  />
                                  <div style="font-size: 0.85rem; font-weight: 500; color: var(--text-main);">
                                    ${p.label}
                                    <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">${p.id}</div>
                                  </div>
                                </label>
                              `;
                            }).join('')}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  ${!isAdminGroup ? `
                    <div class="card-footer">
                      <button class="btn btn-primary" id="btn-save-group-perms">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Guardar Permisos del Grupo
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            })()}

          </div>
        `}

      </div>
    `;

    wireEvents();
  }

  function openUserModal(existing = null) {
    const isEdit = Boolean(existing);
    const isMainAdmin = existing && existing.username.toLowerCase() === 'admin';

    const contentHtml = `
      <form id="user-modal-form">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label required">Nombre de Usuario (Login)</label>
            <input type="text" id="usr-modal-username" class="form-control" value="${escapeHtml(existing?.username || '')}" ${isMainAdmin ? 'disabled' : 'required'} />
          </div>
          <div class="form-group">
            <label class="form-label ${isEdit ? '' : 'required'}">Contraseña ${isEdit ? '(dejar en blanco para no cambiar)' : ''}</label>
            <input type="text" id="usr-modal-pwd" class="form-control" placeholder="${isEdit ? '••••••••' : 'Ej: 0000 o 1234'}" ${isEdit ? '' : 'required'} />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Nombre y Apellidos</label>
          <input type="text" id="usr-modal-name" class="form-control" value="${escapeHtml(existing?.name || '')}" placeholder="Ej: Rosa Vilas Romalde" required />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label required">Grupo de Operativa / Rol</label>
            <select id="usr-modal-role" class="form-control form-select" ${isMainAdmin ? 'disabled' : ''}>
              ${groups.map(g => `
                <option value="${g.id}" ${existing?.role === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" id="usr-modal-email" class="form-control" value="${escapeHtml(existing?.email || '')}" placeholder="nombre@coag.es" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Cargo en Obra</label>
            <input type="text" id="usr-modal-cargo" class="form-control" value="${escapeHtml(existing?.cargo || '')}" placeholder="Ej: Arquitecto Director de Obra" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Empresa / Entidad</label>
            <input type="text" id="usr-modal-empresa" class="form-control" value="${escapeHtml(existing?.empresa || '')}" placeholder="Ej: Cabero Edificaciones, S.A." />
          </div>
        </div>

        ${!isMainAdmin ? `
          <div style="margin-top: 1.25rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
              <input type="checkbox" id="usr-modal-active" ${existing?.active !== false ? 'checked' : ''} />
              <strong>Usuario Activo</strong> (permite iniciar sesión)
            </label>
          </div>
        ` : ''}
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-usr-cancel">Cancelar</button>
      <button class="btn btn-primary" id="modal-usr-save">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        ${isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
      </button>
    `;

    const { close } = modal.open({
      title: isEdit ? `Editar Usuario: ${existing.username}` : 'Nuevo Usuario de la Obra',
      contentHtml,
      footerHtml
    });

    document.getElementById('modal-usr-cancel').onclick = close;
    document.getElementById('modal-usr-save').onclick = () => {
      const username = isMainAdmin ? 'Admin' : document.getElementById('usr-modal-username').value.trim();
      const pwdInput = document.getElementById('usr-modal-pwd').value.trim();
      const name = document.getElementById('usr-modal-name').value.trim();
      const role = isMainAdmin ? 'admin' : document.getElementById('usr-modal-role').value;
      const email = document.getElementById('usr-modal-email').value.trim();
      const cargo = document.getElementById('usr-modal-cargo').value.trim();
      const empresa = document.getElementById('usr-modal-empresa').value.trim();
      const active = isMainAdmin ? true : document.getElementById('usr-modal-active').checked;

      if (!username || !name) {
        showToast('Complete usuario y nombre', 'error');
        return;
      }

      if (!isEdit && !pwdInput) {
        showToast('Indique una contraseña inicial', 'error');
        return;
      }

      // Mandatory Save Confirmation!
      modal.confirmSave({
        title: isEdit ? 'Confirmar Modificación de Usuario' : 'Confirmar Creación de Usuario',
        message: `¿Desea guardar el usuario ${username} asignado al grupo "${groups.find(g => g.id === role)?.name || role}"?`,
        onConfirm: () => {
          close();
          const userObj = {
            id: existing ? existing.id : `usr-${Date.now()}`,
            username,
            name,
            role,
            email,
            cargo,
            empresa,
            active,
            password: pwdInput || existing?.password || '1234'
          };
          db.saveUser(userObj);
          users = db.getUsers();
          render();
          showToast(`Usuario ${username} guardado correctamente`, 'success');
        }
      });
    };
  }

  function openGroupModal(existing = null) {
    const isEdit = Boolean(existing);
    const contentHtml = `
      <form id="grp-modal-form">
        <div class="form-group">
          <label class="form-label required">Nome do Grupo</label>
          <input type="text" id="grp-modal-name" class="form-control" placeholder="Ex: Laboratorio de Control de Calidade" value="${escapeHtml(existing?.name || '')}" required />
        </div>
        ${!isEdit ? `
          <div class="form-group">
            <label class="form-label">Identificador único (ID)</label>
            <input type="text" id="grp-modal-id" class="form-control" placeholder="Ex: laboratorio_cc" />
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Xérase automaticamente a partir do nome se se deixa baleiro.</div>
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Identificador único (ID)</label>
            <input type="text" id="grp-modal-id" class="form-control" value="${escapeHtml(existing.id)}" disabled style="background: var(--bg-surface); opacity: 0.7;" />
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">O identificador técnico interno non se modifica para manter a integridade dos usuarios.</div>
          </div>
        `}
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">Descrición</label>
          <textarea id="grp-modal-desc" class="form-control" rows="2" placeholder="Operativa e competencias permitidas para os integrantes deste grupo...">${escapeHtml(existing?.description || '')}</textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-grp-cancel">Cancelar</button>
      <button class="btn btn-primary" id="modal-grp-save">
        ${isEdit ? 'Gardar Cambios' : 'Crear Grupo'}
      </button>
    `;

    const { close } = modal.open({
      title: isEdit ? `Editar Grupo: ${existing.name}` : 'Crear Novo Grupo de Usuarios',
      contentHtml,
      footerHtml
    });

    document.getElementById('modal-grp-cancel').onclick = close;
    document.getElementById('modal-grp-save').onclick = () => {
      const name = document.getElementById('grp-modal-name').value.trim();
      let id = isEdit ? existing.id : document.getElementById('grp-modal-id').value.trim();
      const description = document.getElementById('grp-modal-desc').value.trim();

      if (!name) {
        showToast('Indique un nome para o grupo', 'error');
        return;
      }

      if (!id) {
        id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').substring(0, 25);
      }

      modal.confirmSave({
        title: isEdit ? 'Confirmar Modificación de Grupo' : 'Confirmar Creación de Grupo',
        message: isEdit ? `¿Desexa actualizar os datos do grupo "${name}"?` : `¿Desexa crear o grupo de operativa "${name}"?`,
        onConfirm: () => {
          close();
          const targetGrp = isEdit ? {
            ...existing,
            name,
            description
          } : {
            id,
            name,
            description,
            permissions: ['actas:view', 'informes:view', 'notas:view']
          };
          db.saveGroup(targetGrp);
          groups = db.getGroups();
          selectedGroupId = targetGrp.id;
          activeTab = 'groups';
          render();
          showToast(isEdit ? `Grupo "${name}" actualizado con éxito` : `Grupo "${name}" creado con permisos base`, 'success');
        }
      });
    };
  }

  function wireEvents() {
    // Tab switching
    const tabUsers = container.querySelector('#tab-users');
    const tabGroups = container.querySelector('#tab-groups');
    if (tabUsers) tabUsers.onclick = () => { activeTab = 'users'; render(); };
    if (tabGroups) tabGroups.onclick = () => { activeTab = 'groups'; render(); };

    // New User
    const createUserBtn = container.querySelector('#btn-create-user');
    if (createUserBtn) createUserBtn.onclick = () => openUserModal();

    // New Group
    const createGroupBtn = container.querySelector('#btn-create-group');
    if (createGroupBtn) createGroupBtn.onclick = () => openGroupModal();

    // Edit User
    container.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const u = db.getUserById(id);
        if (u) openUserModal(u);
      };
    });

    // Delete User (with confirmDelete)
    container.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const u = db.getUserById(id);
        if (!u) return;

        modal.confirmDelete({
          title: 'Confirmar Eliminación de Usuario',
          message: `¿Desea eliminar definitivamente el acceso para ${u.name} (${u.username})?`,
          itemName: `${u.name} (${u.username})`,
          onConfirm: () => {
            try {
              db.deleteUser(id);
              users = db.getUsers();
              render();
              showToast(`Usuario ${u.username} eliminado`, 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      };
    });

    // Group select
    container.querySelectorAll('.group-select-btn').forEach(btn => {
      btn.onclick = () => {
        selectedGroupId = btn.dataset.id;
        render();
      };
    });

    // Edit group
    const editGrpBtn = container.querySelector('#btn-edit-group');
    if (editGrpBtn) {
      editGrpBtn.onclick = () => {
        const grp = db.getGroupById(editGrpBtn.dataset.id);
        if (grp) openGroupModal(grp);
      };
    }

    // Delete group
    const delGrpBtn = container.querySelector('#btn-delete-group');
    if (delGrpBtn) {
      delGrpBtn.onclick = () => {
        const grpId = delGrpBtn.dataset.id;
        const grp = db.getGroupById(grpId);
        if (!grp) return;

        modal.confirmDelete({
          title: 'Confirmar Eliminación de Grupo',
          message: `¿Desea eliminar el grupo de operativa "${grp.name}"? Los usuarios vinculados deberán reasignarse.`,
          itemName: grp.name,
          onConfirm: () => {
            try {
              db.deleteGroup(grpId);
              groups = db.getGroups();
              selectedGroupId = groups[0]?.id || 'direccion_obra';
              render();
              showToast(`Grupo ${grp.name} eliminado`, 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      };
    }

    // Save group permissions
    const saveGrpPerms = container.querySelector('#btn-save-group-perms');
    if (saveGrpPerms) {
      saveGrpPerms.onclick = () => {
        const grp = db.getGroupById(selectedGroupId);
        if (!grp) return;

        const newPerms = [];
        container.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
          newPerms.push(cb.value);
        });

        modal.confirmSave({
          title: 'Confirmar Actualización de Permisos',
          message: `¿Desea guardar los nuevos permisos para el grupo "${grp.name}"? (${newPerms.length} permisos habilitados)`,
          onConfirm: () => {
            grp.permissions = newPerms;
            db.saveGroup(grp);
            groups = db.getGroups();
            render();
            showToast(`Permisos del grupo ${grp.name} actualizados`, 'success');
          }
        });
      };
    }
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
