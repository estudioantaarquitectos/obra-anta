/* ==========================================================================
   ANTA OBRA - Acta Editor View
   Follows institutional guidelines with:
   - Dynamic Apartados (1_APARTADO) and Secciones (1.1_Sección/tema)
   - Rich text editor per section (Bold, Italic, Underline, Lists, Colors)
   - Smart paste from Word / Excel (cleans proprietary markup, preserves tables)
   - Image paste support with automatic client-side compression
   - Photo annex with date and description
   - Direct DOCX and PDF export using official Word template
   ========================================================================== */

import { db, normalizeActa, isDefaultSignerRole } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';

export function renderActaEditor(container, router, params = {}) {
  const isEditing = Boolean(params && params.id);
  const settings = db.getSettings();
  const obraId = (params && params.obraId) || db.getActiveObraId();
  const currentObra = db.getObraById(obraId) || db.getActiveObra();

  let actaData;
  if (isEditing) {
    const existing = db.getActaById(params.id);
    if (!existing) {
      showToast('El acta solicitada no existe', 'error');
      router.navigate('expediente', { id: obraId, tab: 'actas' });
      return;
    }
    actaData = normalizeActa(JSON.parse(JSON.stringify(existing)));
    if (!actaData.obraId && currentObra) {
      actaData.obraId = currentObra.id;
    }
    actaData.anexosPdf = actaData.anexosPdf || [];
    actaData.fotos = Array.isArray(actaData.fotos) ? actaData.fotos : [];

    // Ensure all asistentes have asistio and firma properly defined
    (actaData.asistentes || []).forEach(asist => {
      if (asist.asistio === undefined) asist.asistio = true;
      if (asist.firma === undefined) {
        if (actaData.firmas && actaData.firmas.length > 0) {
          asist.firma = actaData.firmas.some(f => 
            (f.asistenteId && f.asistenteId === asist.id) ||
            (f.nombre && asist.nombre && f.nombre.toLowerCase().includes(asist.nombre.toLowerCase())) ||
            (f.texto && asist.nombre && f.texto.toLowerCase().includes(asist.nombre.toLowerCase()))
          );
        } else {
          asist.firma = isDefaultSignerRole(asist.cargo, asist.entidad);
        }
      }
      if (!asist.asistio) asist.firma = false;
    });

    // Derive active firmas from attendees who attended and sign
    actaData.firmas = (actaData.asistentes || [])
      .filter(a => a.asistio && a.firma)
      .map(a => ({
        asistenteId: a.id,
        nombre: a.nombre,
        cargo: a.cargo || 'Dirección Facultativa',
        texto: `Fdo. ${a.nombre || ''} (${a.cargo || ''})`
      }));
  } else {
    // New Acta initialized with default project data and standard apartados
    const nextNum = db.getNextActaNumber(currentObra?.id);
    const defaultAsistentes = (currentObra?.agentes && currentObra.agentes.length > 0)
      ? currentObra.agentes.map((ag, idx) => ({
          id: `asist-${idx + 1}`,
          nombre: ag.nombre,
          cargo: ag.cargo || ag.rol,
          entidad: ag.entidad || '',
          asistio: true,
          firma: isDefaultSignerRole(ag.cargo || ag.rol, ag.entidad)
        }))
      : [
          { id: '1', nombre: 'Rosa Vilas Romalde', cargo: 'Arquitecta Directora de Obra', entidad: 'Dirección Facultativa', asistio: true, firma: true },
          { id: '2', nombre: 'Sergio Beceiro Lodeiro', cargo: 'Arquitecto Director de Obra', entidad: 'Dirección Facultativa', asistio: true, firma: true },
          { id: '3', nombre: 'Juan Carlos Bello Criado', cargo: 'Coordinador de Seguridad y Salud', entidad: 'CSS', asistio: true, firma: false },
          { id: '4', nombre: 'Miguel López Rodríguez', cargo: 'Jefe de Obra', entidad: 'Cabero Edificaciones, S.A.', asistio: true, firma: false },
          { id: '5', nombre: 'Ana Gallego Núñez', cargo: 'Directora de ejecución', entidad: 'DEM', asistio: true, firma: true }
        ];

    actaData = normalizeActa({
      id: `acta-${Date.now()}`,
      obraId: currentObra ? currentObra.id : 'obra-castillo-san-felipe',
      numero: nextNum,
      fecha: new Date().toISOString().split('T')[0],
      obra: currentObra ? currentObra.titulo : settings.obraPrincipal,
      obraTitulo: currentObra ? currentObra.titulo : settings.obraPrincipal,
      situacion: currentObra ? currentObra.situacion : settings.situacion,
      expediente: currentObra ? currentObra.expediente : settings.expediente,
      asistentes: defaultAsistentes,
      apartados: [
        {
          id: 'ap-1',
          titulo: 'CUESTIONES TRATADAS EN REUNIÓN',
          secciones: [
            {
              id: 'sec-1-1',
              titulo: 'Carpinterías',
              texto: '<p>Se revisan las muestras de taller y remates de mochetas.</p>'
            },
            {
              id: 'sec-1-2',
              titulo: 'Estructuras y cubiertas',
              texto: '<p>Replanteo de vigas y preparación de apoyos en muros de cantería.</p>'
            }
          ]
        },
        {
          id: 'ap-2',
          titulo: 'INDICACIONES POR PARTE DEL COORDINADOR DE SEGURIDAD Y SALUD',
          secciones: [
            {
              id: 'sec-2-1',
              titulo: 'Medidas Preventivas e EPIS',
              texto: '<p>Se recuerda el uso obligatorio de los EPIS correspondientes a los trabajos en ejecución.</p><p>Se ordena que los trabajadores en coronación de muros lleven arnés y línea de vida.</p>'
            }
          ]
        },
        {
          id: 'ap-3',
          titulo: 'ACTUACIONES PREVISTAS',
          secciones: [
            {
              id: 'sec-3-1',
              titulo: 'Próximas Actuaciones',
              texto: '<p>Continuar con los trabajos de limpieza y encintados de muros.</p><p>Aportar muestras y fichas técnicas requeridas.</p>'
            }
          ]
        }
      ],
      firmas: defaultAsistentes.filter(a => a.asistio && a.firma).map(a => ({
        asistenteId: a.id,
        nombre: a.nombre,
        cargo: a.cargo || 'Dirección Facultativa',
        texto: `Fdo. ${a.nombre || ''} (${a.cargo || ''})`
      })),
      fotos: [],
      anexosPdf: [],
      estado: 'borrador'
    });
  }

  function render() {
    container.innerHTML = `
      <div class="content-wrapper">
        <div class="editor-container">

          <!-- Sticky Top Action Bar -->
          <div class="editor-sticky-header">
            <div class="editor-meta-info">
              <span class="editor-type-badge">Acta de Obra</span>
              <div class="editor-doc-title">
                Acta nº ${actaData.numero} • ${actaData.fecha ? formatDate(actaData.fecha) : 'Sin fecha'}
              </div>
            </div>

            <div class="editor-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel">
                Cancelar
              </button>
              ${isEditing ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-export-docx-editor" title="Exportar acta actual a formato Word (.docx) usando la plantilla oficial">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>DOCX</span>
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-export-pdf-editor" title="Generar y descargar PDF Oficial desde Word (.pdf)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                  <span>PDF Oficial</span>
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-preview">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  Ver Oficial
                </button>
              ` : ''}
              <button type="button" class="btn btn-primary" id="btn-save-acta">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Guardar Acta
              </button>
            </div>
          </div>

          <form id="acta-form">

            <!-- Section 0: Encabezado y Datos Generales -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">0</span>
                    Datos de Identificación del Acta
                  </div>
                  <div class="editor-section-desc">Identificación de la sesión de obra</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label required">Nº de Acta</label>
                    <input type="number" id="input-numero" class="form-control" value="${actaData.numero}" required min="1" />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Fecha de la Reunión</label>
                    <input type="date" id="input-fecha" class="form-control" value="${actaData.fecha}" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Estado del Documento</label>
                    <select id="input-estado" class="form-control form-select">
                      <option value="borrador" ${actaData.estado === 'borrador' ? 'selected' : ''}>Borrador en elaboración</option>
                      <option value="firmada" ${actaData.estado === 'firmada' ? 'selected' : ''}>Firmada y distribuida</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 1: Asistentes a la Reunión -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">A</span>
                    Asistentes a la Visita / Reunión de Obra
                  </div>
                  <div class="editor-section-desc">Personas y cargos presentes en la reunión</div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-asistente">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Añadir Asistente
                </button>
              </div>
              <div class="editor-section-body">
                <div class="repeater-list" id="asistentes-list">
                  ${(actaData.asistentes || []).map((asist, idx) => {
                    const isAttending = asist.asistio !== false;
                    const isSigner = Boolean(isAttending && asist.firma);
                    return `
                    <div class="repeater-item" data-index="${idx}" data-id="${asist.id || `asist-${idx + 1}`}">
                      <div class="repeater-fields">
                        <div style="flex: 2; min-width: 180px;">
                          <input type="text" class="form-control asist-nombre" placeholder="Nombre completo" value="${escapeHtml(asist.nombre)}" />
                        </div>
                        <div style="flex: 2; min-width: 170px;">
                          <input type="text" class="form-control asist-cargo" placeholder="Cargo (ej: Arquitecta Directora de Obra)" value="${escapeHtml(asist.cargo)}" />
                        </div>
                        <div style="flex: 1.5; min-width: 130px;">
                          <input type="text" class="form-control asist-entidad" placeholder="Entidad / Empresa" value="${escapeHtml(asist.entidad || '')}" />
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.85rem; padding: 0 0.5rem; flex-wrap: nowrap; white-space: nowrap;">
                          <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; cursor: pointer; user-select: none;">
                            <input type="checkbox" class="asist-asistio" ${isAttending ? 'checked' : ''} />
                            <span>Asistió</span>
                          </label>
                          <label class="label-asist-firma" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; cursor: ${isAttending ? 'pointer' : 'not-allowed'}; user-select: none; color: ${isAttending ? 'var(--text-main)' : 'var(--text-muted)'};">
                            <input type="checkbox" class="asist-firma" ${isSigner ? 'checked' : ''} ${!isAttending ? 'disabled' : ''} />
                            <span title="Indica si este asistente firma en el acta oficial">Firma</span>
                          </label>
                        </div>
                      </div>
                      <button type="button" class="repeater-remove-btn remove-asistente" title="Eliminar fila">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Section 2: Apartados y Secciones con Editor Enriquecido -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">C</span>
                    Contenido del Acta: Apartados y Secciones
                  </div>
                  <div class="editor-section-desc">
                    Estructura jerárquica oficial (1_APARTADO, 1.1_Sección/tema y texto enriquecido con tablas, imágenes y listas)
                  </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-apartado-top">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Añadir Apartado
                </button>
              </div>
              <div class="editor-section-body">
                <div class="apartados-container" id="apartados-list">
                  ${(actaData.apartados || []).map((ap, apIdx) => `
                    <div class="apartado-card" data-apartado-index="${apIdx}" data-id="${ap.id || `ap-${apIdx + 1}`}">
                      
                      <!-- Cabecera de Apartado -->
                      <div class="apartado-card-header">
                        <div class="apartado-header-left">
                          <span class="apartado-badge">${apIdx + 1}_</span>
                          <input 
                            type="text" 
                            class="form-control apartado-titulo-input" 
                            value="${escapeHtml(cleanNumberPrefix(ap.titulo || 'APARTADO'))}" 
                            placeholder="Título del Apartado (ej: CUESTIONES TRATADAS EN REUNIÓN)" 
                            required 
                          />
                        </div>
                        <div class="apartado-header-actions">
                          <button type="button" class="btn btn-secondary btn-sm btn-move-apartado-up" title="Mover apartado arriba" ${apIdx === 0 ? 'disabled' : ''}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                            <span>Subir</span>
                          </button>
                          <button type="button" class="btn btn-secondary btn-sm btn-move-apartado-down" title="Mover apartado abajo" ${apIdx === actaData.apartados.length - 1 ? 'disabled' : ''}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                            <span>Bajar</span>
                          </button>
                          <button type="button" class="btn btn-secondary btn-sm btn-delete-apartado" title="Eliminar este apartado" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.35);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>

                      <!-- Lista de Secciones del Apartado -->
                      <div class="secciones-container">
                        ${(ap.secciones || []).map((sec, secIdx) => `
                          <div class="seccion-card" data-seccion-index="${secIdx}" data-id="${sec.id || `sec-${apIdx + 1}-${secIdx + 1}`}">
                            <div class="seccion-card-header">
                              <div class="seccion-header-left">
                                <span class="seccion-badge">${apIdx + 1}.${secIdx + 1}_</span>
                                <input 
                                  type="text" 
                                  class="form-control seccion-titulo-input" 
                                  value="${escapeHtml(cleanNumberPrefix(sec.titulo || 'Sección/tema'))}" 
                                  placeholder="Título de la sección o tema (ej: Carpinterías, Cubiertas, EPIS...)" 
                                  required 
                                />
                              </div>
                              <div class="seccion-header-actions">
                                <button type="button" class="btn btn-ghost btn-sm btn-move-seccion-up" title="Mover sección arriba" ${secIdx === 0 ? 'disabled' : ''}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                                </button>
                                <button type="button" class="btn btn-ghost btn-sm btn-move-seccion-down" title="Mover sección abajo" ${secIdx === (ap.secciones || []).length - 1 ? 'disabled' : ''}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                </button>
                                <button type="button" class="btn btn-ghost btn-sm btn-delete-seccion" title="Eliminar sección" style="color: var(--color-danger);">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                              </div>
                            </div>

                            <div class="seccion-card-body">
                              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                                <label class="form-hint" style="margin: 0; font-weight: 600; color: var(--text-main);">
                                  Escribe el contenido del tema/sección, o pega contenido:
                                </label>
                                <button type="button" class="rich-tab-toggle-btn" title="Mostrar/ocultar barra de formato (Negrita, Listas, Cores)">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-3.5z"></path></svg>
                                  <span>Formato</span>
                                  <span class="toggle-arrow">▾</span>
                                </button>
                              </div>

                              <!-- Rich Text Editor Container -->
                              <div class="rich-editor-container">
                                <div class="rich-editor-toolbar" style="display: none;">
                                  <button type="button" class="rich-toolbar-btn btn-fmt-bold" title="Negrita (Ctrl+B)"><b>B</b></button>
                                  <button type="button" class="rich-toolbar-btn btn-fmt-italic" title="Cursiva (Ctrl+I)"><i>I</i></button>
                                  <button type="button" class="rich-toolbar-btn btn-fmt-underline" title="Subrayado (Ctrl+U)"><u>U</u></button>
                                  
                                  <span class="rich-toolbar-sep"></span>

                                  <button type="button" class="rich-toolbar-btn btn-fmt-ul" title="Lista con viñetas">• Viñetas</button>
                                  <button type="button" class="rich-toolbar-btn btn-fmt-ol" title="Lista numerada">1. Número</button>

                                  <span class="rich-toolbar-sep"></span>

                                  <div class="rich-color-palette" title="Color de texto">
                                    <button type="button" class="rich-color-dot btn-color" data-color="#1e3a8a" style="background:#1e3a8a;" title="Azul institucional"></button>
                                    <button type="button" class="rich-color-dot btn-color" data-color="#1e293b" style="background:#1e293b;" title="Negro texto"></button>
                                    <button type="button" class="rich-color-dot btn-color" data-color="#64748b" style="background:#64748b;" title="Gris medio"></button>
                                    <button type="button" class="rich-color-dot btn-color" data-color="#dc2626" style="background:#dc2626;" title="Rojo alerta"></button>
                                    <button type="button" class="rich-color-dot btn-color" data-color="#16a34a" style="background:#16a34a;" title="Verde"></button>
                                  </div>

                                  <span class="rich-toolbar-sep"></span>

                                  <button type="button" class="rich-toolbar-btn btn-fmt-clear" title="Limpiar formato">Tx</button>
                                </div>

                                <div 
                                  class="rich-editor-content form-control" 
                                  contenteditable="true" 
                                  data-placeholder="Escribe el contenido del tema/sección, o pega contenido..."
                                >${formatContentForEditor(sec.texto)}</div>
                              </div>
                            </div>
                          </div>
                        `).join('')}

                        <div class="seccion-add-container">
                          <button type="button" class="btn btn-secondary btn-sm btn-add-seccion">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            <span>+ Añadir Sección a este Apartado (${apIdx + 1}.${(ap.secciones || []).length + 1}_)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div class="apartado-add-footer">
                  <button type="button" class="btn btn-primary btn-add-apartado">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>+ Añadir Nuevo Apartado (${(actaData.apartados || []).length + 1}_APARTADO)</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Section 4: Reportaje Fotográfico -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">📷</span>
                    Reportaje Fotográfico de Obra (Anexo)
                  </div>
                  <div class="editor-section-desc">
                    Incorpore fotografías con fecha y descripción para el anexo oficial
                  </div>
                </div>
              </div>
              <div class="editor-section-body">
                
                <!-- Photo Upload Box -->
                <div class="photo-uploader-box" id="drop-zone">
                  <input type="file" id="photo-file-input" class="photo-upload-input" accept="image/*" multiple />
                  <div class="photo-upload-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </div>
                  <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); margin-bottom: 0.35rem;">
                    Haga clic o arrastre fotos aquí
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); max-width: 450px; margin: 0 auto;">
                    Compatible con cámara de smartphone y fotos de PC. Se optimizan automáticamente al subirse.
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="document.getElementById('photo-file-input').click()">
                    Seleccionar fotos o abrir cámara
                  </button>
                </div>

                <!-- Photos Grid -->
                <div class="photos-grid" id="photos-grid">
                  ${(actaData.fotos || []).map((foto, idx) => `
                    <div class="photo-card" data-index="${idx}">
                      <div class="photo-preview-wrapper">
                        <img src="${foto.url}" alt="Foto de obra" />
                        <div class="photo-overlay-actions">
                          <button type="button" class="photo-overlay-btn view-photo" title="Ver en grande">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                          </button>
                          <button type="button" class="photo-overlay-btn remove-photo" title="Eliminar foto">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                      <div class="photo-meta-body">
                        <div>
                          <label class="form-hint" style="margin-bottom: 2px; display: block;">Fecha de la foto:</label>
                          <input type="date" class="form-control photo-date-input" value="${foto.fecha || actaData.fecha}" />
                        </div>
                        <div>
                          <label class="form-hint" style="margin-bottom: 2px; display: block;">Descripción opcional / Pie de foto:</label>
                          <textarea class="form-control photo-desc-input" placeholder="Descripción de la foto...">${escapeHtml(foto.descripcion || '')}</textarea>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>

              </div>
            </div>

            <!-- Section 5: Anexos Documentales PDF -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">📎</span>
                    Anexos Documentales PDF
                  </div>
                  <div class="editor-section-desc">
                    Adjunte documentos PDF (ensayos, planos, informes) que se incorporarán automáticamente al PDF final (no al Word).
                  </div>
                </div>
              </div>
              <div class="editor-section-body">
                <!-- Informative Callout -->
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.65rem 0.9rem; margin-bottom: 1rem; font-size: 0.82rem; color: #1e40af; display: flex; align-items: center; gap: 0.6rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <span>Los archivos PDF subidos en este apartado se concatenarán de forma correlativa al PDF oficial emitido. El archivo Word (.docx) descargable no contendrá estos adjuntos.</span>
                </div>

                <!-- PDF Upload Dropzone -->
                <div class="photo-uploader-box" id="pdf-drop-zone" style="border-style: dashed; padding: 1.5rem 1rem;">
                  <input type="file" id="pdf-file-input" class="photo-upload-input" accept="application/pdf" multiple />
                  <div class="photo-upload-icon" style="color: #dc2626;">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.25rem;">
                    Arrastre archivos PDF aquí o pulse para seleccionar
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                    Compatible con informes de ensayos, fichas técnicas, actas de replanteo, planos o documentos escaneados.
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('pdf-file-input').click()">
                    Seleccionar archivos PDF
                  </button>
                </div>

                <!-- PDF Annexes List -->
                <div id="pdf-annexes-list" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                  ${(actaData.anexosPdf && actaData.anexosPdf.length > 0) ? actaData.anexosPdf.map((pdf, pIdx) => `
                    <div class="pdf-annex-item" data-index="${pIdx}" style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.85rem 1rem; margin-bottom: 0.6rem;">
                      <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                        <div style="width: 36px; height: 36px; border-radius: 6px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; margin-top: 4px;">
                          PDF
                        </div>
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.45rem;">
                          <div>
                            <label class="form-hint" style="font-weight: 700; color: var(--text-main); margin-bottom: 2px; display: block;">Título / Nombre del Anexo (se mostrará en la separata y listado):</label>
                            <input type="text" class="form-control annex-nombre-input" value="${escapeHtml(pdf.nombre || '')}" placeholder="Ej: Plano de Replanteo de Cubierta, Informe de Ensayos a 28 días..." style="font-weight: 600; font-size: 0.88rem;" />
                          </div>
                          <div>
                            <label class="form-hint" style="margin-bottom: 2px; display: block;">Descripción del anexo / contenido del PDF:</label>
                            <input type="text" class="form-control annex-desc-input" value="${escapeHtml(pdf.descripcion || '')}" placeholder="Ej: Entregado por el Jefe de Obra en la visita; ensayos conformes..." style="font-size: 0.82rem;" />
                          </div>
                          <div style="font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span>Archivo original: <strong>${escapeHtml(pdf.archivo || pdf.nombre || 'documento.pdf')}</strong></span>
                            <span>•</span>
                            <span>${formatFileSize(pdf.tamano)}</span>
                            <span>•</span>
                            <span>Añadido el ${pdf.fecha || ''}</span>
                          </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0;">
                          <button type="button" class="btn btn-ghost btn-sm btn-view-pdf-annex" data-index="${pIdx}" title="Ver o descargar este PDF adjunto">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            <span>Ver</span>
                          </button>
                          <button type="button" class="btn btn-ghost btn-sm btn-delete-pdf-annex" data-index="${pIdx}" title="Eliminar anexo" style="color: var(--color-danger);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Borrar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  `).join('') : `
                    <div style="text-align: center; padding: 1.25rem; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-surface); border: 1px dashed var(--border-light); border-radius: var(--radius-sm);">
                      No se han adjuntado documentos PDF adicionales todavía.
                    </div>
                  `}
                </div>

              </div>
            </div>

          </form>

        </div>
      </div>
    `;

    wireEvents();
  }

  function collectFormData() {
    // Basic fields
    actaData.numero = parseInt(container.querySelector('#input-numero').value, 10) || 1;
    actaData.fecha = container.querySelector('#input-fecha').value;
    actaData.estado = container.querySelector('#input-estado').value;

    // Los datos del expediente son del expediente y proceden de la obra activa
    if (currentObra) {
      actaData.expediente = currentObra.expediente || actaData.expediente;
      actaData.obra = currentObra.titulo || actaData.obra;
      actaData.obraTitulo = currentObra.titulo || actaData.obraTitulo || actaData.obra;
      actaData.situacion = currentObra.situacion || actaData.situacion;
    }

    // Asistentes
    const asistentes = [];
    container.querySelectorAll('#asistentes-list .repeater-item').forEach(item => {
      const nombre = item.querySelector('.asist-nombre').value.trim();
      const cargo = item.querySelector('.asist-cargo').value.trim();
      const entidad = item.querySelector('.asist-entidad').value.trim();
      const asistio = item.querySelector('.asist-asistio').checked;
      const firmaChk = item.querySelector('.asist-firma');
      const firma = Boolean(asistio && firmaChk && firmaChk.checked);
      if (nombre || cargo) {
        asistentes.push({
          id: item.dataset.id || `asist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nombre,
          cargo,
          entidad,
          asistio,
          firma
        });
      }
    });
    actaData.asistentes = asistentes;

    // Apartados & Secciones
    const apartados = [];
    container.querySelectorAll('.apartado-card').forEach(apCard => {
      const apId = apCard.dataset.id || `ap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const titulo = apCard.querySelector('.apartado-titulo-input').value.trim();
      const secciones = [];
      apCard.querySelectorAll('.seccion-card').forEach(secCard => {
        const secId = secCard.dataset.id || `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const secTitulo = secCard.querySelector('.seccion-titulo-input').value.trim();
        const editorDiv = secCard.querySelector('.rich-editor-content');
        const secTexto = editorDiv ? editorDiv.innerHTML.trim() : '';
        secciones.push({
          id: secId,
          titulo: secTitulo,
          texto: secTexto
        });
      });
      apartados.push({
        id: apId,
        titulo: titulo,
        secciones: secciones
      });
    });
    actaData.apartados = apartados;

    // Sincronizar campos legados para vistas que los consulten
    if (apartados.length > 0) {
      actaData.cuestionesTratadas = (apartados[0].secciones || []).map(s => ({
        id: s.id,
        subtitulo: s.titulo,
        puntos: s.texto ? [s.texto] : []
      }));
    }

    // Firmas automáticamente generadas a partir de los asistentes que asisten y firman
    actaData.firmas = asistentes
      .filter(a => a.asistio && a.firma)
      .map(a => ({
        asistenteId: a.id,
        nombre: a.nombre,
        cargo: a.cargo || 'Dirección Facultativa',
        texto: `Fdo. ${a.nombre || ''} (${a.cargo || ''})`
      }));

    // Photos metadata
    actaData.fotos = Array.isArray(actaData.fotos) ? actaData.fotos : [];
    container.querySelectorAll('#photos-grid .photo-card').forEach(card => {
      const idx = parseInt(card.dataset.index, 10);
      if (actaData.fotos && actaData.fotos[idx]) {
        const dVal = card.querySelector('.photo-date-input')?.value;
        const descVal = card.querySelector('.photo-desc-input')?.value;
        if (dVal !== undefined) actaData.fotos[idx].fecha = dVal;
        if (descVal !== undefined) actaData.fotos[idx].descripcion = descVal.trim();
      }
    });

    // PDF Annexes metadata (nombre and descripcion)
    container.querySelectorAll('#pdf-annexes-list .pdf-annex-item').forEach(item => {
      const idx = parseInt(item.dataset.index, 10);
      if (actaData.anexosPdf && actaData.anexosPdf[idx]) {
        const nomVal = item.querySelector('.annex-nombre-input')?.value.trim();
        const descVal = item.querySelector('.annex-desc-input')?.value.trim();
        actaData.anexosPdf[idx].nombre = nomVal || actaData.anexosPdf[idx].archivo || 'Documento Anexo';
        actaData.anexosPdf[idx].descripcion = descVal || '';
      }
    });

    return actaData;
  }

  function wireEvents() {
    // Add Asistente
    container.querySelector('#btn-add-asistente').onclick = () => {
      collectFormData();
      actaData.asistentes.push({
        id: `asist-${Date.now()}`,
        nombre: '',
        cargo: '',
        entidad: '',
        asistio: true,
        firma: false
      });
      render();
    };

    // Remove Asistente
    container.querySelectorAll('.remove-asistente').forEach(btn => {
      btn.onclick = (e) => {
        const item = e.target.closest('.repeater-item');
        const idx = parseInt(item.dataset.index, 10);
        collectFormData();
        actaData.asistentes.splice(idx, 1);
        render();
      };
    });

    // Toggle Asistió: habilita/deshabilita la casilla Firma
    container.querySelectorAll('#asistentes-list .asist-asistio').forEach(chk => {
      chk.onchange = (e) => {
        const item = e.target.closest('.repeater-item');
        if (!item) return;
        const firmaLabel = item.querySelector('.label-asist-firma');
        const firmaChk = item.querySelector('.asist-firma');
        const cargoInput = item.querySelector('.asist-cargo');
        const entidadInput = item.querySelector('.asist-entidad');
        const isAttending = e.target.checked;

        if (!isAttending) {
          if (firmaChk) {
            firmaChk.checked = false;
            firmaChk.disabled = true;
          }
          if (firmaLabel) {
            firmaLabel.style.cursor = 'not-allowed';
            firmaLabel.style.color = 'var(--text-muted)';
          }
        } else {
          if (firmaChk) {
            firmaChk.disabled = false;
            const cargo = cargoInput ? cargoInput.value : '';
            const entidad = entidadInput ? entidadInput.value : '';
            if (isDefaultSignerRole(cargo, entidad)) {
              firmaChk.checked = true;
            }
          }
          if (firmaLabel) {
            firmaLabel.style.cursor = 'pointer';
            firmaLabel.style.color = 'var(--text-main)';
          }
        }
      };
    });

    // Add Apartado (Top & Bottom buttons)
    const onAddApartado = () => {
      collectFormData();
      const num = actaData.apartados.length + 1;
      actaData.apartados.push({
        id: `ap-${Date.now()}`,
        titulo: `APARTADO ${num}`,
        secciones: [
          {
            id: `sec-${Date.now()}-1`,
            titulo: `Tema o aspecto tratado`,
            texto: ''
          }
        ]
      });
      render();
      const apCards = container.querySelectorAll('.apartado-card');
      if (apCards.length) {
        apCards[apCards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const btnAddApTop = container.querySelector('#btn-add-apartado-top');
    if (btnAddApTop) btnAddApTop.onclick = onAddApartado;

    const btnAddApBottom = container.querySelector('.btn-add-apartado');
    if (btnAddApBottom) btnAddApBottom.onclick = onAddApartado;

    // Move Apartado Up
    container.querySelectorAll('.btn-move-apartado-up').forEach(btn => {
      btn.onclick = (e) => {
        collectFormData();
        const card = e.target.closest('.apartado-card');
        const idx = parseInt(card.dataset.apartadoIndex, 10);
        if (idx > 0) {
          const temp = actaData.apartados[idx];
          actaData.apartados[idx] = actaData.apartados[idx - 1];
          actaData.apartados[idx - 1] = temp;
          render();
        }
      };
    });

    // Move Apartado Down
    container.querySelectorAll('.btn-move-apartado-down').forEach(btn => {
      btn.onclick = (e) => {
        collectFormData();
        const card = e.target.closest('.apartado-card');
        const idx = parseInt(card.dataset.apartadoIndex, 10);
        if (idx < actaData.apartados.length - 1) {
          const temp = actaData.apartados[idx];
          actaData.apartados[idx] = actaData.apartados[idx + 1];
          actaData.apartados[idx + 1] = temp;
          render();
        }
      };
    });

    // Delete Apartado
    container.querySelectorAll('.btn-delete-apartado').forEach(btn => {
      btn.onclick = (e) => {
        const card = e.target.closest('.apartado-card');
        const idx = parseInt(card.dataset.apartadoIndex, 10);
        modal.confirm({
          title: 'Eliminar Apartado',
          message: `¿Seguro que desea eliminar el Apartado ${idx + 1} y todas sus secciones?`,
          confirmText: 'Eliminar',
          confirmClass: 'btn-danger',
          onConfirm: () => {
            collectFormData();
            actaData.apartados.splice(idx, 1);
            render();
          }
        });
      };
    });

    // Add Section inside an Apartado
    container.querySelectorAll('.btn-add-seccion').forEach(btn => {
      btn.onclick = (e) => {
        collectFormData();
        const apCard = e.target.closest('.apartado-card');
        const apIdx = parseInt(apCard.dataset.apartadoIndex, 10);
        const ap = actaData.apartados[apIdx];
        if (ap) {
          if (!ap.secciones) ap.secciones = [];
          ap.secciones.push({
            id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            titulo: '',
            texto: ''
          });
          render();
        }
      };
    });

    // Move Section Up
    container.querySelectorAll('.btn-move-seccion-up').forEach(btn => {
      btn.onclick = (e) => {
        collectFormData();
        const apCard = e.target.closest('.apartado-card');
        const apIdx = parseInt(apCard.dataset.apartadoIndex, 10);
        const secCard = e.target.closest('.seccion-card');
        const secIdx = parseInt(secCard.dataset.seccionIndex, 10);
        const ap = actaData.apartados[apIdx];
        if (ap && secIdx > 0) {
          const temp = ap.secciones[secIdx];
          ap.secciones[secIdx] = ap.secciones[secIdx - 1];
          ap.secciones[secIdx - 1] = temp;
          render();
        }
      };
    });

    // Move Section Down
    container.querySelectorAll('.btn-move-seccion-down').forEach(btn => {
      btn.onclick = (e) => {
        collectFormData();
        const apCard = e.target.closest('.apartado-card');
        const apIdx = parseInt(apCard.dataset.apartadoIndex, 10);
        const secCard = e.target.closest('.seccion-card');
        const secIdx = parseInt(secCard.dataset.seccionIndex, 10);
        const ap = actaData.apartados[apIdx];
        if (ap && secIdx < ap.secciones.length - 1) {
          const temp = ap.secciones[secIdx];
          ap.secciones[secIdx] = ap.secciones[secIdx + 1];
          ap.secciones[secIdx + 1] = temp;
          render();
        }
      };
    });

    // Delete Section
    container.querySelectorAll('.btn-delete-seccion').forEach(btn => {
      btn.onclick = (e) => {
        const apCard = e.target.closest('.apartado-card');
        const apIdx = parseInt(apCard.dataset.apartadoIndex, 10);
        const secCard = e.target.closest('.seccion-card');
        const secIdx = parseInt(secCard.dataset.seccionIndex, 10);
        const ap = actaData.apartados[apIdx];
        if (ap) {
          collectFormData();
          ap.secciones.splice(secIdx, 1);
          render();
        }
      };
    });

    // Wire Formatting Toolbar Toggle Tabs (Pestaña Formato)
    container.querySelectorAll('.rich-tab-toggle-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const seccionBody = btn.closest('.seccion-card-body') || btn.parentElement.parentElement;
        const toolbar = seccionBody ? seccionBody.querySelector('.rich-editor-toolbar') : null;
        if (!toolbar) return;
        const isHidden = toolbar.style.display === 'none' || getComputedStyle(toolbar).display === 'none';
        if (isHidden) {
          toolbar.style.display = 'flex';
          btn.classList.add('active');
          const arrow = btn.querySelector('.toggle-arrow');
          if (arrow) arrow.textContent = '▴';
        } else {
          toolbar.style.display = 'none';
          btn.classList.remove('active');
          const arrow = btn.querySelector('.toggle-arrow');
          if (arrow) arrow.textContent = '▾';
        }
      };
    });

    // Wire Rich Text Toolbars & Paste Handlers
    container.querySelectorAll('.rich-editor-container').forEach(richBox => {
      const editor = richBox.querySelector('.rich-editor-content');
      if (!editor) return;

      richBox.querySelectorAll('.btn-fmt-bold').forEach(b => {
        b.onmousedown = (e) => { e.preventDefault(); document.execCommand('bold', false, null); };
      });
      richBox.querySelectorAll('.btn-fmt-italic').forEach(b => {
        b.onmousedown = (e) => { e.preventDefault(); document.execCommand('italic', false, null); };
      });
      richBox.querySelectorAll('.btn-fmt-underline').forEach(b => {
        b.onmousedown = (e) => { e.preventDefault(); document.execCommand('underline', false, null); };
      });
      richBox.querySelectorAll('.btn-fmt-ul').forEach(b => {
        b.onmousedown = (e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false, null); };
      });
      richBox.querySelectorAll('.btn-fmt-ol').forEach(b => {
        b.onmousedown = (e) => { e.preventDefault(); document.execCommand('insertOrderedList', false, null); };
      });
      richBox.querySelectorAll('.btn-fmt-clear').forEach(b => {
        b.onmousedown = (e) => { e.preventDefault(); document.execCommand('removeFormat', false, null); };
      });
      richBox.querySelectorAll('.btn-color').forEach(b => {
        b.onmousedown = (e) => {
          e.preventDefault();
          const color = b.dataset.color;
          document.execCommand('foreColor', false, color);
        };
      });

      // Smart Paste Handler
      editor.onpaste = async (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        // 1. Detect image in clipboard
        const items = Array.from(clipboardData.items || []);
        const imgItem = items.find(it => it.type && it.type.startsWith('image/'));
        if (imgItem) {
          e.preventDefault();
          const file = imgItem.getAsFile();
          if (file) {
            showToast('Optimizando e incrustando imagen pegada...', 'info');
            try {
              const compressedUrl = await compressPastedImage(file);
              document.execCommand('insertImage', false, compressedUrl);
              showToast('Imagen comprimida pegada en el texto', 'success');
            } catch (err) {
              console.error('Error al comprimir imagen pegada:', err);
            }
          }
          return;
        }

        // 2. Detect HTML (Word / Excel / Web)
        const html = clipboardData.getData('text/html');
        if (html && (html.includes('Mso') || html.includes('table') || html.includes('<!--[if') || html.includes('<ul') || html.includes('<ol') || html.includes('<p') || html.includes('<div'))) {
          e.preventDefault();
          const cleanedHtml = cleanWordHtml(html);
          document.execCommand('insertHTML', false, cleanedHtml);
          showToast('Contenido adaptado y formateado correctamente', 'info');
          return;
        }

        // 3. Plain text paste: unwrap hard line breaks from PDF/notes and format lists
        const text = clipboardData.getData('text/plain');
        if (text) {
          e.preventDefault();
          const cleanedTextHtml = cleanPastedPlainText(text);
          document.execCommand('insertHTML', false, cleanedTextHtml);
          return;
        }
      };
    });

    // Evitar que el navegador abra archivos arrastrados fuera de la zona
    const preventWindowDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventWindowDrag);
    window.addEventListener('drop', preventWindowDrag);

    // Photo Dropzone and File Picker
    const fileInput = container.querySelector('#photo-file-input');
    const dropZone = container.querySelector('#drop-zone');

    if (dropZone && fileInput) {
      dropZone.style.cursor = 'pointer';
      dropZone.onclick = (e) => {
        if (e.target !== fileInput && !e.target.closest('button')) {
          fileInput.click();
        }
      };
    }

    const processPhotoFiles = async (files) => {
      const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (!imgFiles.length) {
        showToast('Seleccione archivos de imagen válidos (JPG, PNG, WebP)', 'warning');
        return;
      }

      showToast(`Procesando y optimizando ${imgFiles.length} fotografía(s)...`, 'info');
      collectFormData();
      if (!Array.isArray(actaData.fotos)) actaData.fotos = [];

      for (const file of imgFiles) {
        try {
          const compressedUrl = await db.compressImage(file);
          actaData.fotos.push({
            id: `foto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: compressedUrl,
            fecha: actaData.fecha || new Date().toISOString().split('T')[0],
            descripcion: '',
            categoria: 'Obra'
          });
        } catch (err) {
          console.error('Error al optimizar foto:', err);
        }
      }

      render();
      showToast('Fotografía(s) añadida(s) correctamente', 'success');
    };

    if (fileInput) {
      fileInput.onchange = async (e) => {
        await processPhotoFiles(e.target.files);
        fileInput.value = '';
      };
    }

    if (dropZone) {
      dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      };
      dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
      };
      dropZone.ondrop = async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        await processPhotoFiles(e.dataTransfer.files);
      };
    }

    // Sincronización en vivo de fecha y descripción de fotos
    container.querySelectorAll('#photos-grid .photo-card').forEach(card => {
      const idx = parseInt(card.dataset.index, 10);
      const dInp = card.querySelector('.photo-date-input');
      const descInp = card.querySelector('.photo-desc-input');
      if (dInp) {
        dInp.oninput = () => {
          if (actaData.fotos && actaData.fotos[idx]) {
            actaData.fotos[idx].fecha = dInp.value;
          }
        };
      }
      if (descInp) {
        descInp.oninput = () => {
          if (actaData.fotos && actaData.fotos[idx]) {
            actaData.fotos[idx].descripcion = descInp.value.trim();
          }
        };
      }
    });

    // View Large Photo Modal
    container.querySelectorAll('.view-photo').forEach(btn => {
      btn.onclick = (e) => {
        const card = e.target.closest('.photo-card');
        const idx = parseInt(card.dataset.index, 10);
        const foto = actaData.fotos[idx];
        if (foto) {
          modal.alert({
            title: `Fotografía ${idx + 1} - Acta nº ${actaData.numero}`,
            message: `
              <div style="text-align: center;">
                <img src="${foto.url}" style="max-width: 100%; max-height: 70vh; border-radius: var(--radius-sm); box-shadow: var(--shadow-md);" />
                ${foto.descripcion ? `<p style="margin-top: 1rem; font-weight: 500; color: var(--text-main);">${escapeHtml(foto.descripcion)}</p>` : ''}
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Fecha: ${formatDate(foto.fecha)}</div>
              </div>
            `
          });
        }
      };
    });

    // Remove Photo
    container.querySelectorAll('.remove-photo').forEach(btn => {
      btn.onclick = (e) => {
        const card = e.target.closest('.photo-card');
        const idx = parseInt(card.dataset.index, 10);
        collectFormData();
        actaData.fotos.splice(idx, 1);
        render();
      };
    });

    // PDF Annexes File Input and Dropzone
    const pdfFileInput = container.querySelector('#pdf-file-input');
    const pdfDropZone = container.querySelector('#pdf-drop-zone');

    const handlePdfFiles = async (files) => {
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (!pdfFiles.length) {
        showToast('Seleccione archivos en formato PDF', 'warning');
        return;
      }

      showToast(`Procesando ${pdfFiles.length} documento(s) PDF adjunto(s)...`, 'info');
      collectFormData();

      for (const file of pdfFiles) {
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const fileId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await db.savePdfFile(fileId, dataUrl, file.name, file.size);

          const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
          if (!actaData.anexosPdf) actaData.anexosPdf = [];
          actaData.anexosPdf.push({
            id: fileId,
            nombre: cleanTitle || file.name,
            archivo: file.name,
            descripcion: '',
            tamano: file.size,
            fecha: new Date().toISOString().split('T')[0],
            url: dataUrl
          });
        } catch (err) {
          console.error('Error al guardar archivo PDF:', err);
        }
      }

      render();
      showToast('Documento(s) PDF adjuntado(s) correctamente', 'success');
    };

    if (pdfFileInput) {
      pdfFileInput.onchange = (e) => {
        handlePdfFiles(e.target.files);
      };
    }

    if (pdfDropZone) {
      pdfDropZone.ondragover = (e) => {
        e.preventDefault();
        pdfDropZone.classList.add('drag-over');
      };
      pdfDropZone.ondragleave = () => {
        pdfDropZone.classList.remove('drag-over');
      };
      pdfDropZone.ondrop = (e) => {
        e.preventDefault();
        pdfDropZone.classList.remove('drag-over');
        handlePdfFiles(e.dataTransfer.files);
      };
    }

    // View PDF Annex
    container.querySelectorAll('.btn-view-pdf-annex').forEach(btn => {
      btn.onclick = async () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = actaData.anexosPdf[idx];
        if (!item) return;

        let dataUrl = item.url;
        if (!dataUrl && item.id) {
          const stored = await db.getPdfFile(item.id);
          dataUrl = stored ? stored.dataUrl : null;
        }

        if (dataUrl) {
          try {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
          } catch {
            window.open(dataUrl, '_blank');
          }
        } else {
          showToast('No se pudo cargar el archivo PDF', 'error');
        }
      };
    });

    // Delete PDF Annex
    container.querySelectorAll('.btn-delete-pdf-annex').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = actaData.anexosPdf[idx];
        modal.confirm({
          title: 'Eliminar Anexo PDF',
          message: `¿Desea eliminar el documento anexo "${item?.nombre || 'PDF'}"?`,
          confirmText: 'Eliminar',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            collectFormData();
            if (item?.id) {
              await db.deletePdfFile(item.id);
            }
            actaData.anexosPdf.splice(idx, 1);
            render();
            showToast('Documento anexo eliminado', 'info');
          }
        });
      };
    });

    // Cancel Button
    container.querySelector('#btn-cancel').onclick = () => {
      router.navigate('expediente', { id: actaData.obraId, tab: 'actas' });
    };

    // Preview Button
    const btnPreview = container.querySelector('#btn-preview');
    if (btnPreview) {
      btnPreview.onclick = () => {
        const data = collectFormData();
        db.saveActa(data);
        router.navigate('acta-print', { id: data.id });
      };
    }

    // Direct DOCX Export Button in Editor
    const btnDocx = container.querySelector('#btn-export-docx-editor');
    if (btnDocx) {
      btnDocx.onclick = async () => {
        const data = collectFormData();
        db.saveActa(data);
        const origHTML = btnDocx.innerHTML;
        try {
          btnDocx.disabled = true;
          btnDocx.innerHTML = `<span>Generando Word...</span>`;
          showToast('Generando documento Word con plantilla oficial...', 'info');
          const { exportActaToDocx } = await import('../exportDocx.js');
          const fname = await exportActaToDocx(data);
          showToast(`Documento ${fname} descargado con éxito`, 'success');
        } catch (err) {
          console.error(err);
          showToast('Error al exportar a Word', 'error');
        } finally {
          btnDocx.disabled = false;
          btnDocx.innerHTML = origHTML;
        }
      };
    }

    // Direct PDF Export Button in Editor
    const btnPdf = container.querySelector('#btn-export-pdf-editor');
    if (btnPdf) {
      btnPdf.onclick = async () => {
        const data = collectFormData();
        db.saveActa(data);
        const origHTML = btnPdf.innerHTML;
        try {
          btnPdf.disabled = true;
          btnPdf.innerHTML = `<span>Generando PDF...</span>`;
          showToast('Generando PDF oficial mediante Word...', 'info');
          const { exportActaToPdf } = await import('../exportDocx.js');
          const fname = await exportActaToPdf(data);
          showToast(`Documento PDF ${fname} generado con éxito`, 'success');
        } catch (err) {
          console.error(err);
          showToast('Error al exportar PDF con Word', 'error');
        } finally {
          btnPdf.disabled = false;
          btnPdf.innerHTML = origHTML;
        }
      };
    }

    // Save Button
    container.querySelector('#btn-save-acta').onclick = () => {
      const data = collectFormData();

      if (!data.numero || isNaN(data.numero)) {
        showToast('Debe indicar un número de acta válido', 'error');
        return;
      }
      if (!data.fecha) {
        showToast('Debe indicar la fecha de la reunión', 'error');
        return;
      }

      modal.confirmSave({
        title: 'Confirmar Guardado de Acta',
        message: `¿Desea guardar definitivamente los cambios en el Acta nº ${data.numero} (${formatDate(data.fecha)})?`,
        details: `Se actualizarán ${data.asistentes.length} asistentes, ${data.apartados ? data.apartados.length : 0} apartados con ${(data.apartados || []).reduce((acc, a) => acc + (a.secciones || []).length, 0)} sección(es), y ${(data.fotos || []).length} fotografías.`,
        onConfirm: () => {
          const res = db.saveActa(data);
          if (res === false) {
            showToast('Error al guardar: el almacenamiento local no pudo persistir los datos', 'error');
            return;
          }
          showToast(`Acta nº ${data.numero} guardada con éxito`, 'success');
          router.navigate('expediente', { id: data.obraId, tab: 'actas' });
        }
      });
    };
  }

  // Initial render
  render();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanNumberPrefix(str) {
  if (!str) return '';
  return String(str).replace(/^\d+(\.\d+)*[_.\s]+/, '').trim() || str;
}

function formatContentForEditor(content) {
  if (!content) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }
  return content.split('\n').filter(Boolean).map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

function cleanWordHtml(html) {
  if (!html) return '';
  let clean = html.replace(/<!--[\s\S]*?-->/gi, '');
  clean = clean.replace(/<xml[\s\S]*?<\/xml>/gi, '');
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<meta[\s\S]*?>/gi, '');
  clean = clean.replace(/<link[\s\S]*?>/gi, '');

  const temp = document.createElement('div');
  temp.innerHTML = clean;

  function cleanNode(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.className) {
        node.className = node.className.replace(/\bMso\w+\b/g, '').trim();
        if (!node.className) node.removeAttribute('class');
      }
      const style = node.getAttribute('style');
      if (style) {
        const kept = [];
        const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
        if (colorMatch && !colorMatch[1].includes('windowtext')) {
          kept.push(`color: ${colorMatch[1].trim()}`);
        }
        if (/font-weight\s*:\s*(bold|[7-9]00)/i.test(style)) {
          kept.push('font-weight: bold');
        }
        if (/font-style\s*:\s*italic/i.test(style)) {
          kept.push('font-style: italic');
        }
        if (/text-decoration\s*:\s*underline/i.test(style)) {
          kept.push('text-decoration: underline');
        }
        if (kept.length > 0) {
          node.setAttribute('style', kept.join('; '));
        } else {
          node.removeAttribute('style');
        }
      }
      if (node.tagName.toLowerCase().includes(':')) {
        const parent = node.parentNode;
        while (node.firstChild) {
          parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        return;
      }
      Array.from(node.childNodes).forEach(cleanNode);
    }
  }

  Array.from(temp.childNodes).forEach(cleanNode);
  return temp.innerHTML;
}

function compressPastedImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function generateDefaultFirmas(asistentes = []) {
  if (!asistentes || !asistentes.length) {
    return [
      { cargo: 'DO', texto: 'Rosa Vilas Romalde / Sergio Beceiro Lodeiro (Dirección de Obra)' },
      { cargo: 'DE', texto: 'Ana Gallego Núñez (Dirección de Ejecución)' }
    ];
  }
  const defaultSigners = asistentes.filter(a => isDefaultSignerRole(a.cargo, a.entidad));
  const targetList = defaultSigners.length > 0 ? defaultSigners : asistentes;
  return targetList.map(a => ({
    asistenteId: a.id,
    cargo: a.cargo || 'Dirección Facultativa',
    nombre: a.nombre,
    texto: `Fdo. ${a.nombre || ''} (${a.cargo || ''})`
  }));
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(unitIdx > 0 ? 1 : 0)} ${units[unitIdx]}`;
}

function cleanPastedPlainText(text) {
  if (!text) return '';
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawParagraphs = normalized.split(/\n\s*\n/);
  const resultParts = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const isBulletList = lines.every(l => /^[•\-\*]\s+/.test(l));
    const isNumberedList = lines.every(l => /^\d+[\.\)]\s+/.test(l));

    if (isBulletList) {
      const items = lines.map(l => `<li>${escapeHtml(l.replace(/^[•\-\*]\s+/, '').replace(/\s+/g, ' '))}</li>`).join('');
      resultParts.push(`<ul style="text-align: left; margin: 0.5rem 0 0.5rem 1.5rem;">${items}</ul>`);
    } else if (isNumberedList) {
      const items = lines.map(l => `<li>${escapeHtml(l.replace(/^\d+[\.\)]\s+/, '').replace(/\s+/g, ' '))}</li>`).join('');
      resultParts.push(`<ol style="text-align: left; margin: 0.5rem 0 0.5rem 1.5rem;">${items}</ol>`);
    } else {
      // Normal paragraph: unwrap PDF single newlines and collapse multiple spaces/tabs
      const unwrapped = lines.join(' ').replace(/[\t ]+/g, ' ');
      resultParts.push(`<p>${escapeHtml(unwrapped)}</p>`);
    }
  }

  return resultParts.join('');
}

