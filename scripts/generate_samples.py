#!/usr/bin/env python3
"""
Generates the small sample models bundled with the app (frontend/public/samples).

They let App Store reviewers and new users try inspection, repair and
conversion entirely offline without bringing their own files.

  * holey_box.stl      binary STL, box with two missing patches (open holes)
  * l_bracket.obj      closed L-bracket made of quads
  * stepped_block.step faceted B-Rep STEP (CARTESIAN_POINT + POLY_LOOP)

All meshes are built from exposed faces of a voxel grid, so vertices are
shared and the closed shapes are watertight. Usage: python3 scripts/generate_samples.py
"""
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "samples"

# (normal axis, direction, quad corner offsets in CCW order seen from outside)
FACES = {
    (+1, 0, 0): [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)],
    (-1, 0, 0): [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)],
    (0, +1, 0): [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)],
    (0, -1, 0): [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)],
    (0, 0, +1): [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)],
    (0, 0, -1): [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)],
}


def voxel_surface(cells, size):
    """Returns (vertices, quads) for the exposed faces of a set of unit cells."""
    cells = set(cells)
    index = {}
    vertices = []
    quads = []

    def vid(p):
        if p not in index:
            index[p] = len(vertices)
            vertices.append(tuple(c * size for c in p))
        return index[p]

    for (x, y, z) in sorted(cells):
        for n, corners in FACES.items():
            if (x + n[0], y + n[1], z + n[2]) in cells:
                continue
            quads.append([vid((x + dx, y + dy, z + dz)) for dx, dy, dz in corners])
    return vertices, quads


def box_cells(x0, x1, y0, y1, z0, z1):
    return {(x, y, z) for x in range(x0, x1) for y in range(y0, y1) for z in range(z0, z1)}


def triangles(quads):
    for a, b, c, d in quads:
        yield (a, b, c)
        yield (a, c, d)


def normal(v0, v1, v2):
    ux, uy, uz = (v1[i] - v0[i] for i in range(3))
    wx, wy, wz = (v2[i] - v0[i] for i in range(3))
    nx, ny, nz = uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx
    length = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1.0
    return nx / length, ny / length, nz / length


def write_binary_stl(path, vertices, tris, name):
    header = name.encode("ascii")[:80].ljust(80, b" ")
    with open(path, "wb") as f:
        f.write(header)
        f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            v0, v1, v2 = vertices[a], vertices[b], vertices[c]
            f.write(struct.pack("<3f", *normal(v0, v1, v2)))
            for v in (v0, v1, v2):
                f.write(struct.pack("<3f", *v))
            f.write(b"\x00\x00")


def write_obj(path, vertices, quads, name):
    with open(path, "w", encoding="ascii") as f:
        f.write(f"# {name} - OmniSeam 3D sample model (units: mm)\n")
        f.write(f"o {name}\n")
        for v in vertices:
            f.write("v {:.4f} {:.4f} {:.4f}\n".format(*v))
        for q in quads:
            f.write("f " + " ".join(str(i + 1) for i in q) + "\n")


def write_faceted_step(path, vertices, quads, name):
    lines = []
    eid = 100
    point_ids = []
    for v in vertices:
        lines.append(f"#{eid}=CARTESIAN_POINT('',({v[0]:.4f},{v[1]:.4f},{v[2]:.4f}));")
        point_ids.append(eid)
        eid += 1
    face_ids = []
    for q in quads:
        loop = eid
        lines.append(f"#{loop}=POLY_LOOP('',(" + ",".join(f"#{point_ids[i]}" for i in q) + "));")
        lines.append(f"#{loop + 1}=FACE_OUTER_BOUND('',#{loop},.T.);")
        lines.append(f"#{loop + 2}=FACE('',(#{loop + 1}));")
        face_ids.append(loop + 2)
        eid += 3
    shell = eid
    lines.append(f"#{shell}=CLOSED_SHELL('',(" + ",".join(f"#{i}" for i in face_ids) + "));")
    lines.append(f"#{shell + 1}=FACETED_BREP('{name}',#{shell});")
    with open(path, "w", encoding="ascii") as f:
        f.write("ISO-10303-21;\nHEADER;\n")
        f.write(f"FILE_DESCRIPTION(('OmniSeam 3D sample: {name}'),'2;1');\n")
        f.write(f"FILE_NAME('{path.name}','2026-11-14T00:00:00',('OmniSeam 3D'),(''),'generate_samples.py','','');\n")
        f.write("FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));\nENDSEC;\nDATA;\n")
        f.write("\n".join(lines))
        f.write("\nENDSEC;\nEND-ISO-10303-21;\n")


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # 1. Box (40 x 30 x 20 mm) with two missing surface patches -> open holes.
    v, q = voxel_surface(box_cells(0, 8, 0, 6, 0, 4), 5.0)
    top = [i for i, quad in enumerate(q) if all(v[k][2] == 20.0 for k in quad)]
    side = [i for i, quad in enumerate(q) if all(v[k][0] == 40.0 for k in quad)]
    drop = {top[len(top) // 2], top[len(top) // 2 + 1], side[len(side) // 3]}
    q = [quad for i, quad in enumerate(q) if i not in drop]
    write_binary_stl(OUT / "holey_box.stl", v, list(triangles(q)), "OmniSeam sample: holey box")

    # 2. L-bracket: 60 x 20 x 6 base plate + 6 x 20 x 40 upright.
    cells = box_cells(0, 30, 0, 10, 0, 3) | box_cells(0, 3, 0, 10, 3, 20)
    v, q = voxel_surface(cells, 2.0)
    write_obj(OUT / "l_bracket.obj", v, q, "l_bracket")

    # 3. Stepped block (three steps) as faceted STEP.
    cells = box_cells(0, 6, 0, 4, 0, 2) | box_cells(0, 4, 0, 4, 2, 4) | box_cells(0, 2, 0, 4, 4, 6)
    v, q = voxel_surface(cells, 5.0)
    write_faceted_step(OUT / "stepped_block.step", v, q, "stepped_block")

    for p in sorted(OUT.iterdir()):
        if not p.name.startswith("._"):
            print(f"{p.name:22s} {p.stat().st_size:>8d} bytes")


if __name__ == "__main__":
    main()
