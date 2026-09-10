/// <reference lib="webworker" />
import { validateMesh } from '../analysis/core';

declare const self: DedicatedWorkerGlobalScope;
self.onmessage = (event: MessageEvent<{ positions: Float32Array }>) => {
  self.postMessage({ result: validateMesh(event.data.positions) });
};
export {};
