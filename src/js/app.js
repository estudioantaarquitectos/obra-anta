/* ==========================================================================
   ANTA OBRA - Main Application Shell & Client Router
   ========================================================================== */

import { auth } from './auth.js';
import { db } from './db.js';
import { renderLogin } from './views/login.js';
import { renderObrasList } from './views/obrasList.js';
import { renderExpedienteView } from './views/expedienteView.js';
import { renderActaEditor } from './views/actaEditor.js';
import { renderActaPrint } from './views/actaPrint.js';
import { renderInformes } from './views/informes.js';
import { renderInformeEditor } from './views/informeEditor.js';
import { renderInformePrint } from './views/informePrint.js';
import { renderNotas } from './views/notas.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderAgentes } from './views/agentes.js';
import { renderSettings } from './views/settings.js';
import { isSupabaseConfigured } from './supabaseClient.js';
import logoImg from '../../LOGO_200px.png';

class AppRouter {
  constructor() {
    this.currentRoute = 'dashboard';
    this.currentParams = {};
    this.appRoot = document.getElementById('app');
    window.addEventListener('popstate', () => this.handlePopState());
    window.addEventListener('anta:db-synced', () => {
      if (
        !this.currentRoute.includes('editor') &&
        !this.currentRoute.includes('Editor') &&
        this.currentRoute !== 'login'
      ) {
        this.render();
      }
    });
  }

  init() {
    if (!auth.isAuthenticated()) {
      this.navigate('login');
    } else {
      this.navigate('dashboard');
    }
  }

  navigate(route, params = {}) {
    this.currentRoute = route;
    this.currentParams = params;
    
    // Check auth
    if (!auth.isAuthenticated() && route !== 'login') {
      this.currentRoute = 'login';
    } else if (auth.isAuthenticated() && route === 'login') {
      this.currentRoute = 'dashboard';
    }

    this.render();
  }

  handlePopState() {
    // Popstate handling if needed
  }

  render() {
    if (this.currentRoute === 'login') {
      this.appRoot.innerHTML = '<div id="view-container"></div>';
      renderLogin(document.getElementById('view-container'), this);
      return;
    }

    // Authenticated App Shell
    const user = auth.getUser();
    const group = auth.getGroup();
    const activeObra = db.getActiveObra();
    const obrasCount = db.getObras().length;
    const agentesCount = db.getAgentes().length;

    const actasCount = activeObra ? db.getActas(activeObra.id).length : db.getActas().length;
    const informesCount = activeObra ? db.getInformes(activeObra.id).length : db.getInformes().length;
    const notasCount = activeObra ? db.getNotas(activeObra.id).length : db.getNotas().length;
    const canManageUsers = auth.can('users:manage') || auth.isAdmin();

    const isExpedienteActive = this.currentRoute === 'expediente';
    const currentTab = this.currentParams.tab || 'actas';

    this.appRoot.innerHTML = `
      <div class="app-container">
        <!-- Sidebar Backdrop for Mobile -->
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <!-- Sidebar Navigation -->
        <aside class="app-sidebar" id="app-sidebar">
          
          <div class="sidebar-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <a href="javascript:void(0)" class="sidebar-brand" id="brand-logo-link" title="ANTA OBRA - Inicio">
                <img src="${logoImg}" alt="ANTA OBRA" class="sidebar-logo-img" />
              </a>
              <button class="mobile-nav-toggle" id="btn-close-sidebar" style="display: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div class="sidebar-subtitle-badge">
              Seguimiento de obra
            </div>
          </div>

          <!-- Active Obra Badge / Switcher in Sidebar -->
          <div class="sidebar-obra-badge" style="position: relative;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
              <div class="obra-title-subtle">Obra en seguimiento</div>
              <button class="btn-ghost btn-sm" id="btn-sidebar-switch-obra" style="padding: 0.15rem 0.4rem; font-size: 0.72rem; color: var(--primary); text-decoration: underline; cursor: pointer;" title="Ir al selector general de obras">
                Cambiar obra
              </button>
            </div>
            <div class="obra-name-subtle" title="${activeObra ? activeObra.titulo : 'Castillo de San Felipe'}" style="font-weight: 700;">
              ${activeObra ? activeObra.titulo : 'Castillo de San Felipe'}
            </div>
            ${activeObra ? `
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; font-family: monospace;">
                ${activeObra.expediente || 'AVS 03007 25/05'}
              </div>
            ` : ''}
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section-title">Navegación General</div>

            <!-- Selector de Obras / Expedientes (Dashboard Principal) -->
            <a href="javascript:void(0)" class="nav-item ${this.currentRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span>Expedientes de Obra</span>
              <span class="nav-badge">${obrasCount}</span>
            </a>

            <!-- Directorio Central de Agentes -->
            <a href="javascript:void(0)" class="nav-item ${this.currentRoute === 'agentes' ? 'active' : ''}" data-route="agentes">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Directorio de Agentes</span>
              <span class="nav-badge">${agentesCount}</span>
            </a>

            <!-- Expediente Activo y sus 3 secciones (Actas, Informes, Notas) -->
            ${activeObra ? `
              <div class="nav-section-title" style="margin-top: 1.25rem;">
                Expediente Activo
              </div>

              <a href="javascript:void(0)" class="nav-item ${(isExpedienteActive && currentTab === 'actas') || this.currentRoute === 'acta-editor' || this.currentRoute === 'acta-print' ? 'active' : ''}" data-route="expediente" data-tab="actas" data-id="${activeObra.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span>Actas Semanales</span>
                <span class="nav-badge">${actasCount}</span>
              </a>

              <a href="javascript:void(0)" class="nav-item ${(isExpedienteActive && currentTab === 'informes') || this.currentRoute === 'informes' || this.currentRoute === 'informe-editor' || this.currentRoute === 'informe-print' ? 'active' : ''}" data-route="expediente" data-tab="informes" data-id="${activeObra.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-3.5z"></path></svg>
                <span>Informes Mensuales</span>
                <span class="nav-badge">${informesCount}</span>
              </a>

              <a href="javascript:void(0)" class="nav-item ${(isExpedienteActive && currentTab === 'notas') || this.currentRoute === 'notas' ? 'active' : ''}" data-route="expediente" data-tab="notas" data-id="${activeObra.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <span>Notas</span>
                <span class="nav-badge">${notasCount}</span>
              </a>

              <a href="javascript:void(0)" class="nav-item ${isExpedienteActive && currentTab === 'ficha' ? 'active' : ''}" data-route="expediente" data-tab="ficha" data-id="${activeObra.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span>Ficha del Expediente</span>
              </a>
            ` : ''}

            ${canManageUsers ? `
              <div class="nav-section-title" style="margin-top: 1.25rem;">Administración</div>

              <a href="javascript:void(0)" class="nav-item ${this.currentRoute === 'usuarios' ? 'active' : ''}" data-route="usuarios">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span>Usuarios y Grupos</span>
              </a>
            ` : ''}

            <a href="javascript:void(0)" class="nav-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Configuración Global</span>
            </a>
          </nav>

          <!-- Sidebar Footer: Logged in User Profile -->
          <div class="sidebar-footer">
            <div class="user-profile-widget">
              <div class="user-avatar">
                ${getInitials(user.name)}
              </div>
              <div class="user-info">
                <div class="user-name" title="${user.name}">${user.name}</div>
                <div class="user-role-badge">${group ? group.name : user.role}</div>
              </div>
              <button class="btn-logout" id="btn-logout" title="Cerrar Sesión">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>

        </aside>

        <!-- Main Content Area -->
        <main class="app-main">
          
          <!-- Top Bar -->
          <header class="app-topbar">
            <div class="topbar-left">
              <button class="mobile-nav-toggle" id="btn-open-sidebar">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
              <div class="topbar-page-title">${getPageTitle(this.currentRoute, this.currentParams, activeObra)}</div>
            </div>

            <div class="topbar-right" style="display: flex; align-items: center; gap: 0.75rem;">
              ${isSupabaseConfigured ? `
                <div style="font-size: 0.75rem; color: #1e40af; background: #e0e7ff; padding: 0.2rem 0.55rem; border-radius: 999px; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;" title="Sincronización en tiempo real activa con Supabase PostgreSQL">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                  <span>Cloud DB</span>
                </div>
              ` : ''}
              <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem;">
                <span class="status-dot status-dot-green"></span>
                <span style="font-weight: 500;">En línea</span>
              </div>
            </div>
          </header>

          <!-- Dynamic View Container -->
          <div id="view-container"></div>

        </main>
      </div>
    `;

    // Wire Navigation & Sidebar
    this.wireShellEvents();

    // Render active route inside view-container
    const viewContainer = document.getElementById('view-container');
    switch (this.currentRoute) {
      case 'dashboard':
        renderObrasList(viewContainer, this);
        break;
      case 'expediente':
        renderExpedienteView(viewContainer, this, this.currentParams);
        break;
      case 'acta-editor':
        renderActaEditor(viewContainer, this, this.currentParams);
        break;
      case 'acta-print':
        renderActaPrint(viewContainer, this, this.currentParams);
        break;
      case 'informes':
        renderExpedienteView(viewContainer, this, { ...this.currentParams, tab: 'informes' });
        break;
      case 'informe-editor':
        renderInformeEditor(viewContainer, this, this.currentParams);
        break;
      case 'informe-print':
        renderInformePrint(viewContainer, this, this.currentParams);
        break;
      case 'notas':
        renderExpedienteView(viewContainer, this, { ...this.currentParams, tab: 'notas' });
        break;
      case 'usuarios':
        renderUsuarios(viewContainer, this);
        break;
      case 'agentes':
        renderAgentes(viewContainer, this);
        break;
      case 'settings':
        renderSettings(viewContainer, this);
        break;
      default:
        renderObrasList(viewContainer, this);
    }
  }

  wireShellEvents() {
    // Brand logo navigation to dashboard
    const brandLink = this.appRoot.querySelector('#brand-logo-link');
    if (brandLink) {
      brandLink.onclick = () => {
        this.closeMobileSidebar();
        this.navigate('dashboard');
      };
    }

    // Navigation links in sidebar
    this.appRoot.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
      link.onclick = () => {
        const route = link.dataset.route;
        const tab = link.dataset.tab;
        const id = link.dataset.id;
        if (route) {
          this.closeMobileSidebar();
          const params = {};
          if (id) params.id = id;
          if (tab) params.tab = tab;
          this.navigate(route, params);
        }
      };
    });

    // Switch obra button in sidebar
    const switchObraBtn = this.appRoot.querySelector('#btn-sidebar-switch-obra');
    if (switchObraBtn) {
      switchObraBtn.onclick = () => {
        this.closeMobileSidebar();
        this.navigate('dashboard');
      };
    }

    // Logout
    const logoutBtn = this.appRoot.querySelector('#btn-logout');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        auth.logout();
        this.navigate('login');
      };
    }

    // Mobile Sidebar Drawer
    const openBtn = this.appRoot.querySelector('#btn-open-sidebar');
    const closeBtn = this.appRoot.querySelector('#btn-close-sidebar');
    const overlay = this.appRoot.querySelector('#sidebar-overlay');
    const sidebar = this.appRoot.querySelector('#app-sidebar');

    if (openBtn && sidebar && overlay) {
      openBtn.onclick = () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        if (closeBtn) closeBtn.style.display = 'flex';
      };
    }

    if (closeBtn && sidebar && overlay) {
      closeBtn.onclick = () => this.closeMobileSidebar();
    }

    if (overlay) {
      overlay.onclick = () => this.closeMobileSidebar();
    }
  }

  closeMobileSidebar() {
    const overlay = this.appRoot.querySelector('#sidebar-overlay');
    const sidebar = this.appRoot.querySelector('#app-sidebar');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }
}

function getPageTitle(route, params, activeObra) {
  switch (route) {
    case 'dashboard': 
      return 'Expedientes de Obra';
    case 'expediente': {
      const tab = params.tab || 'actas';
      const expCode = activeObra ? `[${activeObra.expediente}]` : '';
      if (tab === 'informes') return `Informes Mensuais ${expCode}`;
      if (tab === 'notas') return `Notas ${expCode}`;
      if (tab === 'ficha') return `Ficha Oficial do Expediente ${expCode}`;
      return `Actas Semanais da Dirección Facultativa ${expCode}`;
    }
    case 'acta-editor': 
      return params.id ? 'Edición de Acta Semanal' : 'Nova Acta Semanal';
    case 'acta-print': 
      return 'Acta Semanal Oficial';
    case 'informes': 
      return 'Informes Mensuais';
    case 'informe-editor': 
      return params.id ? 'Edición de Informe Mensual' : 'Novo Informe Mensual';
    case 'informe-print': 
      return 'Informe Mensual Oficial';
    case 'notas': 
      return 'Notas';
    case 'usuarios': 
      return 'Control de Usuarios e Permisos';
    case 'agentes':
      return 'Directorio de Agentes e Equipo Técnico';
    case 'settings': 
      return 'Configuración Global';
    default: 
      return 'ANTA OBRA';
  }
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

// App bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const router = new AppRouter();
  window.appRouter = router;
  router.init();
});
