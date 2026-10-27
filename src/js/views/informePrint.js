/* ==========================================================================
   ANTA OBRA - DT-05 Official Document View & Print Layout
   Strictly reproduces: DT05_INFORMES DE OBRA.pdf
   Xestión do Solo de Galicia - Xestur S.A. / Vivenda Pública de Galicia
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { showToast } from '../modal.js';

export function renderInformePrint(container, router, params = {}) {
  const inf = db.getInformeById(params.id);

  if (!inf) {
    showToast('Informe non atopado', 'error');
    router.navigate('informes');
    return;
  }

  const canEdit = auth.can('informes:edit');

  const obraId = inf.obraId || db.getActiveObraId();
  const currentObra = db.getObraById(obraId) || db.getActiveObra();
  const obraTitulo = currentObra?.titulo || inf.obraTitulo || inf.datosXerais?.proxecto || 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU';
  const reportNum = getReportDisplayNumber(inf);

  const rawDO = inf.datosXerais?.direccionObra || currentObra?.direccionObra || '';
  const doParts = rawDO.split(/\s+(?:e|y|&)\s+|;\s*|\n/).map(p => p.replace(/\s*\([Dd][Oo]\)\s*$/, '').trim()).filter(Boolean);
  const doClean = doParts.length > 0 ? doParts.join(' e ') : (rawDO.includes(' / ') ? rawDO.split(' / ')[0].trim() : rawDO);
  const deClean = inf.datosXerais?.direccionEjecucion || currentObra?.direccionEjecucion || (rawDO.includes(' / ') ? rawDO.split(' / ')[1].trim() : '');

  container.innerHTML = `
    <div class="content-wrapper">
      <div class="document-preview-container">

        <!-- Toolbar for Screen Mode -->
        <div class="document-preview-toolbar">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button class="btn btn-secondary btn-sm" id="btn-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Volver al Expediente
            </button>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
              Informe Mensual nº ${reportNum} • ${inf.datosXerais?.mesInformado || 'Informe'}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${canEdit ? `
              <button class="btn btn-secondary btn-sm" id="btn-edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Editar Informe
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" id="btn-export-docx" title="Exportar informe mensual a formato Microsoft Word (.docx)" style="font-weight: 600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span>DOCX</span>
            </button>
            <button class="btn btn-primary btn-sm" id="btn-export-pdf-completo" title="Xerar e descargar PDF Oficial Completo con Actas e Anexos fusionados" style="font-weight: 600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <span>Descargar PDF con Anexos</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-print" title="Imprimir directamente desde o navegador">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        <!-- Official Paper Container -->
        <div class="document-paper">

          <!-- DT-05 Official Header (Vipugal 3-Column Layout as in Captura 3) -->
          <div class="dt05-doc-header">
            <div class="dt05-logo-left">
              <img src="VIPUGAL_LOGO.png" alt="Sociedade de Vivenda Pública de Galicia" />
            </div>

            <div class="dt05-header-title">
              <div style="font-weight: 600; font-size: 8.5pt; color: #1e293b; line-height: 1.35;">
                ${escapeHtml(obraTitulo)}
              </div>
              <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">
                (EXPTE: ${escapeHtml(inf.datosXerais?.expediente || currentObra?.expediente || '—')})
              </div>
            </div>

            <div class="dt05-header-meta">
              <div class="dt05-meta-label">
                INFORME ${inf.tipo ? inf.tipo.toUpperCase() : 'MENSUAL'}
              </div>
              <div class="dt05-meta-row">
                <span class="dt05-meta-num">${escapeHtml(reportNum)}</span>
                <span class="dt05-meta-date">${formatHeaderDate(inf.datosXerais?.dataInforme)}</span>
              </div>
            </div>
          </div>

          <!-- 1.- DATOS XERAIS E RESUME EXECUTIVO -->
          <div class="dt05-section">
            <div class="dt05-sec-header">1.- DATOS XERAIS E RESUME EXECUTIVO:</div>
            
            <table class="dt05-table" style="margin-bottom: 12px; width: 100%;">
              <tbody>
                <tr>
                  <td style="width: 28%; font-weight: 600; color: #64748b; background: #f8fafc;">Proxecto:</td>
                  <td colspan="2" style="font-weight: bold; color: #0f172a;">${escapeHtml(obraTitulo || inf.datosXerais?.proxecto || '')}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Emprazamento:</td>
                  <td colspan="2" style="color: #334155;">${escapeHtml(inf.datosXerais?.emprazamento || '')}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Expediente nº:</td>
                  <td colspan="2" style="font-weight: 600; color: #0f172a;">${escapeHtml(inf.datosXerais?.expediente || currentObra?.expediente || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Contratista:</td>
                  <td colspan="2" style="font-weight: bold; color: #0f172a;">${escapeHtml(inf.datosXerais?.contratista || '')}</td>
                </tr>
                ${doParts.length >= 2 ? `
                  <tr>
                    <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Dirección de obra:</td>
                    <td style="font-weight: 600; color: #1e3a8a;">${escapeHtml(doParts[0])}</td>
                    <td style="color: #64748b; font-size: 8pt; width: 25%;">(UTE – ANTA – BOG)</td>
                  </tr>
                  <tr>
                    <td style="background: #f8fafc;"></td>
                    <td style="font-weight: 600; color: #1e3a8a;">${escapeHtml(doParts[1])}</td>
                    <td style="color: #64748b; font-size: 8pt; width: 25%;">(UTE – ANTA – BOG)</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Dirección de obra:</td>
                    <td style="font-weight: 600; color: #1e3a8a;">${escapeHtml(doParts[0] || doClean)}</td>
                    <td style="color: #64748b; font-size: 8pt; width: 25%;">(UTE – ANTA – BOG)</td>
                  </tr>
                `}
                <tr>
                  <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Dirección de execución:</td>
                  <td colspan="2" style="font-weight: 600; color: #0284c7;">${escapeHtml(deClean)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Coordinador CSS:</td>
                  <td colspan="2" style="color: #334155;">${escapeHtml(inf.datosXerais?.coordinadorCSS || currentObra?.coordinadorCSS || 'Juan Carlos Bello Criado (CSS)')}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #64748b; background: #f8fafc;">Xefe de Obra:</td>
                  <td colspan="2" style="color: #334155;">${escapeHtml(inf.datosXerais?.xefeObra || currentObra?.jefeObra || 'Miguel López Rodríguez')}</td>
                </tr>
              </tbody>
            </table>

            <!-- RESUMEN EJECUTIVO (Fondo institucional DAE9F7) -->
            <table style="width: 100%; border-collapse: collapse; background: #dae9f7; border: 1px solid #b9d5ed; border-radius: 4px; font-size: 8.5pt;">
              <thead>
                <tr>
                  <th colspan="2" style="padding: 8px 10px; text-align: left; font-size: 9pt; font-weight: bold; color: #0f172a; border-bottom: 1px solid #b9d5ed;">
                    RESUMEN EJECUTIVO
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 6px 10px; width: 28%; font-weight: 600; color: #1e293b; vertical-align: top;">Estado xeral da obra:</td>
                  <td style="padding: 6px 10px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <div>${check(inf.resumoExecutivo?.estadoXeral === 'en_prazo')} <span style="color: #16a34a; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> En prazo e controlada</div>
                      <div>${check(inf.resumoExecutivo?.estadoXeral === 'con_desviacions')} <span style="color: #d97706; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Con desviacións</div>
                      <div>${check(inf.resumoExecutivo?.estadoXeral === 'comprometida')} <span style="color: #dc2626; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Comprometida</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-weight: 600; color: #1e293b; vertical-align: top;">Avance estimado:</td>
                  <td style="padding: 6px 10px; font-weight: 600;">
                    ${inf.resumoExecutivo?.avanceExecutado || 0}% executado vs ${inf.resumoExecutivo?.avancePrevisto || 0}% previsto
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-weight: 600; color: #1e293b; vertical-align: top;">Principais fitos do mes:</td>
                  <td style="padding: 6px 10px; color: #334155;">
                    ${inf.resumoExecutivo?.principaisFitos || '—'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-weight: 600; color: #1e293b; vertical-align: top;">Principais incidencias:</td>
                  <td style="padding: 6px 10px; color: #334155;">
                    ${inf.resumoExecutivo?.principaisIncidencias || '—'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-weight: 600; color: #1e293b; vertical-align: top;">Riscos detectados:</td>
                  <td style="padding: 6px 10px; color: #334155;">
                    ${inf.resumoExecutivo?.riscosDetectados || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 2.- TRABALLOS EXECUTADOS -->
          <div class="dt05-section">
            <div class="dt05-sec-header">2.- TRABALLOS EXECUTADOS:</div>
            <div style="font-size: 8.5pt; line-height: 1.45;">
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">2.1.- TRABALLOS EXECUTADOS NO MES</div>
                <div style="color: #334155; text-align: justify;">${inf.traballosExecutados?.executadosMes || '—'}</div>
              </div>
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">2.2.- TRABALLOS EN CURSO</div>
                <div style="color: #334155; text-align: justify;">${inf.traballosExecutados?.enCurso || '—'}</div>
              </div>
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">2.3.- TRABALLOS PREVISTOS NO PRÓXIMO MES</div>
                <div style="color: #334155; text-align: justify;">${inf.traballosExecutados?.previstosProximoMes || '—'}</div>
              </div>
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">2.4.- CONTROL XEOMÉTRICO E CUALITATIVO</div>
                <div style="color: #334155; text-align: justify;">${inf.traballosExecutados?.controlXeometricoCualitativo || '—'}</div>
              </div>
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">2.5.- COORDINACIÓN CON ORGANISMOS E/OU EMPRESAS SUBMINISTRADORAS</div>
                <div style="color: #334155; text-align: justify;">${inf.traballosExecutados?.coordinacionOrganismos || '—'}</div>
              </div>
              <div style="margin-bottom: 4px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">2.6.- OBRA NON ACREDITADA</div>
                <div style="color: #334155; text-align: justify;">${inf.traballosExecutados?.obraNonAcreditada || 'Non hai.'}</div>
              </div>
            </div>
          </div>

          <!-- 3.- CONDICIONANTES, MODIFICACIÓNS E OUTRAS INCIDENCIAS -->
          <div class="dt05-section">
            <div class="dt05-sec-header">3.- CONDICIONANTES, MODIFICACIÓNS E OUTRAS INCIDENCIAS:</div>
            <div style="font-size: 8.5pt; line-height: 1.45;">
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">3.1.- CIRCUNSTANCIAS SOBREVIDAS E/OU NOVAS UNIDADES DE OBRA NON CONTEMPLADAS</div>
                <div style="color: #334155; text-align: justify;">${inf.condicionantesModificacions?.circunstanciasSobrevidas || 'Non se rexistran.'}</div>
              </div>
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">3.2.- DESFASES NAS MEDICIÓN DE UNIDADES DO PROXECTO</div>
                <div style="color: #334155; text-align: justify;">${inf.condicionantesModificacions?.desfasesMedicions || 'Non se rexistran.'}</div>
              </div>
              
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 4px;">3.3.- PREVISIÓN DE MODIFICADOS</div>
                <table class="dt05-table" style="width: 100%; margin-bottom: 8px; text-align: center;">
                  <tr>
                    <td style="width: 33.3%;">${check(inf.condicionantesModificacions?.previsionModificados?.situacion === 'non_hai')} Non hai</td>
                    <td style="width: 33.3%;">${check(inf.condicionantesModificacions?.previsionModificados?.situacion === 'en_estudo')} En estudo</td>
                    <td style="width: 33.3%;">${check(inf.condicionantesModificacions?.previsionModificados?.situacion === 'en_tramitacion')} En tramitación</td>
                  </tr>
                </table>

                <table class="dt05-table" style="width: 100%;">
                  <tr>
                    <th style="text-align: left; background: #f8fafc;">Descrición breve: [Modificacións] - [Xustificación]</th>
                  </tr>
                  <tr>
                    <td style="padding: 6px 8px; color: #334155;">${inf.condicionantesModificacions?.previsionModificados?.descricionBreve || 'Non se prevén proxectos modificados no período informado.'}</td>
                  </tr>
                  <tr>
                    <th style="text-align: left; background: #f8fafc;">Indicar impacto en prazo e custo:</th>
                  </tr>
                  <tr>
                    <td style="padding: 6px 8px; color: #334155;">${inf.condicionantesModificacions?.previsionModificados?.impactoPrazoCusto || 'Sen impacto en prazo nin custo adicional.'}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>

          <!-- 4.- SEGUIMENTO ORZAMENTARIO E DA PROGRAMACIÓN -->
          <div class="dt05-section">
            <div class="dt05-sec-header">4.- SEGUIMENTO ORZAMENTARIO E DA PROGRAMACIÓN:</div>
            
            <div style="font-size: 9pt; font-weight: bold; color: #1e3a8a; margin-bottom: 4px;">4.1.- CONTROL ECONÓMICO:</div>
            <table class="dt05-table" style="width: 100%; margin-bottom: 10px;">
              <tbody>
                <tr>
                  <td style="width: 35%; font-weight: 600; background: #f8fafc;">Orzamento adxudicación (€):</td>
                  <td style="font-weight: bold;">${formatEuros(inf.seguimentoOrzamentario?.controlEconomico?.orzamentoAdxudicacion)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; background: #f8fafc;">Certificado acumulado (€):</td>
                  <td style="font-weight: bold;">${formatEuros(inf.seguimentoOrzamentario?.controlEconomico?.importeCertificadoAcumulado)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; background: #f8fafc;">Porcentaxe acumulada (%):</td>
                  <td>${inf.seguimentoOrzamentario?.controlEconomico?.porcentaxeAcumulada || 0}%</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; background: #f8fafc;">Certificación do mes (€):</td>
                  <td>${formatEuros(inf.seguimentoOrzamentario?.controlEconomico?.certificacionMes)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; background: #f8fafc;">Desviación estimada (€ / %):</td>
                  <td>${inf.seguimentoOrzamentario?.controlEconomico?.desviacionEstimada || '0.0 % respecto á previsión lineal'}</td>
                </tr>
              </tbody>
            </table>

            <div style="font-size: 9pt; font-weight: bold; color: #1e3a8a; margin: 10px 0 4px;">4.2.- CONTROL DE PRAZO:</div>
            <table class="dt05-table" style="width: 100%; margin-bottom: 8px; text-align: center;">
              <tr>
                <td style="width: 33.3%;">${check(inf.seguimentoOrzamentario?.controlPrazo?.situacion === 'en_prazo')} <span style="color: #16a34a; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> En prazo</td>
                <td style="width: 33.3%;">${check(inf.seguimentoOrzamentario?.controlPrazo?.situacion === 'atraso_leve')} <span style="color: #d97706; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Atraso leve</td>
                <td style="width: 33.3%;">${check(inf.seguimentoOrzamentario?.controlPrazo?.situacion === 'atraso_significativo')} <span style="color: #dc2626; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Atraso significativo</td>
              </tr>
            </table>

            <table class="dt05-table" style="width: 100%; margin-bottom: 8px;">
              <tbody>
                <tr>
                  <th style="text-align: left; background: #f8fafc;">Desviación estimada (+/- semanas)</th>
                </tr>
                <tr>
                  <td style="padding: 4px 8px;">${inf.seguimentoOrzamentario?.controlPrazo?.desviacionSemanas || 0} semanas</td>
                </tr>
                <tr>
                  <th style="text-align: left; background: #f8fafc;">Causas</th>
                </tr>
                <tr>
                  <td style="padding: 4px 8px;">${inf.seguimentoOrzamentario?.controlPrazo?.causas || 'Mantemento do ritmo previsto polo reforzo da contrata.'}</td>
                </tr>
                <tr>
                  <th style="text-align: left; background: #f8fafc;">Medidas correctoras</th>
                </tr>
                <tr>
                  <td style="padding: 4px 8px;">${inf.seguimentoOrzamentario?.controlPrazo?.medidasCorrectoras || 'Seguimento semanal coas contratas de carpintería e estruturas.'}</td>
                </tr>
                <tr>
                  <th style="text-align: left; background: #f8fafc;">Previsión e reestimación de prazos</th>
                </tr>
                <tr>
                  <td style="padding: 4px 8px;">${inf.seguimentoOrzamentario?.controlPrazo?.previsionReestimacion || 'Previsión de cumprimento do prazo contratado.'}</td>
                </tr>
                <tr>
                  <th style="text-align: left; background: #f8fafc;">Actualización do programa de traballos</th>
                </tr>
                <tr>
                  <td style="padding: 4px 8px;">${inf.seguimentoOrzamentario?.controlPrazo?.actualizacionPrograma || 'Programa de traballos vixente conforme á acta de replanteo.'}</td>
                </tr>
              </tbody>
            </table>

            <table class="dt05-table" style="width: 100%;">
              <tbody>
                <tr>
                  <th style="text-align: left; background: #f8fafc;">
                    ${check(inf.seguimentoOrzamentario?.controlPrazo?.necesariaAmpliacion)} É necesaria unha ampliación do prazo da obra
                  </th>
                </tr>
                <tr>
                  <th style="text-align: left; font-size: 8pt; color: #64748b; background: #fff;">Xustificación da ampliación solicitada:</th>
                </tr>
                <tr>
                  <td style="padding: 4px 8px;">${inf.seguimentoOrzamentario?.controlPrazo?.xustificacionAmpliacion || 'Non se solicita ampliación de prazo.'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 5.- CONTROL DE CALIDADE -->
          <div class="dt05-section">
            <div class="dt05-sec-header">5.- CONTROL DE CALIDADE:</div>
            <div style="font-size: 8.5pt; line-height: 1.45;">
              <div style="margin-bottom: 6px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">5.1.- Resumo de ensaios e informes do mes</div>
                <div style="color: #334155;">${inf.controlCalidade?.resumoEnsaios || 'Ensaios de resistencia e control de calidade conformes con CTE.'}</div>
              </div>
              <div style="margin-bottom: 4px;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">5.2.- Incidencias e solución proposta para materiais deficientes</div>
                <div style="color: #334155;">${inf.controlCalidade?.incidenciasSolucions || 'Resultados conformes con prego. Sen incidencias relevantes.'}</div>
              </div>
            </div>
          </div>

          <!-- 6.- SEGURIDADE E SAÚDE -->
          <div class="dt05-section">
            <div class="dt05-sec-header">6.- SEGURIDADE E SAÚDE:</div>
            <div style="font-size: 8.5pt;">
              <div style="font-weight: bold; margin-bottom: 4px;">Situación xeral:</div>
              <table class="dt05-table" style="width: 100%; margin-bottom: 8px; text-align: center;">
                <tr>
                  <td style="width: 50%;">${check(inf.seguridadeSaude?.situacionXeral !== 'con_incidencias')} <span style="color: #16a34a; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Correcta</td>
                  <td style="width: 50%;">${check(inf.seguridadeSaude?.situacionXeral === 'con_incidencias')} <span style="color: #d97706; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Con incidencias</td>
                </tr>
              </table>
              <div style="font-weight: bold; margin-bottom: 2px;">Incidencias relevantes (en base a documentación CSS):</div>
              <div style="color: #334155;">${inf.seguridadeSaude?.incidenciasRelevantes || 'Uso xeralizado de EPIS e liñas de vida en traballos en altura. Pendente retirada segura de fibrocemento.'}</div>
            </div>
          </div>

          <!-- 8.- ANEXO REPORTAXE FOTOGRÁFICO -->
          ${(inf.fotos || inf.reportaxeFotografica || []).length > 0 ? `
            <div class="dt05-section">
              <div class="dt05-sec-header">8.- ANEXO REPORTAXE FOTOGRÁFICO:</div>
              <div class="acta-photos-grid-print">
                ${(inf.fotos || inf.reportaxeFotografica || []).map((foto, idx) => `
                  <div class="acta-photo-item-print">
                    <img src="${foto.url || foto.dataUrl || ''}" alt="Foto ${idx + 1}" />
                    <div class="acta-photo-caption">
                      <strong>Foto ${idx + 1}</strong> [${formatDate(foto.data || foto.fecha)}]: ${escapeHtml(foto.descripcion || foto.desc || '')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 9.- OUTROS -->
          <div class="dt05-section">
            <div class="dt05-sec-header">9.- OUTROS:</div>
            <div style="font-size: 8.5pt;">
              <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">9.1.- MODIFICACIÓNS DAS CONDICIÓNS CONTRACTUAIS INICIAIS</div>
              <div style="color: #334155; margin-bottom: 8px;">${inf.outros?.modificacionCondicions || 'Incorporación de equipo especialista e axustes menores segundo as necesidades técnicas.'}</div>
              <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">9.2.- CERTIFICADO DE TERMINACIÓN DE FASE</div>
              <div style="color: #334155;">${inf.outros?.certificadoTerminacionFase || 'Non aplica no período informado.'}</div>
            </div>
          </div>

          <!-- 10.- CONCLUSIÓN DA DIRECCIÓN DE OBRA -->
          <div class="dt05-section">
            <div class="dt05-sec-header">10.- CONCLUSIÓN DA DIRECCIÓN DE OBRA:</div>
            <div style="font-size: 8.5pt;">
              <div style="font-weight: bold; margin-bottom: 4px;">A obra presenta un estado:</div>
              <table class="dt05-table" style="width: 100%; margin-bottom: 8px; text-align: center;">
                <tr>
                  <td style="width: 33.3%;">${check(inf.conclusion?.estado === 'favorable')} <span style="color: #16a34a; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Favorable</td>
                  <td style="width: 33.3%;">${check(inf.conclusion?.estado === 'atencion_requirida')} <span style="color: #d97706; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Con atención requirida</td>
                  <td style="width: 33.3%;">${check(inf.conclusion?.estado === 'comprometido')} <span style="color: #dc2626; font-weight: bold; font-size: 1.45em; line-height: 1; vertical-align: -1px; margin: 0 2px;">●</span> Comprometida</td>
                </tr>
              </table>
              <table class="dt05-table" style="width: 100%;">
                <tr>
                  <th style="text-align: left; background: #f8fafc;">Comentarios finais</th>
                </tr>
                <tr>
                  <td style="padding: 6px 8px; color: #334155;">${inf.conclusion?.comentariosFinais || 'A obra presenta un ritmo axeitado e boa coordinación entre a contrata, dirección facultativa e coordinación de seguridade e saúde.'}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- DILIXENCIA DE FIRMAS (ENTRE O PUNTO 10 E O PUNTO 11) -->
          <div class="dt05-section" style="page-break-inside: avoid; margin-top: 10px; margin-bottom: 12px;">
            <div class="dt05-sec-header">DILIXENCIA DE FIRMAS:</div>
            <div style="font-size: 8.5pt; color: #475569; margin-bottom: 8px; font-style: italic;">
              En Ferrol a ${formatDateLong(inf.datosXerais?.dataInforme)}. Para que así conste e aos efectos oportunos, asinan a presente dilixencia:
            </div>
            
            <table class="dt05-table" style="width: 100%;">
              <tbody>
                ${(doParts.length > 0 ? doParts : [doClean]).map((doName) => {
                  const isRosa = doName.toLowerCase().includes('rosa');
                  const isSergio = doName.toLowerCase().includes('sergio');
                  const cargo = isRosa ? 'Arquitecta Directora de Obra (DO)' : (isSergio ? 'Arquitecto Director de Obra (DO)' : 'Dirección Facultativa de Obra (DO)');
                  const emp = isRosa ? 'UTE ANTA-BOG (COAG 2.415)' : (isSergio ? 'UTE ANTA-BOG (COAG 2.890)' : 'UTE ANTA-BOG');
                  return `
                    <tr>
                      <td style="width: 55%; padding: 8px 10px; background: #f8fafc;">
                        <div style="font-weight: bold; color: #0f172a;">${escapeHtml(doName)}</div>
                        <div style="color: #475569; font-size: 8pt; margin-top: 1px;">${escapeHtml(cargo)}</div>
                        <div style="color: #64748b; font-size: 7.8pt; margin-top: 1px;">${escapeHtml(emp)}</div>
                      </td>
                      <td style="width: 45%; padding: 8px 10px; text-align: right; vertical-align: bottom; color: #94a3b8; font-size: 8pt;">
                        Asdo.: ____________________________
                      </td>
                    </tr>
                  `;
                }).join('')}
                ${deClean ? `
                  <tr>
                    <td style="width: 55%; padding: 8px 10px; background: #f8fafc;">
                      <div style="font-weight: bold; color: #0f172a;">${escapeHtml(deClean)}</div>
                      <div style="color: #475569; font-size: 8pt; margin-top: 1px;">Dirección de Execución Material</div>
                      <div style="color: #64748b; font-size: 7.8pt; margin-top: 1px;">Aparelladores Galicia (COAAT 1.108)</div>
                    </td>
                    <td style="width: 45%; padding: 8px 10px; text-align: right; vertical-align: bottom; color: #94a3b8; font-size: 8pt;">
                      Asdo.: ____________________________
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <!-- 11.- ANEXOS DOCUMENTAIS DO INFORME -->
          <div class="dt05-section">
            <div class="dt05-sec-header">11.- ANEXOS DOCUMENTAIS DO INFORME:</div>
            <div style="font-size: 8.5pt;">
              <!-- 11.1 Actas de Visitas Semanais achegadas en PDF (Apartado Propio) -->
              ${(inf.actasPdf && inf.actasPdf.length > 0) ? `
                <div style="margin-top: 6px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px;">
                  <div style="font-weight: bold; color: #1e3a8a; font-size: 8.5pt; margin-bottom: 5px; text-transform: uppercase;">
                    Actas de visitas semanais achegadas en PDF (${inf.actasPdf.length}):
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px; font-size: 8pt;">
                    ${inf.actasPdf.map((acta, aIdx) => `
                      <div style="padding: 4px 6px; border-bottom: 1px dashed #e2e8f0;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <span style="font-weight: 700; color: #1e3a8a;">📄 ${escapeHtml(acta.nombre || `Acta de Visita nº ${aIdx + 1}`)} ${acta.fecha ? `[${formatDate(acta.fecha)}]` : ''}</span>
                          <span style="color: #64748b; font-size: 7.5pt;">${formatFileSize(acta.tamano)} • Engadido o ${acta.fecha || ''}</span>
                        </div>
                        ${acta.descripcion ? `<div style="font-size: 7.8pt; color: #475569; font-style: italic; margin-top: 1px;">${escapeHtml(acta.descripcion)}</div>` : ''}
                        ${acta.archivo && acta.archivo !== acta.nombre ? `<div style="font-size: 7.2pt; color: #94a3b8; margin-top: 1px;">Arquivo orixinal: ${escapeHtml(acta.archivo)}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ((inf.actasAnexasIds && inf.actasAnexasIds.length > 0) ? `
                <div style="margin-top: 6px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px;">
                  <div style="font-weight: bold; color: #1e3a8a; font-size: 8.5pt; margin-bottom: 5px; text-transform: uppercase;">
                    Actas semanais incorporadas correlativamente (${inf.actasAnexasIds.length}):
                  </div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 8pt;">
                    <tbody>
                      ${inf.actasAnexasIds.map(actaId => {
                        const a = db.getActaById(actaId);
                        if (!a) return '';
                        return `
                          <tr style="border-bottom: 1px dashed #e2e8f0;">
                            <td style="padding: 3px 4px; font-weight: bold; color: #1e293b;">Acta nº ${a.numero}</td>
                            <td style="padding: 3px 4px; color: #475569;">${formatDate(a.fecha)}</td>
                            <td style="padding: 3px 4px; color: #334155;">${escapeHtml(a.obra || '')}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '')}

              <!-- 11.2 Outros Documentos e Informes PDF Anexos -->
              ${(inf.anexosPdf && inf.anexosPdf.length > 0) ? `
                <div style="margin-top: 6px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px;">
                  <div style="font-weight: bold; color: #b91c1c; font-size: 8.5pt; margin-bottom: 5px; text-transform: uppercase;">
                    Outros documentos e informes PDF anexos (${inf.anexosPdf.length}):
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px; font-size: 8pt;">
                    ${inf.anexosPdf.map((pdf, pIdx) => `
                      <div style="padding: 4px 6px; border-bottom: 1px dashed #e2e8f0;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <span style="font-weight: 700; color: #0f4761;">📎 ${escapeHtml(pdf.nombre || `Documento_${pIdx + 1}`)}</span>
                          <span style="color: #64748b; font-size: 7.5pt;">${formatFileSize(pdf.tamano)} • Engadido o ${pdf.fecha || ''}</span>
                        </div>
                        ${pdf.descripcion ? `<div style="font-size: 7.8pt; color: #475569; font-style: italic; margin-top: 1px;">${escapeHtml(pdf.descripcion)}</div>` : ''}
                        ${pdf.archivo && pdf.archivo !== pdf.nombre ? `<div style="font-size: 7.2pt; color: #94a3b8; margin-top: 1px;">Arquivo orixinal: ${escapeHtml(pdf.archivo)}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${(!inf.actasPdf?.length && !inf.actasAnexasIds?.length && !inf.anexosPdf?.length) ? `
                <div style="color: #94a3b8; font-style: italic;">Non se incorporan documentos anexos adicionais neste período.</div>
              ` : ''}
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  // Buttons
  container.querySelector('#btn-back').onclick = () => {
    router.navigate('expediente', { id: inf.obraId || db.getActiveObraId(), tab: 'informes' });
  };
  
  const editBtn = container.querySelector('#btn-edit');
  if (editBtn) {
    editBtn.onclick = () => router.navigate('informe-editor', { id: inf.id });
  }

  container.querySelector('#btn-print').onclick = () => {
    window.print();
  };

  // Export DOCX (Word - without PDF annexes as requested)
  const btnDocx = container.querySelector('#btn-export-docx');
  if (btnDocx) {
    btnDocx.onclick = async () => {
      const originalHTML = btnDocx.innerHTML;
      try {
        btnDocx.disabled = true;
        btnDocx.innerHTML = `
          <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
          <span>Xerando Word...</span>
        `;
        showToast('Xerando documento Word (.docx)...', 'info');
        const { exportInformeToDocx } = await import('../exportDocx.js');
        const fname = await exportInformeToDocx(inf);
        showToast(`Documento ${fname} descargado con éxito`, 'success');
      } catch (err) {
        console.error('Erro ao exportar a Word:', err);
        showToast('Erro ao exportar o documento a Word', 'error');
      } finally {
        btnDocx.disabled = false;
        btnDocx.innerHTML = originalHTML;
      }
    };
  }

  // Export PDF Completo con Anexos (PDF oficial con actas semanais e documentos concatenados)
  const btnPdfCompleto = container.querySelector('#btn-export-pdf-completo');
  if (btnPdfCompleto) {
    btnPdfCompleto.onclick = async () => {
      const originalHTML = btnPdfCompleto.innerHTML;
      try {
        btnPdfCompleto.disabled = true;
        btnPdfCompleto.innerHTML = `
          <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
          <span>Compilando PDF e Anexos...</span>
        `;
        showToast('Xerando PDF Oficial do Informe Mensual e concatenando actas e anexos...', 'info');
        const { exportInformeCompletoPdf } = await import('../exportDocx.js');
        const fname = await exportInformeCompletoPdf(inf);
        showToast(`Documento PDF ${fname} descargado con éxito`, 'success');
      } catch (err) {
        console.error('Erro ao xerar PDF completo de informe:', err);
        showToast(err.message || 'Erro ao xerar o PDF completo con anexos', 'error');
      } finally {
        btnPdfCompleto.disabled = false;
        btnPdfCompleto.innerHTML = originalHTML;
      }
    };
  }
}

function check(val) {
  return val ? '☒' : '☐';
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

function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatDateLong(dateStr) {
  if (!dateStr) return 'a data do informe';
  const months = [
    '', 'xaneiro', 'febreiro', 'marzo', 'abril', 'maio', 'xuño',
    'xullo', 'agosto', 'setembro', 'outubro', 'novembro', 'decembro'
  ];
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10);
      const y = parts[0];
      const mName = months[m] || parts[1];
      return `${d} de ${mName} de ${y}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getReportDisplayNumber(inf) {
  if (!inf) return '1';
  const raw = String(inf.numero || '1').trim();
  if (raw.includes('/')) {
    const p = raw.split('/')[0].replace(/^0+/, '');
    return p || raw;
  }
  return raw.replace(/^0+/, '') || raw;
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

function formatEuros(val) {
  if (val === undefined || val === null || isNaN(val)) return '0,00 €';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
}
