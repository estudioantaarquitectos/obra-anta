---
name: docx-pdf
description: Agente especializado en la gestión exclusiva de plantillas DOCX y exportación a PDF para ANTA OBRA. Garantiza paridad absoluta 1:1 entre DOCX y PDF sin discrepancias.
---

# Agente DOCX / PDF (Plantillas y Exportación Oficial)

Este agente tiene como cometido exclusivo gestionar las plantillas oficiales de Word (`.docx`), la inyección de datos del sistema y la exportación idéntica a `.pdf` en el proyecto **ANTA OBRA**.

## Regla de Oro
> **NO HABRÁ DIFERENCIA ENTRE LOS DOCX Y LOS PDFs.**
> El archivo PDF generado es la conversión 1:1 directa del documento DOCX generado a partir de la plantilla oficial. Mismo contenido, misma tipografía, mismos márgenes, mismas tablas, mismos encabezados institucionales de Vipugal y mismas separatas de anexos.

---

## Responsabilidades del Agente

1. **Gestión de Plantillas Oficiales**:
   - Mantener y versionar las plantillas base oficiales:
     - `ejemplo_modificado_acta_semanal.docx` (Plantilla oficial para Actas Semanales; espejo: `plantilla_acta.docx`).
     - `ejemplo_modificado_informe_mensual.docx` (Plantilla oficial para Informes Mensuales; espejo: `plantilla_informe.docx`).
     - Futuras plantillas oficiales (Notas de obra, certificaciones, etc.).
   - Asegurar que las plantillas conserven los logotipos institucionales en alta resolución, sin bordes parásitos de página (`pgBorders`) ni estilos redundantes.

2. **Inyección de Datos y Generación Unificada**:
   - La generación se centraliza en los motores Python de backend:
     - `src/py/generar_acta.py`: Rellena `plantilla_acta.docx`.
     - `src/py/generar_informe.py`: Rellena `plantilla_informe.docx`.
     - `src/py/generar_separata.py`: Genera separatas/portadas institucionales A4 para anexos documentales.
   - Queda prohibida la existencia de generadores paralelos o divergentes (como maquetaciones sintéticas en librerías cliente JS) que produzcan un DOCX con diseño diferente al PDF.

3. **Conversión y Exportación a PDF**:
   - La conversión a PDF se realiza a través del backend mediante Word COM (`win32com.client` / `docx2pdf`), garantizando el renderizado nativo idéntico al documento Word abierto en Microsoft Word.
   - Inserción intercalada de separatas institucionales oficiales previas a cada acta semanal o documento complementario anexo.

4. **Protocolo de Pruebas y Validación**:
   - Cada modificación en una plantilla o en el generador requiere validar:
     1. Generación de `.docx` (descarga y apertura correcta).
     2. Generación de `.pdf` (conversión fiel y descarga correcta).
     3. Cotejo visual directo: el PDF debe ser idéntico al DOCX.
