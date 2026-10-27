# ANTA OBRA - GUÍA MAESTRA DE IMPLANTACIÓN Y CAMBIO DE EQUIPO
**Documento Técnico de Infraestructura, Enlaces de Producción y Migración**  
*Fecha de implantación: 27 de Octubre de 2026*  
*Gestión de Memoria Continua: Agente MEMO & Agente CONECTOR*

---

## 1. RESUMEN DEL SISTEMA Y ARQUITECTURA EN LA NUBE

La plataforma **ANTA OBRA** funciona con una arquitectura moderna desacoplada, 100% operativa y dentro de los planes **gratuitos (Free Tier)** de cada proveedor:

```
                  +----------------------------------------------+
                  |           USUARIO (Navegador Web)            |
                  |         https://anta-obra.vercel.app         |
                  +----------------------+-----------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
   +-----------------------+                           +-----------------------+
   |   VERCEL (Frontend)   |                           |  SUPABASE (PostgreSQL)|
   |  Hosting Global SPA   |                           |  Persistencia Cloud   |
   |  Vite + Vanilla JS    |                           |  Realtime Sync        |
   +-----------+-----------+                           +-----------------------+
               | (Llamadas /api/*)
               v
   +-----------------------------------------------+
   |             RENDER (Backend API)              |
   |      https://anta-backend-1x7v.onrender.com   |
   |  Docker + Python 3.11 + LibreOffice Headless  |
   |  Generación 1:1 de DOCX y PDFs Oficiales      |
   +-----------------------------------------------+
```

---

## 2. FICHA TÉCNICA DE CADA SERVICIO Y CREDENCIALES

### A. Repositorio en GitHub
* **URL del Repositorio:** `https://github.com/estudioantaarquitectos/obra-anta.git`
* **Rama Principal:** `main`
* **Cuenta / Organización:** `estudioantaarquitectos`
* **Automatización CI/CD:** Cada `git push origin main` desencadena automáticamente una nueva compilación y despliegue en producción en Vercel.

---

### B. Frontend en Vercel (Hosting Web)
* **URL de Producción:** [https://anta-obra.vercel.app](https://anta-obra.vercel.app)
* **Proyecto en Vercel:** `anta6/anta-obra`
* **Usuario de Vercel:** `estudioantaarquitectos-8332`
* **Configuración del Proyecto:**
  * **Framework:** Vite
  * **Build Command:** `npm run build`
  * **Output Directory:** `dist`
  * **Configuración de Rutas:** [`vercel.json`](file:///g:/OneDrive/ANTIGRAVITY/ANTA_OBRA/vercel.json) redirige `/api/*` al backend de Render y el resto a `index.html` (SPA router).
* **Variables de Entorno en Vercel:**
  * `VITE_SUPABASE_URL` = `https://oovkvqrhbxjdxjqpsome.supabase.co`
  * `VITE_SUPABASE_ANON_KEY` = `sb_publishable_FGRaZB8fqj54dIduh6TAVg_W1Kr4-aJ`
  * `VITE_API_URL` = `https://anta-backend-1x7v.onrender.com`

---

### C. Base de Datos en Supabase (PostgreSQL en la Nube)
* **Panel de Control:** [https://supabase.com/dashboard](https://supabase.com/dashboard)
* **URL de la API Supabase:** `https://oovkvqrhbxjdxjqpsome.supabase.co`
* **Clave Pública (Anon / Publishable Key):** `sb_publishable_FGRaZB8fqj54dIduh6TAVg_W1Kr4-aJ`
* **Tablas configuradas en base de datos:**
  * `obras`: Datos oficiales de expedientes, presupuestos, contratas y direcciones de obra.
  * `actas`: Actas de obra semanales, asistentes, temas tratados y acuerdos.
  * `informes`: Informes de seguimiento mensual con directrices autonómicas institucionales.
  * `notas`: Notas rápidas de bitácora e incidencias de obra.
  * `agentes`: Directorio de agentes intervinientes, técnicos y empresas.
  * `usuarios` y `grupos`: Sistema de permisos y roles de dirección facultativa.
* **Esquema SQL de Respaldo:** Archivo [`supabase_schema.sql`](file:///g:/OneDrive/ANTIGRAVITY/ANTA_OBRA/supabase_schema.sql) en la raíz del proyecto.

---

### D. Backend de Generación Oficial en Render.com (DOCX y PDF 1:1)
* **Panel de Control:** [https://dashboard.render.com](https://dashboard.render.com)
* **Nombre del Servicio:** `anta-backend`
* **URL Base de la API:** `https://anta-backend-1x7v.onrender.com`
* **Comprobación de Salud (Healthcheck):** `https://anta-backend-1x7v.onrender.com/health`
* **Tipo de Servicio:** Web Service basado en Docker (`Dockerfile`).
* **Paquetes del Contenedor:** Python 3.11, `python-docx`, `reportlab`, `fastapi`/`uvicorn`, LibreOffice Headless (para conversión exacta DOCX a PDF) y utilidades `poppler-utils`.
* **Endpoints Activos:**
  * `POST /api/generate-docx-acta`: Genera el archivo Word oficial del acta a partir de la plantilla.
  * `POST /api/generate-docx-informe`: Genera el informe mensual oficial en Word.
  * `POST /api/generate-docx-separata`: Genera la separata fotográfica oficial.
  * `POST /api/generate-pdf`: Convierte el DOCX en PDF con **paridad estricta 1:1** mediante LibreOffice.

---

## 3. ARCHIVO DE CONFIGURACIÓN `.env` LOCAL

Al clonar el proyecto en un ordenador nuevo, este archivo debe crearse en la carpeta raíz del proyecto (`ANTA_OBRA/.env`):

```bash
# ==============================================================================
# ANTA OBRA - Variables de Entorno de Producción
# ==============================================================================

# Supabase PostgreSQL Cloud
VITE_SUPABASE_URL=https://oovkvqrhbxjdxjqpsome.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_FGRaZB8fqj54dIduh6TAVg_W1Kr4-aJ

NEXT_PUBLIC_SUPABASE_URL=https://oovkvqrhbxjdxjqpsome.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_FGRaZB8fqj54dIduh6TAVg_W1Kr4-aJ

# Backend de Generación Oficial de Documentos (Render Docker)
VITE_API_URL=https://anta-backend-1x7v.onrender.com
```

---

## 4. PASO A PASO PARA REINSTALAR EN UN NUEVO ORDENADOR

Si cambias de ordenador o configuras un equipo nuevo, solo tienes que seguir estos sencillos pasos:

### Paso 1: Instalar el software base en el nuevo PC
1. **Node.js**: Descargar e instalar la versión LTS desde [https://nodejs.org/](https://nodejs.org/).
2. **Python**: Descargar e instalar Python 3.11 o superior desde [https://python.org/](https://python.org/) *(marcar la casilla "Add python.exe to PATH")*.
3. **Git**: Descargar e instalar Git desde [https://git-scm.com/](https://git-scm.com/).
4. **VS Code o Antigravity IDE**.

---

### Paso 2: Clonar el proyecto desde GitHub
Abre la consola (PowerShell o Terminal) en la carpeta donde desees guardar tus proyectos (por ejemplo en tu OneDrive):

```powershell
git clone https://github.com/estudioantaarquitectos/obra-anta.git ANTA_OBRA
cd ANTA_OBRA
```

---

### Paso 3: Instalar dependencias
1. **Dependencias de Frontend (Node.js):**
   ```powershell
   npm install
   ```
2. **Dependencias de Backend local (Python) para scripts y Memo:**
   ```powershell
   pip install -r requirements.txt
   ```

---

### Paso 4: Restaurar el archivo `.env`
Crea el archivo `.env` en la raíz de `ANTA_OBRA/` con el contenido exacto mostrado en la **Sección 3** de este documento.

---

### Paso 5: Ejecutar la aplicación en local
Puedes arrancarla de dos maneras:
* **Haciendo doble clic** en el archivo `iniciar.bat` o `iniciar_app.bat`.
* **Desde consola:**
  ```powershell
  npm run dev
  ```
  La aplicación se abrirá en `http://localhost:5173`.

---

### Paso 6: Vincular Vercel CLI (Opcional, para gestión directa desde consola)
Si deseas desplegar o inspeccionar despliegues desde el nuevo ordenador:
```powershell
npm install -g vercel
vercel login
vercel link
```

---

## 5. CÓMO VERIFICAR CONSUMOS Y CUOTAS GRATUITAS

Todos los servicios contratados están en sus modalidades **Free Tier (gratuitas)** con holgura suficiente para el uso habitual del estudio:

| Servicio | Límite del Plan Gratuito | Cómo consultar el gasto / cuota |
| :--- | :--- | :--- |
| **Vercel** | 100 GB ancho de banda mensual / Ilimitados despliegues personales | [vercel.com/dashboard/usage](https://vercel.com/dashboard/usage) |
| **Supabase** | 500 MB base de datos / 1 GB almacenamiento de archivos / 50.000 usuarios activos | [supabase.com/dashboard/project/oovkvqrhbxjdxjqpsome/settings/billing/usage](https://supabase.com/dashboard/project/oovkvqrhbxjdxjqpsome/settings/billing/usage) |
| **Render** | 750 horas de cómputo al mes *(suficiente para 1 servicio activo 24/7)* / 100 GB ancho de banda | [dashboard.render.com/billing](https://dashboard.render.com/billing) |
| **GitHub** | Repositorios públicos y privados con 2.000 minutos de CI/CD al mes | [github.com/settings/billing](https://github.com/settings/billing) |

> [!TIP]
> **Ahorro de recursos en Render:** En el plan gratuito de Render, si el backend pasa 15 minutos sin recibir solicitudes para generar un Word o PDF, entra en suspensión automática (hibernación). Al solicitar el primer documento del día, tarda unos 30-40 segundos en "despertar"; las siguientes solicitudes se procesan al instante en 1-2 segundos.

---

## 6. COPIA DE SEGURIDAD LOCAL
La aplicación incluye además un generador de copias de seguridad JSON completas desde la pestaña **"Copias de Seguridade"** del menú lateral, lo que te permite descargar en un solo clic todo el contenido de la base de datos (obras, actas, informes, notas y agentes) en tu disco duro en cualquier momento.
