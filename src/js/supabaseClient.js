/* ==============================================================================
   ANTA OBRA - Supabase Client Connector
   Agente CONECTOR: Enlace entre la aplicación y PostgreSQL en Supabase
   ============================================================================== */

import { createClient } from '@supabase/supabase-js';

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

      obras: obRes.data ? obRes.data.map(o => ({
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
        agentes: o.agentes || [],
        presupuesto: o.presupuesto,
        plazoMeses: o.plazo_meses,
        fechaInicio: o.fecha_inicio,
        estado: o.estado
      })) : null,

      actas: acRes.data ? acRes.data.map(a => ({
        ...(a.datos || {}),
        id: a.id,
        obraId: a.obra_id,
        numero: a.numero,
        fecha: a.fecha,
        hora: a.hora,
        estado: a.estado,
        asistentes: a.asistentes || [],
        cuestiones: a.cuestiones || [],
        indicacionesSeguridad: a.indicaciones_seguridad || [],
        actuacionesPrevistas: a.actuaciones_previstas || [],
        firmas: a.firmas || [],
        fotos: a.fotos || [],
        anexosPdf: a.anexos_pdf || []
      })) : null,

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

      notas: notRes.data ? notRes.data.map(n => ({
        id: n.id,
        obraId: n.obra_id,
        numero: n.numero,
        fecha: n.fecha,
        asunto: n.asunto,
        contenido: n.contenido,
        autor: n.autor
      })) : null,

      usuarios: (usrRes && usrRes.data) ? usrRes.data.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        cargo: u.cargo,
        empresa: u.empresa,
        email: u.email,
        active: u.active
      })) : null,

      grupos: (grpRes && grpRes.data) ? grpRes.data.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        permissions: g.permissions || []
      })) : null
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
    await supabase.from('agentes').delete().eq('id', id);
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
      presupuesto: typeof obra.presupuesto === 'number' ? obra.presupuesto : 0,
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
    await supabase.from('obras').delete().eq('id', id);
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

export async function syncUsuarioToSupabase(user) {
  if (!isSupabaseConfigured || !supabase || !user) return;
  try {
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
    });
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso sincronizando usuario con Supabase:', e);
  }
}

export async function deleteUsuarioFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    await supabase.from('usuarios').delete().eq('id', id);
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso eliminando usuario de Supabase:', e);
  }
}

export async function syncGrupoToSupabase(group) {
  if (!isSupabaseConfigured || !supabase || !group) return;
  try {
    await supabase.from('grupos').upsert({
      id: group.id,
      name: group.name,
      description: group.description || '',
      permissions: group.permissions || []
    });
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso sincronizando grupo con Supabase:', e);
  }
}

export async function deleteGrupoFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    await supabase.from('grupos').delete().eq('id', id);
  } catch (e) {
    console.warn('Agente CONECTOR: Aviso eliminando grupo de Supabase:', e);
  }
}

export async function findUsuarioInSupabase(username) {
  if (!isSupabaseConfigured || !supabase || !username) return null;
  try {
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

