/* ==============================================================================
   ANTA OBRA - Supabase Client Connector
   Agente CONECTOR: Enlace entre la aplicación y PostgreSQL en Supabase
   ============================================================================== */

import { createClient } from '@supabase/supabase-js';
import { formatCurrency, parseCurrency } from './utils/currency.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('tu-proyecto') &&
  !supabaseAnonKey.includes('tu-anon-key')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

if (isSupabaseConfigured) {
  console.log('🚀 Agente CONECTOR: Conectado con éxito a Supabase PostgreSQL:', supabaseUrl);
} else {
  console.info('ℹ️ Agente CONECTOR: Supabase no configurado aún en .env. Modo local activo.');
}

/* ------------------------------------------------------------------------------
   Mapeadores y Funciones de Sincronización en Segundo Plano
   ------------------------------------------------------------------------------ */

export const SYSTEM_SYNC_NOTE_ID = '__system_auth_sync__';

export async function fetchSystemSyncFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('notas')
      .select('*')
      .eq('id', SYSTEM_SYNC_NOTE_ID)
      .maybeSingle();

    if (error || !data || !data.contenido) return null;
    const parsed = JSON.parse(data.contenido);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      usuarios: Array.isArray(parsed.usuarios) ? parsed.usuarios : null,
      grupos: Array.isArray(parsed.grupos) ? parsed.grupos : null,
      deletedIds: parsed.deletedIds && typeof parsed.deletedIds === 'object' ? parsed.deletedIds : null,
      updatedAt: parsed.updatedAt || null
    };
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso leyendo sincronización de sistema en Supabase:', e);
    return null;
  }
}

export async function saveSystemSyncToSupabase(partial = {}) {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const current = (await fetchSystemSyncFromSupabase()) || {};
    const currentDeleted = (current.deletedIds && typeof current.deletedIds === 'object') ? current.deletedIds : {};
    let mergedDeleted = { ...currentDeleted };

    if (partial.deletedIds && typeof partial.deletedIds === 'object') {
      if (partial.replaceDeletedIds) {
        mergedDeleted = { ...partial.deletedIds };
      } else {
        const allKeys = new Set([...Object.keys(currentDeleted), ...Object.keys(partial.deletedIds)]);
        allKeys.forEach(cat => {
          const cList = Array.isArray(currentDeleted[cat]) ? currentDeleted[cat].map(String) : [];
          const pList = Array.isArray(partial.deletedIds[cat]) ? partial.deletedIds[cat].map(String) : [];
          mergedDeleted[cat] = Array.from(new Set([...cList, ...pList]));
        });
      }
    }

    const payload = {
      usuarios: Array.isArray(partial.usuarios) ? partial.usuarios : (Array.isArray(current.usuarios) ? current.usuarios : []),
      grupos: Array.isArray(partial.grupos) ? partial.grupos : (Array.isArray(current.grupos) ? current.grupos : []),
      deletedIds: mergedDeleted,
      updatedAt: new Date().toISOString()
    };

    const { error } = await supabase.from('notas').upsert({
      id: SYSTEM_SYNC_NOTE_ID,
      obra_id: null,
      numero: 0,
      fecha: '2026-01-01',
      asunto: 'SYSTEM_AUTH_SYNC',
      contenido: JSON.stringify(payload),
      autor: 'SYSTEM'
    });
    if (error) {
      console.error('Error guardando sincronización de sistema en Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso guardando sincronización de sistema en Supabase:', e);
    return false;
  }
}

function mapActaRowFromSupabase(a) {
  const datos = a.datos || {};
  return {
    ...datos,
    id: a.id,
    obraId: a.obra_id || datos.obraId,
    numero: a.numero ?? datos.numero,
    fecha: a.fecha || datos.fecha,
    hora: a.hora || datos.hora,
    estado: a.estado || datos.estado,
    asistentes: (Array.isArray(a.asistentes) && a.asistentes.length > 0)
      ? a.asistentes
      : (Array.isArray(datos.asistentes) ? datos.asistentes : []),
    cuestiones: (Array.isArray(a.cuestiones) && a.cuestiones.length > 0)
      ? a.cuestiones
      : (Array.isArray(datos.cuestiones) ? datos.cuestiones : []),
    indicacionesSeguridad: Array.isArray(a.indicaciones_seguridad)
      ? a.indicaciones_seguridad
      : (Array.isArray(datos.indicacionesSeguridad) ? datos.indicacionesSeguridad : []),
    actuacionesPrevistas: Array.isArray(a.actuaciones_previstas)
      ? a.actuaciones_previstas
      : (Array.isArray(datos.actuacionesPrevistas) ? datos.actuacionesPrevistas : []),
    firmas: (Array.isArray(a.firmas) && a.firmas.length > 0)
      ? a.firmas
      : (Array.isArray(datos.firmas) ? datos.firmas : []),
    fotos: (Array.isArray(a.fotos) && a.fotos.length > 0)
      ? a.fotos
      : (Array.isArray(datos.fotos) ? datos.fotos : []),
    anexosPdf: (Array.isArray(a.anexos_pdf) && a.anexos_pdf.length > 0)
      ? a.anexos_pdf
      : (Array.isArray(datos.anexosPdf) ? datos.anexosPdf : [])
  };
}

export async function fetchAllFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const [agRes, obRes, acRes, infRes, notRes, usrRes, grpRes] = await Promise.all([
      supabase.from('agentes').select('*'),
      supabase.from('obras').select('*'),
      supabase.from('actas').select('*'),
      supabase.from('informes').select('*'),
      supabase.from('notas').select('*'),
      supabase.from('usuarios').select('*').then(r => r, () => ({ data: null })),
      supabase.from('grupos').select('*').then(r => r, () => ({ data: null }))
    ]);

    // Extraer registro de sincronización de sistema (__system_auth_sync__) de notas
    let systemSync = null;
    const rawNotas = Array.isArray(notRes.data) ? notRes.data : null;
    if (rawNotas) {
      const sysNote = rawNotas.find(n => n.id === SYSTEM_SYNC_NOTE_ID);
      if (sysNote && sysNote.contenido) {
        try {
          const parsed = JSON.parse(sysNote.contenido);
          if (parsed && typeof parsed === 'object') {
            systemSync = parsed;
          }
        } catch (err) {
          console.warn('No se pudo parsear __system_auth_sync__:', err);
        }
      }
    }

    const mappedActasAll = acRes.data ? acRes.data.map(mapActaRowFromSupabase) : null;
    const isReunionRecord = (item) =>
      item?.tipoDocumento === 'reunion' || String(item?.id || '').startsWith('reu-');

    const actasOnly = mappedActasAll ? mappedActasAll.filter(a => !isReunionRecord(a)) : null;
    const reunionesOnly = mappedActasAll ? mappedActasAll.filter(a => isReunionRecord(a)) : null;

    const tableUsuarios = (usrRes && Array.isArray(usrRes.data) && usrRes.data.length > 0)
      ? usrRes.data.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          name: u.name,
          role: u.role,
          cargo: u.cargo,
          empresa: u.empresa,
          email: u.email,
          active: u.active
        }))
      : null;

    const tableGrupos = (grpRes && Array.isArray(grpRes.data) && grpRes.data.length > 0)
      ? grpRes.data.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          permissions: g.permissions || []
        }))
      : null;

    return {
      agentes: agRes.data ? agRes.data.map(a => ({
        id: a.id,
        nombre: a.nombre,
        cargoHabitual: a.cargo_habitual,
        entidad: a.entidad,
        colegiado: a.colegiado,
        telefono: a.telefono,
        email: a.email,
        colorFondo: a.color_fondo,
        iniciales: a.iniciales,
        notas: a.notas
      })) : null,

      obras: obRes.data ? obRes.data.map(o => {
        const rawPres = o.presupuesto !== null && o.presupuesto !== undefined
          ? o.presupuesto
          : (o.datos?.presupuestoAdjudicacion || o.datos?.presupuesto || 0);
        return {
          ...(o.datos || {}),
          id: o.id,
          expediente: o.expediente,
          titulo: o.titulo,
          situacion: o.situacion,
          promotor: o.promotor,
          contratista: o.contratista,
          jefeObra: o.jefe_obra,
          direccionObra: o.direccion_obra,
          direccionEjecucion: o.direccion_ejecucion,
          coordinadorCSS: o.coordinador_css,
          agentes: o.agentes || o.datos?.agentes || [],
          presupuesto: parseCurrency(rawPres),
          presupuestoAdjudicacion: formatCurrency(rawPres),
          plazoMeses: o.plazo_meses,
          fechaInicio: o.fecha_inicio,
          estado: o.estado
        };
      }) : null,

      actas: actasOnly,
      reuniones: reunionesOnly,

      informes: infRes.data ? infRes.data.map(i => ({
        ...(i.datos || {}),
        id: i.id,
        obraId: i.obra_id,
        numero: i.numero,
        tipo: i.tipo,
        datosXerais: i.datos_xerais || {},
        resumoExecutivo: i.resumo_executivo || {},
        traballosExecutados: i.traballos_executados || {},
        condicionantesModificacions: i.condicionantes_modificacions || {},
        controlEconomico: i.control_economico || {},
        controlPrazo: i.control_prazo || {},
        controlCalidade: i.control_calidade || {},
        seguridadeSaude: i.seguridade_saude || {},
        reportaxeFotografica: i.reportaxe_fotografica || [],
        outros: i.outros || {},
        conclusion: i.conclusion || {},
        actasPdf: i.actas_pdf || [],
        anexosPdf: i.anexos_pdf || [],
        actasAnexasIds: i.actas_anexas_ids || []
      })) : null,

      notas: rawNotas ? rawNotas.filter(n => n.id !== SYSTEM_SYNC_NOTE_ID).map(n => ({
        id: n.id,
        obraId: n.obra_id,
        numero: n.numero,
        fecha: n.fecha,
        asunto: n.asunto,
        contenido: n.contenido,
        autor: n.autor
      })) : null,

      usuarios: tableUsuarios || (Array.isArray(systemSync?.usuarios) ? systemSync.usuarios : null),
      grupos: tableGrupos || (Array.isArray(systemSync?.grupos) ? systemSync.grupos : null),
      deletedIds: (systemSync?.deletedIds && typeof systemSync.deletedIds === 'object') ? systemSync.deletedIds : null
    };
  } catch (err) {
    console.error('⚠️ Error cargando datos de Supabase:', err);
    return null;
  }
}

export async function syncAgenteToSupabase(agente) {
  if (!isSupabaseConfigured || !supabase || !agente) return;
  try {
    await supabase.from('agentes').upsert({
      id: agente.id,
      nombre: agente.nombre,
      cargo_habitual: agente.cargoHabitual,
      entidad: agente.entidad,
      colegiado: agente.colegiado,
      telefono: agente.telefono,
      email: agente.email,
      color_fondo: agente.colorFondo,
      iniciales: agente.iniciales,
      notas: agente.notas
    });
  } catch (e) {
    console.error('Error sincronizando agente con Supabase:', e);
  }
}

export async function deleteAgenteFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    const { error } = await supabase.from('agentes').delete().eq('id', id);
    if (error) console.error('Error eliminando agente de Supabase:', error);
  } catch (e) {
    console.error('Error eliminando agente de Supabase:', e);
  }
}

export async function syncObraToSupabase(obra) {
  if (!isSupabaseConfigured || !supabase || !obra) return;
  try {
    await supabase.from('obras').upsert({
      id: obra.id,
      expediente: obra.expediente,
      titulo: obra.titulo,
      situacion: obra.situacion,
      promotor: obra.promotor,
      contratista: obra.contratista,
      jefe_obra: obra.jefeObra,
      direccion_obra: obra.direccionObra,
      direccion_ejecucion: obra.direccionEjecucion,
      coordinador_css: obra.coordinadorCSS,
      agentes: obra.agentes || [],
      presupuesto: typeof obra.presupuesto === 'number'
        ? obra.presupuesto
        : parseCurrency(obra.presupuestoAdjudicacion || obra.presupuesto || 0),
      plazo_meses: typeof obra.plazoMeses === 'number' ? obra.plazoMeses : 12,
      fecha_inicio: obra.fechaInicio || null,
      estado: obra.estado || 'en_curso',
      datos: obra
    });
  } catch (e) {
    console.error('Error sincronizando obra con Supabase:', e);
  }
}

export async function deleteObraFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    // Eliminar previamente registros dependientes para no violar restricciones de clave foránea
    await Promise.allSettled([
      supabase.from('actas').delete().eq('obra_id', id),
      supabase.from('informes').delete().eq('obra_id', id),
      supabase.from('notas').delete().eq('obra_id', id)
    ]);
    const { error } = await supabase.from('obras').delete().eq('id', id);
    if (error) console.error('Error eliminando obra de Supabase:', error);
  } catch (e) {
    console.error('Error eliminando obra de Supabase:', e);
  }
}

export async function syncActaToSupabase(acta) {
  if (!isSupabaseConfigured || !supabase || !acta) return;
  try {
    await supabase.from('actas').upsert({
      id: acta.id,
      obra_id: acta.obraId,
      numero: parseInt(acta.numero, 10) || 1,
      fecha: acta.fecha || new Date().toISOString().split('T')[0],
      hora: acta.hora || '10:00',
      estado: acta.estado || 'borrador',
      asistentes: acta.asistentes || [],
      cuestiones: acta.cuestiones || [],
      indicaciones_seguridad: acta.indicacionesSeguridad || [],
      actuaciones_previstas: acta.actuacionesPrevistas || [],
      firmas: acta.firmas || [],
      fotos: acta.fotos || [],
      anexos_pdf: acta.anexosPdf || [],
      datos: acta
    });
  } catch (e) {
    console.error('Error sincronizando acta con Supabase:', e);
  }
}

export async function deleteActaFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    await supabase.from('actas').delete().eq('id', id);
  } catch (e) {
    console.error('Error eliminando acta de Supabase:', e);
  }
}

export async function syncInformeToSupabase(inf) {
  if (!isSupabaseConfigured || !supabase || !inf) return;
  try {
    await supabase.from('informes').upsert({
      id: inf.id,
      obra_id: inf.obraId,
      numero: parseInt(inf.numero, 10) || 1,
      tipo: inf.tipo || 'mensual',
      datos_xerais: inf.datosXerais || {},
      resumo_executivo: inf.resumoExecutivo || {},
      traballos_executados: inf.traballosExecutados || {},
      condicionantes_modificacions: inf.condicionantesModificacions || {},
      control_economico: inf.controlEconomico || {},
      control_prazo: inf.controlPrazo || {},
      control_calidade: inf.controlCalidade || {},
      seguridade_saude: inf.seguridadeSaude || {},
      reportaxe_fotografica: inf.reportaxeFotografica || inf.fotos || [],
      outros: inf.outros || {},
      conclusion: inf.conclusion || {},
      actas_pdf: inf.actasPdf || [],
      anexos_pdf: inf.anexosPdf || [],
      actas_anexas_ids: inf.actasAnexasIds || [],
      datos: inf
    });
  } catch (e) {
    console.error('Error sincronizando informe con Supabase:', e);
  }
}

export async function deleteInformeFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    await supabase.from('informes').delete().eq('id', id);
  } catch (e) {
    console.error('Error eliminando informe de Supabase:', e);
  }
}

export async function syncNotaToSupabase(nota) {
  if (!isSupabaseConfigured || !supabase || !nota) return;
  try {
    await supabase.from('notas').upsert({
      id: nota.id,
      obra_id: nota.obraId,
      numero: parseInt(nota.numero, 10) || 1,
      fecha: nota.fecha || new Date().toISOString().split('T')[0],
      asunto: nota.asunto || 'Nota',
      contenido: nota.contenido || '',
      autor: nota.autor || ''
    });
  } catch (e) {
    console.error('Error sincronizando nota con Supabase:', e);
  }
}

export async function deleteNotaFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    await supabase.from('notas').delete().eq('id', id);
  } catch (e) {
    console.error('Error eliminando nota de Supabase:', e);
  }
}

/* ------------------------------------------------------------------------------
   Storage Cloud Helpers (Bucket: anta-files)
   ------------------------------------------------------------------------------ */

export const STORAGE_BUCKET = 'anta-files';

export async function uploadFileToSupabase(fileOrBlob, targetPath) {
  if (!isSupabaseConfigured || !supabase || !fileOrBlob) return null;
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(targetPath, fileOrBlob, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error subiendo archivo a Supabase Storage:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(targetPath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Excepción en uploadFileToSupabase:', err);
    return null;
  }
}

export function getPublicStorageUrl(targetPath) {
  if (!isSupabaseConfigured || !supabase || !targetPath) return '';
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(targetPath);
  return data?.publicUrl || '';
}

export async function deleteFileFromSupabase(targetPath) {
  if (!isSupabaseConfigured || !supabase || !targetPath) return false;
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([targetPath]);
    if (error) {
      console.error('Error borrando archivo de Supabase Storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Excepción en deleteFileFromSupabase:', err);
    return false;
  }
}

/* ------------------------------------------------------------------------------
   Sincronización de Usuarios y Grupos con Supabase PostgreSQL
   ------------------------------------------------------------------------------ */

export async function syncUsuarioToSupabase(user, allLocalUsers = null, deletedIds = null) {
  if (!isSupabaseConfigured || !supabase || !user) return;
  try {
    // 1. Sincronizar en el registro de sistema (__system_auth_sync__ en tabla 'notas')
    const current = (await fetchSystemSyncFromSupabase()) || {};
    const remoteUsers = Array.isArray(current.usuarios) ? current.usuarios : [];
    const mergedDeletedIds = deletedIds || current.deletedIds || {};
    const deletedUserSet = new Set(Array.isArray(mergedDeletedIds.usuarios) ? mergedDeletedIds.usuarios : []);
    deletedUserSet.delete(user.id);

    const byKey = new Map();
    remoteUsers.forEach(u => {
      if (u && u.id && !deletedUserSet.has(u.id)) {
        byKey.set(u.id, u);
      }
    });
    if (Array.isArray(allLocalUsers)) {
      allLocalUsers.forEach(u => {
        if (u && u.id && !deletedUserSet.has(u.id)) {
          byKey.set(u.id, u);
        }
      });
    }
    // Asegurar que el usuario recién guardado/editado prevalece (y reemplaza mismo username si tenía otro id)
    for (const [k, existing] of byKey.entries()) {
      if (
        k !== user.id &&
        existing.username &&
        user.username &&
        existing.username.trim().toLowerCase() === user.username.trim().toLowerCase()
      ) {
        byKey.delete(k);
      }
    }
    byKey.set(user.id, {
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      role: user.role,
      cargo: user.cargo || '',
      empresa: user.empresa || '',
      email: user.email || '',
      active: user.active !== undefined ? user.active : true,
      updatedAt: new Date().toISOString()
    });

    await saveSystemSyncToSupabase({
      usuarios: Array.from(byKey.values()),
      grupos: current.grupos,
      deletedIds: {
        ...mergedDeletedIds,
        usuarios: Array.from(deletedUserSet)
      }
    });

    // 2. Intentar también en tabla 'usuarios' si existiera
    await supabase.from('usuarios').upsert({
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      role: user.role,
      cargo: user.cargo || '',
      empresa: user.empresa || '',
      email: user.email || '',
      active: user.active !== undefined ? user.active : true,
      updated_at: new Date().toISOString()
    }).then(() => {}, () => {});
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso sincronizando usuario con Supabase:', e);
  }
}

export async function deleteUsuarioFromSupabase(id, deletedIds = null) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    const current = (await fetchSystemSyncFromSupabase()) || {};
    const remoteUsers = Array.isArray(current.usuarios) ? current.usuarios.filter(u => u && u.id !== id) : [];
    const mergedDeletedIds = deletedIds || current.deletedIds || {};
    const deletedUserSet = new Set(Array.isArray(mergedDeletedIds.usuarios) ? mergedDeletedIds.usuarios : []);
    deletedUserSet.add(id);

    await saveSystemSyncToSupabase({
      usuarios: remoteUsers,
      grupos: current.grupos,
      deletedIds: {
        ...mergedDeletedIds,
        usuarios: Array.from(deletedUserSet)
      }
    });

    await supabase.from('usuarios').delete().eq('id', id).then(() => {}, () => {});
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso eliminando usuario de Supabase:', e);
  }
}

export async function syncGrupoToSupabase(group, allLocalGroups = null, deletedIds = null) {
  if (!isSupabaseConfigured || !supabase || !group) return;
  try {
    const current = (await fetchSystemSyncFromSupabase()) || {};
    const remoteGroups = Array.isArray(current.grupos) ? current.grupos : [];
    const mergedDeletedIds = deletedIds || current.deletedIds || {};
    const deletedGroupSet = new Set(Array.isArray(mergedDeletedIds.grupos) ? mergedDeletedIds.grupos : []);
    deletedGroupSet.delete(group.id);

    const byId = new Map();
    remoteGroups.forEach(g => {
      if (g && g.id && !deletedGroupSet.has(g.id)) byId.set(g.id, g);
    });
    if (Array.isArray(allLocalGroups)) {
      allLocalGroups.forEach(g => {
        if (g && g.id && !deletedGroupSet.has(g.id)) byId.set(g.id, g);
      });
    }
    byId.set(group.id, {
      id: group.id,
      name: group.name,
      description: group.description || '',
      permissions: group.permissions || []
    });

    await saveSystemSyncToSupabase({
      usuarios: current.usuarios,
      grupos: Array.from(byId.values()),
      deletedIds: {
        ...mergedDeletedIds,
        grupos: Array.from(deletedGroupSet)
      }
    });

    await supabase.from('grupos').upsert({
      id: group.id,
      name: group.name,
      description: group.description || '',
      permissions: group.permissions || []
    }).then(() => {}, () => {});
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso sincronizando grupo con Supabase:', e);
  }
}

export async function deleteGrupoFromSupabase(id, deletedIds = null) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    const current = (await fetchSystemSyncFromSupabase()) || {};
    const remoteGroups = Array.isArray(current.grupos) ? current.grupos.filter(g => g && g.id !== id) : [];
    const mergedDeletedIds = deletedIds || current.deletedIds || {};
    const deletedGroupSet = new Set(Array.isArray(mergedDeletedIds.grupos) ? mergedDeletedIds.grupos : []);
    deletedGroupSet.add(id);

    await saveSystemSyncToSupabase({
      usuarios: current.usuarios,
      grupos: remoteGroups,
      deletedIds: {
        ...mergedDeletedIds,
        grupos: Array.from(deletedGroupSet)
      }
    });

    await supabase.from('grupos').delete().eq('id', id).then(() => {}, () => {});
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso eliminando grupo de Supabase:', e);
  }
}

export async function findUsuarioInSupabase(username) {
  if (!isSupabaseConfigured || !supabase || !username) return null;
  const cleanUsername = username.trim().toLowerCase();
  try {
    // 1. Buscar primero en el registro de sistema (__system_auth_sync__)
    const sys = await fetchSystemSyncFromSupabase();
    if (sys && Array.isArray(sys.usuarios)) {
      const deletedSet = new Set(Array.isArray(sys.deletedIds?.usuarios) ? sys.deletedIds.usuarios : []);
      const foundInSys = sys.usuarios.find(
        u => u && !deletedSet.has(u.id) && (u.username || '').trim().toLowerCase() === cleanUsername
      );
      if (foundInSys) {
        return {
          id: foundInSys.id,
          username: foundInSys.username,
          password: foundInSys.password,
          name: foundInSys.name,
          role: foundInSys.role,
          cargo: foundInSys.cargo || '',
          empresa: foundInSys.empresa || '',
          email: foundInSys.email || '',
          active: foundInSys.active !== undefined ? foundInSys.active : true
        };
      }
    }

    // 2. Fallback a tabla 'usuarios' si existiera
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('username', username.trim())
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      name: data.name,
      role: data.role,
      cargo: data.cargo,
      empresa: data.empresa,
      email: data.email,
      active: data.active
    };
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso buscando usuario en Supabase:', e);
    return null;
  }
}

