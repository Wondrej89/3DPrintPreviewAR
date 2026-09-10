# PrintScope AR

Mobilně orientovaná PWA pro lokální prohlížení a předtiskovou geometrickou kontrolu STL, OBJ a 3MF. Nejde o slicer: aplikace negeneruje vrstvy, supporty ani G-code a soubory neposílá na server.

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

Produkční provoz a WebXR vyžadují HTTPS (`localhost` je vývojová výjimka secure-context pravidla).

## GitHub Pages deployment

- URL: `https://wondrej89.github.io/3DPrintPreviewAR/`
- Vite base: `/3DPrintPreviewAR/`
- V nastavení repozitáře zvolte **Settings → Pages → Source = GitHub Actions**.
- Workflow `.github/workflows/deploy-pages.yml` spouští `npm ci`, testy a produkční build a publikuje výhradně artifact `dist/`, nikoli zdrojový root.

### Když opakovaný build stále ukazuje staré chyby

Tlačítko **Re-run jobs** vždy znovu sestaví původní commit daného běhu. Nestáhne změny z novějšího pull requestu. V detailu běhu proto porovnejte zobrazené SHA s posledním commitem na `main`. Po merge opravy spusťte nový běh přes **Actions → Deploy to GitHub Pages → Run workflow → main**, případně počkejte na automatický běh vyvolaný mergem. Nový workflow uvádí sestavované SHA přímo v názvu i build summary.

Manifest, service worker, offline cache a instalační ikony respektují project-page base. Manifest otevírá `/3DPrintPreviewAR/` ve `standalone` režimu. Chrome používá raster ikony 192 × 192, 512 × 512 a samostatnou maskable 512 × 512. Na Home lze vyvolat nativní install prompt; není-li dostupný, aplikace ukáže ruční postup.

Repozitář samotný neobsahuje binární soubory. Požadované PNG ikony vytváří textový skript `scripts/generate-pwa-icons.mjs` automaticky před `npm run dev` a `npm run build`; do GitHub Pages artifactu `dist/` se tedy zahrnou, ale neblokují nástroje pro vytvoření pull requestu, které binární diff nepodporují.

## Android a WebXR

WebXR vyžaduje Android Chrome, ARCore-kompatibilní telefon, HTTPS a povolení kamery. `immersive-ar` hit-test umístí model v aktuálně uložené orientaci v poměru **1 mm = 0,001 m**. Nepodporovaný prohlížeč bezpečně zůstane ve 3D vieweru. Finální hit-test a install prompt je nutné ověřit na fyzickém zařízení.

## Architektura

- `src/pages`, `src/components` – mobile-first Home, viewer a sheets.
- `src/three` – STL/OBJ/3MF loadery a převody do interních mm.
- `src/analysis`, `src/shaders`, `src/workers` – geometrické metriky, overhang shader a worker validace.
- `src/storage` – IndexedDB Blob/metadata historie, persistentní transformace a settings.
- `src/ar` – WebXR hit-test, 1:1 měřítko a tiskový prostor.
- `src/data` – deklarativní profily Prusa FFF a materiálové heuristiky.

## Aktuální analytické možnosti a omezení

Mesh validator ve workeru skutečně reportuje boundary edges, non-manifold edges a degenerované trojúhelníky. Převisová shader heatmapa používá world-space normálu vůči build direction +Z: svislé a vzhůru orientované plochy jsou bezpečné, riziko roste pouze směrem dolů. Vybraný materiál mění práh této jasně označené heuristiky.

Bridge detection a BVH měření tenkých stěn zatím nejsou implementované a jsou v produkčním UI explicitně deaktivované. Aplikace proto nezobrazuje falešné počty mostů ani hodnoty minimální tloušťky. Self-intersections, disconnected shells a inconsistent normals nejsou v současném validatoru reportované. Vlastní tiskárny jsou rovněž označené jako nedostupné, dokud nebude dokončena jejich persistence a validace.

Novou vestavěnou tiskárnu přidejte do `src/data/printers.ts` s explicitním rectangular/circular build volume. Materiál přidejte do `src/data/materials.ts` s dokumentovaným faktorem převisové heuristiky.
