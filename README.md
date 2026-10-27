# ANTA OBRA - Dirección Facultativa e Seguimento de Obra

Plataforma integral de seguimento de obra, actas de visita semanais e informes mensuais oficiais para a **Dirección de Obra (DO)** e **Dirección de Execución de Obra (DE)** conforme aos estándares oficiais de **Vipugal** (Sociedade de Vivenda Pública de Galicia).

## 🚀 Arquitectura do Sistema

- **Frontend**: Vite + Vanilla JS + CSS moderno (Despregado en **Vercel**: [anta-obra.vercel.app](https://anta-obra.vercel.app)).
- **Backend de Documentación**: FastAPI + Python 3.11 + **LibreOffice headless** (Despregado en **Render** con Docker).
- **Base de Datos e Almacenamento**: PostgreSQL + Supabase Storage (para fotografías e PDFs anexos).

## 📄 Xeración Oficial de Documentos (DOCX = PDF)

Garante **paridade absoluta 1:1** mediante as plantillas oficiais de Word:
- **Actas de Visita**: Relleno de táboas, asistentes, reportaxe fotográfico 2x2 e sinaturas.
- **Informes Mensuais**: 13 táboas nativas de seguimento, semáforos a cor RGB, separatas A4 institucionais e concatenación de anexos en PDF.
