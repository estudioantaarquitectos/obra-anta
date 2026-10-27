# Agente DOCX / PDF - Reglas de Plantillas y Exportación

## 1. Principio de Identidad Absoluta (DOCX = PDF)
- **NO habrá diferencia entre los archivos DOCX y los PDFs generados.**
- El PDF debe ser obligatoriamente el reflejo 1:1 del DOCX. Ambos formatos deben compartir idéntica composición, tipografías, encabezados, tablas, cuadrículas fotográficas, saltos de página y separatas.

## 2. Fuente Única de Generación
- Tanto la exportación a `.docx` como a `.pdf` deben servirse desde el mismo flujo basado en las plantillas oficiales de Word:
  - Actas Semanales: `ejemplo_modificado_acta_semanal.docx`
  - Informes Mensuales: `ejemplo_modificado_informe_mensual.docx`
- No se permiten rutas de exportación en cliente que fabriquen un DOCX alternativo con estilos distintos a la plantilla Word oficial.

## 3. Preservación de Plantillas
- Las plantillas base deben contener exclusivamente el encabezado y pie de página oficiales (logotipo de Vivenda Pública de Galicia, número correlativo, expediente y fecha).
- Queda prohibida la reintroducción de encabezados o pies de página secundarios de texto, así como bordes inferiores de página (`pgBorders`) o logos en baja resolución.

## 4. Verificación de Exportaciones
- Cualquier cambio técnico en la generación de actas o informes debe verificarse descargando y abriendo tanto el `.docx` como el `.pdf`, garantizando que ambos se descargan sin errores y son visualmente gemelos.
