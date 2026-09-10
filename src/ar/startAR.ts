import * as THREE from 'three';
import type { LoadedModel, ModelTransform, PrinterProfile } from '../types';

export async function startAR(model: LoadedModel, printer: PrinterProfile, transform: ModelTransform) {
  if (!navigator.xr || !await navigator.xr.isSessionSupported('immersive-ar')) {
    throw new Error('AR není na tomto zařízení nebo v tomto prohlížeči podporováno. 3D viewer zůstává dostupný.');
  }
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'local-floor'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body },
  });
  const requestHitTestSource = session.requestHitTestSource;
  if (typeof requestHitTestSource !== 'function') {
    await session.end();
    throw new Error('Hit-test není tímto WebXR prostředím podporován.');
  }

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.xr.enabled = true;
  document.body.append(renderer.domElement);
  await renderer.xr.setSession(session);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 2));
  const placement = new THREE.Group();
  const modelCoordinates = new THREE.Group();
  modelCoordinates.rotation.x = -Math.PI / 2;
  placement.add(modelCoordinates);
  const object = model.root.clone(true);
  object.quaternion.fromArray(transform.quaternion);
  object.position.fromArray(transform.position).multiplyScalar(0.001);
  object.scale.setScalar(0.001);
  modelCoordinates.add(object);

  const volume = printer.buildVolume;
  const geometry = volume.shape === 'rectangular'
    ? new THREE.BoxGeometry(volume.x * 0.001, volume.z * 0.001, volume.y * 0.001)
    : new THREE.CylinderGeometry(volume.diameter * 0.0005, volume.diameter * 0.0005, volume.z * 0.001, 48);
  const volumeMaterial = new THREE.MeshBasicMaterial({ color: 0x56e6b1, wireframe: true, transparent: true, opacity: 0.24 });
  const buildVolume = new THREE.Mesh(geometry, volumeMaterial);
  buildVolume.position.y = volume.z * 0.0005;
  placement.add(buildVolume);
  placement.visible = false;
  scene.add(placement);

  const reference = await session.requestReferenceSpace('local-floor');
  const viewer = await session.requestReferenceSpace('viewer');
  const source = await requestHitTestSource.call(session, { space: viewer });
  if (!source) {
    await session.end();
    throw new Error('Hit-test zdroj se nepodařilo vytvořit.');
  }
  let pose: XRHitTestResult | undefined;
  renderer.setAnimationLoop((_time, frame) => {
    if (frame) {
      pose = frame.getHitTestResults(source)[0];
      const hitPose = pose?.getPose(reference);
      if (hitPose && !placement.visible) {
        placement.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
      }
    }
    renderer.render(scene, camera);
  });
  session.addEventListener('select', () => { if (pose) placement.visible = true; });
  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null);
    source.cancel();
    geometry.dispose();
    volumeMaterial.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  });
}
