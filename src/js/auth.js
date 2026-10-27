/* ==========================================================================
   ANTA OBRA - Authentication & RBAC (Role-Based Access Control)
   ========================================================================== */

import { db } from './db.js';

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

  login(username, password) {
    if (!username || password === undefined || password === null) {
      return { success: false, message: 'Introduzca usuario y contraseña' };
    }

    const cleanUsername = username.trim();
    const cleanPassword = String(password).trim();

    const user = db.getUserByUsername(cleanUsername);
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
  can(permission) {
    if (!this.currentUser) return false;
    if (this.isAdmin()) return true; // Admin has all rights

    if (!this.currentGroup || !this.currentGroup.permissions) return false;
    return this.currentGroup.permissions.includes(permission);
  }
}

export const auth = new AuthService();
