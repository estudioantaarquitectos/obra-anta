import os
import sys
import json
import re
from pathlib import Path

def sync_memo():
    workspace_dir = Path(__file__).resolve().parent.parent
    memo_dir = workspace_dir / 'Memo'
    memo_dir.mkdir(parents=True, exist_ok=True)
    memo_file = memo_dir / 'memo.md'

    # Read existing memo if present
    existing_text = ""
    if memo_file.exists():
        with open(memo_file, 'r', encoding='utf-8') as f:
            existing_text = f.read()

    # Parse existing conversations
    pattern = r'(## Conversación #(\d+).*?)(?=\n## Conversación #\d+|\Z)'
    existing_matches = re.findall(pattern, existing_text, re.DOTALL)
    existing_convs = {}
    for full_block, num_str in existing_matches:
        num = int(num_str)
        cleaned = full_block.strip()
        if not cleaned.endswith('---'):
            cleaned += '\n\n---'
        existing_convs[num] = cleaned

    app_data_dir = os.environ.get('USERPROFILE', '')
    brain_dir = Path(app_data_dir) / '.gemini' / 'antigravity-ide' / 'brain'

    # Locate transcripts
    transcript_files = list(brain_dir.glob('*/.system_generated/logs/transcript_full.jsonl'))
    if not transcript_files:
        transcript_files = list(brain_dir.glob('*/.system_generated/logs/transcript.jsonl'))

    if not transcript_files:
        print("No transcript files found.")
        return

    transcript_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    latest_transcript = transcript_files[0]

    turns = []
    current_user = None
    current_user_time = None
    current_model_responses = []

    with open(latest_transcript, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
            except Exception:
                continue

            stype = data.get('type')
            source = data.get('source')
            content = data.get('content', '')
            timestamp = data.get('timestamp') or data.get('time') or ''

            if stype == 'USER_INPUT' and source == 'USER_EXPLICIT':
                if current_user is not None:
                    turns.append({
                        'user': current_user,
                        'time': current_user_time,
                        'model': '\n\n'.join(current_model_responses).strip()
                    })
                    current_model_responses = []

                match = re.search(r'<USER_REQUEST>(.*?)</USER_REQUEST>', content, re.DOTALL)
                clean_text = match.group(1).strip() if match else content.strip()
                current_user = clean_text
                current_user_time = timestamp
            elif stype == 'PLANNER_RESPONSE' and source == 'MODEL':
                if content and content.strip():
                    current_model_responses.append(content.strip())

    if current_user is not None:
        turns.append({
            'user': current_user,
            'time': current_user_time,
            'model': '\n\n'.join(current_model_responses).strip()
        })

    # Only append if turns is not empty and not already there
    header = (
        "# MEMO - Registro Literal de Conversaciones\n\n"
        "> **Agente MEMO**: Registro cronológico y literal de las conversaciones entre el Usuario y Antigravity en el proyecto **ANTA OBRA**.\n"
        "> Este documento se actualiza de manera continua y debe ser leído al iniciar el proyecto para estar al tanto de las últimas conversaciones, acuerdos técnicos y decisiones de diseño.\n\n"
        "---\n\n"
    )

    next_idx = max(existing_convs.keys()) + 1 if existing_convs else 1

    # Check if latest turn is already in existing conversations
    for turn in turns:
        # Check if user prompt is already recorded
        prompt = turn['user']
        if not any(prompt in block for block in existing_convs.values()):
            time_part = f" ({turn['time']})" if turn.get('time') else ""
            conv_block = f"## Conversación #{next_idx}{time_part}\n\n### 👤 Usuario:\n\n{turn['user']}\n\n### 🤖 Antigravity:\n\n"
            if turn['model']:
                conv_block += f"{turn['model']}\n\n---"
            else:
                conv_block += "*(Instrucción agrupada / procesada en la siguiente respuesta)*\n\n---"
            existing_convs[next_idx] = conv_block
            next_idx += 1

    # Write out safely
    output = header
    for num in sorted(existing_convs.keys()):
        output += existing_convs[num] + '\n\n'

    with open(memo_file, 'w', encoding='utf-8') as f:
        f.write(output)

    print(f"Memo sincronizado con éxito en: {memo_file} (Total: {len(existing_convs)} conversaciones)")

if __name__ == '__main__':
    sync_memo()
