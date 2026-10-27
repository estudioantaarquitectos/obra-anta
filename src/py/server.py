import os
import sys
import json
import time
import shutil
import tempfile
import subprocess
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ANTA OBRA Document Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PY_DIR = BASE_DIR / "src" / "py"
sys.path.insert(0, str(PY_DIR))

EXPORT_STORE = {}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "anta-obra-backend", "time": time.time()}

@app.get("/api/download-export")
def download_export(token: str):
    item = EXPORT_STORE.get(token)
    if not item:
        raise HTTPException(status_code=404, detail="O arquivo solicitado non existe ou caducou.")
    
    file_path = item["filePath"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="O arquivo xa non está dispoñible no servidor temporal.")
    
    filename = item.get("filename", "documento.pdf")
    content_type = item.get("contentType", "application/octet-stream")
    return FileResponse(file_path, media_type=content_type, filename=filename)

@app.post("/api/export-informe")
async def export_informe(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    
    informe = body.get("informe") or body
    fmt = body.get("format", "docx")
    filename_req = body.get("filename")
    response_type = body.get("responseType", "token")

    if not informe:
        raise HTTPException(status_code=400, detail="Faltan datos do informe")

    tmp_dir = tempfile.gettempdir()
    ts = int(time.time() * 1000)
    tmp_json = os.path.join(tmp_dir, f"inf_req_{ts}.json")
    tmp_docx = os.path.join(tmp_dir, f"inf_out_{ts}.docx")
    tmp_pdf = os.path.join(tmp_dir, f"inf_out_{ts}.pdf")

    with open(tmp_json, "w", encoding="utf-8") as f:
        json.dump(informe, f, ensure_ascii=False, indent=2)

    script_path = PY_DIR / "generar_informe.py"
    plantilla = BASE_DIR / "ejemplo_modificado_informe_mensual.docx"
    if not plantilla.exists():
        plantilla = BASE_DIR / "plantilla_informe.docx"

    cmd = [
        sys.executable,
        str(script_path),
        "--data", tmp_json,
        "--output-docx", tmp_docx,
        "--plantilla", str(plantilla)
    ]
    if fmt == "pdf":
        cmd.extend(["--output-pdf", tmp_pdf])

    proc = subprocess.run(cmd, capture_output=True, text=True)
    try:
        os.remove(tmp_json)
    except Exception:
        pass

    if proc.returncode != 0:
        err = proc.stderr or proc.stdout or "Error al ejecutar generar_informe.py"
        raise HTTPException(status_code=500, detail=err)

    target_file = tmp_pdf if fmt == "pdf" else tmp_docx
    if not os.path.exists(target_file):
        raise HTTPException(status_code=500, detail=f"Non se atopou o arquivo xerado: {fmt}")

    default_name = f"Informe_Mensual_{ts}.{fmt}"
    filename = filename_req or default_name
    content_type = "application/pdf" if fmt == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    if response_type == "raw":
        return FileResponse(target_file, media_type=content_type, filename=filename)

    token = f"inf_{ts}_{os.urandom(4).hex()}"
    persistent_file = os.path.join(tmp_dir, f"anta_{token}_{filename}")
    shutil.copyfile(target_file, persistent_file)

    try: os.remove(tmp_docx)
    except Exception: pass
    if fmt == "pdf":
        try: os.remove(tmp_pdf)
        except Exception: pass

    EXPORT_STORE[token] = {
        "filePath": persistent_file,
        "filename": filename,
        "contentType": content_type,
        "expiresAt": time.time() + 600
    }

    return {
        "success": True,
        "token": token,
        "downloadUrl": f"/api/download-export?token={token}",
        "filename": filename
    }

@app.post("/api/export-acta")
async def export_acta(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    
    acta = body.get("acta") or body
    fmt = body.get("format", "docx")
    filename_req = body.get("filename")
    response_type = body.get("responseType", "token")

    if not acta:
        raise HTTPException(status_code=400, detail="Faltan datos da acta")

    tmp_dir = tempfile.gettempdir()
    ts = int(time.time() * 1000)
    tmp_json = os.path.join(tmp_dir, f"acta_req_{ts}.json")
    tmp_docx = os.path.join(tmp_dir, f"acta_out_{ts}.docx")
    tmp_pdf = os.path.join(tmp_dir, f"acta_out_{ts}.pdf")

    with open(tmp_json, "w", encoding="utf-8") as f:
        json.dump(acta, f, ensure_ascii=False, indent=2)

    script_path = PY_DIR / "generar_acta.py"
    plantilla = BASE_DIR / "ejemplo_modificado_acta_semanal.docx"
    if not plantilla.exists():
        plantilla = BASE_DIR / "plantilla_acta.docx"

    cmd = [
        sys.executable,
        str(script_path),
        "--data", tmp_json,
        "--output-docx", tmp_docx,
        "--plantilla", str(plantilla)
    ]
    if fmt == "pdf":
        cmd.extend(["--output-pdf", tmp_pdf])

    proc = subprocess.run(cmd, capture_output=True, text=True)
    try:
        os.remove(tmp_json)
    except Exception:
        pass

    if proc.returncode != 0:
        err = proc.stderr or proc.stdout or "Error al ejecutar generar_acta.py"
        raise HTTPException(status_code=500, detail=err)

    target_file = tmp_pdf if fmt == "pdf" else tmp_docx
    if not os.path.exists(target_file):
        raise HTTPException(status_code=500, detail=f"Non se atopou o arquivo xerado: {fmt}")

    default_name = f"Acta_{ts}.{fmt}"
    filename = filename_req or default_name
    content_type = "application/pdf" if fmt == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    if response_type == "raw":
        return FileResponse(target_file, media_type=content_type, filename=filename)

    token = f"acta_{ts}_{os.urandom(4).hex()}"
    persistent_file = os.path.join(tmp_dir, f"anta_{token}_{filename}")
    shutil.copyfile(target_file, persistent_file)

    try: os.remove(tmp_docx)
    except Exception: pass
    if fmt == "pdf":
        try: os.remove(tmp_pdf)
        except Exception: pass

    EXPORT_STORE[token] = {
        "filePath": persistent_file,
        "filename": filename,
        "contentType": content_type,
        "expiresAt": time.time() + 600
    }

    return {
        "success": True,
        "token": token,
        "downloadUrl": f"/api/download-export?token={token}",
        "filename": filename
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.py.server:app", host="0.0.0.0", port=8000, reload=True)
