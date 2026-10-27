---
name: memo
description: Agente MEMO que gestiona, lee y actualiza el registro literal de conversaciones entre el usuario y Antigravity en Memo/memo.md. Debe ejecutarse al inicio de la sesión para recordar el historial del proyecto.
---

# Agente MEMO

Este agente tiene como cometido registrar y recordar todas las conversaciones literales mantenidas en el proyecto **ANTA OBRA**.

## Responsabilidades
1. **Lectura inicial**: Al comenzar a trabajar en el proyecto, consultar `Memo/memo.md` para conocer el contexto de las decisiones y solicitudes previas.
2. **Registro literal**: Registrar en `Memo/memo.md` las interacciones entre el Usuario y Antigravity.
3. **Herramienta de sincronización**: Ejecutar `python Memo/sync_memo.py` para actualizar de forma automatizada el archivo `Memo/memo.md` a partir de los logs de la sesión.
