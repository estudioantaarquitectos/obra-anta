# Reglas del Proyecto ANTA OBRA

## Agente MEMO (Memoria y Contexto Continuo)
1. **Lectura obligatoria al iniciar sesión**:
   - Al iniciar la sesión o al recibir el primer mensaje en el proyecto, debes leer obligatoriamente el archivo `Memo/memo.md` (ubicado en `f:/Onedrive/ANTIGRAVITY/ANTA_OBRA/Memo/memo.md` o `g:/OneDrive/ANTIGRAVITY/ANTA_OBRA/Memo/memo.md`) para estar al tanto de todas las conversaciones previas, decisiones técnicas, instrucciones de diseño y solicitudes del usuario.
2. **Registro continuo de conversaciones**:
   - Todas las conversaciones literales entre el usuario y Antigravity deben mantenerse registradas en `Memo/memo.md` dentro de la carpeta `Memo/`.
   - Puedes ejecutar `python Memo/sync_memo.py` o editar `Memo/memo.md` para anexar las nuevas conversaciones de forma literal.

## Agente DOCX / PDF (Plantillas y Exportación Oficial)
1. **Manejo exclusivo de plantillas DOCX y exportación PDF**:
   - Gestiona de forma centralizada las plantillas oficiales de Word:
     - `ejemplo_modificado_acta_semanal.docx` (para Actas Semanales).
     - `ejemplo_modificado_informe_mensual.docx` (para Informes Mensuales).
   - Administra los scripts de backend asociados (`src/py/generar_acta.py`, `src/py/generar_informe.py`, `src/py/generar_separata.py`).
2. **Paridad absoluta e inquebrantable (DOCX = PDF)**:
   - **NO habrá diferencia entre los archivos DOCX y los PDFs generados.**
   - El PDF debe ser obligatoriamente la conversión 1:1 exacta del DOCX generado a partir de la plantilla oficial.
   - Ambos formatos deben presentar idéntica composición, tipografía, cabeceras oficiales de Vipugal, tablas, alineaciones, reportajes fotográficos y separatas.
   - Quedan prohibidas vías de exportación divergentes o sintéticas que alteren el diseño en un formato respecto al otro.

## Agente CONECTOR (Enlace entre Antigravity y la Web Real)
1. **Enlace operativo y arquitectónico**:
   - Actúa como puente entre el entorno de desarrollo asistido en Antigravity y los despliegues de la aplicación en la web real.
   - Diseña, audita e implementa la transición de la persistencia local (`localStorage` / mocks) a bases de datos de producción reales (PostgreSQL, Supabase, Firestore, PocketBase, etc.).
2. **Orquestación de servicios en producción**:
   - Gestiona las estrategias de hosting (Vercel, Netlify, Cloudflare Pages, Firebase o servidor VPS dedicado).
   - Asegura la infraestructura remota para la ejecución de los generadores DOCX y exportadores PDF en backend con paridad 1:1.
   - Administra la autenticación multi-usuario con roles de obra, almacenamiento en la nube para fotos y PDFs, y sincronización en tiempo real.

