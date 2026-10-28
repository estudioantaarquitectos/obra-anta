/* ==========================================================================
   ANTA OBRA - Agent Profile Avatar & Color System
   Handles agent initials generation, role-based default colors,
   custom background colors, and avatar rendering for cards & lists.
   ========================================================================== */

/**
 * Extracts initials from an agent's name according to Spanish naming conventions:
 * - 1 word: first 2 characters, e.g. "Cabero" -> "CA"
 * - 2 words (Nombre + Apellido): "Rosa Vilas" -> "RV"
 * - 3 words (Nombre + 1º Apellido + 2º Apellido): "Rosa Vilas Romalde" -> "RV"
 * - 4+ words (Nombre 1 + Nombre 2 + 1º Apellido + 2º Apellido):
 *   "Juan Carlos López Martín" -> "JL"
 *   "María José González Novo" -> "MG"
 *   "Juan Carlos Bello Criado" -> "JB"
 * Filters out common particles ('de', 'del', 'la', 'y', etc.)
 */
export function getAgentInitials(name) {
  if (!name || typeof name !== 'string') return 'AG';
  const clean = name.trim();
  if (!clean) return 'AG';

  // Common particles in Spanish and Galician names
  const particles = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'da', 'do', 'das', 'dos', 'van', 'von', 'e']);

  const allWords = clean.split(/\s+/).filter(Boolean);
  if (allWords.length === 0) return 'AG';
  if (allWords.length === 1) {
    return allWords[0].substring(0, 2).toUpperCase();
  }

  // Filter out connectors if there are sufficient words
  const meaningful = allWords.filter(w => !particles.has(w.toLowerCase()));
  const words = meaningful.length >= 2 ? meaningful : allWords;

  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  if (words.length === 3) {
    // [Nombre] [1º Apellido] [2º Apellido] -> Primer Nombre + Primer Apellido
    // e.g. "Rosa Vilas Romalde" -> "RV"
    // e.g. "Sergio Beceiro Lodeiro" -> "SB"
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // 4 or more words: Typically [Nombre 1] [Nombre 2] [1º Apellido] [2º Apellido]
  // e.g. "Juan Carlos López Martín" -> "JL"
  // e.g. "María José González Novo" -> "MG"
  return (words[0][0] + words[2][0]).toUpperCase();
}


/**
 * Calculates whether a color is light or dark based on standard YIQ luminance.
 */
export function isLightColor(colorStr) {
  if (!colorStr) return true;
  const s = String(colorStr).trim().toLowerCase();
  if (s === '#ffffff' || s === 'white' || s === '#fff') return true;
  if (s === '#e0f2fe' || s === '#f0f9ff' || s === '#f8fafc' || s === '#f1f5f9') return true;

  if (s.startsWith('#')) {
    let c = s.slice(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length === 6) {
      const r = parseInt(c.substr(0, 2), 16);
      const g = parseInt(c.substr(2, 2), 16);
      const b = parseInt(c.substr(4, 2), 16);
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return yiq >= 170;
    }
  }
  return false;
}

/**
 * Resolves avatar background color, text color, and border based on:
 * 1. Explicit `agente.colorFondo` if configured
 * 2. Role-based default:
 *    - Directores de Obra: Azul oscuro (#1e3a8a, texto blanco)
 *    - Directores de Ejecución: Azul claro (#38bdf8, texto blanco)
 *    - CSS: Azul casi blanco (#e0f2fe, texto #0369a1, borde #bae6fd)
 *    - Resto: Blanco por defecto (#ffffff, texto #1e293b, borde #cbd5e1)
 */
export function getAgentAvatarColors(agente, cargoOverride = '') {
  const customColor = agente?.colorFondo;
  if (customColor && String(customColor).trim()) {
    const bg = String(customColor).trim();
    const isLight = isLightColor(bg);
    const isCssTone = bg.toLowerCase() === '#e0f2fe' || bg.toLowerCase() === '#f0f9ff';
    return {
      bg,
      text: isLight ? (isCssTone ? '#0369a1' : '#1e293b') : '#ffffff',
      border: isLight ? (isCssTone ? '1px solid #bae6fd' : '1.5px solid #cbd5e1') : 'transparent'
    };
  }

  const roleText = `${agente?.cargoHabitual || ''} ${agente?.cargo || ''} ${cargoOverride || ''}`.toLowerCase();

  // 1. Directores de Obra -> Azul oscuro
  if (/\bdo\b|director.*obra|directora.*obra/i.test(roleText)) {
    return {
      bg: '#1e3a8a',
      text: '#ffffff',
      border: 'transparent'
    };
  }

  // 2. Directores de Ejecución -> Azul claro
  if (/\bde\b|\bdem\b|ejecuci|aparejad|arquitect.*t[eé]cnic/i.test(roleText)) {
    return {
      bg: '#38bdf8',
      text: '#ffffff',
      border: 'transparent'
    };
  }

  // 3. CSS (Coordinador Seguridade e Saúde) -> Azul casi blanco
  if (/\bcss\b|seguridad|seguridade|sa[uú]de/i.test(roleText)) {
    return {
      bg: '#e0f2fe',
      text: '#0369a1',
      border: '1px solid #bae6fd'
    };
  }

  // 4. El resto -> Blanco por defecto
  return {
    bg: '#ffffff',
    text: '#1e293b',
    border: '1.5px solid #cbd5e1'
  };
}

/**
 * Renders an agent profile avatar HTML element with initials inside a rounded square.
 * Matches Captura 2 style (border-radius: ~25-26% of size, centered bold uppercase letters).
 */
export function renderAgentAvatarHtml(agente, { size = 34, cargo = '', extraClass = '', style = '' } = {}) {
  const name = typeof agente === 'string' ? agente : (agente?.nombre || '');
  const customInitials = (typeof agente === 'object' && agente?.iniciales) ? String(agente.iniciales).trim().toUpperCase() : '';
  const initials = customInitials || getAgentInitials(name);
  const colors = getAgentAvatarColors(typeof agente === 'object' ? agente : null, cargo);
  const borderRadius = Math.round(size * 0.25);
  const fontSize = Math.max(10, Math.round(size * 0.38));

  return `
    <div class="agent-avatar ${extraClass}" title="${escapeHtml(name + (cargo ? ' (' + cargo + ')' : ''))}" style="
      width: ${size}px;
      height: ${size}px;
      border-radius: ${borderRadius}px;
      background-color: ${colors.bg};
      color: ${colors.text};
      border: ${colors.border};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: ${fontSize}px;
      flex-shrink: 0;
      user-select: none;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      letter-spacing: -0.02em;
      ${style}
    ">
      ${initials}
    </div>
  `;
}

/**
 * Extracts section titles from Apartado 1 of an acta
 * (or legacy cuestionesTratadas titles/subtitulos)
 */
export function getApartado1Titulos(acta) {
  if (!acta) return [];
  if (acta.apartados && Array.isArray(acta.apartados) && acta.apartados.length > 0) {
    const ap1 = acta.apartados[0];
    if (ap1.secciones && Array.isArray(ap1.secciones) && ap1.secciones.length > 0) {
      return ap1.secciones.map(s => s.titulo).filter(Boolean);
    }
  }
  if (acta.cuestionesTratadas && Array.isArray(acta.cuestionesTratadas) && acta.cuestionesTratadas.length > 0) {
    return acta.cuestionesTratadas.map(c => c.subtitulo || (Array.isArray(c.puntos) ? c.puntos[0] : '')).filter(Boolean);
  }
  return [];
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resolves any user reference (ID, username, or full name) into a friendly display name
 */
export function getUserDisplayName(userRef) {
  if (!userRef) return 'Admin';
  const str = String(userRef).trim();
  if (!str) return 'Admin';

  if (str === 'usr-admin' || str.toLowerCase() === 'admin') return 'Admin';
  if (str === 'usr-rosa' || str.toLowerCase() === 'rosa') return 'Rosa Vilas Romalde';
  if (str === 'usr-sergio' || str.toLowerCase() === 'sergio') return 'Sergio Beceiro Lodeiro';

  try {
    const rawUsers = typeof localStorage !== 'undefined' ? localStorage.getItem('anta_obra_users') : null;
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      const found = users.find(u => String(u.id) === str || String(u.username).toLowerCase() === str.toLowerCase());
      if (found && found.name) return found.name;
    }
    const rawAgentes = typeof localStorage !== 'undefined' ? localStorage.getItem('anta_obra_agentes') : null;
    if (rawAgentes) {
      const agentes = JSON.parse(rawAgentes);
      const found = agentes.find(a => String(a.id) === str || String(a.nombre).toLowerCase() === str.toLowerCase());
      if (found && found.nombre) return found.nombre;
    }
  } catch {}

  return str;
}

/**
 * Formats ISO date or YYYY-MM-DD into a localized readable date with hours if present
 */
export function formatModificationDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      const parts = String(isoStr).split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return String(isoStr);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    if (String(isoStr).includes('T')) {
      return `${day}/${month}/${year} ${hours}:${mins}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return String(isoStr);
  }
}

/**
 * Renders a compact, visually appealing user modifier badge with initials and timestamp
 */
export function renderUserModifierHtml(userRef, dateStr, options = {}) {
  const displayName = getUserDisplayName(userRef);
  const formattedDate = formatModificationDate(dateStr);
  const initials = getAgentInitials(displayName);
  const colors = getAgentAvatarColors(null, displayName);

  return `
    <div style="display: flex; align-items: center; gap: 0.45rem; ${options.style || ''}" title="Última modificación por ${escapeHtml(displayName)}${formattedDate ? ' (' + formattedDate + ')' : ''}">
      <div style="
        width: 22px; 
        height: 22px; 
        border-radius: 4px; 
        background-color: ${colors.bg}; 
        color: ${colors.text}; 
        border: ${colors.border}; 
        display: inline-flex; 
        align-items: center; 
        justify-content: center; 
        font-weight: 700; 
        font-size: 10px; 
        flex-shrink: 0;
        box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      ">
        ${initials}
      </div>
      <div style="min-width: 0; line-height: 1.25;">
        <div style="font-weight: 600; font-size: 0.82rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">
          ${escapeHtml(displayName)}
        </div>
        ${formattedDate ? `
          <div style="font-size: 0.71rem; color: var(--text-muted); white-space: nowrap;">
            ${formattedDate}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}


