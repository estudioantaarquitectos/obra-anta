/* ==========================================================================
   ANTA OBRA - Login View
   Clean, architectural, elegant authentication with official ANTA branding.
   ========================================================================== */

import { auth } from '../auth.js';
import { db } from '../db.js';
import { showToast } from '../modal.js';
import logoImg from '../../../LOGO_200px.png';

export function renderLogin(container, router) {
  container.innerHTML = `
    <div style="min-height: 100vh; width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 25%, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%); padding: 1.5rem;">
      <div class="card" style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.1), 0 0 1px 1px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0; overflow: hidden; margin: auto;">
        
        <!-- Header Branding (Captura 2) -->
        <div style="padding: 2.75rem 2rem 1.75rem; display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
          <div style="margin-bottom: 0.75rem;">
            <img src="${logoImg}" alt="ANTA Arquitectos" style="width: 215px; max-width: 100%; height: auto; display: block;" />
          </div>
          <div style="background-color: #1e293b; color: #ffffff; border-radius: 6px; text-align: center; padding: 5px 22px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); line-height: 1.2; user-select: none;">
            SEGUIMIENTO DE OBRA
          </div>
          <p style="font-size: 0.83rem; color: #64748b; margin-top: 1.1rem; margin-bottom: 0; line-height: 1.45;">
            Plataforma de Dirección de Obra, Actas e Informes
          </p>
        </div>

        <!-- Login Form -->
        <div class="card-body" style="padding: 2rem;">
          <form id="login-form">
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label required" for="login-username" style="font-weight: 600; font-size: 0.875rem; color: #334155; margin-bottom: 0.4rem; display: block;">Usuario</label>
              <div style="position: relative;">
                <input 
                  type="text" 
                  id="login-username" 
                  class="form-control" 
                  placeholder="Nome de usuario" 
                  required 
                  autocomplete="username"
                  style="padding-left: 2.6rem; height: 44px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.92rem; width: 100%;"
                />
                <div style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; display: flex; align-items: center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label required" for="login-password" style="font-weight: 600; font-size: 0.875rem; color: #334155; margin-bottom: 0.4rem; display: block;">Contrasinal</label>
              <div style="position: relative;">
                <input 
                  type="password" 
                  id="login-password" 
                  class="form-control" 
                  placeholder="••••••••" 
                  required 
                  autocomplete="current-password"
                  style="padding-left: 2.6rem; padding-right: 2.6rem; height: 44px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.92rem; width: 100%;"
                />
                <div style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; display: flex; align-items: center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <button type="button" id="toggle-pwd" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; padding: 0.3rem; border: none; background: transparent; cursor: pointer; display: flex; align-items: center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
            </div>

            <div id="login-error" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.84rem; margin-bottom: 1.25rem;">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; height: 46px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.6rem; border-radius: 8px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); border: none; color: white;">
              <span>Iniciar Sesión</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </form>
        </div>

        <div class="card-footer" style="justify-content: center; font-size: 0.78rem; color: #94a3b8; background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 1rem 1.5rem; text-align: center;">
          ANTA OBRA • Sistema de Dirección de Obra e Control de Calidade
        </div>

      </div>
    </div>
  `;

  // Password toggle
  const pwdInput = container.querySelector('#login-password');
  const toggleBtn = container.querySelector('#toggle-pwd');
  toggleBtn.onclick = () => {
    const isPwd = pwdInput.type === 'password';
    pwdInput.type = isPwd ? 'text' : 'password';
  };

  // Form Submit
  const form = container.querySelector('#login-form');
  const errDiv = container.querySelector('#login-error');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const user = container.querySelector('#login-username').value;
    const pass = container.querySelector('#login-password').value;

    const submitBtn = container.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await auth.login(user, pass);
      if (res.success) {
        showToast(`Benvido/a, ${res.user.name}`, 'success');
        router.navigate('dashboard');
      } else {
        errDiv.textContent = res.message;
        errDiv.style.display = 'block';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };
}
