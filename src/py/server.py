import os
import json
import uuid
import time
import base64
import shutil
import tempfile
import subprocess
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI(title="ANTA OBRA Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXPORT_TOKENS = {}
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PY_DIR = os.path.dirname(__file__)


def convert_docx_to_pdf_file(in_docx: str, out_pdf: str) -> bool:
    # 1. Try Word COM on Windows
    try:
        import win32com.client
        import pythoncom
        pythoncom.CoInitialize()
        word = win32com.client.DispatchEx('Word.Application')
        word.Visible = False
        word.DisplayAlerts = False
        try:
            doc_w = word.Documents.Open(os.path.abspath(in_docx))
            doc_w.SaveAs(os.path.abspath(out_pdf), FileFormat=17)
            doc_w.Close(False)
            if os.path.exists(out_pdf):
                return True
        finally:
            word.Quit()
            pythoncom.CoUninitialize()
    except Exception:
        pass

    # 2. Try LibreOffice headless (Linux / Docker / Render)
    try:
        out_dir = os.path.dirname(os.path.abspath(out_pdf))
        base_name = os.path.splitext(os.path.basename(in_docx))[0]
        expected_pdf = os.path.join(out_dir, f"{base_name}.pdf")
        cmd = ['soffice', '--headless', '--convert-to', 'pdf', '--outdir', out_dir, os.path.abspath(in_docx)]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.path.exists(expected_pdf):
            if os.path.abspath(expected_pdf) != os.path.abspath(out_pdf):
                shutil.move(expected_pdf, out_pdf)
            return True
    except Exception:
        pass

    return os.path.exists(out_pdf)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "anta-obra-backend"}


@app.post("/api/store-download")
async def store_download(request: Request):
    try:
        data = await request.json()
        b64 = data.get("base64", "")
        filename = data.get("filename", "documento.pdf")
        content_type = data.get("contentType", "application/octet-stream")
        if not b64:
            raise HTTPException(status_code=400, detail="Falta base64")
        clean_b64 = b64.split(";base64,")[1] if ";base64," in b64 else b64
        buf = base64.b64decode(clean_b64)
        token = f"store_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}"
        tmp_file = os.path.join(tempfile.gettempdir(), f"anta_{token}_{filename}")
        with open(tmp_file, "wb") as f:
            f.write(buf)
        EXPORT_TOKENS[token] = {"path": tmp_file, "filename": filename, "content_type": content_type}
        return {
            "success": True,
            "token": token,
            "downloadUrl": f"/api/download-export?token={token}",
            "filename": filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export-acta")
async def export_acta(request: Request):
    try:
        data = await request.json()
        acta_payload = data.get("acta") if isinstance(data, dict) and "acta" in data else data
        fmt = data.get("format", "docx").lower() if isinstance(data, dict) else "docx"
        response_type = data.get("responseType", "token") if isinstance(data, dict) else "token"
        tmp_dir = tempfile.mkdtemp(prefix="anta_acta_")
        in_json = os.path.join(tmp_dir, "acta_in.json")
        with open(in_json, "w", encoding="utf-8") as f:
            json.dump(acta_payload, f, ensure_ascii=False)

        num = acta_payload.get("numero", "S_N") if isinstance(acta_payload, dict) else "S_N"
        default_name = f"Acta_N{num}.{fmt}"
        req_filename = (data.get("filename") if isinstance(data, dict) else None) or default_name
        out_docx = os.path.join(tmp_dir, f"Acta_N{num}.docx")
        out_pdf = os.path.join(tmp_dir, f"Acta_N{num}.pdf")
        
        es_reunion = (
            acta_payload.get("tipoDocumento") == "reunion"
            or acta_payload.get("tipo") == "reunion"
            or acta_payload.get("esReunion") is True
        ) if isinstance(acta_payload, dict) else False
        
        if es_reunion:
            cand_r = [
                os.path.join(BASE_DIR, "ejemplo_modificado_acta_reunión.docx"),
                os.path.join(BASE_DIR, "plantilla_reunion.docx")
            ]
            plantilla = next((p for p in cand_r if os.path.exists(p)), cand_r[0])
        else:
            cand_s = [
                os.path.join(BASE_DIR, "ejemplo_modificado_acta_semanal.docx"),
                os.path.join(BASE_DIR, "plantilla_acta.docx")
            ]
            plantilla = next((p for p in cand_s if os.path.exists(p)), cand_s[0])
            
        script = os.path.join(PY_DIR, "generar_acta.py")

        cmd = ["python", script, "--data", in_json, "--output-docx", out_docx, "--plantilla", plantilla]
        if fmt == "pdf":
            cmd.extend(["--output-pdf", out_pdf])

        res = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)
        if res.returncode != 0:
            raise HTTPException(status_code=500, detail=res.stderr or res.stdout or "Error generando acta")

        out_line = res.stdout.strip().split("\n")[-1]
        result = json.loads(out_line)
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Error"))

        out_file = out_pdf if fmt == "pdf" else out_docx
        if not os.path.exists(out_file):
            raise HTTPException(status_code=500, detail=f"No se generó el archivo {fmt}")

        media_type = "application/pdf" if fmt == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if response_type == "raw":
            return FileResponse(path=out_file, filename=req_filename, media_type=media_type)

        token = f"acta_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}"
        EXPORT_TOKENS[token] = {"path": out_file, "filename": req_filename, "content_type": media_type}
        return {
            "success": True,
            "token": token,
            "downloadUrl": f"/api/download-export?token={token}",
            "filename": req_filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export-informe")
async def export_informe(request: Request):
    try:
        data = await request.json()
        informe_payload = data.get("informe") if isinstance(data, dict) and "informe" in data else data
        fmt = data.get("format", "docx").lower() if isinstance(data, dict) else "docx"
        response_type = data.get("responseType", "token") if isinstance(data, dict) else "token"
        tmp_dir = tempfile.mkdtemp(prefix="anta_inf_")
        in_json = os.path.join(tmp_dir, "inf_in.json")
        with open(in_json, "w", encoding="utf-8") as f:
            json.dump(informe_payload, f, ensure_ascii=False)

        default_name = f"Informe_Mensual_{int(time.time()*1000)}.{fmt}"
        req_filename = (data.get("filename") if isinstance(data, dict) else None) or default_name
        out_docx = os.path.join(tmp_dir, f"Informe_Mensual_{int(time.time()*1000)}.docx")
        out_pdf = os.path.join(tmp_dir, f"Informe_Mensual_{int(time.time()*1000)}.pdf")
        plantilla = os.path.join(BASE_DIR, "ejemplo_modificado_informe_mensual.docx")
        script = os.path.join(PY_DIR, "generar_informe.py")

        cmd = ["python", script, "--data", in_json, "--output-docx", out_docx, "--plantilla", plantilla]
        if fmt == "pdf":
            cmd.extend(["--output-pdf", out_pdf])

        res = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)
        if res.returncode != 0:
            raise HTTPException(status_code=500, detail=res.stderr or res.stdout or "Error generando informe")

        out_line = res.stdout.strip().split("\n")[-1]
        result = json.loads(out_line)
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Error"))

        out_file = out_pdf if fmt == "pdf" else out_docx
        if not os.path.exists(out_file):
            raise HTTPException(status_code=500, detail=f"No se generó el archivo {fmt}")

        media_type = "application/pdf" if fmt == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if response_type == "raw":
            return FileResponse(path=out_file, filename=req_filename, media_type=media_type)

        token = f"inf_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}"
        EXPORT_TOKENS[token] = {"path": out_file, "filename": req_filename, "content_type": media_type}
        return {
            "success": True,
            "token": token,
            "downloadUrl": f"/api/download-export?token={token}",
            "filename": req_filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/convert-docx-to-pdf")
async def convert_docx_to_pdf(request: Request):
    try:
        data = await request.json()
        docx_b64 = data.get("docxBase64", "")
        if not docx_b64:
            raise HTTPException(status_code=400, detail="Falta documento docx en base64")
        clean_b64 = docx_b64.split(";base64,")[1] if ";base64," in docx_b64 else docx_b64
        tmp_dir = tempfile.mkdtemp(prefix="anta_conv_")
        in_docx = os.path.join(tmp_dir, "doc.docx")
        out_pdf = os.path.join(tmp_dir, "doc.pdf")
        with open(in_docx, "wb") as f:
            f.write(base64.b64decode(clean_b64))
        ok = convert_docx_to_pdf_file(in_docx, out_pdf)
        if not ok or not os.path.exists(out_pdf):
            raise HTTPException(status_code=500, detail="Error convirtiendo DOCX a PDF")
        return FileResponse(path=out_pdf, filename="documento.pdf", media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-separata")
async def generate_separata(request: Request):
    try:
        data = await request.json()
        tmp_dir = tempfile.mkdtemp(prefix="anta_sep_")
        tmp_json = os.path.join(tmp_dir, "sep_req.json")
        out_pdf = os.path.join(tmp_dir, "sep_out.pdf")
        with open(tmp_json, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        script = os.path.join(PY_DIR, "generar_separata.py")
        res = subprocess.run(["python", script, "--data", tmp_json, "--output", out_pdf], capture_output=True, text=True, cwd=BASE_DIR)
        if res.returncode != 0 or not os.path.exists(out_pdf):
            raise HTTPException(status_code=500, detail=res.stderr or "Error al generar separata")
        return FileResponse(path=out_pdf, filename="separata.pdf", media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/merge-pdfs")
async def merge_pdfs(request: Request):
    try:
        import pypdf
        data = await request.json()
        pdf_list = data.get("pdfs", [])
        filename = data.get("filename", "Documento_con_anexos.pdf")
        if not pdf_list:
            raise HTTPException(status_code=400, detail="Faltan archivos PDF para fusionar")
        tmp_dir = tempfile.mkdtemp(prefix="anta_merge_")
        tmp_files = []
        for idx, item in enumerate(pdf_list):
            tmp_path = os.path.join(tmp_dir, f"in_{idx}.pdf")
            if isinstance(item, dict) and (item.get("type") == "separata" or item.get("separata")):
                sep_data = item.get("separata") or item
                sep_json = os.path.join(tmp_dir, f"sep_{idx}.json")
                with open(sep_json, "w", encoding="utf-8") as f:
                    json.dump(sep_data, f, ensure_ascii=False)
                script = os.path.join(PY_DIR, "generar_separata.py")
                subprocess.run(["python", script, "--data", sep_json, "--output", tmp_path], capture_output=True, text=True, cwd=BASE_DIR)
                if os.path.exists(tmp_path):
                    tmp_files.append(tmp_path)
            elif isinstance(item, str) and ";base64," in item:
                b64 = item.split(";base64,")[1]
                with open(tmp_path, "wb") as f:
                    f.write(base64.b64decode(b64))
                tmp_files.append(tmp_path)
            elif isinstance(item, str) and item.startswith("%PDF"):
                with open(tmp_path, "wb") as f:
                    f.write(item.encode("latin1"))
                tmp_files.append(tmp_path)
        if not tmp_files:
            raise HTTPException(status_code=400, detail="No se encontraron buffers PDF válidos")
        out_pdf = os.path.join(tmp_dir, "merged.pdf")
        writer = pypdf.PdfWriter()
        for f_path in tmp_files:
            writer.append(f_path)
        writer.write(out_pdf)
        writer.close()
        return FileResponse(path=out_pdf, filename=filename, media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download-export")
def download_export(token: str):
    item = EXPORT_TOKENS.get(token)
    if not item or not os.path.exists(item["path"]):
        raise HTTPException(status_code=404, detail="Archivo no encontrado o expirado")
    media_type = item.get("content_type") or (
        "application/pdf" if item["filename"].endswith(".pdf")
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(
        path=item["path"],
        filename=item["filename"],
        media_type=media_type
    )
