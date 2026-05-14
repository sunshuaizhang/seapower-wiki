"""
Sea Power texture extractor — long-lived daemon invoked by the Java backend.

Protocol
--------
Reads one JSON object per line from stdin, writes one JSON object per line to stdout.
All diagnostic output goes to stderr (not stdout, to keep the protocol clean).

Commands
--------
{"cmd": "health"}
    -> {"ok": true, "ready": true|false, "indexed": <int>}

{"cmd": "extract", "name": "<texture_name>", "out": "<absolute_path.png>"}
    -> {"ok": true, "name": "...", "path": "...", "width": W, "height": H}
       or {"ok": false, "error": "not_found"|"..." }

{"cmd": "list", "prefix": "usn_cg_"}             # optional
    -> {"ok": true, "names": ["usn_cg-47", ...]}

{"cmd": "shutdown"}
    -> {"ok": true}   then process exits

Startup
-------
Loads ./resources.assets plus any sibling sharedassets / globalgamemanagers files,
builds a name → object index of Texture2D entries.
"""

from __future__ import annotations

import io
import json
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Dict, List, Optional

try:
    import UnityPy  # type: ignore
except Exception as e:  # pragma: no cover
    sys.stderr.write(f"FATAL: UnityPy import failed: {e}\n")
    sys.exit(2)


def log(msg: str) -> None:
    sys.stderr.write(f"[extractor] {msg}\n")
    sys.stderr.flush()


def write_response(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.write("\n")
    sys.stdout.flush()


class TextureIndex:
    """Builds and serves a name → Texture2D object lookup across all loaded .assets files."""

    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        # name → (object, source_path)
        self.index: Dict[str, tuple] = {}
        self.environments: List = []
        self.load_count = 0

    def load(self) -> None:
        """Load the main assets files and build the texture index."""
        t0 = time.time()
        # Files to scan. Order matters only if two textures share a name — last one wins.
        candidates = [
            "resources.assets",
            "sharedassets1.assets",
            "sharedassets2.assets",
            "sharedassets0.assets",
            "globalgamemanagers.assets",
        ]
        for fname in candidates:
            path = self.data_dir / fname
            if not path.exists():
                continue
            try:
                env = UnityPy.load(str(path))
                self.environments.append(env)
                self._ingest(env, fname)
                self.load_count += 1
                log(f"loaded {fname}")
            except Exception as e:
                log(f"warn: could not load {fname}: {e}")
        log(f"indexed {len(self.index)} textures from {self.load_count} files in {time.time() - t0:.1f}s")

    def _ingest(self, env, source: str) -> None:
        for obj in env.objects:
            if obj.type.name != "Texture2D":
                continue
            try:
                data = obj.read()
                name = getattr(data, "m_Name", None) or getattr(data, "name", None)
                if not name:
                    continue
                self.index[name] = (obj, source)
            except Exception:
                # Some texture entries fail to deserialize; skip them quietly.
                continue

    def exists(self, name: str) -> bool:
        return name in self.index

    def names(self, prefix: Optional[str] = None) -> List[str]:
        if not prefix:
            return sorted(self.index.keys())
        return sorted(k for k in self.index if k.startswith(prefix))

    def extract(self, name: str, out_path: Path) -> dict:
        obj_tuple = self.index.get(name)
        if obj_tuple is None:
            return {"ok": False, "error": "not_found", "name": name}
        obj, source = obj_tuple
        try:
            data = obj.read()
            img = data.image  # PIL.Image
            out_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(str(out_path), format="PNG", optimize=True)
            return {
                "ok": True,
                "name": name,
                "path": str(out_path),
                "width": img.size[0],
                "height": img.size[1],
                "source": source,
            }
        except Exception as e:
            return {"ok": False, "error": f"decode_failed: {e}", "name": name}


def main() -> None:
    if len(sys.argv) < 2:
        sys.stderr.write("usage: unity_extractor.py <Sea_Power_Data_dir>\n")
        sys.exit(2)
    data_dir = Path(sys.argv[1])
    if not data_dir.is_dir():
        sys.stderr.write(f"not a directory: {data_dir}\n")
        sys.exit(2)

    idx = TextureIndex(data_dir)
    # Announce startup immediately so the caller knows the process is alive.
    write_response({"ok": True, "event": "starting", "data_dir": str(data_dir)})
    try:
        idx.load()
    except Exception as e:
        write_response({"ok": False, "event": "load_failed", "error": str(e)})
        sys.exit(3)
    write_response({"ok": True, "event": "ready", "indexed": len(idx.index)})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception as e:
            write_response({"ok": False, "error": f"bad_json: {e}"})
            continue

        cmd = req.get("cmd")
        try:
            if cmd == "health":
                write_response({"ok": True, "ready": True, "indexed": len(idx.index)})
            elif cmd == "exists":
                write_response({"ok": True, "exists": idx.exists(req.get("name", ""))})
            elif cmd == "list":
                write_response({"ok": True, "names": idx.names(req.get("prefix"))})
            elif cmd == "extract":
                name = req.get("name", "")
                out = req.get("out", "")
                if not name or not out:
                    write_response({"ok": False, "error": "name_and_out_required"})
                    continue
                write_response(idx.extract(name, Path(out)))
            elif cmd == "shutdown":
                write_response({"ok": True, "event": "bye"})
                return
            else:
                write_response({"ok": False, "error": f"unknown_cmd: {cmd}"})
        except Exception as e:
            write_response({"ok": False, "error": f"exception: {e}", "trace": traceback.format_exc()})


if __name__ == "__main__":
    # Ensure UTF-8 stdin/stdout regardless of Windows codepage.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stdin.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    main()
