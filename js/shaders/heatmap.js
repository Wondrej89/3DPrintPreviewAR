import * as THREE from 'three';

export function heatmapMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `attribute float risk;
attribute float contact;
varying float vRisk;
varying float vContact;
void main(){
  vRisk=risk;
  vContact=contact;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`,
    fragmentShader: `varying float vRisk;
varying float vContact;
void main(){
  vec3 safe=vec3(.12,.75,.55),warn=vec3(1.,.72,.05),bad=vec3(.95,.15,.12),bed=vec3(.12,.48,1.);
  vec3 riskColor=vRisk<.5?mix(safe,warn,vRisk*2.):mix(warn,bad,(vRisk-.5)*2.);
  gl_FragColor=vec4(mix(riskColor,bed,step(.5,vContact)),1.);
}`
  });
}
