import { defineConfig } from 'vite';
import { resolve } from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const exportStore = new Map();

function actaExportServerPlugin() {
  return {
    name: 'acta-export-server',
    configureServer(server) {
      // Periodic cleanup of temp export files older than 10 minutes (only in dev server)
      const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, val] of exportStore.entries()) {
          if (val.expiresAt < now) {
            try { if (fs.existsSync(val.filePath)) fs.unlinkSync(val.filePath); } catch (e) {}
            exportStore.delete(key);
          }
        }
      }, 60000);
      if (cleanupInterval.unref) cleanupInterval.unref();
      // 1. Direct native HTTP download endpoint with explicit Content-Disposition
      server.middlewares.use('/api/download-export', (req, res) => {
        try {
          const parsedUrl = new URL(req.url, 'http://localhost:5173');
          const token = parsedUrl.searchParams.get('token');
          if (!token || !exportStore.has(token)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('O arquivo de descarga solicitado non existe ou caducou.');
            return;
          }
          const item = exportStore.get(token);
          if (!fs.existsSync(item.filePath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('O arquivo xa non está dispoñible no servidor temporal.');
            return;
          }

          const fileBuffer = fs.readFileSync(item.filePath);
          const safeName = item.filename || 'documento.pdf';

          res.statusCode = 200;
          res.setHeader('Content-Type', item.contentType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
          res.setHeader('Content-Length', fileBuffer.length);
          res.end(fileBuffer);
        } catch (err) {
          console.error('[API download-export] Error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Erro interno ao descargar: ' + err.message);
        }
      });

      // 2. Store arbitrary base64/blob to serve via native HTTP download
      server.middlewares.use('/api/store-download', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const { base64, filename, contentType } = data;
            if (!base64 || !filename) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Falta base64 ou filename' }));
              return;
            }
            const cleanB64 = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64;
            const buf = Buffer.from(cleanB64, 'base64');
            const token = `store_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const tmpFile = path.join(os.tmpdir(), `anta_${token}_${filename}`);
            fs.writeFileSync(tmpFile, buf);

            exportStore.set(token, {
              filePath: tmpFile,
              filename,
              contentType: contentType || 'application/octet-stream',
              expiresAt: Date.now() + 10 * 60 * 1000
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              token,
              downloadUrl: `/api/download-export?token=${token}`,
              filename
            }));
          } catch (err) {
            console.error('[API store-download] Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      // 3. Export Acta (DOCX / PDF)
      server.middlewares.use('/api/export-acta', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const cleanBody = (body || '').replace(/^\uFEFF/, '').trim();
            const data = JSON.parse(cleanBody || '{}');
            const acta = data.acta;
            const format = data.format || 'docx';

            if (!acta) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Faltan datos del acta' }));
              return;
            }

            const tmpDir = os.tmpdir();
            const timestamp = Date.now();
            const tmpJson = path.join(tmpDir, `acta_req_${timestamp}.json`);
            const tmpDocx = path.join(tmpDir, `acta_out_${timestamp}.docx`);
            const tmpPdf = path.join(tmpDir, `acta_out_${timestamp}.pdf`);

            fs.writeFileSync(tmpJson, JSON.stringify(acta, null, 2), 'utf-8');

            const scriptPath = path.resolve(__dirname, 'src/py/generar_acta.py');
            const plantillaPath = fs.existsSync(path.resolve(__dirname, 'ejemplo_modificado_acta_semanal.docx'))
              ? path.resolve(__dirname, 'ejemplo_modificado_acta_semanal.docx')
              : path.resolve(__dirname, 'plantilla_acta.docx');

            const pyArgs = [
              scriptPath,
              '--data', tmpJson,
              '--output-docx', tmpDocx,
              '--plantilla', plantillaPath
            ];

            if (format === 'pdf') {
              pyArgs.push('--output-pdf', tmpPdf);
            }

            const proc = spawn('python', pyArgs);

            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', d => { stdout += d.toString(); });
            proc.stderr.on('data', d => { stderr += d.toString(); });

            proc.on('close', code => {
              try { fs.unlinkSync(tmpJson); } catch (e) {}

              if (code !== 0) {
                console.error('[API export-acta] Error en Python:', stderr, stdout);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: stderr || stdout || 'Error al generar acta' }));
                return;
              }

              const targetFile = format === 'pdf' ? tmpPdf : tmpDocx;
              if (!fs.existsSync(targetFile)) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `No se encontró el archivo generado: ${format}` }));
                return;
              }

              const numStr = String(acta.numero || 'acta').padStart(2, '0');
              const dateStr = (acta.fecha || '').replace(/-/g, '');
              const defaultFilename = format === 'pdf'
                ? `Acta_N${numStr}_${dateStr || 'reunion'}.pdf`
                : `Acta_N${numStr}_${dateStr || 'reunion'}.docx`;
              const filename = data.filename || defaultFilename;

              const contentType = format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

              // Always return token downloadUrl if not explicitly requesting raw binary stream
              if (data.responseType !== 'raw') {
                const token = `acta_${timestamp}_${Math.random().toString(36).slice(2, 9)}`;
                const persistentTmp = path.join(tmpDir, `anta_${token}_${filename}`);
                fs.copyFileSync(targetFile, persistentTmp);
                try { fs.unlinkSync(tmpDocx); } catch (e) {}
                if (format === 'pdf') { try { fs.unlinkSync(tmpPdf); } catch (e) {} }

                exportStore.set(token, {
                  filePath: persistentTmp,
                  filename,
                  contentType,
                  expiresAt: Date.now() + 10 * 60 * 1000
                });

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  token,
                  downloadUrl: `/api/download-export?token=${token}`,
                  filename
                }));
                return;
              }

              const fileBuffer = fs.readFileSync(targetFile);
              try { fs.unlinkSync(tmpDocx); } catch (e) {}
              if (format === 'pdf') { try { fs.unlinkSync(tmpPdf); } catch (e) {} }

              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
              res.setHeader('Content-Length', fileBuffer.length);
              res.end(fileBuffer);
            });
          } catch (err) {
            console.error('[API export-acta] Error inesperado:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      // 4. Export Informe Mensual (DOCX / PDF)
      server.middlewares.use('/api/export-informe', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const cleanBody = (body || '').replace(/^\uFEFF/, '').trim();
            const data = JSON.parse(cleanBody || '{}');
            const informe = data.informe || data;
            const format = data.format || 'docx';

            if (!informe) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Faltan datos do informe' }));
              return;
            }

            const tmpDir = os.tmpdir();
            const timestamp = Date.now();
            const tmpJson = path.join(tmpDir, `informe_req_${timestamp}.json`);
            const tmpDocx = path.join(tmpDir, `informe_out_${timestamp}.docx`);
            const tmpPdf = path.join(tmpDir, `informe_out_${timestamp}.pdf`);

            fs.writeFileSync(tmpJson, JSON.stringify(informe, null, 2), 'utf-8');

            const scriptPath = path.resolve(__dirname, 'src/py/generar_informe.py');
            const plantillaPath = fs.existsSync(path.resolve(__dirname, 'ejemplo_modificado_informe_mensual.docx'))
              ? path.resolve(__dirname, 'ejemplo_modificado_informe_mensual.docx')
              : path.resolve(__dirname, 'plantilla_informe.docx');

            const pyArgs = [
              scriptPath,
              '--data', tmpJson,
              '--output-docx', tmpDocx,
              '--plantilla', plantillaPath
            ];

            if (format === 'pdf') {
              pyArgs.push('--output-pdf', tmpPdf);
            }

            const proc = spawn('python', pyArgs);

            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', d => { stdout += d.toString(); });
            proc.stderr.on('data', d => { stderr += d.toString(); });

            proc.on('close', code => {
              try { fs.unlinkSync(tmpJson); } catch (e) {}

              if (code !== 0) {
                console.error('[API export-informe] Error en Python:', stderr, stdout);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: stderr || stdout || 'Error al generar informe' }));
                return;
              }

              const targetFile = format === 'pdf' ? tmpPdf : tmpDocx;
              if (!fs.existsSync(targetFile)) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `No se encontró el archivo generado: ${format}` }));
                return;
              }

              const dx = informe.datosXerais || {};
              const numStr = informe.numero ? `N${informe.numero}_` : '';
              const rawName = dx.mesInformado || informe.numero || 'seguimento';
              const cleanName = String(rawName)
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .replace(/_+/g, '_')
                .slice(0, 30);
              const isSemanal = informe.tipo === 'semanal' || informe.tipo === 'informe_semanal';
              const tipoPrefix = isSemanal ? 'Informe_Semanal' : 'Informe_Mensual';
              const defaultFilename = format === 'pdf'
                ? `${tipoPrefix}_Completo_${numStr}${cleanName || 'DT05'}.pdf`
                : `${tipoPrefix}_${numStr}${cleanName || 'DT05'}.docx`;
              const filename = data.filename || defaultFilename;

              const contentType = format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

              // Always return token downloadUrl if not explicitly requesting raw binary stream
              if (data.responseType !== 'raw') {
                const token = `informe_${timestamp}_${Math.random().toString(36).slice(2, 9)}`;
                const persistentTmp = path.join(tmpDir, `anta_${token}_${filename}`);
                fs.copyFileSync(targetFile, persistentTmp);
                try { fs.unlinkSync(tmpDocx); } catch (e) {}
                if (format === 'pdf') { try { fs.unlinkSync(tmpPdf); } catch (e) {} }

                exportStore.set(token, {
                  filePath: persistentTmp,
                  filename,
                  contentType,
                  expiresAt: Date.now() + 10 * 60 * 1000
                });

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  token,
                  downloadUrl: `/api/download-export?token=${token}`,
                  filename
                }));
                return;
              }

              const fileBuffer = fs.readFileSync(targetFile);
              try { fs.unlinkSync(tmpDocx); } catch (e) {}
              if (format === 'pdf') { try { fs.unlinkSync(tmpPdf); } catch (e) {} }

              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
              res.setHeader('Content-Length', fileBuffer.length);
              res.end(fileBuffer);
            });
          } catch (err) {
            console.error('[API export-informe] Error inesperado:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      server.middlewares.use('/api/convert-docx-to-pdf', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const docxBase64 = data.docxBase64;
            if (!docxBase64) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Falta documento docx en base64' }));
              return;
            }

            const tmpDir = os.tmpdir();
            const timestamp = Date.now();
            const inDocx = path.join(tmpDir, `doc_${timestamp}.docx`);
            const outPdf = path.join(tmpDir, `doc_${timestamp}.pdf`);

            const b64 = docxBase64.includes(';base64,') ? docxBase64.split(';base64,')[1] : docxBase64;
            fs.writeFileSync(inDocx, Buffer.from(b64, 'base64'));

            const pyCmd = `
import win32com.client, sys, os
w = win32com.client.Dispatch('Word.Application')
w.Visible = False
w.DisplayAlerts = False
try:
    doc = w.Documents.Open(os.path.abspath(sys.argv[1]))
    doc.SaveAs(os.path.abspath(sys.argv[2]), FileFormat=17)
    doc.Close(False)
finally:
    w.Quit()
`;
            const proc = spawn('python', ['-c', pyCmd, inDocx, outPdf]);
            let stderr = '';
            proc.stderr.on('data', d => { stderr += d.toString(); });
            proc.on('close', code => {
              try { fs.unlinkSync(inDocx); } catch (e) {}

              if (code !== 0 || !fs.existsSync(outPdf)) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: stderr || 'Error convirtiendo DOCX a PDF' }));
                return;
              }

              const buffer = fs.readFileSync(outPdf);
              try { fs.unlinkSync(outPdf); } catch (e) {}

              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Length', buffer.length);
              res.end(buffer);
            });
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      server.middlewares.use('/api/merge-pdfs', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const pdfList = data.pdfs || [];
            const filename = data.filename || 'Documento_con_anexos.pdf';

            if (!pdfList || pdfList.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Faltan archivos PDF para fusionar' }));
              return;
            }

            const tmpDir = os.tmpdir();
            const timestamp = Date.now();
            const tmpFiles = [];
            const outPdf = path.join(tmpDir, `merged_${timestamp}.pdf`);

            for (let i = 0; i < pdfList.length; i++) {
              const item = pdfList[i];
              const tmpPath = path.join(tmpDir, `in_${timestamp}_${i}.pdf`);
              if (item && typeof item === 'object' && (item.type === 'separata' || item.separata)) {
                const sepData = item.separata || item;
                const sepJson = path.join(tmpDir, `sep_${timestamp}_${i}.json`);
                fs.writeFileSync(sepJson, JSON.stringify(sepData), 'utf-8');
                const sepScript = path.resolve(__dirname, 'src/py/generar_separata.py');
                const sepProc = spawn('python', [sepScript, '--data', sepJson, '--output', tmpPath]);
                await new Promise((resolveProc) => {
                  sepProc.on('close', () => {
                    try { fs.unlinkSync(sepJson); } catch (e) {}
                    if (fs.existsSync(tmpPath)) {
                      tmpFiles.push(tmpPath);
                    }
                    resolveProc();
                  });
                });
              } else if (typeof item === 'string' && item.includes(';base64,')) {
                const b64 = item.split(';base64,')[1];
                fs.writeFileSync(tmpPath, Buffer.from(b64, 'base64'));
                tmpFiles.push(tmpPath);
              } else if (typeof item === 'string' && item.startsWith('%PDF')) {
                fs.writeFileSync(tmpPath, Buffer.from(item, 'latin1'));
                tmpFiles.push(tmpPath);
              } else if (Buffer.isBuffer(item)) {
                fs.writeFileSync(tmpPath, item);
                tmpFiles.push(tmpPath);
              }
            }

            if (tmpFiles.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No se encontraron buffers PDF válidos' }));
              return;
            }

            const pyCmd = `
import pypdf, sys
w = pypdf.PdfWriter()
for f in sys.argv[2:]:
    w.append(f)
w.write(sys.argv[1])
w.close()
`;
            const proc = spawn('python', ['-c', pyCmd, outPdf, ...tmpFiles]);
            let stderr = '';
            proc.stdout.on('data', d => {});
            proc.stderr.on('data', d => { stderr += d.toString(); });
            proc.on('close', code => {
              tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });

              if (code !== 0 || !fs.existsSync(outPdf)) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: stderr || 'Error al fusionar PDFs' }));
                return;
              }

              const buffer = fs.readFileSync(outPdf);
              try { fs.unlinkSync(outPdf); } catch (e) {}

              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
              res.setHeader('Content-Length', buffer.length);
              res.end(buffer);
            });
          } catch (err) {
            console.error('[API merge-pdfs] Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      server.middlewares.use('/api/generate-separata', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const tmpDir = os.tmpdir();
            const timestamp = Date.now();
            const tmpJson = path.join(tmpDir, `sep_req_${timestamp}.json`);
            const outPdf = path.join(tmpDir, `sep_out_${timestamp}.pdf`);

            fs.writeFileSync(tmpJson, JSON.stringify(data), 'utf-8');
            const scriptPath = path.resolve(__dirname, 'src/py/generar_separata.py');
            const proc = spawn('python', [scriptPath, '--data', tmpJson, '--output', outPdf]);

            proc.on('close', code => {
              try { fs.unlinkSync(tmpJson); } catch (e) {}
              if (code !== 0 || !fs.existsSync(outPdf)) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Error al generar separata' }));
                return;
              }

              const buffer = fs.readFileSync(outPdf);
              try { fs.unlinkSync(outPdf); } catch (e) {}

              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Length', buffer.length);
              res.end(buffer);
            });
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  root: './',
  base: './',
  plugins: [actaExportServerPlugin()],
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: [
        '**/*.crdownload',
        '**/*.tmp',
        '**/~$*',
        '**/dist_actas/**',
        '**/dist/**',
        '**/*.docx',
        '**/*.pdf',
        '**/node_modules/**',
        '**/.git/**'
      ]
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
});
