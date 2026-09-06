# Interfaccia

Sito statico: Vite, moduli ES vanilla, `htl` per i template. Nessun framework
reattivo — vedi `docs/DECISIONS.md` § D-001 per il perché.

## Avvio

```bash
npm install
npm run dev
```

Deve stampare **300 feature** e **933 righe di relief**. Se non parte, il
problema è nei dati sotto `public/data/`, non nel codice.

## Dati a runtime

L'app carica solo questi file, copiati da `data/dist/` e `data/source/`:

```
public/data/
  gaddatlas.geojson        ~630 KB   features, relief, paths
  roma.geojson                 ?     contorno di Roma (poligono, non raster)
  passages/ch01…ch10.json  ~320 KB   caricati in lazy, uno per capitolo
  passages/index.json        14 KB   referenceId → capitolo
```

Sono **copie**: le originali vivono in `data/`. Dopo ogni `make all` vanno
ricopiate, altrimenti l'app mostra dati vecchi.

Il TTL non va nel bundle: il canvas non interroga mai il grafo, il GeoJSON è
autosufficiente. Servirà solo allo strato SPARQL/Comunica, rimandato a dopo la
consegna, e si caricherà in lazy sulla sola pagina Query.

## Il trasloco (D-007)

In `vite.config.js` il percorso base viene da una variabile d'ambiente e non è
mai cablato:

```js
base: process.env.BASE_PATH || "/",
```

Il default `"/"` serve al dev server. In produzione:

```bash
BASE_PATH=/gaddatlas/ npm run build
```

I progetti DH.ARC stanno sotto prefisso di percorso
(`projects.dharc.unibo.it/odi/`), quindi nessun percorso assoluto nel codice:
solo import e URL relativi. Con questa disciplina il passaggio da GitHub Pages
a un dominio di ateneo è una variabile, non una migrazione.

## Il porting dal notebook

Il prototipo è `_archivio/chartD.js`, notebook Observable appiattito di 5.306
righe. Contiene **34 moduli**; la mappa modulo → file e l'ordine di lavoro sono
in `docs/PORTING.md`.

Le sei sostituzioni Observable → ES, e non ce ne sono altre:

| Observable | Sostituzione |
|---|---|
| `FileAttachment(x).json()` | `await fetch(url).then(r => r.json())` |
| `import * as d3 from "npm:d3@7"` | `import * as d3 from "d3"` |
| `` html`…` `` | `import { html } from "htl"` — stessa libreria dello stdlib |
| `display(chart)` | `root.append(chart)` |
| `invalidation` | una `dispose()` esplicita, o un `AbortController` |
| top-level `await` | incapsulare in `async function boot()` |

Il porting è **meccanico**: non riscrivere la logica, non rinominare variabili,
non "ripulire" i commenti — spiegano il perché delle costanti e sono il lavoro
di mesi.
