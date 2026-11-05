/* ==========================================================================
   ANTA OBRA - Authentication & RBAC (Role-Based Access Control)
   ========================================================================== */

import { db } from './db.js';
import { findUsuarioInSupabase } from './supabaseClient.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentGroup = null;
    this.loadSession();
  }

  loadSession() {
    const session = db.getSession();
    if (session && session.userId) {
      const user = db.getUserById(session.userId);
      if (user && user.active) {
        this.currentUser = user;
        this.currentGroup = db.getGroupById(user.role);
        return true;
      }
    }
    this.currentUser = null;
    this.currentGroup = null;
    return false;
  }

  async login(username, password) {
    if (!username || password === undefined || password === null) {
      return { success: false, message: 'Introduzca usuario y contraseña' };
    }

    const cleanUsername = username.trim();
    const cleanPassword = String(password).trim();

    let user = db.getUserByUsername(cleanUsername);

    // Si no está en localStorage o la contraseña cambió en otro PC, sincronizar desde Supabase
    if (!user || String(user.password) !== cleanPassword) {
      await db.hydrateFromSupabase();
      user = db.getUserByUsername(cleanUsername);
      if (!user) {
        const remoteUser = await findUsuarioInSupabase(cleanUsername);
        if (remoteUser) {
          user = db.saveUser(remoteUser);
        }
      }
    }

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    if (!user.active) {
      return { success: false, message: 'La cuenta se encuentra desactivada. Contacte con el Administrador.' };
    }

    // Special check for Admin (0000) or user's stored password
    if (String(user.password) !== cleanPassword) {
      return { success: false, message: 'Contraseña incorrecta' };
    }

    this.currentUser = user;
    this.currentGroup = db.getGroupById(user.role);
    db.setSession(user);

    return { success: true, user };
  }

  logout() {
    this.currentUser = null;
    this.currentGroup = null;
    db.setSession(null);
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getUser() {
    return this.currentUser;
  }

  getGroup() {
    return this.currentGroup;
  }

  isAdmin() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || this.currentUser.username.toLowerCase() === 'admin';
  }

  /**
   * Check if current user has a specific permission
   * @param {string} permission e.g. 'actas:edit', 'users:manage'
   */
  /**
   * Verifica se o usuario actual ten permiso para ver e acceder a unha obra/expediente
   * @param {Object|string} obra Obxecto de obra ou ID de obra
   * @returns {boolean}
   */
  canAccessObra(obra) {
    if (!this.currentUser) {
      this.loadSession();
    }
    if (!this.currentUser) return false;
    if (this.isAdmin()) return true; // Admin sempre ten acceso total garantizado a tódalas obras

    const obraObj = typeof obra === 'string' ? db.getObraById(obra) : obra;
    if (!obraObj) return false;

    const assigned = Array.isArray(obraObj.usuariosAsignados) ? obraObj.usuariosAsignados : [];
    // Se non hai ningún usuario asignado explicitamente, só o Admin pode acceder
    if (assigned.length === 0) return false;

    const curId = String(this.currentUser.id || '').toLowerCase();
    const curUsername = String(this.currentUser.username || '').toLowerCase();

    return assigned.some(u => {
      const s = String(u).toLowerCase();
      return s === curId || s === curUsername;
    });
  }

  can(permission) {
    if (!this.currentUser) return false;
    if (this.isAdmin()) return true; // Admin has all rights

    if (!this.currentGroup || !this.currentGroup.permissions) return false;
    return this.currentGroup.permissions.includes(permission);
  }
}

export const auth = new AuthService();
