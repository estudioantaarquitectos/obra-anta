/* ==========================================================================
   ANTA OBRA - Asistente IA Multimodal (Google Gemini API)
   Dictado por voz, lectura de documentos (PDF/DOCX/Imaxes) e extracción estruturada
   100% Desacoplado, Reversible e sen impacto nas funcións existentes
   ========================================================================== */

import { db } from '../db.js';
import { modal, showToast } from '../modal.js';

const CANDIDATE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest'
];

export function getGeminiApiKey() {
  const settings = db.getSettings();
  if (settings && settings.geminiApiKey && settings.geminiApiKey.trim()) {
    return settings.geminiApiKey.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY.trim();
  }
  return '';
}

function promptForApiKey({ onSuccess }) {
  const contentHtml = `
    <div style="padding: 0.5rem 0;">
      <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.55;">
        Para empregar o <strong>Asistente IA</strong> (dictado por voz, lectura de fotos e importación de actas), introduza a súa chave API de Google Gemini. É gratuíta e obtense en 1 minuto en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 700; text-decoration: underline;">Google AI Studio ↗</a>.
      </p>
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label required" style="font-weight: 700;">Chave API de Google Gemini</label>
        <input type="password" id="prompt-gemini-key" class="form-control" placeholder="Pegue aquí a chave API..." style="font-family: monospace; font-size: 0.9rem;" autofocus />
      </div>
    </div>
  `;
  const footerHtml = `
    <div style="display: flex; justify-content: flex-end; gap: 0.5rem; width: 100%;">
      <button type="button" class="btn btn-secondary" id="prompt-key-cancel">Cancelar</button>
      <button type="button" class="btn btn-primary" id="prompt-key-save" style="background: #7c3aed; border-color: #6d28d9; font-weight: 700;">
        Gardar e Abrir Asistente ✨
      </button>
    </div>
  `;
  const { backdrop, close } = modal.open({
    title: '✨ Configuración da Chave API de Gemini',
    contentHtml,
    footerHtml,
    size: 'md'
  });

  const cancelBtn = backdrop.querySelector('#prompt-key-cancel');
  if (cancelBtn) cancelBtn.onclick = () => close();

  const saveBtn = backdrop.querySelector('#prompt-key-save');
  const inputEl = backdrop.querySelector('#prompt-gemini-key');

  const handleSave = () => {
    const key = inputEl?.value.trim();
    if (!key) {
      showToast('Por favor, pegue ou introduza a chave API', 'warning');
      return;
    }
    const cur = db.getSettings();
    db.saveSettings({ ...cur, geminiApiKey: key, aiAssistantEnabled: true });
    showToast('Chave API gardada con éxito!', 'success');
    close();
    if (typeof onSuccess === 'function') onSuccess();
  };

  if (saveBtn) saveBtn.onclick = handleSave;
  if (inputEl) {
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
  }
}

/**
 * Retorna true se a IA está habilitada nas opcións do sistema
 */
export function isAiEnabled() {
  const settings = db.getSettings();
  return settings.aiAssistantEnabled !== false;
}

/**
 * Xera o HTML do botón de invocación do Asistente IA
 */
export function renderAiButtonHtml(label = 'Asistente IA', id = 'btn-ai-assistant', className = 'btn btn-ghost btn-sm') {
  return `
    <button type="button" class="${className}" id="${id}" style="color: #7c3aed; border-color: rgba(124, 58, 237, 0.35); background: rgba(124, 58, 237, 0.05); font-weight: 700; display: inline-flex; align-items: center; gap: 6px;" title="Asistente IA: Dictado por voz ou importación de PDF/DOCX">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      </svg>
      <span>✨ ${label}</span>
    </button>
  `;
}

/**
 * Abre o modal do Asistente IA adaptado ao tipo de documento en edición
 */
export function openAiAssistantModal({ documentType = 'acta', currentData = {}, onApply }) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    promptForApiKey({
      onSuccess: () => {
        openAiAssistantModal({ documentType, currentData, onApply });
      }
    });
    return;
  }

  let docTitle = 'Visita de Obra';
  if (documentType === 'reunion') docTitle = 'Reunión de Obra';
  else if (documentType === 'informe_semanal') docTitle = 'Informe Semanal';
  else if (documentType === 'informe_mensual') docTitle = 'Informe Mensual';
  else if (documentType === 'nota') docTitle = 'Nota de Obra';

  let currentTab = 'voice'; // 'voice' | 'file' | 'text'
  let mediaRecorder = null;
  let audioChunks = [];
  let audioBlob = null;
  let audioBase64 = null;
  let audioMimeType = '';
  let recordTimerInterval = null;
  let recordSeconds = 0;
  let uploadedFilePayload = null; // { mimeType, data, filename }

  const contentHtml = `
    <div class="ai-assistant-wrapper" style="min-height: 380px;">
      
      <!-- Selector de Modo / Pestañas -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-light); padding-bottom: 0.75rem; margin-bottom: 1.25rem;">
        <button type="button" class="btn btn-primary btn-sm ai-tab-btn" data-tab="voice" style="display: flex; align-items: center; gap: 6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
          <span>🎙️ Dictar por Voz</span>
        </button>
        <button type="button" class="btn btn-secondary btn-sm ai-tab-btn" data-tab="file" style="display: flex; align-items: center; gap: 6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>📄 Importar PDF / DOCX / Foto</span>
        </button>
        <button type="button" class="btn btn-secondary btn-sm ai-tab-btn" data-tab="text" style="display: flex; align-items: center; gap: 6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          <span>✍️ Pegar Texto / Notas</span>
        </button>
      </div>

      <!-- Area de Contido Dinámico por Pestaña -->
      <div id="ai-tab-content-container">
        
        <!-- Pestaña 1: Voz -->
        <div id="ai-panel-voice" class="ai-panel">
          <div style="text-align: center; padding: 2rem 1rem; background: var(--bg-surface); border: 1.5px dashed var(--border-light); border-radius: 8px;">
            <div id="voice-record-btn-container" style="margin-bottom: 1rem;">
              <button type="button" id="btn-toggle-record" class="btn btn-primary" style="width: 72px; height: 72px; border-radius: 50%; padding: 0; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); background: #7c3aed; border-color: #6d28d9;">
                <svg id="icon-mic" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                <div id="icon-stop" style="display: none; width: 22px; height: 22px; background: #fff; border-radius: 4px;"></div>
              </button>
            </div>
            
            <div id="voice-status-text" style="font-weight: 700; font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">
              Pulse o micrófono para comezar a ditar
            </div>
            <div id="voice-timer" style="font-family: monospace; font-size: 1.25rem; font-weight: 800; color: #7c3aed; margin-bottom: 0.75rem; display: none;">
              00:00
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); max-width: 440px; margin: 0 auto; line-height: 1.45;">
              Fale con naturalidade describindo o visto na obra, incidencias, asistentes presentes e instrucións dadas. O modelo adaptará as súas palabras á estrutura de <strong>${docTitle}</strong>.
            </p>

            <div id="voice-player-container" style="display: none; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--border-light);">
              <audio id="audio-playback" controls style="max-width: 380px; width: 100%; margin-bottom: 0.75rem;"></audio>
            </div>
          </div>
        </div>

        <!-- Pestaña 2: Arquivo (PDF / DOCX / Imaxe) -->
        <div id="ai-panel-file" class="ai-panel" style="display: none;">
          <div id="file-drop-zone" style="text-align: center; padding: 2.5rem 1.5rem; background: var(--bg-surface); border: 2px dashed var(--border-light); border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8" style="margin-bottom: 0.75rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            <div style="font-weight: 700; color: var(--text-main); font-size: 1rem; margin-bottom: 0.25rem;">
              Arrastre aquí un documento PDF, Word (.docx) ou fotografía
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
              ou prema para seleccionalo desde o seu ordenador
            </div>
            <input type="file" id="ai-file-input" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" style="display: none;" />
            <button type="button" class="btn btn-secondary btn-sm" id="btn-select-file">Seleccionar Arquivo</button>
          </div>

          <div id="file-selected-info" style="display: none; margin-top: 1rem; padding: 0.85rem 1rem; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.5rem;">📄</span>
              <div>
                <strong id="file-name-display" style="font-size: 0.9rem; color: #5b21b6; display: block;">documento.pdf</strong>
                <span id="file-size-display" style="font-size: 0.78rem; color: var(--text-muted);">0 KB</span>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-remove-file" style="color: var(--color-danger);">✕ Quitar</button>
          </div>
        </div>

        <!-- Pestaña 3: Texto Libre -->
        <div id="ai-panel-text" class="ai-panel" style="display: none;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">
              Pegue apuntamentos, notas de WhatsApp ou correos electrónicos:
            </label>
            <textarea id="ai-free-text" class="form-control" rows="8" placeholder="Exemplo: Visita do 4 de novembro co contratista Acciona. Revisouse a cuberta e acordouse reparar as gárgolas antes de colocar o illamento. Asistiron Rosa Vilas e David Hermida..." style="font-size: 0.9rem; line-height: 1.5;"></textarea>
          </div>
        </div>

      </div>

      <!-- Área de Procesamento / Cargando -->
      <div id="ai-loading-container" style="display: none; padding: 3rem 1rem; text-align: center;">
        <div style="display: inline-block; width: 44px; height: 44px; border: 3px solid rgba(124, 58, 237, 0.2); border-radius: 50%; border-top-color: #7c3aed; animation: spin 0.8s linear infinite; margin-bottom: 1rem;"></div>
        <div style="font-size: 1.05rem; font-weight: 700; color: #7c3aed; margin-bottom: 0.35rem;">
          Analizando contido con Google Gemini...
        </div>
        <div style="font-size: 0.82rem; color: var(--text-muted);">
          Extraendo e estruturando datos para <strong>${docTitle}</strong>
        </div>
      </div>

      <!-- Área de Previsualización dos Resultados Extraídos -->
      <div id="ai-results-container" style="display: none; margin-top: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-light);">
          <div style="font-weight: 800; color: #166534; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Información extraída con éxito</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-reanalyze" style="font-size: 0.78rem;">
            ↺ Volver a analizar
          </button>
        </div>

        <div id="ai-preview-content" style="max-height: 340px; overflow-y: auto; padding: 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.85rem;">
          <!-- Xerado dinamicamente -->
        </div>
      </div>

    </div>
  `;

  const footerHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <button type="button" class="btn btn-ghost" id="modal-ai-cancel">Cancelar</button>
      
      <div style="display: flex; gap: 0.5rem;">
        <button type="button" class="btn btn-primary" id="modal-ai-process-btn" style="background: #7c3aed; border-color: #6d28d9; font-weight: 700; display: flex; align-items: center; gap: 6px;">
          <span>✨ Analizar con IA</span>
        </button>
        <button type="button" class="btn btn-success" id="modal-ai-apply-btn" style="display: none; font-weight: 700;">
          <span>${documentType === 'nota' ? '✓ Crear e Gardar Nota' : '✓ Incorporar ao Documento'}</span>
        </button>
      </div>
    </div>
  `;

  const { backdrop, close } = modal.open({
    title: `✨ Asistente IA — ${docTitle}`,
    contentHtml,
    footerHtml,
    size: 'lg'
  });

  // Variables de UI
  const tabBtns = backdrop.querySelectorAll('.ai-tab-btn');
  const panelVoice = backdrop.querySelector('#ai-panel-voice');
  const panelFile = backdrop.querySelector('#ai-panel-file');
  const panelText = backdrop.querySelector('#ai-panel-text');
  const loadingBox = backdrop.querySelector('#ai-loading-container');
  const resultsBox = backdrop.querySelector('#ai-results-container');
  const tabContainer = backdrop.querySelector('#ai-tab-content-container');
  const processBtn = backdrop.querySelector('#modal-ai-process-btn');
  const applyBtn = backdrop.querySelector('#modal-ai-apply-btn');
  const reanalyzeBtn = backdrop.querySelector('#btn-reanalyze');
  const previewBox = backdrop.querySelector('#ai-preview-content');

  let extractedResult = null;

  // Xestión de Pestañas
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-secondary');

      currentTab = btn.dataset.tab;
      panelVoice.style.display = currentTab === 'voice' ? 'block' : 'none';
      panelFile.style.display = currentTab === 'file' ? 'block' : 'none';
      panelText.style.display = currentTab === 'text' ? 'block' : 'none';
    };
  });

  // Cancelar
  backdrop.querySelector('#modal-ai-cancel').onclick = () => {
    stopRecording();
    close();
  };

  // 1. LÓXICA DE GRABACIÓN DE VOZ
  const btnToggleRecord = backdrop.querySelector('#btn-toggle-record');
  const iconMic = backdrop.querySelector('#icon-mic');
  const iconStop = backdrop.querySelector('#icon-stop');
  const voiceTimer = backdrop.querySelector('#voice-timer');
  const voiceStatus = backdrop.querySelector('#voice-status-text');
  const voicePlayerBox = backdrop.querySelector('#voice-player-container');
  const audioPlayback = backdrop.querySelector('#audio-playback');

  let isRecording = false;

  btnToggleRecord.onclick = async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      stopRecording();
    }
  };

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/ogg');
      
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      audioMimeType = mime;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        audioBlob = new Blob(audioChunks, { type: audioMimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result;
          audioBase64 = res.split(',')[1];
          if (audioPlayback) {
            audioPlayback.src = res;
            voicePlayerBox.style.display = 'block';
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);
      isRecording = true;
      btnToggleRecord.style.background = '#dc2626';
      btnToggleRecord.style.borderColor = '#b91c1c';
      iconMic.style.display = 'none';
      iconStop.style.display = 'block';
      voiceStatus.textContent = 'Gravando audio... Fale con naturalidade';
      voiceStatus.style.color = '#dc2626';
      voiceTimer.style.display = 'block';

      recordSeconds = 0;
      recordTimerInterval = setInterval(() => {
        recordSeconds++;
        const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
        const secs = String(recordSeconds % 60).padStart(2, '0');
        voiceTimer.textContent = `${mins}:${secs}`;
      }, 1000);

    } catch (err) {
      showToast('Non se puido acceder ao micrófono: ' + err.message, 'error');
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      try {
        mediaRecorder.stop();
      } catch (e) {}
    }
    isRecording = false;
    clearInterval(recordTimerInterval);
    btnToggleRecord.style.background = '#7c3aed';
    btnToggleRecord.style.borderColor = '#6d28d9';
    iconMic.style.display = 'block';
    iconStop.style.display = 'none';
    voiceStatus.textContent = 'Gravación completada';
    voiceStatus.style.color = '#166534';
  }

  // 2. LÓXICA DE SELECCIÓN DE ARQUIVO
  const fileDropZone = backdrop.querySelector('#file-drop-zone');
  const fileInput = backdrop.querySelector('#ai-file-input');
  const btnSelectFile = backdrop.querySelector('#btn-select-file');
  const fileSelectedInfo = backdrop.querySelector('#file-selected-info');
  const fileNameDisplay = backdrop.querySelector('#file-name-display');
  const fileSizeDisplay = backdrop.querySelector('#file-size-display');
  const btnRemoveFile = backdrop.querySelector('#btn-remove-file');

  fileDropZone.onclick = () => fileInput.click();
  btnSelectFile.onclick = (e) => {
    e.stopPropagation();
    fileInput.click();
  };

  fileDropZone.ondragover = (e) => {
    e.preventDefault();
    fileDropZone.style.borderColor = '#7c3aed';
    fileDropZone.style.background = 'rgba(124, 58, 237, 0.05)';
  };
  fileDropZone.ondragleave = () => {
    fileDropZone.style.borderColor = 'var(--border-light)';
    fileDropZone.style.background = 'var(--bg-surface)';
  };
  fileDropZone.ondrop = (e) => {
    e.preventDefault();
    fileDropZone.style.borderColor = 'var(--border-light)';
    fileDropZone.style.background = 'var(--bg-surface)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleIncomingFile(e.dataTransfer.files[0]);
    }
  };

  fileInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleIncomingFile(e.target.files[0]);
    }
  };

  btnRemoveFile.onclick = () => {
    uploadedFilePayload = null;
    fileSelectedInfo.style.display = 'none';
    fileDropZone.style.display = 'block';
    fileInput.value = '';
  };

  function handleIncomingFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (file.type === 'application/pdf' || ext === 'pdf') {
      reader.onload = () => {
        uploadedFilePayload = {
          mimeType: 'application/pdf',
          data: reader.result.split(',')[1],
          filename: file.name
        };
        showFileReady(file.name, file.size);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      reader.onload = () => {
        uploadedFilePayload = {
          mimeType: file.type || 'image/jpeg',
          data: reader.result.split(',')[1],
          filename: file.name
        };
        showFileReady(file.name, file.size);
      };
      reader.readAsDataURL(file);
    } else if (ext === 'txt') {
      reader.onload = () => {
        uploadedFilePayload = {
          mimeType: 'text/plain',
          text: reader.result,
          filename: file.name
        };
        showFileReady(file.name, file.size);
      };
      reader.readAsText(file);
    } else if (ext === 'docx') {
      // Para DOCX, lemos o texto interno de document.xml
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;
          const text = await extractDocxTextInBrowser(arrayBuffer);
          uploadedFilePayload = {
            mimeType: 'text/plain',
            text: text || 'Documento DOCX baleiro',
            filename: file.name
          };
          showFileReady(file.name, file.size);
        } catch (e) {
          showToast('Non se puido ler o arquivo DOCX: ' + e.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast('Formato non admitido. Use PDF, DOCX, TXT ou Imaxe.', 'warning');
    }
  }

  function showFileReady(name, size) {
    fileNameDisplay.textContent = name;
    fileSizeDisplay.textContent = (size / 1024).toFixed(1) + ' KB';
    fileSelectedInfo.style.display = 'flex';
    fileDropZone.style.display = 'none';
    showToast(`Arquivo "${name}" listo para analizar`, 'info');
  }

  // 3. PROCESAMENTO CON GEMINI API
  processBtn.onclick = async () => {
    stopRecording();

    let parts = [];

    if (currentTab === 'voice') {
      if (!audioBase64) {
        showToast('Grave primeiro un audio co micrófono antes de analizar', 'warning');
        return;
      }
      parts.push({
        inlineData: {
          mimeType: audioMimeType || 'audio/webm',
          data: audioBase64
        }
      });
      parts.push({
        text: `Analiza esta gravación de audio para o seguinte tipo de documento: ${documentType.toUpperCase()}. Extrae a información en galego estruturada con fidelidade técnica.`
      });
    } else if (currentTab === 'file') {
      if (!uploadedFilePayload) {
        showToast('Seleccione un arquivo antes de analizar', 'warning');
        return;
      }
      if (uploadedFilePayload.text) {
        parts.push({ text: uploadedFilePayload.text });
      } else {
        parts.push({
          inlineData: {
            mimeType: uploadedFilePayload.mimeType,
            data: uploadedFilePayload.data
          }
        });
      }
      parts.push({
        text: `Analiza o documento adxunto (${uploadedFilePayload.filename}) para un documento de tipo: ${documentType.toUpperCase()}. Extrae a información estructurada para ANTA OBRA.`
      });
    } else if (currentTab === 'text') {
      const txt = backdrop.querySelector('#ai-free-text')?.value.trim();
      if (!txt) {
        showToast('Escriba ou pegue texto antes de analizar', 'warning');
        return;
      }
      parts.push({ text: txt });
      parts.push({
        text: `Analiza estas notas de texto e adapta a información á estrutura de: ${documentType.toUpperCase()}.`
      });
    }

    // Cambiar estado a cargando
    tabContainer.style.display = 'none';
    resultsBox.style.display = 'none';
    loadingBox.style.display = 'block';
    processBtn.style.display = 'none';

    try {
      const structured = await callGeminiStructured({
        apiKey,
        parts,
        documentType
      });

      extractedResult = structured;
      renderExtractedPreview(structured);

      loadingBox.style.display = 'none';
      resultsBox.style.display = 'block';
      applyBtn.style.display = 'block';
    } catch (err) {
      loadingBox.style.display = 'none';
      tabContainer.style.display = 'block';
      processBtn.style.display = 'block';
      showToast('Erro procesando con Gemini: ' + err.message, 'error');
    }
  };

  reanalyzeBtn.onclick = () => {
    resultsBox.style.display = 'none';
    applyBtn.style.display = 'none';
    tabContainer.style.display = 'block';
    processBtn.style.display = 'block';
  };

  // Renderizar a previsualización dos datos detectados
  function renderExtractedPreview(data) {
    let previewHtml = '';

    if (data.resumo) {
      previewHtml += `
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: var(--primary); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 2px;">Resumo Executivo / Síntese:</strong>
          <div style="background: #fff; padding: 0.6rem 0.8rem; border: 1px solid var(--border-light); border-radius: 4px; color: var(--text-main); line-height: 1.45;">
            ${escapeHtml(data.resumo)}
          </div>
        </div>
      `;
    }

    if (data.apartados && data.apartados.length > 0) {
      previewHtml += `
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: var(--primary); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 6px;">Apartados e Seccións Estruturadas (${data.apartados.length}):</strong>
          ${data.apartados.map((ap, idx) => {
            const rawSecs = Array.isArray(ap.secciones) && ap.secciones.length > 0
              ? ap.secciones
              : (Array.isArray(ap.puntos) ? ap.puntos : []);

            return `
              <div style="background: #fff; border: 1px solid var(--border-light); border-radius: 6px; padding: 0.75rem; margin-bottom: 0.6rem;">
                <div style="color: #0f4761; font-weight: 800; font-size: 0.88rem; text-transform: uppercase; margin-bottom: 0.4rem;">
                  ${escapeHtml(ap.titulo || `Apartado ${idx + 1}`)}
                </div>
                ${rawSecs.length > 0 ? `
                  <div style="display: flex; flex-direction: column; gap: 6px; padding-left: 0.5rem; border-left: 2px solid var(--border-light);">
                    ${rawSecs.map((s, sIdx) => {
                      const t = typeof s === 'object' && s !== null ? (s.titulo || `Sección ${sIdx + 1}`) : (typeof s === 'string' && s.length > 40 ? s.slice(0, 40) + '...' : s);
                      const txt = typeof s === 'object' && s !== null ? (s.texto || s.contenido || '') : s;
                      return `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px;">
                          <div style="font-weight: 700; color: #1e293b; font-size: 0.82rem; margin-bottom: 2px;">
                            ${idx + 1}.${sIdx + 1}_ ${escapeHtml(t)}
                          </div>
                          <div style="font-size: 0.78rem; color: #475569; line-height: 1.4;">
                            ${escapeHtml(txt)}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (data.acuerdos && data.acuerdos.length > 0) {
      previewHtml += `
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: #166534; text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 4px;">Acordos e Instrucións (${data.acuerdos.length}):</strong>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.6rem 0.8rem;">
            <ul style="margin: 0 0 0 1.25rem; padding: 0; color: #166534; font-size: 0.82rem; line-height: 1.45;">
              ${data.acuerdos.map(ac => {
                const txt = typeof ac === 'object' && ac !== null ? (ac.titulo ? `<strong>${escapeHtml(ac.titulo)}:</strong> ` : '') + escapeHtml(ac.texto || '') : escapeHtml(String(ac));
                return `<li>${txt}</li>`;
              }).join('')}
            </ul>
          </div>
        </div>
      `;
    }

    if (data.asistentes && data.asistentes.length > 0) {
      previewHtml += `
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: var(--primary); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 4px;">Persoas / Asistentes Mencionados:</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${data.asistentes.map(as => `<span class="badge badge-primary" style="font-size: 0.75rem;">👤 ${escapeHtml(as)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    if (data.titulo && documentType === 'nota') {
      previewHtml += `
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: var(--primary); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 2px;">Título da Nota:</strong>
          <div style="background: #fff; padding: 0.5rem 0.75rem; border: 1px solid var(--border-light); border-radius: 4px; font-weight: 700;">
            ${escapeHtml(data.titulo)}
          </div>
        </div>
      `;
    }

    previewBox.innerHTML = previewHtml || `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">Non se detectaron apartados específicos. Pode revisar o texto extraído.</div>`;
  }

  // 4. APLICAR AO DOCUMENTO
  applyBtn.onclick = () => {
    if (!extractedResult) return;
    if (typeof onApply === 'function') {
      onApply(extractedResult);
      showToast('Información incorporada ao documento con éxito', 'success');
      close();
    }
  };
}

/**
 * Chamada á API de Gemini con selección automática de modelo de respaldo
 */
async function callGeminiStructured({ apiKey, parts, documentType }) {
  const systemInstructionText = getSystemInstruction(documentType);

  const payload = {
    contents: [{ parts }],
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    },
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const resJson = await response.json();
        let text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('A resposta de Gemini non contén texto.');
        text = text.trim();
        if (text.startsWith('```json')) text = text.slice(7);
        else if (text.startsWith('```')) text = text.slice(3);
        if (text.endsWith('```')) text = text.slice(0, -3);
        return JSON.parse(text.trim());
      }

      const errData = await response.json().catch(() => ({}));
      lastError = new Error(`[${model}] ${errData.error?.message || response.statusText}`);
      // Se é erro 404 ou 503, tenta co seguinte modelo
      if (response.status === 404 || response.status === 503 || response.status === 429) {
        console.warn(`Fallback modelo ${model} -> seguinte:`, lastError.message);
        continue;
      }
      throw lastError;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Non foi posible conectar con ningún dos modelos de Gemini.');
}

/**
 * Prompt de sistema especializado segundo o tipo de documento
 */
function getSystemInstruction(documentType) {
  return `
Es el asistente de Inteligencia Artificial para arquitectos y direcciones de obra de "ANTA OBRA".
Tu misión es procesar el dictado de voz, documento adjunto (PDF, DOCX o imagen) o notas, estructurándolos rigurosamente para el documento oficial de obra.

REGLA FUNDAMENTAL DE ESTRUCTURACIÓN DE ACTAS Y REUNIONES DE OBRA:
Una visita o reunión de obra se compone de APARTADOS generales (ej: "1_ CIMENTACIÓN E ESTRUTURA", "2_ INSTALACIÓNS", "3_ CUBERTA", "4_ SEGURIDADE E SAÚDE").
Dentro de cada apartado general, existen SECCIONES o temas específicos (ej: 1.1, 1.2...).

⚠️ ATENCIÓN MÁXIMA A LA DIFERENCIA ENTRE "titulo" Y "texto" DE CADA SECCIÓN:
1. "titulo": TÍTULO BREVE, SINTÉTICO Y CONCISO del tema tratado (ej: "Replanteo da estrutura", "Revisión polo Director de Execución", "Control de cotas", "Permisos de acometida").
   - DEBE TENER ENTRE 2 Y 6 PALABRAS MÁXIMO.
   - NUNCA pongas aquí oraciones largas, párrafos explicativos, ni el dictado literal.
2. "texto": AQUÍ DEBE IR TODO EL CONTENIDO EXPLICATIVO, redacción de las observaciones técnicas, detalles, comprobaciones y hechos dictados (ej: "Realizado o replanteo da estrutura, con especial atención ao control de cotas de excavación e comprobación de niveis de acordo co proxecto de execución...").

Debes responder ÚNICAMENTE con el siguiente esquema JSON estricto:

{
  "resumo": "Resumen ejecutivo formal y claro en gallego o castellano técnico",
  "apartados": [
    {
      "titulo": "Título general del apartado en mayúsculas (ej: CIMENTACIÓN E ESTRUTURA, INSTALACIÓNS, CUBERTAS, SEGURIDADE)",
      "secciones": [
        {
          "titulo": "Título breve del tema (ej: Replanteo da estrutura)",
          "texto": "Párrafo o contenido detallado y completo con las comprobaciones, hechos constatados y observaciones dictadas..."
        }
      ]
    }
  ],
  "acuerdos": [
    {
      "titulo": "Título breve del acuerdo u orden (ej: Revisión polo DE)",
      "texto": "Redacción completa del acuerdo, compromiso o requerimiento..."
    }
  ],
  "asistentes": ["Nombre y Apellidos (Cargo/Entidad)"],
  "titulo": "Título breve (solo si es nota de obra)",
  "categoria": "llamada" | "incidencia" | "orden_direccion" | "recordatorio" (para notas),
  "urgencia": "baja" | "media" | "alta",
  "estado": "Pendiente" | "Resolta"
}

NORMAS ESPECÍFICAS:
1. Divide el audio o texto en capítulos constructivos lógicos (apartados).
2. Dentro de cada capítulo, crea una o más secciones. Sintetiza siempre un "titulo" corto y pon la explicación completa en "texto".
3. Si el dictado menciona acuerdos u órdenes directas, inclúyelos en "acuerdos" con su "titulo" y "texto".
4. Redacción en tono técnico, directo, limpio, sin muletillas de voz ("bueno", "vamos a ver", "eh...").
5. Responde EXCLUSIVAMENTE con el objeto JSON válido.
`;
}

/**
 * Extrae texto plano dun arquivo DOCX no propio navegador sen librerías externas pesadas
 */
async function extractDocxTextInBrowser(arrayBuffer) {
  // Un archivo DOCX é un ZIP que contén word/document.xml
  // Lemos con DecompressionStream ou parseo de cadenas ZIP
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    // Buscamos a sinatura PK do zip
    const textDecoder = new TextDecoder('utf-8');
    const rawStr = textDecoder.decode(uint8);
    // Extraemos etiquetas <w:t>...</w:t>
    const matches = rawStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (matches && matches.length > 0) {
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    }
  } catch (e) {
    console.warn('Fallback docx parsing error:', e);
  }
  return '';
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

