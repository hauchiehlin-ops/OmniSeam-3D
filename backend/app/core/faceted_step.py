"""
Pure-Python reader for faceted STEP files (ISO 10303-21 with POLY_LOOP faces).

OpenCASCADE (and therefore cascadio and FreeCAD) only transfers STEP shapes
that are attached to a product / shape-representation structure. Minimal
faceted exports — a bare FACETED_BREP / CLOSED_SHELL made of POLY_LOOP faces,
as written by many mesh tools and by OmniSeam's own sample generator — have
no such structure, so OCCT reports "Failed to transfer STEP data" and the
pipeline used to fail with "Unable to parse CAD file". The on-device engine
reads these files, so the cloud node falls back to this reader.

Only planar polygon faces are supported (that is all a faceted STEP holds).
Inner face bounds (holes inside a single face) are ignored; faceted exporters
practically never emit them.
"""
import re
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import trimesh

_ENTITY = re.compile(r"#(\d+)\s*=\s*([A-Z0-9_]+)\s*\((.*)\)\s*$", re.S)
_REF = re.compile(r"#(\d+)")
_NUMBER = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def _entities(text: str) -> Dict[int, tuple]:
    """Parses the DATA section into {id: (TYPE, raw_args)}."""
    start = text.find("DATA;")
    end = text.rfind("ENDSEC;")
    body = text[start + 5:end] if start >= 0 else text
    # Strings may contain ';' only in theory; faceted exports never do.
    result: Dict[int, tuple] = {}
    for stmt in body.split(";"):
        m = _ENTITY.match(stmt.strip())
        if m:
            result[int(m.group(1))] = (m.group(2), m.group(3))
    return result


def _strip_name(args: str) -> str:
    """Drops the leading quoted name argument: "'name',(...)" -> "(...)"."""
    return re.sub(r"^\s*'(?:[^']|'')*'\s*,", "", args, count=1)


def _polygon_normal(points: np.ndarray) -> np.ndarray:
    """Newell's method: robust normal for any planar (even concave) polygon."""
    nxt = np.roll(points, -1, axis=0)
    n = np.array([
        np.sum((points[:, 1] - nxt[:, 1]) * (points[:, 2] + nxt[:, 2])),
        np.sum((points[:, 2] - nxt[:, 2]) * (points[:, 0] + nxt[:, 0])),
        np.sum((points[:, 0] - nxt[:, 0]) * (points[:, 1] + nxt[:, 1])),
    ])
    length = np.linalg.norm(n)
    return n / length if length > 0 else n


def _triangulate(points: np.ndarray) -> List[List[int]]:
    """Ear-clipping triangulation of one planar polygon; keeps the loop's winding."""
    count = len(points)
    if count < 3:
        return []
    if count == 3:
        return [[0, 1, 2]]

    normal = _polygon_normal(points)
    if not np.any(normal):
        return [[0, i, i + 1] for i in range(1, count - 1)]
    # Project onto the polygon plane; the loop is counter-clockwise around `normal`.
    axis_u = np.cross(normal, [1.0, 0.0, 0.0])
    if np.linalg.norm(axis_u) < 1e-6:
        axis_u = np.cross(normal, [0.0, 1.0, 0.0])
    axis_u /= np.linalg.norm(axis_u)
    axis_v = np.cross(normal, axis_u)
    flat = np.stack([points @ axis_u, points @ axis_v], axis=1)

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def inside(p, a, b, c):
        return cross(a, b, p) >= 0 and cross(b, c, p) >= 0 and cross(c, a, p) >= 0

    remaining = list(range(count))
    triangles: List[List[int]] = []
    guard = 0
    while len(remaining) > 3 and guard < count * count:
        guard += 1
        clipped = False
        for k in range(len(remaining)):
            i0, i1, i2 = remaining[k - 1], remaining[k], remaining[(k + 1) % len(remaining)]
            a, b, c = flat[i0], flat[i1], flat[i2]
            if cross(a, b, c) <= 1e-12:
                continue  # reflex or collinear corner
            if any(inside(flat[j], a, b, c) for j in remaining if j not in (i0, i1, i2)):
                continue
            triangles.append([i0, i1, i2])
            remaining.pop(k)
            clipped = True
            break
        if not clipped:
            break
    if len(remaining) == 3:
        triangles.append(remaining[:])
    elif len(remaining) > 3:
        # Degenerate input: finish with a fan so no face is silently dropped.
        triangles.extend([remaining[0], remaining[i], remaining[i + 1]] for i in range(1, len(remaining) - 1))
    return triangles


def load_faceted_step(file_path: Path) -> Optional[trimesh.Trimesh]:
    """Returns a mesh for a faceted STEP file, or None if it holds no POLY_LOOP faces."""
    text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
    if "POLY_LOOP" not in text:
        return None
    ents = _entities(text)

    def point(ref: int) -> Optional[List[float]]:
        ent = ents.get(ref)
        if not ent or ent[0] != "CARTESIAN_POINT":
            return None
        coords = [float(x) for x in _NUMBER.findall(_strip_name(ent[1]))]
        return coords[:3] if len(coords) >= 3 else None

    def loop_points(ref: int) -> Optional[np.ndarray]:
        ent = ents.get(ref)
        if not ent or ent[0] != "POLY_LOOP":
            return None
        pts = [point(int(r)) for r in _REF.findall(ent[1])]
        pts = [p for p in pts if p is not None]
        # Drop a closing point that repeats the first one.
        if len(pts) > 3 and np.allclose(pts[0], pts[-1]):
            pts = pts[:-1]
        return np.array(pts, dtype=float) if len(pts) >= 3 else None

    # Outer loops of FACE / FACE_SURFACE / ADVANCED_FACE entities; if there are
    # no faces (unusual), use every POLY_LOOP.
    loops: List[int] = []
    for _, (kind, args) in ents.items():
        if kind == "FACE_OUTER_BOUND":
            refs = _REF.findall(args)
            if refs:
                loops.append(int(refs[0]))
    if not loops:
        loops = [i for i, (kind, _) in ents.items() if kind == "POLY_LOOP"]

    vertices: List[np.ndarray] = []
    faces: List[List[int]] = []
    offset = 0
    for ref in loops:
        pts = loop_points(ref)
        if pts is None:
            continue
        for tri in _triangulate(pts):
            faces.append([offset + t for t in tri])
        vertices.append(pts)
        offset += len(pts)

    if not faces:
        return None
    mesh = trimesh.Trimesh(vertices=np.vstack(vertices), faces=np.array(faces), process=True)
    mesh.merge_vertices()
    return mesh if len(mesh.faces) > 0 else None
