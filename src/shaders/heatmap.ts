import * as THREE from 'three';

export function heatmapMaterial(materialFactor = 1) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uMaterialFactor: { value: materialFactor } },
    vertexShader: `
      varying vec3 worldNormal;
      void main() {
        worldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 worldNormal;
      uniform float uMaterialFactor;
      void main() {
        // dot >= 0 includes upward and vertical surfaces: both are safe.
        // Only downward-facing normals develop increasing risk.
        float downward = max(0.0, -dot(normalize(worldNormal), vec3(0.0, 0.0, 1.0)));
        float risk = smoothstep(0.15 / uMaterialFactor, 0.72 / uMaterialFactor, downward);
        vec3 safe = vec3(0.25, 0.85, 0.55);
        vec3 warning = vec3(1.0, 0.72, 0.12);
        vec3 critical = vec3(1.0, 0.1, 0.04);
        vec3 color = risk < 0.5
          ? mix(safe, warning, risk * 2.0)
          : mix(warning, critical, (risk - 0.5) * 2.0);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}
