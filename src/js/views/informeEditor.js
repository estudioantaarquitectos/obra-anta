/* ==========================================================================
   ANTA OBRA - DT-05 Informe Editor View
   Strictly follows: DT05_INFORMES DE OBRA.pdf (10 official sections)
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { modal, showToast } from '../modal.js';
import { renderRichEditorHtml, wireRichEditors, getRichEditorContent } from '../utils/richEditor.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function renderInformeEditor(container, router, params = {}) {
  const isEditing = Boolean(params && params.id);
  const settings = db.getSettings();
  const obraId = (params && params.obraId) || db.getActiveObraId();
  const currentObra = db.getObraById(obraId) || db.getActiveObra();

  const emittedActas = db.getActas(obraId) || [];

  let infData;
  if (isEditing) {
    const existing = db.getInformeById(params.id);
    if (!existing) {
      showToast('O informe solicitado non existe', 'error');
      router.navigate('expediente', { id: obraId, tab: 'informes' });
      return;
    }
    infData = JSON.parse(JSON.stringify(existing));
    if (!infData.obraId && currentObra) {
      infData.obraId = currentObra.id;
    }
    infData.actasAnexasIds = infData.actasAnexasIds || [];
    infData.actasPdf = infData.actasPdf || [];
    infData.anexosPdf = infData.anexosPdf || [];
  } else {
    infData = {
      id: `inf-${Date.now()}`,
      obraId: currentObra ? currentObra.id : 'obra-castillo-san-felipe',
      tipo: 'mensual',
      numero: db.getNextInformeNumber(currentObra ? currentObra.id : null),
      actasPdf: [],
      actasAnexasIds: [],
      anexosPdf: [],
      datosXerais: {
        proxecto: currentObra ? currentObra.titulo : settings.obraPrincipal,
        emprazamento: currentObra ? currentObra.situacion : settings.situacion,
        expediente: currentObra ? currentObra.expediente : (settings.expediente || ''),
        contratista: currentObra ? currentObra.contratista : settings.contratista,
        direccionObra: currentObra ? currentObra.direccionObra : (settings.direccionObra || 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO)'),
        direccionEjecucion: currentObra ? currentObra.direccionEjecucion : (settings.direccionEjecucion || 'Ana Gallego Núñez (DEM)'),
        mesInformado: 'Outubro 2025',
        dataInforme: new Date().toISOString().split('T')[0]
      },
      resumoExecutivo: {
        estadoXeral: 'en_prazo',
        avancePrevisto: 45,
        avanceExecutado: 45,
        principaisFitos: '',
        principaisIncidencias: '',
        riscosDetectados: 'Risco de prazo / custo / técnico'
      },
      traballosExecutados: {
        executadosMes: '',
        enCurso: '',
        previstosProximoMes: '',
        controlXeometricoCualitativo: '',
        coordinacionOrganismos: '',
        obraNonAcreditada: 'Non hai obra non acreditada.'
      },
      condicionantesModificacions: {
        circunstanciasSobrevidas: '',
        desfasesMedicions: '',
        previsionModificados: {
          situacion: 'non_hai',
          descricionBreve: '',
          impactoPrazoCusto: ''
        }
      },
      seguimentoOrzamentario: {
        controlEconomico: {
          orzamentoAdxudicacion: 894520.00,
          importeCertificadoAcumulado: 402534.00,
          porcentaxeAcumulada: 45.0,
          certificacionMes: 44726.00,
          desviacionEstimada: '0.0%'
        },
        controlPrazo: {
          situacion: 'en_prazo',
          desviacionSemanas: 0,
          causas: '',
          medidasCorrectoras: '',
          previsionReestimacion: '',
          actualizacionPrograma: '',
          necesariaAmpliacion: false,
          xustificacionAmpliacion: ''
        }
      },
      controlCalidade: {
        resumoEnsaios: '',
        incidenciasSolucions: '',
        ensaiosAnexos: ''
      },
      seguridadeSaude: {
        situacionXeral: 'correcta',
        incidenciasRelevantes: ''
      },
      reportaxeFotografica: [],
      outros: {
        modificacionCondicions: '',
        certificadoTerminacionFase: ''
      },
      conclusion: {
        estado: 'favorable',
        comentariosFinais: ''
      },
      anexos: {
        actasVisitas: true,
        planObraActualizado: true,
        informesEnsaios: true,
        outrosAnexos: ''
      },
      estado: 'borrador'
    };
  }

  function render() {
    const ce = infData.seguimentoOrzamentario?.controlEconomico || {};
    const orzamentoVal = parseCurrency(ce.orzamentoAdxudicacion !== undefined ? ce.orzamentoAdxudicacion : 894520);
    const acumuladoVal = parseCurrency(ce.importeCertificadoAcumulado !== undefined ? ce.importeCertificadoAcumulado : 0);
    const mesVal = parseCurrency(ce.certificacionMes !== undefined ? ce.certificacionMes : 0);
    const pctCalculada = orzamentoVal > 0 ? (acumuladoVal / orzamentoVal) * 100 : 0;
    const pctDisplay = pctCalculada.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';

    container.innerHTML = `
      <div class="content-wrapper">
        <div class="editor-container">

          <!-- Sticky Top Header -->
          <div class="editor-sticky-header">
            <div class="editor-meta-info">
              <span class="editor-type-badge" style="background: #e0f2fe; color: #0369a1;">Informe Mensual</span>
              <div class="editor-doc-title">
                Informe ${infData.datosXerais?.mesInformado || infData.numero} • ${infData.datosXerais?.proxecto?.substring(0, 45) || 'Castillo de San Felipe'}...
              </div>
            </div>

            <div class="editor-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel">
                Cancelar
              </button>
              ${isEditing ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-preview">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  Ver Oficial
                </button>
              ` : ''}
              <button type="button" class="btn btn-primary" id="btn-save-informe">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Gardar Informe
              </button>
            </div>
          </div>

          <form id="informe-form">

            <!-- 1.- DATOS XERAIS E RESUMO EXECUTIVO -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">1</span>
                    1.- Datos Xerais e Resumo Executivo
                  </div>
                  <div class="editor-section-desc">Identificación da promoción e visión xeral de estado</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div style="display: grid; grid-template-columns: 140px 180px 1fr 180px; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label required">Nº de Informe</label>
                    <input type="number" id="num-informe" class="form-control" value="${infData.numero ?? ''}" min="1" placeholder="Ex: 1" style="font-weight: 700; font-size: 1.05rem;" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Tipo de Documento</label>
                    <select id="tipo-informe" class="form-control form-select">
                      <option value="mensual" ${infData.tipo === 'mensual' ? 'selected' : ''}>Informe Mensual</option>
                      <option value="semanal" ${infData.tipo === 'semanal' ? 'selected' : ''}>Informe Semanal</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Mes / Período Informado</label>
                    <input type="text" id="mes-informado" class="form-control" value="${escapeHtml(infData.datosXerais?.mesInformado || '')}" placeholder="Ex: Novembro 2025 - Xaneiro 2026 (Nadal)" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Data do Informe</label>
                    <input type="date" id="data-informe" class="form-control" value="${infData.datosXerais?.dataInforme || ''}" required />
                  </div>
                </div>

                <!-- Resumo Executivo: Estado xeneral da obra -->
                <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-light); margin-top: 1rem;">
                  <label class="form-label required" style="font-weight: 700; margin-bottom: 0.75rem;">
                    RESUMO EXECUTIVO: Estado xeral da obra
                  </label>
                  
                  <div class="status-selector-grid">
                    <label class="status-radio-card ${infData.resumoExecutivo?.estadoXeral === 'en_prazo' ? 'selected-success' : ''}">
                      <input type="radio" name="estadoXeral" value="en_prazo" ${infData.resumoExecutivo?.estadoXeral === 'en_prazo' ? 'checked' : ''} />
                      <span class="status-dot status-dot-green"></span>
                      <span style="font-weight: 600; font-size: 0.85rem;">En prazo e controlada</span>
                    </label>

                    <label class="status-radio-card ${infData.resumoExecutivo?.estadoXeral === 'con_desviacions' ? 'selected-warning' : ''}">
                      <input type="radio" name="estadoXeral" value="con_desviacions" ${infData.resumoExecutivo?.estadoXeral === 'con_desviacions' ? 'checked' : ''} />
                      <span class="status-dot status-dot-yellow"></span>
                      <span style="font-weight: 600; font-size: 0.85rem;">Con desviacións</span>
                    </label>

                    <label class="status-radio-card ${infData.resumoExecutivo?.estadoXeral === 'comprometida' ? 'selected-danger' : ''}">
                      <input type="radio" name="estadoXeral" value="comprometida" ${infData.resumoExecutivo?.estadoXeral === 'comprometida' ? 'checked' : ''} />
                      <span class="status-dot status-dot-red"></span>
                      <span style="font-weight: 600; font-size: 0.85rem;">Comprometida</span>
                    </label>
                  </div>

                  <div class="form-grid-2" style="margin-top: 1rem;">
                    <div class="form-group">
                      <label class="form-label required">Avance executado (% actual)</label>
                      <input type="number" id="avance-executado" class="form-control" value="${infData.resumoExecutivo?.avanceExecutado || 0}" min="0" max="100" step="0.1" />
                    </div>
                    <div class="form-group">
                      <label class="form-label required">Avance previsto no cronograma (%)</label>
                      <input type="number" id="avance-previsto" class="form-control" value="${infData.resumoExecutivo?.avancePrevisto || 0}" min="0" max="100" step="0.1" />
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Principais fitos do mes / período</label>
                    ${renderRichEditorHtml({ id: 'principais-fitos', content: infData.resumoExecutivo?.principaisFitos, placeholder: 'Ex: Remate da cuberta, probas de presión, etc.', minHeight: '65px' })}
                  </div>

                  <div class="form-group">
                    <label class="form-label">Principais incidencias</label>
                    ${renderRichEditorHtml({ id: 'principais-incidencias', content: infData.resumoExecutivo?.principaisIncidencias, placeholder: 'Incidencias máis salientables...', minHeight: '65px' })}
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Riscos detectados</label>
                    ${renderRichEditorHtml({ id: 'riscos-detectados', content: infData.resumoExecutivo?.riscosDetectados, placeholder: 'Risco de prazo / custo / técnico', minHeight: '55px' })}
                  </div>
                </div>

              </div>
            </div>

            <!-- 2.- TRABALLOS EXECUTADOS -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">2</span>
                    2.- Traballos Executados
                  </div>
                  <div class="editor-section-desc">Descrición da actividade construtiva no período correspondente</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div class="form-group">
                  <label class="form-label">Traballos executados no mes</label>
                  ${renderRichEditorHtml({ id: 'executados-mes', content: infData.traballosExecutados?.executadosMes, placeholder: 'Descrición breve por capítulos, fin de fase se corresponde...', minHeight: '80px' })}
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label">Traballos en curso</label>
                    ${renderRichEditorHtml({ id: 'en-curso', content: infData.traballosExecutados?.enCurso, placeholder: 'Descrición das tarefas activas...', minHeight: '75px' })}
                  </div>
                  <div class="form-group">
                    <label class="form-label">Traballos previstos próximo mes</label>
                    ${renderRichEditorHtml({ id: 'previstos-proximo', content: infData.traballosExecutados?.previstosProximoMes, placeholder: 'Planificación para o seguinte período...', minHeight: '75px' })}
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label">Control xeométrico e cualitativo</label>
                    ${renderRichEditorHtml({ id: 'control-xeometrico', content: infData.traballosExecutados?.controlXeometricoCualitativo, placeholder: 'Comprobacións de niveis, replanteos...', minHeight: '60px' })}
                  </div>
                  <div class="form-group">
                    <label class="form-label">Coordinación con organismos e/ou empresas subministradoras</label>
                    ${renderRichEditorHtml({ id: 'coordinacion-org', content: infData.traballosExecutados?.coordinacionOrganismos, placeholder: 'Xestións con Patrimonio, concello, etc.', minHeight: '60px' })}
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">A obra non acreditada (se a houbese) incluíndo xustificación</label>
                  ${renderRichEditorHtml({ id: 'obra-non-acreditada', content: infData.traballosExecutados?.obraNonAcreditada, placeholder: 'Non se rexistra obra non acreditada...', minHeight: '55px' })}
                </div>
              </div>
            </div>

            <!-- 3.- CONDICIONANTES, MODIFICACIÓNS E OUTRAS INCIDENCIAS -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">3</span>
                    3.- Condicionantes, Modificacións e Outras Incidencias
                  </div>
                  <div class="editor-section-desc">Circunstancias sobrevidas, novas unidades e previsión de modificados</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div class="form-group">
                  <label class="form-label">Circunstancias sobrevidas e/ou novas unidades de obra non contempladas</label>
                  ${renderRichEditorHtml({ id: 'circunstancias-sobrevidas', content: infData.condicionantesModificacions?.circunstanciasSobrevidas, placeholder: 'Indicar necesidade e valoración económica...', minHeight: '70px' })}
                </div>

                <div class="form-group">
                  <label class="form-label">Desfases nas medicións das unidades do proxecto</label>
                  ${renderRichEditorHtml({ id: 'desfases-medicions', content: infData.condicionantesModificacions?.desfasesMedicions, placeholder: 'Indicar se existen diferenzas salientables...', minHeight: '60px' })}
                </div>

                <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                  <label class="form-label" style="font-weight: 700; color: var(--text-main);">PREVISIÓN DE MODIFICADOS:</label>
                  <div class="status-selector-grid">
                    <label class="status-radio-card ${infData.condicionantesModificacions?.previsionModificados?.situacion === 'non_hai' ? 'selected-success' : ''}">
                      <input type="radio" name="modificadosSituacion" value="non_hai" ${infData.condicionantesModificacions?.previsionModificados?.situacion === 'non_hai' ? 'checked' : ''} />
                      <span>Non hai</span>
                    </label>
                    <label class="status-radio-card ${infData.condicionantesModificacions?.previsionModificados?.situacion === 'en_estudo' ? 'selected-warning' : ''}">
                      <input type="radio" name="modificadosSituacion" value="en_estudo" ${infData.condicionantesModificacions?.previsionModificados?.situacion === 'en_estudo' ? 'checked' : ''} />
                      <span>En estudo</span>
                    </label>
                    <label class="status-radio-card ${infData.condicionantesModificacions?.previsionModificados?.situacion === 'en_tramitacion' ? 'selected-danger' : ''}">
                      <input type="radio" name="modificadosSituacion" value="en_tramitacion" ${infData.condicionantesModificacions?.previsionModificados?.situacion === 'en_tramitacion' ? 'checked' : ''} />
                      <span>En tramitación</span>
                    </label>
                  </div>

                  <div class="form-grid-2" style="margin-top: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Descrición breve: [Modificacións] - [Xustificación]</label>
                      ${renderRichEditorHtml({ id: 'mod-descricion', content: infData.condicionantesModificacions?.previsionModificados?.descricionBreve, placeholder: '[Modificacións] - [Xustificación]...', minHeight: '55px' })}
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">⚠️ Indicar impacto en prazo e custo</label>
                      ${renderRichEditorHtml({ id: 'mod-impacto', content: infData.condicionantesModificacions?.previsionModificados?.impactoPrazoCusto, placeholder: 'Indicar impacto en prazo e custo...', minHeight: '55px' })}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- 4.- SEGUIMENTO ORZAMENTARIO E DA PROGRAMACIÓN -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">4</span>
                    4.- Seguimento Orzamentario e da Programación
                  </div>
                  <div class="editor-section-desc">4.1 Control Económico e 4.2 Control de Prazo</div>
                </div>
              </div>
              <div class="editor-section-body">
                
                <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem;">
                  4.1.- CONTROL ECONÓMICO (Portada da certificación)
                </h4>
                <div class="form-grid-4">
                  <div class="form-group">
                    <label class="form-label" for="eco-adxudicacion">Orzamento adxudicación (€)</label>
                    <input 
                      type="text" 
                      id="eco-adxudicacion" 
                      class="form-control" 
                      value="${formatCurrency(orzamentoVal)}" 
                      placeholder="0,00 €" 
                      autocomplete="off"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="eco-acumulado">Certificado acumulado (€)</label>
                    <input 
                      type="text" 
                      id="eco-acumulado" 
                      class="form-control" 
                      value="${formatCurrency(acumuladoVal)}" 
                      placeholder="0,00 €" 
                      autocomplete="off"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="eco-porcentaxe" style="display: flex; align-items: center; justify-content: space-between;">
                      <span>Porcentaxe acumulada (%)</span>
                      <span style="font-size: 0.72rem; color: var(--primary); font-weight: 600;">(Cálculo automático)</span>
                    </label>
                    <input 
                      type="text" 
                      id="eco-porcentaxe" 
                      class="form-control" 
                      value="${pctDisplay}" 
                      readonly 
                      tabindex="-1"
                      style="background-color: var(--bg-subtle, #f8fafc); font-weight: 700; color: var(--primary, #1e3a8a); cursor: default;" 
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="eco-mes">Certificación do mes (€)</label>
                    <input 
                      type="text" 
                      id="eco-mes" 
                      class="form-control" 
                      value="${formatCurrency(mesVal)}" 
                      placeholder="0,00 €" 
                      autocomplete="off"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Desviación estimada (€ / %)</label>
                  <input type="text" id="eco-desviacion" class="form-control" value="${escapeHtml(infData.seguimentoOrzamentario?.controlEconomico?.desviacionEstimada || '')}" placeholder="Ex: -2.0% respecto á previsión" />
                </div>

                <hr style="border: none; border-top: 1px solid var(--border-light); margin: 1.5rem 0;" />

                <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem;">
                  4.2.- CONTROL DE PRAZO
                </h4>
                
                <div class="status-selector-grid">
                  <label class="status-radio-card ${infData.seguimentoOrzamentario?.controlPrazo?.situacion === 'en_prazo' ? 'selected-success' : ''}">
                    <input type="radio" name="prazoSituacion" value="en_prazo" ${infData.seguimentoOrzamentario?.controlPrazo?.situacion === 'en_prazo' ? 'checked' : ''} />
                    <span class="status-dot status-dot-green"></span>
                    <span>En prazo</span>
                  </label>
                  <label class="status-radio-card ${infData.seguimentoOrzamentario?.controlPrazo?.situacion === 'atraso_leve' ? 'selected-warning' : ''}">
                    <input type="radio" name="prazoSituacion" value="atraso_leve" ${infData.seguimentoOrzamentario?.controlPrazo?.situacion === 'atraso_leve' ? 'checked' : ''} />
                    <span class="status-dot status-dot-yellow"></span>
                    <span>Atraso leve</span>
                  </label>
                  <label class="status-radio-card ${infData.seguimentoOrzamentario?.controlPrazo?.situacion === 'atraso_significativo' ? 'selected-danger' : ''}">
                    <input type="radio" name="prazoSituacion" value="atraso_significativo" ${infData.seguimentoOrzamentario?.controlPrazo?.situacion === 'atraso_significativo' ? 'checked' : ''} />
                    <span class="status-dot status-dot-red"></span>
                    <span>Atraso significativo</span>
                  </label>
                </div>

                <div class="form-grid-3" style="margin-top: 1rem;">
                  <div class="form-group">
                    <label class="form-label">Desviación estimada (+/- semanas)</label>
                    <input type="number" id="prazo-semanas" class="form-control" value="${infData.seguimentoOrzamentario?.controlPrazo?.desviacionSemanas || 0}" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Causas</label>
                    ${renderRichEditorHtml({ id: 'prazo-causas', content: infData.seguimentoOrzamentario?.controlPrazo?.causas, placeholder: 'Causas de atraso...', minHeight: '55px' })}
                  </div>
                  <div class="form-group">
                    <label class="form-label">Medidas correctoras</label>
                    ${renderRichEditorHtml({ id: 'prazo-medidas', content: infData.seguimentoOrzamentario?.controlPrazo?.medidasCorrectoras, placeholder: 'Medidas correctoras...', minHeight: '55px' })}
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label">Previsión e reestimación de prazos</label>
                    ${renderRichEditorHtml({ id: 'prazo-prevision', content: infData.seguimentoOrzamentario?.controlPrazo?.previsionReestimacion, placeholder: 'Previsión e reestimación de prazos...', minHeight: '65px' })}
                  </div>
                  <div class="form-group">
                    <label class="form-label">Actualización do programa de traballos</label>
                    ${renderRichEditorHtml({ id: 'prazo-actualizacion', content: infData.seguimentoOrzamentario?.controlPrazo?.actualizacionPrograma, placeholder: 'Actualización do programa de traballos...', minHeight: '65px' })}
                  </div>
                </div>

                <div style="background: var(--bg-subtle); padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="prazo-necesaria-ampliacion" ${infData.seguimentoOrzamentario?.controlPrazo?.necesariaAmpliacion ? 'checked' : ''} />
                    É necesaria unha ampliación do prazo da obra?
                  </label>
                  <div id="box-xustificacion-ampliacion" style="margin-top: 0.6rem; display: ${infData.seguimentoOrzamentario?.controlPrazo?.necesariaAmpliacion ? 'block' : 'none'};">
                    <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.3rem;">Xustificación da ampliación solicitada:</label>
                    ${renderRichEditorHtml({ id: 'prazo-xustificacion', content: infData.seguimentoOrzamentario?.controlPrazo?.xustificacionAmpliacion, placeholder: 'Xustificación e semanas solicitadas para iniciar trámite canto antes...', minHeight: '65px' })}
                  </div>
                </div>

              </div>
            </div>

            <!-- 5.- CONTROL DE CALIDADE & 6.- SEGURIDADE E SAÚDE -->
            <div class="form-grid-2">
              <div class="editor-section">
                <div class="editor-section-header">
                  <div class="editor-section-title">
                    <span class="section-number-tag">5</span>
                    5.- Control de Calidade
                  </div>
                </div>
                <div class="editor-section-body">
                  <div class="form-group">
                    <label class="form-label">Resumo de ensaios e informes do mes</label>
                    ${renderRichEditorHtml({ id: 'cal-ensaios', content: infData.controlCalidade?.resumoEnsaios, placeholder: 'Resumo de ensaios e informes do mes...', minHeight: '75px' })}
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Incidencias e solución proposta para materiais deficientes</label>
                    ${renderRichEditorHtml({ id: 'cal-incidencias', content: infData.controlCalidade?.incidenciasSolucions, placeholder: 'Incidencias e solución proposta...', minHeight: '75px' })}
                  </div>
                </div>
              </div>

              <div class="editor-section">
                <div class="editor-section-header">
                  <div class="editor-section-title">
                    <span class="section-number-tag">6</span>
                    6.- Seguridade e Saúde
                  </div>
                </div>
                <div class="editor-section-body">
                  <div class="form-group">
                    <label class="form-label">Situación xeral</label>
                    <div style="display: flex; gap: 1rem;">
                      <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                        <input type="radio" name="seguridadeSituacion" value="correcta" ${infData.seguridadeSaude?.situacionXeral === 'correcta' ? 'checked' : ''} />
                        Correcta
                      </label>
                      <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                        <input type="radio" name="seguridadeSituacion" value="con_incidencias" ${infData.seguridadeSaude?.situacionXeral === 'con_incidencias' ? 'checked' : ''} />
                        Con incidencias
                      </label>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Incidencias relevantes (en base a documentación CSS)</label>
                    ${renderRichEditorHtml({ id: 'seg-incidencias', content: infData.seguridadeSaude?.incidenciasRelevantes, placeholder: 'Incidencias relevantes (en base a documentación CSS)...', minHeight: '80px' })}
                  </div>
                </div>
              </div>
            </div>

            <!-- 7.- REPORTAXE FOTOGRÁFICA -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">7</span>
                    7.- Reportaxe Fotográfica
                  </div>
                  <div class="editor-section-desc">Imaxes xerais e detalles de execución con data de realización e pé de foto</div>
                </div>
              </div>
              <div class="editor-section-body">
                <div class="photo-uploader-box" id="inf-drop-zone">
                  <input type="file" id="inf-photo-file-input" class="photo-upload-input" accept="image/*" multiple />
                  <div class="photo-upload-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
                    Subir fotografías para a reportaxe
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="document.getElementById('inf-photo-file-input').click()">
                    Seleccionar imaxes
                  </button>
                </div>

                <div class="photos-grid" id="inf-photos-grid">
                  ${(infData.reportaxeFotografica || []).map((foto, idx) => `
                    <div class="photo-card" data-index="${idx}">
                      <div class="photo-preview-wrapper">
                        <img src="${foto.url}" alt="Foto" />
                        <div class="photo-overlay-actions">
                          <button type="button" class="photo-overlay-btn inf-remove-photo" title="Eliminar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                      <div class="photo-meta-body">
                        <div>
                          <label class="form-hint">Data realización:</label>
                          <input type="date" class="form-control inf-photo-date" value="${foto.data || infData.datosXerais?.dataInforme}" />
                        </div>
                        <div>
                          <label class="form-hint">Descrición / Pé de foto:</label>
                          <textarea class="form-control inf-photo-desc" placeholder="Descrición da imaxe...">${escapeHtml(foto.descripcion || '')}</textarea>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- 8.- OUTROS E 9.- CONCLUSIÓN -->
            <div class="form-grid-2">
              <div class="editor-section">
                <div class="editor-section-header">
                  <div class="editor-section-title">
                    <span class="section-number-tag">8</span>
                    8.- Outros
                  </div>
                </div>
                <div class="editor-section-body">
                  <div class="form-group">
                    <label class="form-label">Modificacións das condicións contractuais iniciais</label>
                    ${renderRichEditorHtml({ id: 'outros-condicions', content: infData.outros?.modificacionCondicions, placeholder: 'Persoal adscrito, subcontratas, solicitude de ampliación...', minHeight: '65px' })}
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Certificado de terminación de fase</label>
                    ${renderRichEditorHtml({ id: 'outros-certificado', content: infData.outros?.certificadoTerminacionFase, placeholder: 'Certificado de terminación de fase...', minHeight: '55px' })}
                  </div>
                </div>
              </div>

              <div class="editor-section">
                <div class="editor-section-header">
                  <div class="editor-section-title">
                    <span class="section-number-tag">9</span>
                    9.- Conclusión da Dirección de Obra
                  </div>
                </div>
                <div class="editor-section-body">
                  <div class="form-group">
                    <label class="form-label">A obra presenta un estado:</label>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                      <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                        <input type="radio" name="conclusionEstado" value="favorable" ${infData.conclusion?.estado === 'favorable' ? 'checked' : ''} />
                        🟢 Favorable
                      </label>
                      <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                        <input type="radio" name="conclusionEstado" value="atencion_requirida" ${infData.conclusion?.estado === 'atencion_requirida' ? 'checked' : ''} />
                        🟡 Con atención requirida
                      </label>
                      <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                        <input type="radio" name="conclusionEstado" value="comprometido" ${infData.conclusion?.estado === 'comprometido' ? 'checked' : ''} />
                        🔴 Comprometido
                      </label>
                    </div>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Comentarios finais (Valoración clara e directa da DO)</label>
                    ${renderRichEditorHtml({ id: 'concl-comentarios', content: infData.conclusion?.comentariosFinais, placeholder: 'Comentarios finais (Valoración clara e directa da DO)...', minHeight: '80px' })}
                  </div>
                </div>
              </div>
            </div>

            <!-- 10.- ANEXOS -->
            <div class="editor-section">
              <div class="editor-section-header">
                <div>
                  <div class="editor-section-title">
                    <span class="section-number-tag">10</span>
                    10.- Anexos Documentais do Informe
                  </div>
                  <div class="editor-section-desc">
                    Seleccione as actas semanais a incorporar e adxunte calquera documento PDF adicional. Concatenaranse de forma correlativa ao PDF final emitido (non ao Word).
                  </div>
                </div>
              </div>
              <div class="editor-section-body">
                <!-- Informative Callout -->
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.65rem 0.9rem; margin-bottom: 1.25rem; font-size: 0.82rem; color: #1e40af; display: flex; align-items: center; gap: 0.6rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <span>Os documentos PDF e actas semanais seleccionadas engadiranse correlativamente ao PDF oficial xerado para o informe mensual. O ficheiro editable de Word (.docx) descargable non incluirá estes ficheiros anexos.</span>
                </div>

                <!-- 10.1 Actas de Visitas Semanais en PDF (Apartado Propio) -->
                <div style="background: var(--bg-subtle); border: 1.5px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.95rem 1rem; margin-bottom: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.6rem;">
                    <div>
                      <div style="font-weight: 700; font-size: 0.92rem; color: #1e3a8a; display: flex; align-items: center; gap: 0.4rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        <span>Actas de Visitas Semanais en PDF (Apartado Propio)</span>
                        <span class="badge badge-info" id="badge-actas-pdf-count" style="font-size: 0.72rem;">
                          ${(infData.actasPdf || []).length} adxunta(s)
                        </span>
                      </div>
                      <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.15rem;">
                        Adxunte as actas semanais oficiais en PDF emitidas durante o mes. Concatenaranse con separata oficial propia ao PDF do informe.
                      </div>
                    </div>
                  </div>

                  <!-- Dropzone para Actas en PDF -->
                  <div class="photo-uploader-box" id="inf-actas-pdf-drop-zone" style="border-style: dashed; border-color: #93c5fd; background: #eff6ff; padding: 1.15rem 1rem; margin-bottom: 0.85rem;">
                    <input type="file" id="inf-actas-pdf-file-input" class="photo-upload-input" accept="application/pdf" multiple />
                    <div class="photo-upload-icon" style="color: #2563eb;">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    </div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: #1e3a8a; margin-bottom: 0.2rem;">
                      Arrastre as actas semanais en PDF aquí ou prema para seleccionar
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('inf-actas-pdf-file-input').click()" style="font-size: 0.82rem; font-weight: 600;">
                      Seleccionar actas semanais en PDF
                    </button>
                  </div>

                  <!-- Lista de Actas en PDF Adxuntadas -->
                  <div id="inf-actas-pdf-list" style="display: flex; flex-direction: column; gap: 0.6rem;">
                    ${(infData.actasPdf && infData.actasPdf.length > 0) ? infData.actasPdf.map((acta, aIdx) => `
                      <div class="inf-acta-pdf-item" data-index="${aIdx}" style="background: var(--bg-surface); border: 1.5px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.85rem 1rem;">
                        <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                          <div style="width: 40px; height: 40px; border-radius: 6px; background: #dbeafe; color: #1e40af; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; font-size: 0.7rem; flex-shrink: 0; margin-top: 4px;">
                            <span>ACTA</span>
                            <span style="font-size: 0.6rem; font-weight: 600;">PDF</span>
                          </div>
                          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.45rem;">
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.6rem;">
                              <div>
                                <label class="form-hint" style="font-weight: 700; color: #1e3a8a; margin-bottom: 2px; display: block;">Título / Número da Acta (aparecerá na separata e no informe):</label>
                                <input type="text" class="form-control inf-acta-nombre-input" value="${escapeHtml(acta.nombre || `Acta de Visita nº ${aIdx + 1}`)}" placeholder="Ex: Acta nº 1, Acta de Visita nº 2..." style="font-weight: 600; font-size: 0.88rem;" />
                              </div>
                              <div>
                                <label class="form-hint" style="font-weight: 700; color: #1e3a8a; margin-bottom: 2px; display: block;">Data da Visita:</label>
                                <input type="date" class="form-control inf-acta-fecha-input" value="${acta.fecha || ''}" style="font-size: 0.85rem;" />
                              </div>
                            </div>
                            <div>
                              <label class="form-hint" style="margin-bottom: 2px; display: block;">Descrición da visita / Observacións:</label>
                              <input type="text" class="form-control inf-acta-desc-input" value="${escapeHtml(acta.descripcion || '')}" placeholder="Ex: Visita ordinaria semanal de seguimento e control..." style="font-size: 0.82rem;" />
                            </div>
                            <div style="font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                              <span>Arquivo orixinal: <strong>${escapeHtml(acta.archivo || acta.nombre || 'acta.pdf')}</strong></span>
                              <span>•</span>
                              <span>${formatFileSize(acta.tamano)}</span>
                              <span>•</span>
                              <span>Engadido o ${acta.uploadDate || acta.fecha || ''}</span>
                            </div>
                          </div>
                          <div style="display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0;">
                            <button type="button" class="btn btn-ghost btn-sm inf-btn-view-acta-pdf" data-index="${aIdx}" title="Ver acta en PDF">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                              <span>Ver</span>
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm inf-btn-delete-acta-pdf" data-index="${aIdx}" title="Eliminar acta" style="color: var(--color-danger);">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              <span>Borrar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    `).join('') : `
                      <div style="text-align: center; padding: 1.1rem 1rem; color: var(--text-muted); font-size: 0.82rem; background: var(--bg-surface); border: 1px dashed var(--border-light); border-radius: var(--radius-sm);">
                        Non se achegaron actas semanais en PDF aínda.
                      </div>
                    `}
                  </div>
                </div>

                <!-- 10.2 Outros Documentos PDF Anexos -->
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); margin-bottom: 0.25rem;">
                    Documentos e Informes PDF Anexos
                  </div>
                  <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 0.6rem;">
                    Suba ensaios de laboratorio, planos de replanteo, plan de obra en PDF, etc.
                  </div>

                  <div class="photo-uploader-box" id="inf-pdf-drop-zone" style="border-style: dashed; padding: 1.25rem 1rem;">
                    <input type="file" id="inf-pdf-file-input" class="photo-upload-input" accept="application/pdf" multiple />
                    <div class="photo-upload-icon" style="color: #dc2626;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </div>
                    <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-main); margin-bottom: 0.2rem;">
                      Arrastre ficheiros PDF aquí ou prema para seleccionar
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('inf-pdf-file-input').click()">
                      Seleccionar arquivos PDF
                    </button>
                  </div>

                  <!-- PDF Annexes List -->
                  <div id="inf-pdf-annexes-list" style="margin-top: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem;">
                    ${(infData.anexosPdf && infData.anexosPdf.length > 0) ? infData.anexosPdf.map((pdf, pIdx) => `
                      <div class="inf-pdf-annex-item" data-index="${pIdx}" style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.85rem 1rem;">
                        <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                          <div style="width: 36px; height: 36px; border-radius: 6px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; margin-top: 4px;">
                            PDF
                          </div>
                          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.45rem;">
                            <div>
                              <label class="form-hint" style="font-weight: 700; color: var(--text-main); margin-bottom: 2px; display: block;">Título / Nome do Anexo (aparecerá na separata e no informe):</label>
                              <input type="text" class="form-control inf-annex-nombre-input" value="${escapeHtml(pdf.nombre || '')}" placeholder="Ex: Plano de replanteo, Informe de ensaios..." style="font-weight: 600; font-size: 0.88rem;" />
                            </div>
                            <div>
                              <label class="form-hint" style="margin-bottom: 2px; display: block;">Descrición do anexo / contido do PDF:</label>
                              <input type="text" class="form-control inf-annex-desc-input" value="${escapeHtml(pdf.descripcion || '')}" placeholder="Ex: Probas de laboratorio a 28 días; plano modificado entregado en visita..." style="font-size: 0.82rem;" />
                            </div>
                            <div style="font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                              <span>Arquivo orixinal: <strong>${escapeHtml(pdf.archivo || pdf.nombre || 'documento.pdf')}</strong></span>
                              <span>•</span>
                              <span>${formatFileSize(pdf.tamano)}</span>
                              <span>•</span>
                              <span>Engadido o ${pdf.fecha || ''}</span>
                            </div>
                          </div>
                          <div style="display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0;">
                            <button type="button" class="btn btn-ghost btn-sm inf-btn-view-pdf" data-index="${pIdx}" title="Ver anexo">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                              <span>Ver</span>
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm inf-btn-delete-pdf" data-index="${pIdx}" title="Eliminar anexo" style="color: var(--color-danger);">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              <span>Borrar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    `).join('') : `
                      <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.82rem; background: var(--bg-surface); border: 1px dashed var(--border-light); border-radius: var(--radius-sm);">
                        Non se achegaron documentos PDF adicionais aínda.
                      </div>
                    `}
                  </div>
                </div>

                <div class="form-group" style="margin-top: 1rem; margin-bottom: 0;">
                  <label class="form-label">Outras observacións de anexos (Texto explicativo no informe mensual):</label>
                  <input type="text" id="anexo-outros" class="form-control" value="${escapeHtml(infData.anexos?.outrosAnexos || '')}" placeholder="Fichas técnicas, planos CAD, ensaios..." />
                </div>
              </div>
            </div>

          </form>

        </div>
      </div>
    `;

    wireEvents();
  }

  function collectData() {
    infData.tipo = container.querySelector('#tipo-informe')?.value || 'mensual';
    const numParsed = parseInt(container.querySelector('#num-informe')?.value, 10);
    const curExp = currentObra ? currentObra.expediente : (infData.datosXerais?.expediente || settings.expediente || '');
    const curTitulo = currentObra ? currentObra.titulo : (infData.datosXerais?.proxecto || settings.obraPrincipal || '');
    infData.expediente = curExp;
    infData.obraTitulo = curTitulo;
    infData.datosXerais = {
      proxecto: curTitulo,
      emprazamento: currentObra ? currentObra.situacion : (infData.datosXerais?.emprazamento || settings.situacion),
      expediente: curExp,
      contratista: currentObra ? (currentObra.contratista || '') : (infData.datosXerais?.contratista || settings.contratista),
      direccionObra: currentObra ? currentObra.direccionObra : (infData.datosXerais?.direccionObra || settings.direccionObra || 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO)'),
      direccionEjecucion: currentObra ? currentObra.direccionEjecucion : (infData.datosXerais?.direccionEjecucion || settings.direccionEjecucion || 'Ana Gallego Núñez (DEM)'),
      mesInformado: container.querySelector('#mes-informado')?.value.trim() || '',
      dataInforme: container.querySelector('#data-informe')?.value || ''
    };

    const estRadio = container.querySelector('input[name="estadoXeral"]:checked');
    infData.resumoExecutivo = {
      estadoXeral: estRadio ? estRadio.value : 'en_prazo',
      avanceExecutado: parseFloat(container.querySelector('#avance-executado')?.value) || 0,
      avancePrevisto: parseFloat(container.querySelector('#avance-previsto')?.value) || 0,
      principaisFitos: getRichEditorContent(container, 'principais-fitos'),
      principaisIncidencias: getRichEditorContent(container, 'principais-incidencias'),
      riscosDetectados: getRichEditorContent(container, 'riscos-detectados')
    };

    infData.traballosExecutados = {
      executadosMes: getRichEditorContent(container, 'executados-mes'),
      enCurso: getRichEditorContent(container, 'en-curso'),
      previstosProximoMes: getRichEditorContent(container, 'previstos-proximo'),
      controlXeometricoCualitativo: getRichEditorContent(container, 'control-xeometrico'),
      coordinacionOrganismos: getRichEditorContent(container, 'coordinacion-org'),
      obraNonAcreditada: getRichEditorContent(container, 'obra-non-acreditada')
    };

    const modSitRadio = container.querySelector('input[name="modificadosSituacion"]:checked');
    infData.condicionantesModificacions = {
      circunstanciasSobrevidas: getRichEditorContent(container, 'circunstancias-sobrevidas'),
      desfasesMedicions: getRichEditorContent(container, 'desfases-medicions'),
      previsionModificados: {
        situacion: modSitRadio ? modSitRadio.value : 'non_hai',
        descricionBreve: getRichEditorContent(container, 'mod-descricion'),
        impactoPrazoCusto: getRichEditorContent(container, 'mod-impacto')
      }
    };

    const orzamentoNum = parseCurrency(container.querySelector('#eco-adxudicacion')?.value);
    const acumuladoNum = parseCurrency(container.querySelector('#eco-acumulado')?.value);
    const mesNum = parseCurrency(container.querySelector('#eco-mes')?.value);
    let pctCalculada = 0;
    if (orzamentoNum > 0) {
      pctCalculada = Math.round((acumuladoNum / orzamentoNum) * 10000) / 100;
    }

    const prazoSitRadio = container.querySelector('input[name="prazoSituacion"]:checked');
    infData.seguimentoOrzamentario = {
      controlEconomico: {
        orzamentoAdxudicacion: orzamentoNum,
        importeCertificadoAcumulado: acumuladoNum,
        porcentaxeAcumulada: pctCalculada,
        certificacionMes: mesNum,
        desviacionEstimada: container.querySelector('#eco-desviacion')?.value.trim() || ''
      },
      controlPrazo: {
        situacion: prazoSitRadio ? prazoSitRadio.value : 'en_prazo',
        desviacionSemanas: parseInt(container.querySelector('#prazo-semanas')?.value, 10) || 0,
        causas: getRichEditorContent(container, 'prazo-causas'),
        medidasCorrectoras: getRichEditorContent(container, 'prazo-medidas'),
        previsionReestimacion: getRichEditorContent(container, 'prazo-prevision'),
        actualizacionPrograma: getRichEditorContent(container, 'prazo-actualizacion'),
        necesariaAmpliacion: Boolean(container.querySelector('#prazo-necesaria-ampliacion')?.checked),
        xustificacionAmpliacion: getRichEditorContent(container, 'prazo-xustificacion')
      }
    };

    infData.controlCalidade = {
      resumoEnsaios: getRichEditorContent(container, 'cal-ensaios'),
      incidenciasSolucions: getRichEditorContent(container, 'cal-incidencias'),
      ensaiosAnexos: ''
    };

    const segRadio = container.querySelector('input[name="seguridadeSituacion"]:checked');
    infData.seguridadeSaude = {
      situacionXeral: segRadio ? segRadio.value : 'correcta',
      incidenciasRelevantes: getRichEditorContent(container, 'seg-incidencias')
    };

    const conclRadio = container.querySelector('input[name="conclusionEstado"]:checked');
    infData.conclusion = {
      estado: conclRadio ? conclRadio.value : 'favorable',
      comentariosFinais: getRichEditorContent(container, 'concl-comentarios')
    };

    infData.outros = {
      modificacionCondicions: getRichEditorContent(container, 'outros-condicions'),
      certificadoTerminacionFase: getRichEditorContent(container, 'outros-certificado')
    };

    infData.actasPdf = infData.actasPdf || [];
    infData.actasAnexasIds = infData.actasAnexasIds || [];
    infData.anexosPdf = infData.anexosPdf || [];

    // Update Acta PDF inputs
    container.querySelectorAll('#inf-actas-pdf-list .inf-acta-pdf-item').forEach(item => {
      const idx = parseInt(item.dataset.index, 10);
      if (infData.actasPdf && infData.actasPdf[idx]) {
        const nomVal = item.querySelector('.inf-acta-nombre-input')?.value.trim();
        const fechaVal = item.querySelector('.inf-acta-fecha-input')?.value;
        const descVal = item.querySelector('.inf-acta-desc-input')?.value.trim();
        infData.actasPdf[idx].nombre = nomVal || infData.actasPdf[idx].archivo || `Acta de Visita nº ${idx + 1}`;
        infData.actasPdf[idx].fecha = fechaVal || infData.actasPdf[idx].fecha || '';
        infData.actasPdf[idx].descripcion = descVal || '';
      }
    });

    infData.anexos = {
      actasVisitas: infData.actasPdf.length > 0 || infData.actasAnexasIds.length > 0,
      planObraActualizado: true,
      informesEnsaios: true,
      outrosAnexos: container.querySelector('#anexo-outros') ? container.querySelector('#anexo-outros').value.trim() : ''
    };

    // Update photo inputs
    container.querySelectorAll('#inf-photos-grid .photo-card').forEach(card => {
      const idx = parseInt(card.dataset.index, 10);
      if (infData.reportaxeFotografica && infData.reportaxeFotografica[idx]) {
        infData.reportaxeFotografica[idx].data = card.querySelector('.inf-photo-date')?.value || '';
        infData.reportaxeFotografica[idx].descripcion = card.querySelector('.inf-photo-desc')?.value.trim() || '';
      }
    });

    // Update PDF Annex inputs
    container.querySelectorAll('#inf-pdf-annexes-list .inf-pdf-annex-item').forEach(item => {
      const idx = parseInt(item.dataset.index, 10);
      if (infData.anexosPdf && infData.anexosPdf[idx]) {
        const nomVal = item.querySelector('.inf-annex-nombre-input')?.value.trim();
        const descVal = item.querySelector('.inf-annex-desc-input')?.value.trim();
        infData.anexosPdf[idx].nombre = nomVal || infData.anexosPdf[idx].archivo || 'Documento Anexo';
        infData.anexosPdf[idx].descripcion = descVal || '';
      }
    });

    return infData;
  }

  function wireEvents() {
    // Wire rich text toolbars and paste interceptors
    wireRichEditors(container);

    // =========================================================================
    // Control Económico: Formato Moeda (€ con céntimos) e Cálculo Automático %
    // =========================================================================
    const inputAdx = container.querySelector('#eco-adxudicacion');
    const inputAcum = container.querySelector('#eco-acumulado');
    const inputMes = container.querySelector('#eco-mes');
    const inputPct = container.querySelector('#eco-porcentaxe');

    const updatePctAutomatico = () => {
      if (!inputAdx || !inputAcum || !inputPct) return;
      const adxVal = parseCurrency(inputAdx.value);
      const acumVal = parseCurrency(inputAcum.value);
      let pct = 0;
      if (adxVal > 0) {
        pct = (acumVal / adxVal) * 100;
      }
      inputPct.value = pct.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
    };

    [inputAdx, inputAcum, inputMes].forEach(input => {
      if (!input) return;

      input.addEventListener('focus', () => {
        input.select();
      });

      input.addEventListener('input', () => {
        updatePctAutomatico();
      });

      input.addEventListener('blur', () => {
        const parsed = parseCurrency(input.value);
        input.value = formatCurrency(parsed);
        updatePctAutomatico();
      });
    });

    // =========================================================================
    // Actas de Visitas en PDF Upload and Dropzone (Apartado Propio)
    // =========================================================================
    const actasPdfFileInput = container.querySelector('#inf-actas-pdf-file-input');
    const actasPdfDropZone = container.querySelector('#inf-actas-pdf-drop-zone');

    const handleInfActasPdfFiles = async (files) => {
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (!pdfFiles.length) {
        showToast('Seleccione actas semanais en formato PDF', 'warning');
        return;
      }

      showToast(`Procesando ${pdfFiles.length} acta(s) semanal(is) en PDF...`, 'info');
      collectData();

      for (const file of pdfFiles) {
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const fileId = `acta-pdf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await db.savePdfFile(fileId, dataUrl, file.name, file.size);

          // Detectar número de acta del nombre del archivo si es posible
          const matchNum = file.name.match(/acta.*?([0-9]+)/i) || file.name.match(/([0-9]+)/);
          const defaultTitle = matchNum ? `Acta de Visita nº ${matchNum[1]}` : file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();

          if (!infData.actasPdf) infData.actasPdf = [];
          infData.actasPdf.push({
            id: fileId,
            nombre: defaultTitle || file.name,
            fecha: infData.datosXerais?.dataInforme || new Date().toISOString().split('T')[0],
            archivo: file.name,
            descripcion: '',
            tamano: file.size,
            uploadDate: new Date().toISOString().split('T')[0],
            url: dataUrl
          });
        } catch (err) {
          console.error('Error al guardar acta semanal en PDF:', err);
        }
      }

      render();
      showToast('Acta(s) semanal(is) en PDF adxuntada(s) correctamente', 'success');
    };

    if (actasPdfFileInput) {
      actasPdfFileInput.onchange = (e) => handleInfActasPdfFiles(e.target.files);
    }

    if (actasPdfDropZone) {
      actasPdfDropZone.ondragover = (e) => {
        e.preventDefault();
        actasPdfDropZone.classList.add('drag-over');
      };
      actasPdfDropZone.ondragleave = () => {
        actasPdfDropZone.classList.remove('drag-over');
      };
      actasPdfDropZone.ondrop = (e) => {
        e.preventDefault();
        actasPdfDropZone.classList.remove('drag-over');
        handleInfActasPdfFiles(e.dataTransfer.files);
      };
    }

    // View Acta PDF
    container.querySelectorAll('.inf-btn-view-acta-pdf').forEach(btn => {
      btn.onclick = async () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = infData.actasPdf[idx];
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
          showToast('Non se puido abrir o arquivo PDF da acta', 'error');
        }
      };
    });

    // Delete Acta PDF
    container.querySelectorAll('.inf-btn-delete-acta-pdf').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = infData.actasPdf[idx];
        modal.confirm({
          title: 'Eliminar Acta en PDF',
          message: `¿Desea eliminar o arquivo da acta "${item?.nombre || 'Acta PDF'}"?`,
          confirmText: 'Eliminar',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            collectData();
            if (item?.id) {
              await db.deletePdfFile(item.id);
            }
            infData.actasPdf.splice(idx, 1);
            render();
            showToast('Acta semanal en PDF eliminada', 'info');
          }
        });
      };
    });

    // =========================================================================
    // Photo Upload and Dropzone (Reportaxe Fotográfica)
    // =========================================================================
    const photoFileInput = container.querySelector('#inf-photo-file-input');
    const photoDropZone = container.querySelector('#inf-drop-zone');

    const handleInfPhotoFiles = async (files) => {
      const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (!imgFiles.length) {
        showToast('Seleccione imaxes válidas (JPG, PNG, WebP)', 'warning');
        return;
      }

      showToast(`Optimizando ${imgFiles.length} fotografía(s)...`, 'info');
      collectData();

      for (const file of imgFiles) {
        try {
          const compressedUrl = await db.compressImage(file);
          if (!infData.reportaxeFotografica) infData.reportaxeFotografica = [];
          infData.reportaxeFotografica.push({
            id: `foto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: compressedUrl,
            data: infData.datosXerais?.dataInforme || new Date().toISOString().split('T')[0],
            descripcion: '',
            categoria: 'Obra'
          });
        } catch (err) {
          console.error('Error al optimizar foto en informe:', err);
        }
      }

      render();
      showToast('Fotografía(s) engadida(s) correctamente', 'success');
    };

    if (photoFileInput) {
      photoFileInput.onchange = (e) => handleInfPhotoFiles(e.target.files);
    }

    if (photoDropZone) {
      photoDropZone.ondragover = (e) => {
        e.preventDefault();
        photoDropZone.classList.add('drag-over');
      };
      photoDropZone.ondragleave = () => {
        photoDropZone.classList.remove('drag-over');
      };
      photoDropZone.ondrop = (e) => {
        e.preventDefault();
        photoDropZone.classList.remove('drag-over');
        handleInfPhotoFiles(e.dataTransfer.files);
      };
    }

    // Photo delete buttons
    container.querySelectorAll('.inf-remove-photo').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const card = btn.closest('.photo-card');
        const idx = parseInt(card.dataset.index, 10);
        collectData();
        if (infData.reportaxeFotografica && infData.reportaxeFotografica[idx]) {
          infData.reportaxeFotografica.splice(idx, 1);
          render();
          showToast('Foto eliminada da reportaxe', 'info');
        }
      };
    });

    // =========================================================================
    // PDF Annexes File Input and Dropzone
    // =========================================================================
    const pdfFileInput = container.querySelector('#inf-pdf-file-input');
    const pdfDropZone = container.querySelector('#inf-pdf-drop-zone');

    const handleInfPdfFiles = async (files) => {
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (!pdfFiles.length) {
        showToast('Seleccione arquivos en formato PDF', 'warning');
        return;
      }

      showToast(`Procesando ${pdfFiles.length} documento(s) PDF anexo(s)...`, 'info');
      collectData();

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
          if (!infData.anexosPdf) infData.anexosPdf = [];
          infData.anexosPdf.push({
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
      showToast('Documento(s) PDF anexo(s) gardado(s) correctamente', 'success');
    };

    if (pdfFileInput) {
      pdfFileInput.onchange = (e) => handleInfPdfFiles(e.target.files);
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
        handleInfPdfFiles(e.dataTransfer.files);
      };
    }

    // Prevención global para que soltar fotos en la ventana no las abra en el navegador
    const handleWindowDragOver = (e) => {
      e.preventDefault();
    };
    const handleWindowDrop = (e) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    // View PDF Annex
    container.querySelectorAll('.inf-btn-view-pdf').forEach(btn => {
      btn.onclick = async () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = infData.anexosPdf[idx];
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
          showToast('Non se puido abrir o arquivo PDF', 'error');
        }
      };
    });

    // Delete PDF Annex
    container.querySelectorAll('.inf-btn-delete-pdf').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = infData.anexosPdf[idx];
        modal.confirm({
          title: 'Eliminar Anexo PDF',
          message: `¿Desea eliminar o documento anexo "${item?.nombre || 'PDF'}"?`,
          confirmText: 'Eliminar',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            collectData();
            if (item?.id) {
              await db.deletePdfFile(item.id);
            }
            infData.anexosPdf.splice(idx, 1);
            render();
            showToast('Documento anexo eliminado', 'info');
          }
        });
      };
    });

    // Ampliación checkbox toggle
    const ampCb = container.querySelector('#prazo-necesaria-ampliacion');
    const ampBox = container.querySelector('#box-xustificacion-ampliacion');
    if (ampCb && ampBox) {
      ampCb.onchange = (e) => {
        ampBox.style.display = e.target.checked ? 'block' : 'none';
      };
    }

    // Photo input
    const photoInput = container.querySelector('#inf-photo-file-input');
    if (photoInput) {
      photoInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        collectData();

        for (const file of files) {
          try {
            const compressed = await db.compressImage(file);
            infData.reportaxeFotografica.push({
              id: `rf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              url: compressed,
              data: infData.datosXerais?.dataInforme || new Date().toISOString().split('T')[0],
              descripcion: '',
              categoria: 'DT-05'
            });
          } catch (err) {
            console.error('Error photo:', err);
          }
        }
        render();
        showToast('Fotos engadidas á reportaxe', 'success');
      };
    }

    container.querySelectorAll('.inf-remove-photo').forEach(btn => {
      btn.onclick = (e) => {
        const card = e.target.closest('.photo-card');
        const idx = parseInt(card.dataset.index, 10);
        collectData();
        infData.reportaxeFotografica.splice(idx, 1);
        render();
      };
    });

    // Preview
    const prevBtn = container.querySelector('#btn-preview');
    if (prevBtn) {
      prevBtn.onclick = () => {
        const data = collectData();
        db.saveInforme(data);
        router.navigate('informe-print', { id: data.id });
      };
    }

    // Cancel
    container.querySelector('#btn-cancel').onclick = () => {
      router.navigate('expediente', { id: infData.obraId || currentObra?.id, tab: 'informes' });
    };

    // Save with confirmSave
    container.querySelector('#btn-save-informe').onclick = () => {
      const data = collectData();
      if (!data.obraId && currentObra) {
        data.obraId = currentObra.id;
      }

      if (!data.datosXerais.mesInformado) {
        showToast('Debe indicar o mes ou período informado', 'error');
        return;
      }

      modal.confirmSave({
        title: 'Confirmar Gardado de Informe Mensual',
        message: `¿Desea gardar as modificacións do informe para ${data.datosXerais.mesInformado}?`,
        details: `Inclúe ${(data.actasPdf || []).length} actas semanais en PDF e ${(data.anexosPdf || []).length} anexos PDF.`,
        onConfirm: () => {
          db.saveInforme(data);
          showToast(`Informe de ${data.datosXerais.mesInformado} gardado`, 'success');
          router.navigate('expediente', { id: data.obraId, tab: 'informes' });
        }
      });
    };
  }

  render();
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

function parseCurrency(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim().replace(/[€\s]/g, '');
  if (!str) return 0;
  
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2) {
      str = str.replace(/\./g, '');
    } else if (parts.length === 2) {
      if (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
        str = str.replace('.', '');
      }
    }
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(val) {
  const num = parseCurrency(val);
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}
