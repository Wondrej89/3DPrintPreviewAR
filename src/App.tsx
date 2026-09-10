import { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { ViewerPage } from './pages/ViewerPage';
import { IDENTITY_TRANSFORM } from './types';
import type { LoadedModel, ModelTransform, ModelUnit, RecentModel } from './types';
import { loadModel } from './three/loadModel';
import { geometryDimensions } from './analysis/core';
import { saveModel, updateModelTransform } from './storage/db';
import { validateMeshInWorker } from './workers/meshValidation';

interface CurrentModel { id: string; model: LoadedModel; name: string; transform: ModelTransform }

export default function App() {
  const [current, setCurrent] = useState<CurrentModel>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const open = async (blob: Blob, name: string, unit: ModelUnit, recent?: RecentModel) => {
    setBusy(true);
    setError('');
    try {
      const model = await loadModel(blob, name, unit);
      const mesh = await validateMeshInWorker(model.geometries);
      const id = recent?.id ?? crypto.randomUUID();
      const transform = recent?.transform ?? IDENTITY_TRANSFORM;
      const entry: RecentModel = {
        id,
        name,
        blob,
        unit: model.unit,
        format: model.format,
        dimensions: geometryDimensions(model.geometries),
        lastOpened: Date.now(),
        transform,
        mesh,
      };
      await saveModel(entry);
      setCurrent({ id, model, name, transform });
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updateTransform = (transform: ModelTransform) => {
    setCurrent((value) => value ? { ...value, transform } : value);
    if (current) void updateModelTransform(current.id, transform);
  };

  return <>
    {current ? (
      <ViewerPage
        model={current.model}
        name={current.name}
        transform={current.transform}
        onTransformChange={updateTransform}
        onBack={() => setCurrent(undefined)}
      />
    ) : <HomePage open={open} />}
    {busy && <div className="loading"><span />Načítám a kontroluji mesh…</div>}
    {error && <div className="error" onClick={() => setError('')}>{error}</div>}
  </>;
}
