#!/usr/bin/env python3
"""Regenerate only zero-byte Kenney WebP previews from the matching shipped GLB."""
import argparse
import json
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw

EDGE = 160
SCALE = 3
VIEW = np.array([1.55, 1.15, 1.45], dtype=float)
VIEW /= np.linalg.norm(VIEW)
RIGHT = np.cross([0., 1., 0.], VIEW)
RIGHT /= np.linalg.norm(RIGHT)
UP = np.cross(VIEW, RIGHT)
UP /= np.linalg.norm(UP)
LIGHT = np.array([-0.3, 0.85, 0.6], dtype=float)
LIGHT /= np.linalg.norm(LIGHT)


def faces_from_glb(source):
    scene = trimesh.load(str(source), force='scene', process=False)
    parts = []
    total = 0
    for node in scene.graph.nodes_geometry:
        matrix, geom_name = scene.graph.get(node)
        mesh = scene.geometry[geom_name]
        if not isinstance(mesh, trimesh.Trimesh) or len(mesh.faces) == 0:
            continue
        total += len(mesh.faces)
        if total > 80_000:
            raise ValueError('Too many triangles for offline thumbnail render')
        verts = trimesh.transform_points(mesh.vertices, matrix)[np.asarray(mesh.faces)]
        try:
            colors = np.asarray(mesh.visual.to_color().face_colors, dtype=np.uint8)
            if colors.shape != (len(mesh.faces), 4):
                raise ValueError('Incorrect material colors')
        except Exception:
            colors = np.tile(np.array([[195, 203, 188, 255]], dtype=np.uint8), (len(mesh.faces), 1))
        normals = np.asarray(mesh.face_normals, dtype=float) @ np.asarray(matrix[:3, :3]).T
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-8)
        parts.append((verts, colors, normals))
    if not parts:
        raise ValueError('GLB has no triangles')
    vertices = np.concatenate([part[0] for part in parts])
    if not np.isfinite(vertices).all():
        raise ValueError('Non-finite vertex coordinate')
    return vertices, np.concatenate([part[1] for part in parts]), np.concatenate([part[2] for part in parts])


def render(source, output):
    triangles, colors, normals = faces_from_glb(source)
    projected = np.stack([triangles @ RIGHT, triangles @ UP], axis=-1)
    minimum = projected.min(axis=(0, 1))
    maximum = projected.max(axis=(0, 1))
    extent = max(maximum - minimum)
    if extent <= 1e-8:
        raise ValueError('Degenerate model projection')
    size = EDGE * SCALE
    factor = (size * .8) / extent
    projected = (projected - (minimum + maximum) / 2) * factor
    projected[..., 0] += size / 2
    projected[..., 1] = size / 2 - projected[..., 1]
    depth = (triangles @ VIEW).mean(axis=1)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas, 'RGBA')
    for index in np.argsort(depth):
        rgba = colors[index].astype(float)
        shade = .64 + .32 * max(0., float(np.dot(normals[index], LIGHT)))
        rgba[:3] = np.clip(rgba[:3] * shade, 0, 255)
        if rgba[3] < 8:
            continue
        draw.polygon([tuple(point.tolist()) for point in projected[index]], fill=tuple(rgba.astype('uint8')))
    if not canvas.getbbox():
        raise ValueError('Renderer produced a blank preview')
    canvas = canvas.resize((EDGE, EDGE), Image.Resampling.LANCZOS)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, 'WEBP', quality=76, method=6)
    if output.stat().st_size < 50:
        raise ValueError('Invalid generated WebP size')
    return {'file': str(output), 'bytes': output.stat().st_size, 'triangles': int(triangles.shape[0])}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--report', default='')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    root = Path(args.root)
    repaired = []
    for preview in sorted((root / 'public/plaza/build-kit').glob('*/thumbs/*.webp')):
        if preview.stat().st_size != 0:
            continue
        model = preview.parent.parent / (preview.stem + '.glb')
        if not model.is_file():
            raise FileNotFoundError(f'Cannot find a source GLB for {preview}')
        repaired.append({'file': str(preview), 'dryRun': True} if args.dry_run else render(model, preview))
    print(json.dumps({'count': len(repaired), 'repaired': repaired}, indent=2))
    if args.report:
        Path(args.report).write_text(json.dumps(repaired, indent=2))


if __name__ == '__main__':
    main()
