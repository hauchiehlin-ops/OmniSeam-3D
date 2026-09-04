import json
import os
from typing import Dict, Any

_dir = os.path.dirname(__file__)

with open(os.path.join(_dir, "en.json"), "r", encoding="utf-8") as f:
    EN_MESSAGES = json.load(f)

with open(os.path.join(_dir, "zh_TW.json"), "r", encoding="utf-8") as f:
    ZH_TW_MESSAGES = json.load(f)


def get_i18n(lang: str = "en") -> Dict[str, Any]:
    if lang.lower() in ["zh", "zh-tw", "zh_tw", "zhtw", "tw"]:
        return ZH_TW_MESSAGES
    return EN_MESSAGES


def get_text(key_path: str, lang: str = "en", default: str = "") -> str:
    messages = get_i18n(lang)
    parts = key_path.split(".")
    val = messages
    for part in parts:
        if isinstance(val, dict) and part in val:
            val = val[part]
        else:
            return default or key_path
    return str(val) if isinstance(val, (str, int, float)) else default
