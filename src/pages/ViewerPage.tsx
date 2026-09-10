import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, Camera, Flame, Printer, Rotate3D, ScanLine } from 'lucide-react';
import type { AnalysisMode, LoadedModel, MaterialProfile, ModelTransform, PrinterProfile } from '../types';
import { IDENTITY_TRANSFORM } from '../types';
import { PRINTERS } from '../data/printers';
import { MATERIALS } from '../data/materials';
import { ModelScene } from '../components/ModelScene';
import { fitPrinter, transformedPoints } from '../analysis/core';
import { startAR } from '../ar/startAR';
import { setting, setSetting } from '../storage/db';

interface Props {
  model: LoadedModel;
  name: string;
  transform: ModelTransform;
  onTransformChange: (transform: ModelTransform) => void;
  onBack: () => void;
}

export function ViewerPage({ model, name, transform, onTransformChange, onBack }: Props) {
  const [printer, setPrinter] = useState<PrinterProfile>(PRINTERS[2]);
  const [nozzle, setNozzle] = useState(0.4);
  const [material, setMaterial] = useState<MaterialProfile>(MATERIALS[0]);
  const [mode, setMode] = useState<AnalysisMode>('normal');
  const [panel, setPanel] = useState<'printer' | 'analysis' | 'filament' | 'orient'>();
  const [placeMode, setPlaceMode] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void Promise.all([
      setting('printerId', PRINTERS[2].id),
      setting('nozzle', 0.4),
      setting('materialId', MATERIALS[0].id),
    ]).then(([printerId, savedNozzle, materialId]) => {
      setPrinter(PRINTERS.find((item) => item.id === printerId) ?? PRINTERS[2]);
      setNozzle(savedNozzle);
      setMaterial(MATERIALS.find((item) => item.id === materialId) ?? MATERIALS[0]);
    });
  }, []);

  const points = useMemo(() => transformedPoints(model.geometries, transform), [model, transform]);
  const dimensions = useMemo(() => {
    const box = new THREE.Box3().setFromPoints(points);
    const size = box.getSize(new THREE.Vector3());
    return { x: size.x, y: size.y, z: size.z };
  }, [points]);
  const fit = useMemo(() => fitPrinter(points, printer.buildVolume), [points, printer]);

  const changeTransform = (next: ModelTransform) => {
    onTransformChange(next);
    setPlaceMode(false);
    setNotice('Orientace byla uložena. Model leží na Z = 0.');
  };

  return <main className="viewer">
    <div className="topbar">
      <button onClick={onBack} aria-label="Zpět"><ArrowLeft /></button>
      <div><b>{name}</b><span>{dimensions.x.toFixed(1)} × {dimensions.y.toFixed(1)} × {dimensions.z.toFixed(1)} mm</span></div>
      <div className={fit.fits ? 'fit ok' : 'fit'}>{fit.fits ? '✓ Fits' : `! ${fit.issues.join(', ')}`}</div>
    </div>
    <ModelScene
      model={model}
      mode={mode}
      materialFactor={material.overhangSeverityFactor}
      printer={printer}
      placeMode={placeMode}
      transform={transform}
      onTransformChange={changeTransform}
    />
    {placeMode && <div className="toast">Klepněte na rovnou plochu modelu</div>}
    {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}
    {mode === 'overhang' && <div className="legend">
      <b>Převisy · orientační</b><div className="gradient" />
      <span>bezpečné → dolů směřující kritické</span>
    </div>}
    <nav>
      <button aria-label="Orientace" onClick={() => setPanel('orient')}><Rotate3D /><span>Orientace</span></button>
      <button aria-label="Analýza" onClick={() => setPanel('analysis')}><ScanLine /><span>Analýza</span></button>
      <button aria-label="AR" onClick={() => void startAR(model, printer, transform).catch((error) => setNotice(error.message))}><Camera /><span>AR</span></button>
      <button aria-label="Tiskárna" onClick={() => setPanel('printer')}><Printer /><span>Tiskárna</span></button>
      <button aria-label="Filament" onClick={() => setPanel('filament')}><Flame /><span>Filament</span></button>
    </nav>
    {panel && <div className="modal" onClick={() => setPanel(undefined)}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={() => setPanel(undefined)}>×</button>
        {panel === 'printer' && <>
          <h2>Tiskárna</h2>
          <label>Profil<select value={printer.id} onChange={(event) => {
            const selected = PRINTERS.find((item) => item.id === event.target.value) ?? PRINTERS[0];
            setPrinter(selected);
            setNozzle(selected.defaultNozzleDiameterMm);
            void setSetting('printerId', selected.id);
            void setSetting('nozzle', selected.defaultNozzleDiameterMm);
          }}>{PRINTERS.map((item) => <option key={item.id} value={item.id}>{item.model}</option>)}</select></label>
          <label>Tryska<select value={nozzle} onChange={(event) => {
            const value = Number(event.target.value);
            setNozzle(value);
            void setSetting('nozzle', value);
          }}>{printer.availableNozzleDiametersMm?.map((value) => <option key={value} value={value}>{value} mm</option>)}</select></label>
          <p className="hint">Vlastní tiskárny zatím nejsou v tomto stabilizačním sestavení dostupné.</p>
        </>}
        {panel === 'filament' && <>
          <h2>Filament</h2><div className="list">{MATERIALS.map((item) => <button key={item.id} className={item.id === material.id ? 'selected' : ''} onClick={() => {
            setMaterial(item); void setSetting('materialId', item.id);
          }}><b>{item.name}</b><span>Ovlivňuje práh převisové heuristiky: {item.overhangSeverityFactor.toFixed(2)}</span></button>)}</div>
        </>}
        {panel === 'analysis' && <>
          <h2>Analýza</h2><div className="list">
            <button className={mode === 'normal' ? 'selected' : ''} onClick={() => { setMode('normal'); setPanel(undefined); }}>Normální zobrazení</button>
            <button className={mode === 'overhang' ? 'selected' : ''} onClick={() => { setMode('overhang'); setPanel(undefined); }}>Převisy</button>
            <button disabled>Tenké stěny — připravuje se</button>
            <button disabled>Mosty — připravuje se</button>
          </div><p className="hint">Neimplementované analýzy jsou vypnuté; aplikace nezobrazuje falešně přesná data.</p>
        </>}
        {panel === 'orient' && <>
          <h2>Orientace</h2>
          <button className="primary" onClick={() => { setPlaceMode(true); setPanel(undefined); }}>Položit na plochu</button>
          <button className="secondary" onClick={() => { changeTransform(IDENTITY_TRANSFORM); setPanel(undefined); }}>Resetovat orientaci</button>
        </>}
      </div>
    </div>}
  </main>;
}
