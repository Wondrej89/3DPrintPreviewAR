import * as THREE from 'three';
import { state } from '../state.js';

const HORIZONTAL_LIMIT = 0.8;

function createOverlay(session) {
  const overlay = document.createElement('div');
  overlay.className = 'ar-ui';
  overlay.innerHTML = `
    <p class="ar-status" role="status" aria-live="polite">Pomalu pohybujte telefonem a namiřte kameru na vodorovný povrch.</p>
    <div class="ar-actions">
      <button class="ar-place" type="button" disabled>Umístit model</button>
      <button class="ar-exit" type="button">Ukončit AR</button>
    </div>`;
  overlay.addEventListener('beforexrselect', event => event.preventDefault());
  overlay.querySelector('.ar-exit').onclick = () => session.end();
  document.body.append(overlay);
  return overlay;
}

function isHorizontal(matrix) {
  // WebXR hit-test poses expose the surface normal as their local Y axis.
  return matrix.elements[5] >= HORIZONTAL_LIMIT;
}

export async function startAR(viewer) {
  if (!state.currentModel) throw Error('Nejprve otevřete model.');
  if (!navigator.xr || !await navigator.xr.isSessionSupported('immersive-ar')) {
    throw Error('WebXR AR není na tomto zařízení dostupné. Viewer zůstává funkční.');
  }

  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['local-floor', 'dom-overlay'],
    domOverlay: { root: document.body }
  });
  const viewerRoot = viewer.renderer.domElement.closest('#viewer');
  const viewerWasHidden = viewerRoot?.hidden;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.xr.enabled = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearAlpha(0);
  renderer.domElement.className = 'ar-canvas';
  document.body.append(renderer.domElement);
  const overlay = createOverlay(session);
  const status = overlay.querySelector('.ar-status');
  const placeButton = overlay.querySelector('.ar-place');

  let hitTestSource;
  const cleanup = () => {
    hitTestSource?.cancel();
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    overlay.remove();
    if (viewerRoot) viewerRoot.hidden = viewerWasHidden;
  };
  session.addEventListener('end', cleanup, { once: true });

  try {
    await renderer.xr.setSession(session);
    if (viewerRoot) viewerRoot.hidden = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const placement = new THREE.Group();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2), placement);

    const model = state.currentModel.root.clone();
    model.scale.multiplyScalar(0.001);
    model.visible = true;
    placement.add(model);

    const printer = state.printer;
    const volumeGeometry = printer.shape === 'rectangular'
      ? new THREE.BoxGeometry(printer.x * 0.001, printer.y * 0.001, printer.z * 0.001)
      : new THREE.CylinderGeometry(printer.diameter * 0.0005, printer.diameter * 0.0005, printer.z * 0.001, 48);
    const volume = new THREE.Mesh(volumeGeometry, new THREE.MeshBasicMaterial({
      color: 0x55e7b4, wireframe: true, transparent: true, opacity: 0.25
    }));
    if (printer.shape !== 'rectangular') volume.rotation.x = Math.PI / 2;
    volume.position.z = printer.z * 0.0005;
    placement.add(volume);
    // Loaded models are Z-up while WebXR floor spaces are Y-up.
    placement.rotation.x = -Math.PI / 2;
    placement.visible = false;

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.055, 0.075, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x55e7b4, side: THREE.DoubleSide })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    let localSpace;
    try {
      localSpace = await session.requestReferenceSpace('local-floor');
    } catch {
      localSpace = await session.requestReferenceSpace('local');
    }
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    let validPose = null;

    const place = () => {
      if (!validPose) return;
      placement.position.setFromMatrixPosition(validPose);
      placement.visible = true;
      status.textContent = 'Model je umístěn. Zaměřte jiný povrch a klepnutím jej přesuňte.';
    };
    placeButton.onclick = place;
    session.addEventListener('select', place);

    renderer.setAnimationLoop((_, frame) => {
      const hit = frame?.getHitTestResults(hitTestSource)[0];
      const pose = hit?.getPose(localSpace);
      if (pose) {
        reticle.matrix.fromArray(pose.transform.matrix);
        if (isHorizontal(reticle.matrix)) {
          validPose = reticle.matrix.clone();
          reticle.visible = true;
          placeButton.disabled = false;
          if (!placement.visible) status.textContent = 'Povrch nalezen. Klepněte do obrazu nebo na „Umístit model“.';
        } else {
          validPose = null;
          reticle.visible = false;
          placeButton.disabled = true;
          if (!placement.visible) status.textContent = 'Nalezený povrch není vodorovný. Miřte na podlahu nebo stůl.';
        }
      } else {
        validPose = null;
        reticle.visible = false;
        placeButton.disabled = true;
        if (!placement.visible) status.textContent = 'Pomalu pohybujte telefonem a namiřte kameru na vodorovný povrch.';
      }
      renderer.render(scene, camera);
    });
  } catch (error) {
    await session.end().catch(cleanup);
    throw error;
  }
}
