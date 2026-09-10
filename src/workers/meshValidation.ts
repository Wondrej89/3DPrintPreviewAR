import type { BufferGeometry } from 'three';
import type { MeshSummary } from '../types';

export function validateMeshInWorker(geometries: BufferGeometry[]): Promise<MeshSummary> {
  let floatCount = 0;
  const arrays = geometries.map((geometry) => {
    const source = geometry.index ? geometry.toNonIndexed() : geometry;
    const positions = source.attributes.position.array as Float32Array;
    floatCount += positions.length;
    return { source, positions, disposable: source !== geometry };
  });
  const packed = new Float32Array(floatCount);
  let offset = 0;
  arrays.forEach(({ source, positions, disposable }) => {
    packed.set(positions, offset);
    offset += positions.length;
    if (disposable) source.dispose();
  });

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./meshAnalysis.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ result: MeshSummary }>) => {
      resolve(event.data.result);
      worker.terminate();
    };
    worker.onerror = (event) => {
      reject(new Error(event.message || 'Mesh validation worker selhal.'));
      worker.terminate();
    };
    worker.postMessage({ positions: packed }, [packed.buffer]);
  });
}
