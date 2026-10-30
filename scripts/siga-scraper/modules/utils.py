import os
import json
import time
import datetime
import subprocess
import hashlib

DIAS = {
    "Lunes": 0, "Martes": 1, "Miércoles": 2, 
    "Jueves": 3, "Viernes": 4, "Sábado": 5, "Domingo": 6,
}

DIAS_INV = {v: k for k, v in DIAS.items()}

def atomic_write(filepath, data, encoding="utf-8"):
    """Escribe un JSON de forma atómica."""
    write_if_modified(filepath, data, encoding=encoding)

def write_if_modified(filepath, data, old_hash=None, encoding="utf-8"):
    """
    Escribe el archivo solo si el contenido (hash) difiere del anterior.
    Retorna: (content_hash, written_boolean)
    """
    json_content = json.dumps(data, sort_keys=True, ensure_ascii=False)
    content_bytes = json_content.encode(encoding)
    new_hash = hashlib.md5(content_bytes).hexdigest()
    
    if old_hash and new_hash == old_hash:
        return new_hash, False

    temp_path = filepath + ".tmp"
    with open(temp_path, "w+", encoding=encoding) as f:
        f.write(json_content)
    os.replace(temp_path, filepath)
    
    return new_hash, True

def ensure_directories(base_dir):
    """Asegura que exista la ruta de datos públicos (public/data)."""
    data_path = os.path.join(base_dir, "public", "data")
    os.makedirs(data_path, exist_ok=True)
    return data_path

def get_git_revision_short_hash():
    try:
        return subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD']).decode('ascii').strip()
    except:
        return "unknown"
