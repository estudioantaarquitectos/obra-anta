/* ==========================================================================
   ANTA OBRA - Storage & Database Manager
   Provides persistent LocalStorage / IndexedDB with automatic initial seed,
   full CRUD, backup export/import, and client-side photo optimization.
   ========================================================================== */

import { INITIAL_USERS, INITIAL_GROUPS, INITIAL_SETTINGS, INITIAL_AGENTES, INITIAL_OBRAS, INITIAL_ACTAS, INITIAL_REUNIONES, INITIAL_INFORMES, INITIAL_NOTAS } from './seed.js';
import {
  isSupabaseConfigured,
  fetchAllFromSupabase,
  syncAgenteToSupabase,
  deleteAgenteFromSupabase,
  syncObraToSupabase,
  deleteObraFromSupabase,
  syncActaToSupabase,
  deleteActaFromSupabase,
  syncInformeToSupabase,
  deleteInformeFromSupabase,
  syncNotaToSupabase,
  deleteNotaFromSupabase,
  syncUsuarioToSupabase,
  deleteUsuarioFromSupabase,
  syncGrupoToSupabase,
  deleteGrupoFromSupabase
} from './supabaseClient.js';
import { formatCurrency, parseCurrency } from './utils/currency.js';

const STORAGE_KEYS = {
  USERS: 'anta_obra_users',
  GROUPS: 'anta_obra_groups',
  SETTINGS: 'anta_obra_settings',
  OBRAS: 'anta_obra_obras',
  ACTIVE_OBRA: 'anta_obra_active_obra',
  AGENTES: 'anta_obra_agentes',
  ACTAS: 'anta_obra_actas',
  REUNIONES: 'anta_obra_reuniones',
  INFORMES: 'anta_obra_informes',
  NOTAS: 'anta_obra_notas',
  SESSION: 'anta_obra_session'
};

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.seed();
    } else {
      // Migration: Ensure OBRAS, AGENTES and relations exist
      this.checkMigrations();
    }
    // Background hydration from Supabase Cloud
    this.hydrateFromSupabase();
  }

  async hydrateFromSupabase() {
    if (!isSupabaseConfigured) return;
    try {
      const data = await fetchAllFromSupabase();
      if (!data) return;
      let updated = false;
      if (Array.isArray(data.agentes) && data.agentes.length > 0) {
        this.setCollection(STORAGE_KEYS.AGENTES, data.agentes);
        updated = true;
      }
      if (Array.isArray(data.obras) && data.obras.length > 0) {
        this.setCollection(STORAGE_KEYS.OBRAS, data.obras);
        updated = true;
      }
      if (Array.isArray(data.actas) && data.actas.length > 0) {
        this.setCollection(STORAGE_KEYS.ACTAS, data.actas);
        updated = true;
      }
      if (Array.isArray(data.informes) && data.informes.length > 0) {
        this.setCollection(STORAGE_KEYS.INFORMES, data.informes);
        updated = true;
      }
      if (Array.isArray(data.notas) && data.notas.length > 0) {
        this.setCollection(STORAGE_KEYS.NOTAS, data.notas);
        updated = true;
      }
      if (Array.isArray(data.grupos) && data.grupos.length > 0) {
        const localGroups = this.getGroups();
        const mergedGroups = [...localGroups];
        for (const remoteG of data.grupos) {
          const idx = mergedGroups.findIndex(g => String(g.id) === String(remoteG.id));
          if (idx >= 0) {
            mergedGroups[idx] = { ...mergedGroups[idx], ...remoteG };
          } else {
            mergedGroups.push(remoteG);
          }
        }
        this.setCollection(STORAGE_KEYS.GROUPS, mergedGroups);
        updated = true;
      }
      if (Array.isArray(data.usuarios) && data.usuarios.length > 0) {
        const localUsers = this.getUsers();
        const mergedUsers = [...localUsers];
        for (const remoteU of data.usuarios) {
          const idx = mergedUsers.findIndex(u => String(u.id) === String(remoteU.id) || u.username?.toLowerCase() === remoteU.username?.toLowerCase());
          if (idx >= 0) {
            mergedUsers[idx] = { ...mergedUsers[idx], ...remoteU };
          } else {
            mergedUsers.push(remoteU);
          }
        }
        this.setCollection(STORAGE_KEYS.USERS, mergedUsers);
        updated = true;
      }
      if (updated && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('anta:db-synced'));
      }
    } catch (err) {
      console.warn('Agente CONECTOR: Hidratación desde Supabase diferida:', err);
    }
  }

  seed() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(INITIAL_GROUPS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.AGENTES, JSON.stringify(INITIAL_AGENTES));
    localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(INITIAL_OBRAS));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_OBRA, 'obra-castillo-san-felipe');
    localStorage.setItem(STORAGE_KEYS.ACTAS, JSON.stringify(INITIAL_ACTAS));
    localStorage.setItem(STORAGE_KEYS.REUNIONES, JSON.stringify(INITIAL_REUNIONES));
    localStorage.setItem(STORAGE_KEYS.INFORMES, JSON.stringify(INITIAL_INFORMES));
    localStorage.setItem(STORAGE_KEYS.NOTAS, JSON.stringify(INITIAL_NOTAS));
  }

  checkMigrations() {
    if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(INITIAL_GROUPS));
    } else {
      const groups = this.getCollection(STORAGE_KEYS.GROUPS);
      let groupsChanged = false;
      groups.forEach(g => {
        if (!g.permissions) g.permissions = [];
        if (g.id === 'admin') {
          ['agentes:view', 'agentes:manage', 'backup:manage'].forEach(p => {
            if (!g.permissions.includes(p)) { g.permissions.push(p); groupsChanged = true; }
          });
        } else if (g.id === 'direccion_obra') {
          ['agentes:view', 'agentes:manage'].forEach(p => {
            if (!g.permissions.includes(p)) { g.permissions.push(p); groupsChanged = true; }
          });
        }
      });
      if (groupsChanged) {
        this.setCollection(STORAGE_KEYS.GROUPS, groups);
        groups.forEach(g => syncGrupoToSupabase(g));
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.AGENTES)) {
      localStorage.setItem(STORAGE_KEYS.AGENTES, JSON.stringify(INITIAL_AGENTES));
    } else {
      const agentes = this.getCollection(STORAGE_KEYS.AGENTES);
      let agentesChanged = false;
      const oldSaxonMap = {
        'ag-rosa-vilas': 'RV',
        'ag-sergio-beceiro': 'SB',
        'ag-ana-gallego': 'AG',
        'ag-juan-carlos-bello': 'JB',
        'ag-miguel-lopez': 'ML',
        'ag-maria-jose-gonzalez': 'MG',
        'ag-joaquin-ferrer': 'JF'
      };
      agentes.forEach(a => {
        const seedAg = INITIAL_AGENTES.find(sa => sa.id === a.id);
        if (!a.colorFondo && seedAg?.colorFondo) {
          a.colorFondo = seedAg.colorFondo;
          agentesChanged = true;
        }
        if (oldSaxonMap[a.id] && (!a.iniciales || a.iniciales === 'RR' || a.iniciales === 'SL' || a.iniciales === 'AN' || a.iniciales === 'JC' || a.iniciales === 'MR' || a.iniciales === 'MN')) {
          a.iniciales = oldSaxonMap[a.id];
          agentesChanged = true;
        } else if (!a.iniciales && seedAg?.iniciales) {
          a.iniciales = seedAg.iniciales;
          agentesChanged = true;
        }
      });
      if (agentesChanged) {
        this.setCollection(STORAGE_KEYS.AGENTES, agentes);
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.OBRAS)) {
      localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(INITIAL_OBRAS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_OBRA)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_OBRA, 'obra-castillo-san-felipe');
    }

    // Ensure all obras have an agentes array and updated initials
    const obras = this.getCollection(STORAGE_KEYS.OBRAS);
    let obrasChanged = false;
    obras.forEach(o => {
      if (!o.agentes || !Array.isArray(o.agentes) || o.agentes.length === 0) {
        const seedObra = INITIAL_OBRAS.find(initO => initO.id === o.id) || INITIAL_OBRAS[0];
        o.agentes = seedObra.agentes ? JSON.parse(JSON.stringify(seedObra.agentes)) : [];
        obrasChanged = true;
      } else {
        o.agentes.forEach(ag => {
          if (ag.id === 'ag-rosa-vilas' && (ag.iniciales === 'RR' || !ag.iniciales)) { ag.iniciales = 'RV'; obrasChanged = true; }
          if (ag.id === 'ag-sergio-beceiro' && (ag.iniciales === 'SL' || !ag.iniciales)) { ag.iniciales = 'SB'; obrasChanged = true; }
          if (ag.id === 'ag-ana-gallego' && (ag.iniciales === 'AN' || !ag.iniciales)) { ag.iniciales = 'AG'; obrasChanged = true; }
          if (ag.id === 'ag-juan-carlos-bello' && (ag.iniciales === 'JC' || !ag.iniciales)) { ag.iniciales = 'JB'; obrasChanged = true; }
          if (ag.id === 'ag-miguel-lopez' && (ag.iniciales === 'MR' || !ag.iniciales)) { ag.iniciales = 'ML'; obrasChanged = true; }
          if (ag.id === 'ag-maria-jose-gonzalez' && (ag.iniciales === 'MN' || !ag.iniciales)) { ag.iniciales = 'MG'; obrasChanged = true; }
          if (ag.id === 'ag-joaquin-ferrer' && (ag.iniciales === 'JC' || !ag.iniciales)) { ag.iniciales = 'JF'; obrasChanged = true; }
        });
      }

      // Normalizar presupuesto a moneda Euro (€) con dos decimales
      if (o.presupuestoAdjudicacion || o.presupuesto) {
        const formatted = formatCurrency(o.presupuestoAdjudicacion || o.presupuesto);
        const num = parseCurrency(o.presupuestoAdjudicacion || o.presupuesto);
        if (o.presupuestoAdjudicacion !== formatted || o.presupuesto !== num) {
          o.presupuestoAdjudicacion = formatted;
          o.presupuesto = num;
          obrasChanged = true;
        }
      }
    });
    if (obrasChanged) {
      this.setCollection(STORAGE_KEYS.OBRAS, obras);
    }

    // Ensure all actas have an obraId and normalized apartados
    const defaultObraId = 'obra-castillo-san-felipe';
    const actas = this.getCollection(STORAGE_KEYS.ACTAS);
    let actasChanged = false;
    actas.forEach(a => {
      if (!a.obraId) {
        a.obraId = defaultObraId;
        actasChanged = true;
      }
      if (!a.obra || a.obra.includes('NextGenEU')) {
        a.obra = 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';
        a.obraTitulo = a.obra;
        actasChanged = true;
      }
      if (!a.apartados || !Array.isArray(a.apartados) || a.apartados.length === 0) {
        const norm = normalizeActa(a);
        a.apartados = norm.apartados;
        actasChanged = true;
      }
      if (!a.modificadoPor) {
        a.modificadoPor = a.numero == 17 ? 'Sergio Beceiro Lodeiro' : 'Rosa Vilas Romalde';
        a.fechaModificacion = a.fechaModificacion || (a.fecha ? `${a.fecha}T18:00:00Z` : new Date().toISOString());
        actasChanged = true;
      }
    });
    if (actasChanged) this.setCollection(STORAGE_KEYS.ACTAS, actas);

    let informes = this.getCollection(STORAGE_KEYS.INFORMES);
    let infChanged = false;
    const fullOfficialTitle = 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';
    if (!informes.length || (informes.length === 1 && informes[0].id === 'inf-2025-09') || !informes.some(i => i.numero === 3)) {
      informes = JSON.parse(JSON.stringify(INITIAL_INFORMES));
      infChanged = true;
    } else {
      informes.forEach((i, idx) => {
        if (!i.obraId) {
          i.obraId = defaultObraId;
          infChanged = true;
        }
        if (!i.numero || (typeof i.numero === 'string' && i.numero.includes('/'))) {
          i.numero = idx + 1;
          infChanged = true;
        }
        if (i.datosXerais && i.datosXerais.proxecto && i.datosXerais.proxecto.includes('NextGenEU')) {
          i.datosXerais.proxecto = fullOfficialTitle;
          i.obraTitulo = fullOfficialTitle;
          infChanged = true;
        }
        if (!i.modificadoPor) {
          i.modificadoPor = i.numero == 2 ? 'Sergio Beceiro Lodeiro' : 'Rosa Vilas Romalde';
          i.fechaModificacion = i.fechaModificacion || (i.datosXerais?.dataInforme ? `${i.datosXerais.dataInforme}T19:00:00Z` : new Date().toISOString());
          infChanged = true;
        }
      });
    }
    if (infChanged) this.setCollection(STORAGE_KEYS.INFORMES, informes);

    const notas = this.getCollection(STORAGE_KEYS.NOTAS);
    let notasChanged = false;
    notas.forEach(n => {
      if (!n.obraId) {
        n.obraId = defaultObraId;
        notasChanged = true;
      }
      if (!n.modificadoPor) {
        n.modificadoPor = n.autor || 'Rosa Vilas Romalde';
        n.fechaModificacion = n.fechaModificacion || (n.fecha ? `${n.fecha}T12:00:00Z` : new Date().toISOString());
        notasChanged = true;
      }
    });
    if (notasChanged) this.setCollection(STORAGE_KEYS.NOTAS, notas);

    if (!localStorage.getItem(STORAGE_KEYS.REUNIONES)) {
      localStorage.setItem(STORAGE_KEYS.REUNIONES, JSON.stringify(INITIAL_REUNIONES));
    }

    // Purge mock test users (usr-rosa, usr-ana, etc.) preserving Admin and any user created by Admin
    const users = this.getCollection(STORAGE_KEYS.USERS);
    const mockTestUserIds = ['usr-rosa', 'usr-sergio', 'usr-ana', 'usr-juancarlos', 'usr-miguel', 'usr-maria'];
    const filteredUsers = users.filter(u => !mockTestUserIds.includes(u.id));
    if (filteredUsers.length !== users.length) {
      this.setCollection(STORAGE_KEYS.USERS, filteredUsers.length > 0 ? filteredUsers : INITIAL_USERS);
    }
  }

  resetToDefaults() {
    this.seed();
  }

  /* ----------------- Generic Collection Helpers ----------------- */
  getCollection(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error loading collection ${key}:`, e);
      return [];
    }
  }

  setCollection(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error saving collection ${key}:`, e);
      return false;
    }
  }

  /* ----------------- OBRAS Y EXPEDIENTES ----------------- */
  getObras() {
    return this.getCollection(STORAGE_KEYS.OBRAS);
  }

  getObraById(id) {
    if (!id) return null;
    const obras = this.getObras();
    return obras.find(o => String(o.id) === String(id)) || null;
  }

  getActiveObraId() {
    let activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_OBRA);
    if (!activeId) {
      const obras = this.getObras();
      if (obras.length > 0) {
        activeId = obras[0].id;
        this.setActiveObraId(activeId);
      }
    }
    return activeId;
  }

  setActiveObraId(id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_OBRA, id);
    const obra = this.getObraById(id);
    if (obra) {
      // Sync settings
      const settings = this.getSettings();
      settings.activeObraId = obra.id;
      settings.obraPrincipal = obra.titulo;
      settings.situacion = obra.situacion;
      settings.expediente = obra.expediente;
      settings.contratista = obra.contratista;
      settings.equipoTecnico = obra.direccionObra + (obra.direccionEjecucion ? ' / ' + obra.direccionEjecucion : '');
      settings.coordinadorCSS = obra.coordinadorCSS;
      settings.entidadPromotora = obra.promotor;
      this.saveSettings(settings);
    }
    return id;
  }

  getActiveObra() {
    const activeId = this.getActiveObraId();
    let obra = this.getObraById(activeId);
    if (!obra) {
      const obras = this.getObras();
      if (obras.length > 0) {
        this.setActiveObraId(obras[0].id);
        return obras[0];
      }
    }
    return obra;
  }

  saveObra(obra) {
    if (obra.presupuestoAdjudicacion || obra.presupuesto) {
      obra.presupuestoAdjudicacion = formatCurrency(obra.presupuestoAdjudicacion || obra.presupuesto);
      obra.presupuesto = parseCurrency(obra.presupuestoAdjudicacion);
    }
    const obras = this.getObras();
    const existingIndex = obras.findIndex(o => String(o.id) === String(obra.id));
    
    let saved;
    if (existingIndex >= 0) {
      obras[existingIndex] = {
        ...obras[existingIndex],
        ...obra,
        fechaModificacion: new Date().toISOString()
      };
      saved = obras[existingIndex];
    } else {
      saved = {
        ...obra,
        id: obra.id || `obra-${Date.now()}`,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      obras.unshift(saved);
    }
    this.setCollection(STORAGE_KEYS.OBRAS, obras);

    // If active obra or only obra, sync settings
    if (String(this.getActiveObraId()) === String(saved.id) || obras.length === 1) {
      this.setActiveObraId(saved.id);
    }
    syncObraToSupabase(saved);
    return saved;
  }

  deleteObra(id) {
    const obras = this.getObras();
    if (obras.length <= 1) {
      throw new Error('Debe existir al menos un expediente de obra en el sistema.');
    }
    const filtered = obras.filter(o => String(o.id) !== String(id));
    this.setCollection(STORAGE_KEYS.OBRAS, filtered);

    // Cascade delete related records
    const actas = this.getActas().filter(a => String(a.obraId) !== String(id));
    this.setCollection(STORAGE_KEYS.ACTAS, actas);

    const reuniones = this.getReuniones().filter(r => String(r.obraId) !== String(id));
    this.setCollection(STORAGE_KEYS.REUNIONES, reuniones);

    const informes = this.getInformes().filter(i => String(i.obraId) !== String(id));
    this.setCollection(STORAGE_KEYS.INFORMES, informes);

    const notas = this.getNotas().filter(n => String(n.obraId) !== String(id));
    this.setCollection(STORAGE_KEYS.NOTAS, notas);

    // If active was deleted, set another active
    if (String(this.getActiveObraId()) === String(id)) {
      this.setActiveObraId(filtered[0].id);
    }
    deleteObraFromSupabase(id);
    return true;
  }

  /* ----------------- AGENTES Y EQUIPO TÉCNICO ----------------- */
  getAgentes() {
    return this.getCollection(STORAGE_KEYS.AGENTES);
  }

  getAgenteById(id) {
    if (!id) return null;
    const agentes = this.getAgentes();
    return agentes.find(a => String(a.id) === String(id)) || null;
  }

  saveAgente(agente) {
    const agentes = this.getAgentes();
    const existingIndex = agentes.findIndex(a => String(a.id) === String(agente.id));
    let saved;

    if (existingIndex >= 0) {
      saved = {
        ...agentes[existingIndex],
        ...agente,
        fechaModificacion: new Date().toISOString()
      };
      agentes[existingIndex] = saved;
    } else {
      saved = {
        ...agente,
        id: agente.id || `ag-${Date.now()}`,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      agentes.push(saved);
    }
    this.setCollection(STORAGE_KEYS.AGENTES, agentes);

    // Also update cached details in assigned obras if any
    const obras = this.getObras();
    let obrasUpdated = false;
    obras.forEach(o => {
      if (o.agentes && Array.isArray(o.agentes)) {
        o.agentes.forEach(oa => {
          if (String(oa.agenteId) === String(saved.id)) {
            oa.nombre = saved.nombre;
            oa.cargo = saved.cargoHabitual || oa.cargo;
            oa.entidad = saved.entidad || oa.entidad;
            oa.email = saved.email || oa.email;
            oa.telefono = saved.telefono || oa.telefono;
            obrasUpdated = true;
          }
        });
      }
    });
    if (obrasUpdated) {
      this.setCollection(STORAGE_KEYS.OBRAS, obras);
    }

    syncAgenteToSupabase(saved);
    return saved;
  }

  deleteAgente(id) {
    let agentes = this.getAgentes();
    agentes = agentes.filter(a => String(a.id) !== String(id));
    this.setCollection(STORAGE_KEYS.AGENTES, agentes);

    // Also remove from any obras where assigned
    const obras = this.getObras();
    let obrasUpdated = false;
    obras.forEach(o => {
      if (o.agentes && Array.isArray(o.agentes)) {
        const origLen = o.agentes.length;
        o.agentes = o.agentes.filter(oa => String(oa.agenteId) !== String(id));
        if (o.agentes.length !== origLen) obrasUpdated = true;
      }
    });
    if (obrasUpdated) {
      this.setCollection(STORAGE_KEYS.OBRAS, obras);
    }

    deleteAgenteFromSupabase(id);
    return true;
  }

  getObrasByAgenteId(agenteId) {
    if (!agenteId) return [];
    const obras = this.getObras();
    return obras.filter(o => {
      if (!o.agentes || !Array.isArray(o.agentes)) return false;
      return o.agentes.some(oa => String(oa.agenteId) === String(agenteId));
    });
  }

  /* ----------------- ACTAS DE OBRA ----------------- */
  getActas(obraId = null) {
    const actas = this.getCollection(STORAGE_KEYS.ACTAS);
    const filtered = obraId ? actas.filter(a => String(a.obraId) === String(obraId)) : actas;
    return filtered.map(normalizeActa);
  }

  getActaById(id) {
    const actas = this.getCollection(STORAGE_KEYS.ACTAS);
    const found = actas.find(a => String(a.id) === String(id));
    return found ? normalizeActa(found) : null;
  }

  saveActa(acta) {
    const actas = this.getCollection(STORAGE_KEYS.ACTAS);
    const existingIndex = actas.findIndex(a => String(a.id) === String(acta.id));
    const normalized = normalizeActa(acta);
    const currentUser = this.getCurrentUserModifier();
    const now = new Date().toISOString();
    
    let saved;
    if (existingIndex >= 0) {
      saved = {
        ...actas[existingIndex],
        ...normalized,
        modificadoPor: currentUser,
        fechaModificacion: now
      };
      actas[existingIndex] = saved;
    } else {
      saved = {
        ...normalized,
        id: normalized.id || `acta-${Date.now()}`,
        obraId: normalized.obraId || this.getActiveObraId(),
        creadoPor: currentUser,
        modificadoPor: currentUser,
        fechaCreacion: now,
        fechaModificacion: now
      };
      actas.unshift(saved);
    }
    this.setCollection(STORAGE_KEYS.ACTAS, actas);
    syncActaToSupabase(saved);
    return saved;
  }

  deleteActa(id) {
    let actas = this.getCollection(STORAGE_KEYS.ACTAS);
    actas = actas.filter(a => String(a.id) !== String(id));
    this.setCollection(STORAGE_KEYS.ACTAS, actas);
    deleteActaFromSupabase(id);
    return true;
  }

  deleteMultipleActas(ids) {
    const idSet = new Set(ids.map(String));
    let actas = this.getCollection(STORAGE_KEYS.ACTAS);
    actas = actas.filter(a => !idSet.has(String(a.id)));
    this.setCollection(STORAGE_KEYS.ACTAS, actas);
    ids.forEach(id => deleteActaFromSupabase(id));
    return true;
  }

  getNextActaNumber(obraId = null) {
    const actas = this.getActas(obraId);
    if (!actas.length) return 1;
    const maxNum = actas.reduce((max, a) => {
      const n = parseInt(a.numero, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    return maxNum + 1;
  }

  /* ----------------- REUNIONES OFICIAIS ----------------- */
  getReuniones(obraId = null) {
    const reuniones = this.getCollection(STORAGE_KEYS.REUNIONES);
    const filtered = obraId ? reuniones.filter(r => String(r.obraId) === String(obraId)) : reuniones;
    return filtered.map(normalizeReunion);
  }

  getReunionById(id) {
    const reuniones = this.getCollection(STORAGE_KEYS.REUNIONES);
    const found = reuniones.find(r => String(r.id) === String(id));
    return found ? normalizeReunion(found) : null;
  }

  saveReunion(reunion) {
    const reuniones = this.getCollection(STORAGE_KEYS.REUNIONES);
    const existingIndex = reuniones.findIndex(r => String(r.id) === String(reunion.id));
    const normalized = normalizeReunion(reunion);
    const currentUser = this.getCurrentUserModifier();
    const now = new Date().toISOString();
    
    let saved;
    if (existingIndex >= 0) {
      saved = {
        ...reuniones[existingIndex],
        ...normalized,
        modificadoPor: currentUser,
        fechaModificacion: now
      };
      reuniones[existingIndex] = saved;
    } else {
      saved = {
        ...normalized,
        id: normalized.id || `reu-${Date.now()}`,
        obraId: normalized.obraId || this.getActiveObraId(),
        creadoPor: currentUser,
        modificadoPor: currentUser,
        fechaCreacion: now,
        fechaModificacion: now
      };
      reuniones.unshift(saved);
    }
    this.setCollection(STORAGE_KEYS.REUNIONES, reuniones);
    syncActaToSupabase(saved);
    return saved;
  }

  deleteReunion(id) {
    let reuniones = this.getCollection(STORAGE_KEYS.REUNIONES);
    reuniones = reuniones.filter(r => String(r.id) !== String(id));
    this.setCollection(STORAGE_KEYS.REUNIONES, reuniones);
    deleteActaFromSupabase(id);
    return true;
  }

  deleteMultipleReuniones(ids) {
    const idSet = new Set(ids.map(String));
    let reuniones = this.getCollection(STORAGE_KEYS.REUNIONES);
    reuniones = reuniones.filter(r => !idSet.has(String(r.id)));
    this.setCollection(STORAGE_KEYS.REUNIONES, reuniones);
    ids.forEach(id => deleteActaFromSupabase(id));
    return true;
  }

  getNextReunionNumber(obraId = null) {
    const reuniones = this.getReuniones(obraId);
    if (!reuniones.length) return 1;
    const maxNum = reuniones.reduce((max, r) => {
      const n = parseInt(r.numero, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    return maxNum + 1;
  }

  /* ----------------- INFORMES DT-05 ----------------- */
  getInformes(obraId = null) {
    const informes = this.getCollection(STORAGE_KEYS.INFORMES);
    if (obraId) {
      return informes.filter(i => String(i.obraId) === String(obraId));
    }
    return informes;
  }

  getInformeById(id) {
    const informes = this.getCollection(STORAGE_KEYS.INFORMES);
    return informes.find(inf => String(inf.id) === String(id)) || null;
  }

  saveInforme(informe) {
    const informes = this.getCollection(STORAGE_KEYS.INFORMES);
    const existingIndex = informes.findIndex(i => String(i.id) === String(informe.id));
    const currentUser = this.getCurrentUserModifier();
    const now = new Date().toISOString();
    
    let saved;
    if (existingIndex >= 0) {
      saved = {
        ...informes[existingIndex],
        ...informe,
        modificadoPor: currentUser,
        fechaModificacion: now
      };
      informes[existingIndex] = saved;
    } else {
      saved = {
        ...informe,
        id: informe.id || `inf-${Date.now()}`,
        obraId: informe.obraId || this.getActiveObraId(),
        creadoPor: currentUser,
        modificadoPor: currentUser,
        fechaCreacion: now,
        fechaModificacion: now
      };
      informes.unshift(saved);
    }
    this.setCollection(STORAGE_KEYS.INFORMES, informes);
    syncInformeToSupabase(saved);
    return saved;
  }

  deleteInforme(id) {
    let informes = this.getCollection(STORAGE_KEYS.INFORMES);
    informes = informes.filter(i => String(i.id) !== String(id));
    this.setCollection(STORAGE_KEYS.INFORMES, informes);
    deleteInformeFromSupabase(id);
    return true;
  }

  deleteMultipleInformes(ids) {
    const idSet = new Set(ids.map(String));
    let informes = this.getCollection(STORAGE_KEYS.INFORMES);
    informes = informes.filter(i => !idSet.has(String(i.id)));
    this.setCollection(STORAGE_KEYS.INFORMES, informes);
    ids.forEach(id => deleteInformeFromSupabase(id));
    return true;
  }

  getNextInformeNumber(obraId = null) {
    const informes = this.getInformes(obraId);
    if (!informes.length) return 1;
    const maxNum = informes.reduce((max, inf) => {
      const n = parseInt(inf.numero, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    return maxNum + 1;
  }

  /* ----------------- NOTAS DE OBRA / BITÁCORA ----------------- */
  getNotas(obraId = null) {
    const notas = this.getCollection(STORAGE_KEYS.NOTAS);
    if (obraId) {
      return notas.filter(n => String(n.obraId) === String(obraId));
    }
    return notas;
  }

  getNotaById(id) {
    return this.getNotas().find(n => String(n.id) === String(id)) || null;
  }

  saveNota(nota) {
    const notas = this.getNotas();
    const existingIndex = notas.findIndex(n => String(n.id) === String(nota.id));
    const currentUser = this.getCurrentUserModifier();
    const now = new Date().toISOString();
    
    let saved;
    if (existingIndex >= 0) {
      saved = {
        ...notas[existingIndex],
        ...nota,
        modificadoPor: currentUser,
        fechaModificacion: now
      };
      notas[existingIndex] = saved;
    } else {
      saved = {
        ...nota,
        id: nota.id || `not-${Date.now()}`,
        obraId: nota.obraId || this.getActiveObraId(),
        fecha: nota.fecha || now.split('T')[0],
        autor: nota.autor || currentUser,
        creadoPor: currentUser,
        modificadoPor: currentUser,
        fechaCreacion: now,
        fechaModificacion: now
      };
      notas.unshift(saved);
    }
    this.setCollection(STORAGE_KEYS.NOTAS, notas);
    syncNotaToSupabase(saved);
    return saved;
  }

  deleteNota(id) {
    let notas = this.getNotas();
    notas = notas.filter(n => String(n.id) !== String(id));
    this.setCollection(STORAGE_KEYS.NOTAS, notas);
    deleteNotaFromSupabase(id);
    return true;
  }

  /* ----------------- USERS & GROUPS ----------------- */
  getUsers() {
    return this.getCollection(STORAGE_KEYS.USERS);
  }

  getUserById(id) {
    return this.getUsers().find(u => String(u.id) === String(id)) || null;
  }

  getUserByUsername(username) {
    if (!username) return null;
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  saveUser(user) {
    const users = this.getUsers();
    const existingIndex = users.findIndex(u => String(u.id) === String(user.id));
    let savedUser;
    
    if (existingIndex >= 0) {
      savedUser = { ...users[existingIndex], ...user };
      users[existingIndex] = savedUser;
    } else {
      savedUser = {
        ...user,
        id: user.id || `usr-${Date.now()}`,
        active: user.active !== undefined ? user.active : true
      };
      users.push(savedUser);
    }
    this.setCollection(STORAGE_KEYS.USERS, users);
    syncUsuarioToSupabase(savedUser);
    return savedUser;
  }

  deleteUser(id) {
    const user = this.getUserById(id);
    if (user && user.username.toLowerCase() === 'admin') {
      throw new Error('No es posible eliminar el usuario Admin principal del sistema.');
    }
    let users = this.getUsers();
    users = users.filter(u => String(u.id) !== String(id));
    this.setCollection(STORAGE_KEYS.USERS, users);
    deleteUsuarioFromSupabase(id);
    return true;
  }

  getGroups() {
    return this.getCollection(STORAGE_KEYS.GROUPS);
  }

  getGroupById(id) {
    return this.getGroups().find(g => String(g.id) === String(id)) || null;
  }

  saveGroup(group) {
    const groups = this.getGroups();
    const existingIndex = groups.findIndex(g => String(g.id) === String(group.id));
    let savedGroup;
    
    if (existingIndex >= 0) {
      savedGroup = { ...groups[existingIndex], ...group };
      groups[existingIndex] = savedGroup;
    } else {
      savedGroup = {
        ...group,
        id: group.id || `grp-${Date.now()}`
      };
      groups.push(savedGroup);
    }
    this.setCollection(STORAGE_KEYS.GROUPS, groups);
    syncGrupoToSupabase(savedGroup);
    return savedGroup;
  }

  deleteGroup(id) {
    if (id === 'admin') {
      throw new Error('No es posible eliminar el grupo Administradores principal.');
    }
    let groups = this.getGroups();
    groups = groups.filter(g => String(g.id) !== String(id));
    this.setCollection(STORAGE_KEYS.GROUPS, groups);
    deleteGrupoFromSupabase(id);

    // Reasignar usuarios vinculados al grupo eliminado hacia admin
    let users = this.getUsers();
    let updated = false;
    users = users.map(u => {
      if (u.role === id) {
        updated = true;
        const reassigned = { ...u, role: 'admin' };
        syncUsuarioToSupabase(reassigned);
        return reassigned;
      }
      return u;
    });
    if (updated) {
      this.setCollection(STORAGE_KEYS.USERS, users);
    }
    return true;
  }

  /* ----------------- SETTINGS ----------------- */
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }

  /* ----------------- SESSION ----------------- */
  getSession() {
    try {
      const session = localStorage.getItem(STORAGE_KEYS.SESSION);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  }

  setSession(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        cargo: user.cargo,
        loginAt: new Date().toISOString()
      }));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }

  getCurrentUserModifier() {
    const session = this.getSession();
    if (session && (session.name || session.username)) {
      return session.name || session.username;
    }
    return 'Admin';
  }

  /* ----------------- BACKUP / RESTORE ----------------- */
  exportBackup() {
    return {
      exportedAt: new Date().toISOString(),
      version: '1.2.0',
      users: this.getUsers(),
      groups: this.getGroups(),
      settings: this.getSettings(),
      agentes: this.getAgentes(),
      obras: this.getObras(),
      activeObraId: this.getActiveObraId(),
      actas: this.getActas(),
      reuniones: this.getReuniones(),
      informes: this.getInformes(),
      notas: this.getNotas()
    };
  }

  importBackup(backupData) {
    if (!backupData || !backupData.users || !backupData.actas) {
      throw new Error('Formato de copia de seguridad no válido.');
    }
    this.setCollection(STORAGE_KEYS.USERS, backupData.users);
    this.setCollection(STORAGE_KEYS.GROUPS, backupData.groups || INITIAL_GROUPS);
    this.setCollection(STORAGE_KEYS.SETTINGS, backupData.settings || INITIAL_SETTINGS);
    this.setCollection(STORAGE_KEYS.AGENTES, backupData.agentes || INITIAL_AGENTES);
    this.setCollection(STORAGE_KEYS.OBRAS, backupData.obras || INITIAL_OBRAS);
    if (backupData.activeObraId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_OBRA, backupData.activeObraId);
    }
    this.setCollection(STORAGE_KEYS.ACTAS, backupData.actas);
    this.setCollection(STORAGE_KEYS.REUNIONES, backupData.reuniones || INITIAL_REUNIONES);
    this.setCollection(STORAGE_KEYS.INFORMES, backupData.informes || []);
    this.setCollection(STORAGE_KEYS.NOTAS, backupData.notas || []);
    return true;
  }

  /* ----------------- IMAGE OPTIMIZER HELPER ----------------- */
  compressImage(file, maxWidth = 1000, quality = 0.65) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  // IndexedDB for large binary attachments (PDF files)
  _openPdfDb() {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return resolve(null);
      }
      try {
        const request = window.indexedDB.open('anta_obra_pdf_store', 1);
        request.onupgradeneeded = (e) => {
          const idb = e.target.result;
          if (!idb.objectStoreNames.contains('files')) {
            idb.createObjectStore('files', { keyPath: 'id' });
          }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async savePdfFile(id, dataUrlOrBase64, name = '', size = 0) {
    try {
      const idb = await this._openPdfDb();
      if (!idb) return false;
      return new Promise((resolve) => {
        const tx = idb.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        store.put({ id, data: dataUrlOrBase64, name, size, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn('Error guardando PDF en IndexedDB:', err);
      return false;
    }
  }

  async getPdfFile(id) {
    try {
      const idb = await this._openPdfDb();
      if (!idb) return null;
      return new Promise((resolve) => {
        const tx = idb.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn('Error obteniendo PDF de IndexedDB:', err);
      return null;
    }
  }

  async deletePdfFile(id) {
    try {
      const idb = await this._openPdfDb();
      if (!idb) return false;
      return new Promise((resolve) => {
        const tx = idb.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn('Error eliminando PDF de IndexedDB:', err);
      return false;
    }
  }
}

export const db = new Database();

/**
 * Checks if a role/cargo corresponds by default to a signer
 * (Directores de Obra and Directores de Ejecución)
 */
export function isDefaultSignerRole(cargo = '', rol = '') {
  const combined = `${cargo || ''} ${rol || ''}`.toLowerCase();
  // Directores de Obra
  if (combined.includes('director de obra') || combined.includes('directora de obra') || 
      combined.includes('dirección de obra') || combined.includes('direccion de obra') || 
      /\bdo\b/.test(combined)) {
    return true;
  }
  // Directores de Ejecución
  if (combined.includes('ejecuci') || combined.includes('aparejad') || 
      combined.includes('arquitecto técnico') || combined.includes('arquitecta técnica') || 
      /\bdem?\b/.test(combined)) {
    return true;
  }
  return false;
}

/**
 * Normalizes an Acta object, ensuring that apartados and secciones exist,
 * and maintaining backwards compatibility with legacy fields.
 */
export function normalizeActa(acta) {
  if (!acta) return acta;
  const clone = { ...acta };
  clone.anexosPdf = clone.anexosPdf || [];
  clone.fotos = Array.isArray(clone.fotos) ? clone.fotos : [];

  if (!clone.apartados || !Array.isArray(clone.apartados) || clone.apartados.length === 0) {
    const apartados = [];

    // 1. Cuestiones Tratadas
    if (clone.cuestionesTratadas && clone.cuestionesTratadas.length > 0) {
      apartados.push({
        id: 'ap-1',
        titulo: 'CUESTIONES TRATADAS EN REUNIÓN',
        secciones: clone.cuestionesTratadas.map((c, i) => ({
          id: c.id || `sec-1-${i + 1}`,
          titulo: c.subtitulo || `Tema ${i + 1}`,
          texto: Array.isArray(c.puntos) ? c.puntos.join('\n') : (c.puntos || '')
        }))
      });
    }

    // 2. Indicaciones de Seguridad y Salud
    if (clone.indicacionesSeguridad && clone.indicacionesSeguridad.length > 0) {
      apartados.push({
        id: 'ap-2',
        titulo: 'INDICACIONES POR PARTE DEL COORDINADOR DE SEGURIDAD Y SALUD',
        secciones: [
          {
            id: 'sec-2-1',
            titulo: 'Medidas Preventivas e EPIS',
            texto: Array.isArray(clone.indicacionesSeguridad)
              ? clone.indicacionesSeguridad.join('\n')
              : clone.indicacionesSeguridad
          }
        ]
      });
    }

    // 3. Actuaciones Previstas
    if (clone.actuacionesPrevistas && clone.actuacionesPrevistas.length > 0) {
      apartados.push({
        id: 'ap-3',
        titulo: 'ACTUACIONES PREVISTAS',
        secciones: [
          {
            id: 'sec-3-1',
            titulo: 'Próximas Actuaciones',
            texto: Array.isArray(clone.actuacionesPrevistas)
              ? clone.actuacionesPrevistas.join('\n')
              : clone.actuacionesPrevistas
          }
        ]
      });
    }

    // Default if completely empty
    if (apartados.length === 0) {
      apartados.push({
        id: 'ap-1',
        titulo: 'CUESTIONES TRATADAS EN REUNIÓN',
        secciones: [
          {
            id: 'sec-1-1',
            titulo: 'Carpinterías',
            texto: 'Se revisan las muestras de taller y remates de mochetas.'
          }
        ]
      });
    }

    clone.apartados = apartados;
  } else {
    clone.apartados = clone.apartados.map((ap, apIdx) => ({
      id: ap.id || `ap-${apIdx + 1}`,
      titulo: ap.titulo || `APARTADO ${apIdx + 1}`,
      secciones: (ap.secciones || []).map((sec, secIdx) => ({
        id: sec.id || `sec-${apIdx + 1}-${secIdx + 1}`,
        titulo: sec.titulo || `Sección ${apIdx + 1}.${secIdx + 1}`,
        texto: sec.texto || ''
      }))
    }));
  }

  // Synchronize legacy fields for views that query them
  if (clone.apartados && clone.apartados.length > 0) {
    if (!clone.cuestionesTratadas || !clone.cuestionesTratadas.length) {
      const firstAp = clone.apartados[0];
      clone.cuestionesTratadas = (firstAp.secciones || []).map(s => ({
        id: s.id,
        subtitulo: s.titulo,
        puntos: s.texto ? s.texto.split('\n').filter(Boolean) : []
      }));
    }
    if (!clone.indicacionesSeguridad || !clone.indicacionesSeguridad.length) {
      const segAp = clone.apartados.find(a => (a.titulo || '').toLowerCase().includes('segur'));
      if (segAp) {
        clone.indicacionesSeguridad = (segAp.secciones || []).flatMap(s => s.texto ? s.texto.split('\n').filter(Boolean) : []);
      }
    }
    if (!clone.actuacionesPrevistas || !clone.actuacionesPrevistas.length) {
      const actAp = clone.apartados.find(a => (a.titulo || '').toLowerCase().includes('previst') || (a.titulo || '').toLowerCase().includes('actua'));
      if (actAp) {
        clone.actuacionesPrevistas = (actAp.secciones || []).flatMap(s => s.texto ? s.texto.split('\n').filter(Boolean) : []);
      }
    }
  }

  return clone;
}

/**
 * Normaliza un objeto de Reunión oficial con sus campos específicos de reunión.
 */
export function normalizeReunion(data = {}) {
  const normalized = normalizeActa(data);
  normalized.tipoDocumento = 'reunion';
  normalized.tipoModalidad = data.tipoModalidad || data.tipoReunion || 'Presencial';
  normalized.lugar = data.lugar || 'Caseta de obra';
  normalized.hora = data.hora || '10:00';
  return normalized;
}

export { getAgentInitials, getAgentAvatarColors, renderAgentAvatarHtml, getApartado1Titulos, getUserDisplayName, formatModificationDate, renderUserModifierHtml } from './utils/avatar.js';

