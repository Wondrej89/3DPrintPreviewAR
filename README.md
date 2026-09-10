# PrintScope AR

Mobilně orientovaná PWA pro lokální prohlížení a předtiskovou geometrickou kontrolu STL, OBJ a 3MF. Nejde o slicer: aplikace negeneruje vrstvy, supporty ani G-code a soubory nikdy neposílá na server.

## Spuštění a build

```bash
npm install
npm run dev
npm test
npm run build
```

Vývojový server Vite je vhodný pro viewer. Service worker a instalační chování ověřujte z produkčního buildu (`npm run build`, následně HTTPS static hosting). Pro vzdálené zařízení je nutný důvěryhodný HTTPS certifikát; `localhost` je jediná běžná výjimka secure-context pravidla.

## PWA a Android

Manifest, automaticky aktualizovaný Workbox service worker, offline cache a maskable ikona vznikají přes `vite-plugin-pwa`. Na Home obrazovce lze vyvolat nativní install prompt. Není-li dostupný, aplikace ukáže postup přes menu Chrome. V již instalovaném standalone režimu se volba skryje.

WebXR režim vyžaduje Android Chrome, ARCore-kompatibilní telefon, HTTPS a povolení kamery. Pomocí `immersive-ar` a hit-testu najde vodorovnou plochu; klepnutí položí uzamčený model ve vztahu **1 mm = 0,001 m** spolu s wireframe tiskovým prostorem. Nepodporovaný prohlížeč bezpečně zůstane ve 3D vieweru. AR se musí finálně ověřit na fyzickém zařízení.

## Architektura

- `src/pages`, `src/components` – mobile-first Home, viewer, sheets a instalační UI.
- `src/three` – izolované loadery Three.js, sjednocení meshů a převody na interní mm.
- `src/analysis`, `src/shaders`, `src/workers` – geometrické metriky, shader heatmapy a worker vstup.
- `src/storage` – IndexedDB Blob/metadata historie s LRU limitem 10.
- `src/ar` – WebXR hit-test, skutečné měřítko a tiskový prostor.
- `src/data` – aktualizovatelné profily Prusa FFF a materiálové heuristiky mimo UI.

## Analytické heuristiky

Mesh validator třídí boundary, non-manifold a degenerované hrany; poškozený model zůstává zobrazitelný. Převisová shader heatmapa používá normálu vůči build direction +Z. Bridge a materiálové skóre je pouze geometrický odhad, protože bez vrstev nelze přesně určit podporu. Thin-wall režim vizualizuje lokální riziko relativně k aktivní trysce; produkční přesnost u komplikovaných/non-watertight meshů není zaručena. Kontakt s podložkou používá numerické okolí Z=0. Doporučení orientace je záměrně prezentováno jako heuristika, nikoli optimum.

## Známá omezení

- 3MF načítá Three.js loader včetně assemblies; některá vendor-specific rozšíření nemusí být podporována.
- OBJ externí MTL a textury nejsou potřeba pro analýzu a nenačítají se.
- Self-intersection a bridge detekce jsou u velmi velkých modelů aproximace. Skutečný tisk závisí i na chlazení, rychlosti a vrstvě.
- WebXR nemá plnohodnotný desktopový emulátor; finální hit-test a instalovatelnost vyžadují Android hardware.

## Rozšíření profilů

Novou tiskárnu přidejte deklarativně do `src/data/printers.ts` s explicitním rectangular/circular build volume; zejména INDX objem nikdy neodvozujte. Materiál přidejte do `src/data/materials.ts` s pojmenovanými faktory převisů a mostů. UI tyto soubory načítá automaticky bez hardcoded seznamů.
