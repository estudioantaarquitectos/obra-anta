/* ==========================================================================
   ANTA OBRA - Shared Rich Text Editor Utility
   Provides rich text formatting (bold, italic, lists, color),
   smart Word/PDF clipboard paste sanitization, and plain-text conversion.
   ========================================================================== */

/**
 * Escapes special HTML characters
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips HTML tags and normalizes entities to plain text for Word/DOCX
 */
export function stripHtml(html) {
  if (!html) return '';
  let str = String(html)
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  return str.trim();
}

/**
 * Prepares existing text or HTML for the contenteditable area
 */
export function formatContentForEditor(content) {
  if (!content) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }
  return content.split('\n').filter(Boolean).map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

/**
 * Renders the HTML markup for a standard rich text editor block
 */
export function renderRichEditorHtml({
  id,
  content = '',
  placeholder = 'Escribe aquí o pega contenido...',
  minHeight = '75px'
}) {
  return `
    <div class="rich-editor-container" data-editor-id="${id}">
      <div style="display: flex; justify-content: flex-end; align-items: center; padding: 0.25rem 0.5rem; background: #f8fafc; border-bottom: 1px solid var(--border-light);">
        <button type="button" class="rich-tab-toggle-btn" title="Mostrar/ocultar barra de formato (Negrita, Listas, Cores)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 16.5-3.5z"></path></svg>
          <span>Formato</span>
          <span class="toggle-arrow">▾</span>
        </button>
      </div>

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
        id="${id}"
        class="rich-editor-content form-control" 
        contenteditable="true" 
        data-placeholder="${escapeHtml(placeholder)}"
        style="min-height: ${minHeight};"
      >${formatContentForEditor(content)}</div>
    </div>
  `;
}

/**
 * Cleans pasted Word/Office HTML by stripping Mso classes and non-standard tags
 */
export function cleanWordHtml(html) {
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

/**
 * Normalizes pasted plain text (e.g. from PDFs) into formatted paragraphs or lists
 */
export function cleanPastedPlainText(text) {
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
      const unwrapped = lines.join(' ').replace(/[\t ]+/g, ' ');
      resultParts.push(`<p>${escapeHtml(unwrapped)}</p>`);
    }
  }

  return resultParts.join('');
}

/**
 * Compresses an image pasted into the editor
 */
export function compressPastedImage(file) {
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

/**
 * Retrieves inner HTML content from a rich editor element, ignoring empty tags
 */
export function getRichEditorContent(container, id) {
  const el = container.querySelector(`#${id}`);
  if (!el) return '';
  const html = el.innerHTML.trim();
  if (!html || html === '<br>' || html === '<p><br></p>' || html === '<p></p>') {
    return '';
  }
  return html;
}

/**
 * Attaches toolbar action listeners and paste interception to all rich editors inside container
 */
export function wireRichEditors(container) {
  container.querySelectorAll('.rich-editor-container').forEach(richBox => {
    const editor = richBox.querySelector('.rich-editor-content');
    if (!editor || editor.__wired) return;
    editor.__wired = true;
    richBox.querySelectorAll('.rich-tab-toggle-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const toolbar = richBox.querySelector('.rich-editor-toolbar');
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

    // Paste handling
    editor.onpaste = async (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = Array.from(clipboardData.items || []);
      const imgItem = items.find(it => it.type && it.type.startsWith('image/'));
      if (imgItem) {
        e.preventDefault();
        const file = imgItem.getAsFile();
        if (file) {
          try {
            const compressedUrl = await compressPastedImage(file);
            document.execCommand('insertImage', false, compressedUrl);
          } catch (err) {
            console.error('Error al pegar imagen:', err);
          }
        }
        return;
      }

      const html = clipboardData.getData('text/html');
      if (html && (html.includes('Mso') || html.includes('table') || html.includes('<!--[if') || html.includes('<ul') || html.includes('<ol') || html.includes('<p') || html.includes('<div'))) {
        e.preventDefault();
        const cleanedHtml = cleanWordHtml(html);
        document.execCommand('insertHTML', false, cleanedHtml);
        return;
      }

      const text = clipboardData.getData('text/plain');
      if (text) {
        e.preventDefault();
        const cleanedTextHtml = cleanPastedPlainText(text);
        document.execCommand('insertHTML', false, cleanedTextHtml);
      }
    };
  });
}
