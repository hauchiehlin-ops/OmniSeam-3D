#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def bump_semver(current: str, part: str = "patch") -> str:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)", current)
    if not match:
        return "1.0.1"
    major, minor, patch = map(int, match.groups())
    
    if part == "major":
        major += 1
        minor = 0
        patch = 0
    elif part == "minor":
        minor += 1
        patch = 0
    else:  # default patch
        patch += 1
        
    return f"{major}.{minor}.{patch}"

def main():
    part = sys.argv[1].lower() if len(sys.argv) > 1 and sys.argv[1].lower() in ["major", "minor", "patch"] else "patch"
    
    # 1. Update frontend/package.json
    pkg_json_path = ROOT / "frontend" / "package.json"
    with open(pkg_json_path, "r", encoding="utf-8") as f:
        pkg_data = json.load(f)
        
    old_version = pkg_data.get("version", "1.0.0")
    new_version = bump_semver(old_version, part)
    pkg_data["version"] = new_version
    
    with open(pkg_json_path, "w", encoding="utf-8") as f:
        json.dump(pkg_data, f, indent=2)
        f.write("\n")
        
    # 2. Update frontend/src/version.ts
    version_ts_path = ROOT / "frontend" / "src" / "version.ts"
    with open(version_ts_path, "w", encoding="utf-8") as f:
        f.write(f'export const APP_VERSION = "{new_version}";\n')
        
    # 3. Update backend/app/config.py
    config_py_path = ROOT / "backend" / "app" / "config.py"
    if config_py_path.exists():
        with open(config_py_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r'VERSION:\s*str\s*=\s*"[^"]+"', f'VERSION: str = "{new_version}"', content)
        with open(config_py_path, "w", encoding="utf-8") as f:
            f.write(content)
            
    print(f"{old_version} -> {new_version}")

if __name__ == "__main__":
    main()
