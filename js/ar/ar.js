import * as THREE from 'three';
import { state } from '../state.js';

export async function startAR(viewer) {
  if (!navigator.xr || !await navigator.xr.isSessionSupported('immersive-ar')) {
    throw Error('WebXR AR není na tomto zařízení dostupné. Viewer zůstává funkční.');
  }

  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'local-floor'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  });
  const viewerRoot = viewer.renderer.domElement.closest('#viewer');
  const viewerWasHidden = viewerRoot?.hidden;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.xr.enabled = true;
  renderer.setClearAlpha(0);
  renderer.domElement.className = 'ar-canvas';
  document.body.append(renderer.domElement);

  let hitTestSource;
  const cleanup = () => {
    hitTestSource?.cancel();
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    if (viewerRoot) viewerRoot.hidden = viewerWasHidden;
  };
  session.addEventListener('end', cleanup, { once: true });

  try {
    await renderer.xr.setSession(session);

    // The normal preview becomes a DOM overlay in immersive AR. Hide the whole
    // viewer so the camera and the separate AR scene are all the user sees.
    if (viewerRoot) viewerRoot.hidden = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const placement = new THREE.Group();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2), placement);

    const model = state.currentModel.root.clone();
    model.scale.multiplyScalar(0.001);
    placement.add(model);

    const printer = state.printer;
    const volumeGeometry = printer.shape === 'rectangular'
      ? new THREE.BoxGeometry(printer.x * 0.001, printer.y * 0.001, printer.z * 0.001)
      : new THREE.CylinderGeometry(
        printer.diameter * 0.0005,
        printer.diameter * 0.0005,
        printer.z * 0.001,
        48
      );
    const volume = new THREE.Mesh(volumeGeometry, new THREE.MeshBasicMaterial({
      color: 0x55e7b4,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    }));
    if (printer.shape !== 'rectangular') volume.rotation.x = Math.PI / 2;
    volume.position.z = printer.z * 0.0005;
    placement.add(volume);
    // Loaded models are Z-up while WebXR floor spaces are Y-up.
    placement.rotation.x = -Math.PI / 2;
    placement.visible = false;

    const localSpace = await session.requestReferenceSpace('local-floor');
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    let hit;

    renderer.setAnimationLoop((_, frame) => {
      const hits = frame?.getHitTestResults(hitTestSource) || [];
      hit = hits[0];
      renderer.render(scene, camera);
    });
    session.addEventListener('select', () => {
      const pose = hit?.getPose(localSpace);
      if (!pose) return;
      placement.position.set(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );
      placement.visible = true;
    });
  } catch (error) {
    await session.end().catch(cleanup);
    throw error;
  }
}
