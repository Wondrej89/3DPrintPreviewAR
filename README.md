# PrintScope AR

Statická, mobile-first PWA pro lokální prohlížení a geometrickou kontrolu modelů **STL, OBJ a 3MF**. Neodesílá modely na server. Produkční aplikace nemá React, Vite, TypeScript, npm, bundler ani build krok.

## Spuštění bez npm

```bash
python -m http.server 8000
```

Otevřete `http://localhost:8000/`. `file://` není podporováno, protože ES Modules, Service Worker a WebXR vyžadují HTTP(S). Browser testy jsou na `http://localhost:8000/tests.html`.

## GitHub Pages

Nastavte **Settings → Pages → Deploy from a branch → main → /(root)**. Produkce: <https://wondrej89.github.io/3DPrintPreviewAR/>. Všechny URL jsou relativní, takže projektový podadresář funguje bez konfigurace.

## Architektura a importy

`index.html` načítá `./js/app.js` jako nativní ES Module a import map mapuje `three` a `three/addons/` na pevně verzované Three.js 0.160.0 na jsDelivr CDN. Service Worker tyto soubory při instalaci uloží pro další offline spuštění. `js/state.js` je jediný zdroj transformace pro viewer, fit, persistence i AR.

- `js/model`: STL/OBJ/3MF import, jednotky a orientace
- `js/viewer`: jedna persistentní WebGL scéna a build plate
- `js/analysis`, `js/shaders`, `js/workers`: fit, bed contact, skutečný normal-based overhang shader a worker validation
- `js/storage`: nativní IndexedDB, Blob a LRU 10 modelů
- `js/ar`: WebXR hit-test, orientace modelu a build volume v měřítku 1 mm = 0,001 m
- `js/ui`, `js/data`: rozhraní a lokální profily

## Implementované analýzy

Implementovány jsou boundary/non-manifold edges a degenerované trojúhelníky ve Workeru, transform-aware rectangular/circular printer fit, geometrický bed contact a plynulá shaderová overhang heatmapa. Převis vychází z normály vůči +Z: vzhůru a svisle je bezpečný, dolů roste riziko; materiál mění závažnost.

## Záměrně nezobrazené / TODO

Bridge region heuristic, BVH thin-wall analýza, disconnected shells/inconsistent normals a doporučená orientace zatím nejsou označené jako hotové ani vystavené v UI. Nejsou zde placeholder/fake výsledky. Slicing, G-code a support generation nejsou cílem projektu.

## PWA

`manifest.webmanifest` používá relativní `start_url`/`scope`. Verzovaný `sw.js` přednačte app shell, všechny moduly, Three.js závislosti a ikony. Vlastní HTML/CSS/JS používají network-first strategii: online se vždy stáhne a uloží aktuální odpověď, offline se použije poslední cache. Aktivace odstraní pouze staré aplikační cache; modely a nastavení v nezávislé IndexedDB zůstávají zachované. Registrace obchází HTTP cache Service Workeru, při startu výslovně kontroluje aktualizaci a novou verzi na domovské obrazovce načte automaticky. V otevřeném 3D Vieweru místo toho nabídne bezpečné ruční načtení, aby nepřerušila práci s modelem.
