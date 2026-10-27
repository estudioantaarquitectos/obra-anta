/* ==========================================================================
   ANTA OBRA - Modal & Alert Dialog System
   Guarantees explicit confirmation for Saving and Deleting as required:
   "seimpre habrá confirmaciónd e guardado y borrado"
   ========================================================================== */

let modalStack = [];

/**
 * Safely handles backdrop dismiss so dragging/selecting text inside
 * the modal window never triggers accidental closure on mouseup outside.
 */
function attachBackdropDismiss(backdrop, cleanup, allowBackdropDismiss = true) {
  if (!allowBackdropDismiss) return;
  let isMouseDownOnBackdrop = false;
  backdrop.addEventListener('mousedown', (e) => {
    isMouseDownOnBackdrop = (e.target === backdrop);
  });
  backdrop.addEventListener('mouseup', (e) => {
    if (isMouseDownOnBackdrop && e.target === backdrop) {
      cleanup();
    }
    isMouseDownOnBackdrop = false;
  });
}

export const modal = {
  /**
   * Confirmation dialog for SAVING (always requested by user specification)
   */
  confirmSave({ title = 'Confirmar Guardado', message = '¿Desea guardar los cambios realizados en el documento?', details = '', confirmText = 'Confirmar y Guardar', cancelText = 'Revisar / Cancelar', onConfirm }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    const zIndex = 100 + (modalStack.length + 1) * 20;
    backdrop.style.zIndex = zIndex;
    backdrop.innerHTML = `
      <div class="modal-window">
        <div class="modal-header">
          <div class="modal-title" style="color: var(--primary);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            ${title}
          </div>
          <button class="modal-close-btn" id="modal-close-x">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: ${details ? '0.75rem' : '0'}; line-height: 1.5;">
            ${message}
          </p>
          ${details ? `<div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">${details}</div>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>
          <button class="btn btn-primary" id="modal-confirm-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    modalStack.push(backdrop);

    const cleanup = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 200);
      modalStack = modalStack.filter(m => m !== backdrop);
    };

    backdrop.querySelector('#modal-close-x').onclick = cleanup;
    backdrop.querySelector('#modal-cancel-btn').onclick = cleanup;
    backdrop.querySelector('#modal-confirm-btn').onclick = () => {
      cleanup();
      if (typeof onConfirm === 'function') onConfirm();
    };

    attachBackdropDismiss(backdrop, cleanup, true);
  },

  /**
   * Confirmation dialog for DELETING (always requested by user specification)
   */
  confirmDelete({ title = 'Confirmar Eliminación', message = '¿Está seguro de que desea eliminar este elemento?', itemName = '', count = 1, confirmText = 'Eliminar definitivamente', cancelText = 'Cancelar', onConfirm }) {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.innerHTML = `
      <div class="modal-window">
        <div class="modal-header">
          <div class="modal-title" style="color: var(--color-danger);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            ${title}
          </div>
          <button class="modal-close-btn" id="modal-close-x">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.75rem; line-height: 1.5;">
            ${message}
          </p>
          ${itemName ? `
            <div style="background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.88rem; color: var(--color-danger); font-weight: 600;">
              ${count > 1 ? `Se eliminarán ${count} elementos seleccionados.` : `Elemento: ${itemName}`}
            </div>
          ` : ''}
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.75rem;">
            ⚠️ Esta acción es irreversible y no se podrá deshacer.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>
          <button class="btn btn-danger" id="modal-confirm-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    activeModal = backdrop;

    const cleanup = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 200);
      activeModal = null;
    };

    backdrop.querySelector('#modal-close-x').onclick = cleanup;
    backdrop.querySelector('#modal-cancel-btn').onclick = cleanup;
    backdrop.querySelector('#modal-confirm-btn').onclick = () => {
      cleanup();
      if (typeof onConfirm === 'function') onConfirm();
    };

    attachBackdropDismiss(backdrop, cleanup, true);
  },

  /**
   * Confirmation dialog with mandatory text verification (e.g. typing "ELIMINAR")
   */
  confirmTextVerification({
    title = 'Confirmar Eliminación Definitiva',
    message = '¿Está seguro de que desea eliminar este elemento?',
    details = '',
    verificationKeyword = 'ELIMINAR',
    confirmText = 'Eliminar definitivamente',
    cancelText = 'Cancelar',
    onConfirm
  }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    const zIndex = 100 + (modalStack.length + 1) * 20;
    backdrop.style.zIndex = zIndex;

    backdrop.innerHTML = `
      <div class="modal-window">
        <div class="modal-header">
          <div class="modal-title" style="color: var(--color-danger); display: flex; align-items: center; gap: 0.5rem;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            ${title}
          </div>
          <button class="modal-close-btn" id="modal-verify-close-x">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.75rem; line-height: 1.5;">
            ${message}
          </div>
          ${details ? `
            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              ${details}
            </div>
          ` : ''}

          <div style="background: #fff5f5; border: 1.5px solid #fecaca; border-radius: var(--radius-sm); padding: 0.85rem 1rem; margin-top: 0.75rem;">
            <label for="modal-verify-input" style="display: block; font-size: 0.84rem; font-weight: 600; color: #991b1b; margin-bottom: 0.4rem;">
              Para confirmar, escriba la palabra <span style="background: #fee2e2; padding: 2px 6px; border-radius: 4px; letter-spacing: 1px; font-family: monospace; font-size: 0.95rem; color: #b91c1c;">${verificationKeyword}</span> a continuación:
            </label>
            <input 
              type="text" 
              id="modal-verify-input" 
              class="form-control" 
              placeholder="Escriba ${verificationKeyword}" 
              autocomplete="off" 
              style="font-size: 0.92rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;" 
            />
          </div>

          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.75rem; margin-bottom: 0;">
            ⚠️ Esta acción es irreversible y eliminará todos los registros y documentos asociados.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-verify-cancel-btn">${cancelText}</button>
          <button class="btn btn-danger" id="modal-verify-confirm-btn" disabled style="opacity: 0.5; cursor: not-allowed;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    modalStack.push(backdrop);

    const cleanup = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 200);
      modalStack = modalStack.filter(m => m !== backdrop);
    };

    const input = backdrop.querySelector('#modal-verify-input');
    const confirmBtn = backdrop.querySelector('#modal-verify-confirm-btn');

    const checkMatch = () => {
      const isMatch = (input.value || '').trim().toUpperCase() === verificationKeyword.toUpperCase();
      confirmBtn.disabled = !isMatch;
      confirmBtn.style.opacity = isMatch ? '1' : '0.5';
      confirmBtn.style.cursor = isMatch ? 'pointer' : 'not-allowed';
      return isMatch;
    };

    input.oninput = checkMatch;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (checkMatch()) {
          cleanup();
          if (typeof onConfirm === 'function') onConfirm();
        }
      }
    };

    backdrop.querySelector('#modal-verify-close-x').onclick = cleanup;
    backdrop.querySelector('#modal-verify-cancel-btn').onclick = cleanup;
    confirmBtn.onclick = () => {
      if (checkMatch()) {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
      }
    };

    attachBackdropDismiss(backdrop, cleanup, true);

    setTimeout(() => input.focus(), 100);
  },

  /**
   * Generic custom modal dialog
   */
  open({ title, contentHtml, footerHtml = '', size = 'md', closePrevious = true, closeOnBackdrop = false }) {
    if (closePrevious) {
      this.close();
    }

    const sizeClass = size === 'lg' ? 'modal-window-lg' : (size === 'xl' ? 'modal-window-xl' : '');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    const zIndex = 100 + (modalStack.length + 1) * 20;
    backdrop.style.zIndex = zIndex;

    backdrop.innerHTML = `
      <div class="modal-window ${sizeClass}">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close-btn" id="modal-close-x">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          ${contentHtml}
        </div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);
    modalStack.push(backdrop);

    const cleanup = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 200);
      modalStack = modalStack.filter(m => m !== backdrop);
    };

    backdrop.querySelector('#modal-close-x').onclick = cleanup;
    attachBackdropDismiss(backdrop, cleanup, closeOnBackdrop);

    return { backdrop, close: cleanup };
  },

  /**
   * Photo Lightbox Modal
   */
  openLightbox(url, title = 'Fotografía de Obra', caption = '', date = '') {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.innerHTML = `
      <div class="modal-window modal-window-lg" style="max-width: 800px; background: #0f172a; color: white;">
        <div class="modal-header" style="border-bottom-color: #334155;">
          <div class="modal-title" style="color: white; font-size: 1rem;">
            ${title} ${date ? `<span style="font-size: 0.8rem; font-weight: normal; color: #94a3b8; margin-left: 0.5rem;">(${date})</span>` : ''}
          </div>
          <button class="modal-close-btn" id="modal-close-x" style="color: #94a3b8;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body" style="padding: 0; background: #000; text-align: center;">
          <img src="${url}" alt="${title}" style="max-height: 65vh; max-width: 100%; margin: 0 auto; object-fit: contain;">
          ${caption ? `<div style="padding: 1rem; background: #1e293b; color: #f1f5f9; font-size: 0.9rem; text-align: left; line-height: 1.4;">${caption}</div>` : ''}
        </div>
        <div class="modal-footer" style="background: #0f172a; border-top-color: #334155;">
          <button class="btn btn-secondary" id="modal-close-btn" style="background: #334155; color: white; border: none;">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    activeModal = backdrop;

    const cleanup = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 200);
      activeModal = null;
    };

    backdrop.querySelector('#modal-close-x').onclick = cleanup;
    backdrop.querySelector('#modal-close-btn').onclick = cleanup;
    attachBackdropDismiss(backdrop, cleanup, true);
  },

  close(targetBackdrop = null) {
    if (targetBackdrop) {
      targetBackdrop.remove();
      modalStack = modalStack.filter(m => m !== targetBackdrop);
    } else {
      while (modalStack.length > 0) {
        const m = modalStack.pop();
        if (m) m.remove();
      }
    }
  }
};

/**
 * Toast Notifications
 */
let toastContainer = null;

export function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`;
  
  if (type === 'success') {
    icon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`;
  } else if (type === 'error') {
    icon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`;
  }

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
