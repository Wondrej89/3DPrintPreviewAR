import * as THREE from 'three';

export function overhangRisk(normalZ, factor = 1) {
  if (normalZ >= 0) return 0;
  return Math.min(1, Math.max(0, -normalZ) * factor);
}

export const overhangAngle = nz => Math.acos(Math.max(-1, Math.min(1, nz))) * 180 / Math.PI;

/** Rebuild heatmap data in world space after every orientation change. */
export function addOverhangAttribute(root, factor, contactTolerance = .1) {
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!object.isMesh || !object.geometry?.attributes.normal) return;

    // Face-level contact must not leak through vertices shared with other faces.
    if (object.geometry.index) {
      const indexed = object.geometry;
      object.geometry = indexed.toNonIndexed();
      indexed.dispose();
    }

    const geometry = object.geometry;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const risk = new Float32Array(positions.count);
    const contact = new Float32Array(positions.count);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
    const normal = new THREE.Vector3();
    const vertex = new THREE.Vector3();

    for (let i = 0; i < normals.count; i++) {
      normal.fromBufferAttribute(normals, i).applyNormalMatrix(normalMatrix);
      risk[i] = overhangRisk(normal.z, factor);
    }

    for (let i = 0; i + 2 < positions.count; i += 3) {
      let touchesBed = true;
      for (let j = 0; j < 3; j++) {
        vertex.fromBufferAttribute(positions, i + j).applyMatrix4(object.matrixWorld);
        if (vertex.z > contactTolerance) touchesBed = false;
      }
      if (!touchesBed) continue;
      for (let j = 0; j < 3; j++) {
        risk[i + j] = 0;
        contact[i + j] = 1;
      }
    }

    geometry.setAttribute('risk', new THREE.Float32BufferAttribute(risk, 1));
    geometry.setAttribute('contact', new THREE.Float32BufferAttribute(contact, 1));
  });
}
