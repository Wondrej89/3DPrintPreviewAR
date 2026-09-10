import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AnalysisMode, LoadedModel, ModelTransform, PrinterProfile } from '../types';
import { heatmapMaterial } from '../shaders/heatmap';

interface Runtime {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group;
  normalMaterial: THREE.MeshStandardMaterial;
  heatmapMaterial: THREE.ShaderMaterial;
  bed?: THREE.GridHelper;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  animation: number;
}

interface Props {
  model: LoadedModel;
  mode: AnalysisMode;
  materialFactor: number;
  printer: PrinterProfile;
  placeMode: boolean;
  transform: ModelTransform;
  onTransformChange: (transform: ModelTransform) => void;
}

const applyTransform = (group: THREE.Group, transform: ModelTransform) => {
  group.quaternion.fromArray(transform.quaternion);
  group.position.fromArray(transform.position);
  group.updateMatrixWorld(true);
};

export function ModelScene(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | undefined>(undefined);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10_000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x24304a, 2.5));
    const model = props.model.root.clone(true);
    const normalMaterial = new THREE.MeshStandardMaterial({ color: 0xa8b3ff, roughness: 0.58, metalness: 0.08 });
    const shader = heatmapMaterial(props.materialFactor);
    model.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).material = normalMaterial;
    });
    applyTransform(model, props.transform);
    scene.add(model);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const runtime: Runtime = {
      renderer, scene, camera, controls, model, normalMaterial, heatmapMaterial: shader,
      raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(), animation: 0,
    };
    runtimeRef.current = runtime;

    const frameCamera = () => {
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
      camera.near = Math.max(radius / 1000, 0.001);
      camera.far = Math.max(radius * 100, 10);
      camera.position.copy(center).add(new THREE.Vector3(radius * 1.4, -radius * 2.2, radius * 1.5));
      camera.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
    };
    frameCamera();

    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const placeOnFace = (event: PointerEvent) => {
      if (!propsRef.current.placeMode) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      runtime.pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      runtime.raycaster.setFromCamera(runtime.pointer, camera);
      const hit = runtime.raycaster.intersectObject(model, true)[0];
      if (!hit?.face) return;
      const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const align = new THREE.Quaternion().setFromUnitVectors(worldNormal, new THREE.Vector3(0, 0, -1));
      const quaternion = align.multiply(model.quaternion.clone()).normalize();
      model.quaternion.copy(quaternion);
      model.position.set(0, 0, 0);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const transform: ModelTransform = {
        quaternion: quaternion.toArray(),
        position: [0, 0, -box.min.z],
      };
      propsRef.current.onTransformChange(transform);
    };
    renderer.domElement.addEventListener('pointerup', placeOnFace);
    const draw = () => {
      runtime.animation = requestAnimationFrame(draw);
      controls.update();
      renderer.render(scene, camera);
    };
    draw();

    return () => {
      cancelAnimationFrame(runtime.animation);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerup', placeOnFace);
      controls.dispose();
      normalMaterial.dispose();
      shader.dispose();
      if (runtime.bed) {
        runtime.bed.geometry.dispose();
        const bedMaterial = runtime.bed.material;
        if (Array.isArray(bedMaterial)) bedMaterial.forEach((item) => item.dispose());
        else bedMaterial.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = undefined;
    };
  }, [props.model]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    applyTransform(runtime.model, props.transform);
    const box = new THREE.Box3().setFromObject(runtime.model);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
    runtime.camera.near = Math.max(radius / 1000, 0.001);
    runtime.camera.far = Math.max(radius * 100, 10);
    runtime.camera.updateProjectionMatrix();
    runtime.controls.target.copy(center);
    runtime.controls.update();
  }, [props.transform]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.model.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        (object as THREE.Mesh).material = props.mode === 'overhang' ? runtime.heatmapMaterial : runtime.normalMaterial;
      }
    });
  }, [props.mode]);

  useEffect(() => {
    const uniform = runtimeRef.current?.heatmapMaterial.uniforms.uMaterialFactor;
    if (uniform) uniform.value = props.materialFactor;
  }, [props.materialFactor]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (runtime.bed) {
      runtime.scene.remove(runtime.bed);
      runtime.bed.geometry.dispose();
      const bedMaterial = runtime.bed.material;
      if (Array.isArray(bedMaterial)) bedMaterial.forEach((item) => item.dispose());
      else bedMaterial.dispose();
    }
    const volume = props.printer.buildVolume;
    const width = volume.shape === 'rectangular' ? volume.x : volume.diameter;
    const depth = volume.shape === 'rectangular' ? volume.y : volume.diameter;
    runtime.bed = new THREE.GridHelper(Math.max(width, depth), 12, 0x42dab0, 0x273650);
    runtime.bed.rotation.x = Math.PI / 2;
    runtime.scene.add(runtime.bed);
  }, [props.printer]);

  return <div className="scene" ref={hostRef} />;
}
