import * as THREE from 'three';
import type { BuildVolume, Dimensions, MeshSummary, ModelTransform } from '../types';

export function geometryDimensions(geometries: THREE.BufferGeometry[], scale = 1): Dimensions {
  const box = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  });
  const size = box.getSize(new THREE.Vector3()).multiplyScalar(scale);
  return { x: size.x, y: size.y, z: size.z };
}

export function transformedPoints(
  geometries: THREE.BufferGeometry[],
  transform: ModelTransform,
): THREE.Vector3[] {
  const quaternion = new THREE.Quaternion(...transform.quaternion);
  const position = new THREE.Vector3(...transform.position);
  const points: THREE.Vector3[] = [];
  geometries.forEach((geometry) => {
    const attribute = geometry.attributes.position;
    for (let index = 0; index < attribute.count; index += 1) {
      points.push(new THREE.Vector3().fromBufferAttribute(attribute, index).applyQuaternion(quaternion).add(position));
    }
  });
  return points;
}

export function fitPrinter(points: THREE.Vector3[], volume: BuildVolume) {
  const box = new THREE.Box3().setFromPoints(points);
  const size = box.getSize(new THREE.Vector3());
  const issues: string[] = [];
  if (size.z > volume.z || box.min.z < -1e-4) issues.push('Z');
  if (volume.shape === 'rectangular') {
    if (size.x > volume.x) issues.push('X');
    if (size.y > volume.y) issues.push('Y');
  } else {
    // The model may be centered on the bed, so test its actual vertices around
    // the footprint bounding-box center rather than only its rectangular size.
    const center = box.getCenter(new THREE.Vector3());
    if (points.some((point) => Math.hypot(point.x - center.x, point.y - center.y) > volume.diameter / 2)) {
      issues.push('kruhová podložka');
    }
  }
  return { fits: issues.length === 0, issues };
}

export function overhangAngle(normal: THREE.Vector3) {
  return THREE.MathUtils.radToDeg(
    Math.acos(THREE.MathUtils.clamp(normal.clone().normalize().dot(new THREE.Vector3(0, 0, 1)), -1, 1)),
  );
}

export function validateMesh(positions: ArrayLike<number>): MeshSummary {
  const edges = new Map<string, number>();
  let degenerateTriangles = 0;
  const key = (point: number[]) => point.map((value) => Math.round(value * 1e5)).join(',');
  for (let offset = 0; offset < positions.length; offset += 9) {
    const vertices = [0, 1, 2].map((vertex) => [
      positions[offset + vertex * 3], positions[offset + vertex * 3 + 1], positions[offset + vertex * 3 + 2],
    ]);
    const triangle = new THREE.Triangle(
      new THREE.Vector3(vertices[0][0], vertices[0][1], vertices[0][2]),
      new THREE.Vector3(vertices[1][0], vertices[1][1], vertices[1][2]),
      new THREE.Vector3(vertices[2][0], vertices[2][1], vertices[2][2]),
    );
    if (triangle.getArea() < 1e-9) degenerateTriangles += 1;
    ([[0, 1], [1, 2], [2, 0]] as const).forEach(([a, b]) => {
      const edge = [key(vertices[a]), key(vertices[b])].sort().join('|');
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    });
  }
  const boundaryEdges = [...edges.values()].filter((count) => count === 1).length;
  const nonManifoldEdges = [...edges.values()].filter((count) => count > 2).length;
  return {
    status: degenerateTriangles || nonManifoldEdges ? 'Error' : boundaryEdges ? 'Warning' : 'OK',
    boundaryEdges,
    nonManifoldEdges,
    degenerateTriangles,
  };
}
