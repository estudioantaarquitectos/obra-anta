/* ==========================================================================
   ANTA OBRA - Login View
   Minimalist, clear, elegant authentication with default Admin credentials.
   ========================================================================== */

import { auth } from '../auth.js';
import { db } from '../db.js';
import { showToast } from '../modal.js';

export function renderLogin(container, router) {
  const users = db.getUsers();

  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 1.5rem;">
      <div class="card" style="width: 100%; max-width: 440px; box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); overflow: hidden;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 2.25rem 2rem 2rem; color: white; text-align: center;">
          <div style="width: 52px; height: 52px; background: rgba(255, 255, 255, 0.15); border-radius: var(--radius-md); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem; backdrop-filter: blur(4px);">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <h1 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.35rem;">ANTA OBRA</h1>
          <p style="font-size: 0.85rem; opacity: 0.9; max-width: 300px; margin: 0 auto; line-height: 1.4;">
            Gestión de Actas de Obra, Informes Mensuales y Dirección Facultativa
          </p>
        </div>

        <!-- Login Form -->
        <div class="card-body" style="padding: 2rem;">
          <form id="login-form">
            <div class="form-group">
              <label class="form-label required" for="login-username">Usuario</label>
              <div style="position: relative;">
                <input 
                  type="text" 
                  id="login-username" 
                  class="form-control" 
                  placeholder="Nome de usuario" 
                  required 
                  autocomplete="username"
                  style="padding-left: 2.5rem;"
                />
                <div style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required" for="login-password">Contrasinal</label>
              <div style="position: relative;">
                <input 
                  type="password" 
                  id="login-password" 
                  class="form-control" 
                  placeholder="••••••••" 
                  required 
                  autocomplete="current-password"
                  style="padding-left: 2.5rem; padding-right: 2.5rem;"
                />
                <div style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <button type="button" id="toggle-pwd" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); padding: 0.2rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
            </div>

            <div id="login-error" style="display: none; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 1.25rem;">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-size: 0.95rem; font-weight: 600;">
              Iniciar Sesión
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </form>

        </div>

        <div class="card-footer" style="justify-content: center; font-size: 0.78rem; color: var(--text-muted); background: #f8fafc;">
          ANTA OBRA • Sistema de Dirección de Obra y Control de Calidad
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

  form.onsubmit = (e) => {
    e.preventDefault();
    const user = container.querySelector('#login-username').value;
    const pass = container.querySelector('#login-password').value;

    const res = auth.login(user, pass);
    if (res.success) {
      showToast(`Benvido/a, ${res.user.name}`, 'success');
      router.navigate('dashboard');
    } else {
      errDiv.textContent = res.message;
      errDiv.style.display = 'block';
    }
  };
}
