import { useEffect, useRef, useState } from 'react';
import type { ModelUnit, RecentModel } from '../types';
import { InstallButton } from '../components/InstallButton';
import { recentModels, removeModel } from '../storage/db';

interface Props {
  open: (blob: Blob, name: string, unit: ModelUnit, recent?: RecentModel) => void;
}

export function HomePage({ open }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<RecentModel[]>([]);
  const [pending, setPending] = useState<File>();
  const [unit, setUnit] = useState<ModelUnit>('mm');

  const refresh = async () => {
    setRecent(await recentModels());
  };

  useEffect(() => {
    let active = true;
    void recentModels().then((models) => {
      if (active) setRecent(models);
    });
    return () => { active = false; };
  }, []);

  const pick = (file?: File) => {
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.3mf')) open(file, file.name, 'mm');
    else setPending(file);
  };

  return <main className="home">
    <header><div className="logo">⬡</div><div><b>PrintScope</b><span>AR printability viewer</span></div></header>
    <section className="hero">
      <span className="eyebrow">VŠE ZŮSTÁVÁ V ZAŘÍZENÍ</span>
      <h1>Prověřte model<br /><em>ještě před tiskem.</em></h1>
      <p>Rozměry, orientace, kritická místa a skutečná velikost v AR — bez uploadu a bez slicování.</p>
      <button className="primary" onClick={() => input.current?.click()}>＋ Otevřít model</button>
      <input ref={input} hidden type="file" accept=".stl,.obj,.3mf" onChange={(event) => pick(event.target.files?.[0])} />
      <InstallButton />
    </section>
    {pending && <div className="modal"><div className="sheet">
      <h2>Jednotky modelu</h2>
      <p>{pending.name} neobsahuje spolehlivou informaci o jednotce.</p>
      <div className="segments">{(['mm', 'cm', 'inch'] as ModelUnit[]).map((value) =>
        <button key={value} className={value === unit ? 'active' : ''} onClick={() => setUnit(value)}>{value}</button>,
      )}</div>
      <button className="primary" onClick={() => open(pending, pending.name, unit)}>Načíst jako {unit}</button>
      <button className="link" onClick={() => setPending(undefined)}>Zrušit</button>
    </div></div>}
    <section className="recents">
      <div className="section-title"><h2>Poslední modely</h2><span>{recent.length} / 10</span></div>
      {!recent.length ? <div className="empty"><div>◇</div><b>Zatím žádné modely</b><p>Otevřené soubory se bezpečně uloží do tohoto zařízení.</p></div> : recent.map((model) =>
        <article key={model.id} onClick={() => open(model.blob, model.name, model.unit, model)}>
          <div className="thumb">⬡</div>
          <div><b>{model.name}</b><span>{model.format.toUpperCase()} · {model.dimensions.x.toFixed(1)} × {model.dimensions.y.toFixed(1)} × {model.dimensions.z.toFixed(1)} mm</span></div>
          <button aria-label="Odstranit" onClick={(event) => {
            event.stopPropagation();
            void removeModel(model.id).then(refresh);
          }}>×</button>
        </article>,
      )}
    </section>
    <footer>Lokální zpracování · Žádný backend · 1 unit = 1 mm</footer>
  </main>;
}
