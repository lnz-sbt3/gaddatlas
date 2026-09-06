# GaddAtlas — istruzioni per l'agente

Contesto di progetto per Claude Code. Leggilo prima di toccare qualsiasi file.

## Cos'è

Atlante semantico della geografia narrativa di *Quer pasticciaccio brutto de via
Merulana* di Gadda. Tesi di dottorato in Digital Humanities, Università di
Bologna (FICLIT). **Consegna: fine ottobre 2026. Difesa: aprile 2027.**

Due artefatti distinti nello stesso repository:

- **CHORA** (`ontology/`) — l'ontologia, riusabile oltre Gadda. Namespace
  `https://w3id.org/chora#`, **prefisso `chora:`** (D-013). Restano
  dichiarazioni `PREFIX ga: <https://w3id.org/chora#>` nelle shapes e in parte
  delle query: non è un errore, un prefisso è un'etichetta locale al file che lo
  dichiara e l'URI è identico. Non "correggerle" durante il porting.
- **GaddAtlas** (`data/`, `app/`) — il caso di studio: il dataset sul
  Pasticciaccio e l'interfaccia. Namespace `https://w3id.org/gaddatlas/id/`.

## Le decisioni sono già prese

`docs/DECISIONS.md` contiene quattordici decisioni motivate (D-001…D-014). **Leggile
prima di proporre alternative architetturali.** Se una scelta ti sembra
sbagliata, dillo citando la decisione — non aggirarla in silenzio.

**Stato dei dati: allineato.** `data/dist/gaddatlas.geojson` dichiara
`tripleCount 17203`, `buildVersion 4.3`, `ontology CHORA`. D-014 è chiusa. Se
un giorno leggi `4.2` o `17168`, il GeoJSON è tornato indietro: `make all`.

Le tre non negoziabili:

1. **Niente framework reattivi** (D-001). Vite + moduli ES vanilla + `htl`. Il
   nucleo è un `<canvas>` con un loop `requestAnimationFrame` che muta array in
   place a 60fps: React combatte quel modello senza dare nulla in cambio.
2. **Non modificare i file derivati** (D-002). Si toccano solo
   `data/source/xlsx/*.xlsx`, `data/source/mapping.yaml`,
   `data/source/void_seeds.json` e `ontology/chora.ttl`. Tutto ciò che sta in
   `data/dist/` si rigenera con `make all`. Una modifica a mano lì sparisce al
   build successivo.
3. **Nessun URL di hosting cablato** (D-007). Il `base` di Vite viene da una
   variabile d'ambiente. Il sito potrebbe passare da GitHub Pages a
   `projects.dharc.unibo.it`: deve restare una variabile, non una migrazione.

## Comandi

```bash
make all        # fogli + TBox -> TTL -> geojson + passages -> audit
make audit      # nove invarianti fra sorgenti e derivati; esce 1 se falliscono
make shacl      # validazione SHACL, deve dire CONFORME
make queries    # 12 competency + 10 integrity query

cd app
npm run dev     # dev server
npm run build   # build statica in app/dist
```

Dopo ogni modifica alle sorgenti dati: `make all && make audit`.

## Il porting da Observable — stato e regole

Il prototipo è `_archivio/chartD.js`: il notebook Observable appiattito, 5.306
righe. **Va versionato**, non ignorato: è l'artefatto che la tesi documenta.
Va spacchettato in moduli ES sotto `app/src/`.

**Inventario verificato:** 34 moduli, nessun riferimento non dichiarato,
nessun ciclo — il grafo è un DAG.

Trenta seguono il pattern `const s4X = (() => { … })()` con le dipendenze
destrutturate in testa. **Quattro no**, e vanno trattati caso per caso:
`projection` (`d3.geoMercator()` diretto, senza prefisso `s4`), `s4Config`
(oggetto letterale, non IIFE), `s4RayCellDistance` (`function` con nome),
`context2d` (arrow function non auto-invocata). `docs/PORTING.md` li mappa già
uno per uno.

**Le sei sostituzioni Observable → ES, e non ce ne sono altre:**

| Observable | Sostituzione |
|---|---|
| `FileAttachment(x).json()` | `await fetch(url).then(r => r.json())` |
| `import * as d3 from "npm:d3@7"` | `import * as d3 from "d3"` |
| `` html`…` `` | `import { html } from "htl"` — è la stessa libreria dello stdlib |
| `display(chart)` | `root.append(chart)` |
| `invalidation` | una `dispose()` esplicita, o un `AbortController` |
| top-level `await` | incapsulare in `async function boot()` |

**Regole del porting:**

- Un modulo per file, stesso nome: `s4Voronoi` → `src/model/voronoi.js` con
  `export default`. Le righe di destrutturazione in testa diventano `import`.
- **Non riscrivere la logica.** Il porting è meccanico. Ogni cambiamento di
  comportamento va fatto in un commit separato dal porting, mai insieme.
- `s4Satellites` usa `s4Voronoi` e `s4Chapters`, che nel file appaiono dopo:
  l'ordine del file **non** è topologico. Con gli `import` ES non è un problema,
  ma non concatenare i moduli assumendo l'ordine del file.
- I commenti nel notebook spiegano il *perché* delle costanti e sono il lavoro
  di mesi. **Portali tutti.** Non "ripulirli".
- `chartS4` è l'unico blocco grosso (~1.100 righe): va spezzato separando lo
  stato dal `draw()` e dal `tick()`. Farlo **dopo** che il porting fedele
  funziona, non durante.

**Verifica del porting:** prima di iniziare, catturare screenshot di
riferimento del notebook a stati noti (mappa, diagramma, assonometria, con e
senza focalizzatore). Il canvas non ha test: il confronto visivo è l'unica
rete.

## Dati a runtime

L'app carica **solo** questi file, da `app/public/data/`:

```
gaddatlas.geojson        ~630 KB  view model: features, relief, paths
roma.geojson             ~576 KB  contorno di Roma (poligono, non raster)
passages/ch01…ch10.json  ~320 KB  caricati in lazy, uno per capitolo
passages/index.json       14 KB   referenceId -> capitolo
```

`roma.geojson` pesa 576 KB per una silhouette di sfondo: vale la pena
semplificarlo (mapshaper, o `d3.geoIdentity` con tolleranza) prima della
consegna. Non è urgente, ma è quasi la metà del peso della pagina.

**Il TTL non va nel bundle.** Il canvas non interroga mai il grafo: il GeoJSON è
autosufficiente. Il TTL serve solo allo strato SPARQL/Comunica, rimandato a dopo
la consegna, e si caricherà in lazy sulla sola pagina Query.

**`atlas.json` non si pubblica mai** (D-012): contiene tutti i 722 estratti in
un file unico, contro D-004. È in `.gitignore`.

## Vincoli che non vanno rotti

- **Estratti gaddiani.** Opera protetta fino al 2043. Brani brevi ex art. 70
  L. 633/1941, serviti per capitolo, sempre con edizione e pagina. **Mai** un
  export cumulativo, mai un endpoint che li restituisca in blocco. Vedi
  `NOTICE-EXCERPTS.md`.
- **Tre licenze distinte** (`LICENSE` MIT per il codice, `LICENSE-DATA` CC BY
  per ontologia e dati, `NOTICE-EXCERPTS.md` per i brani). Non unificarle.
- **Alias toponomastici: non inventarli.** `s4Config.ALIAS_GROUPS` nel notebook
  dichiara 5 fusioni, il grafo ne dichiara 3 diverse, `MERGE_MAP` è vuota
  (D-011). È una decisione editoriale aperta: porta `ALIAS_GROUPS` **così com'è**
  e non tentare di riconciliarlo.
- **La grammatica visiva è semantica.** Tinta = ruolo narrativo, luminosità =
  quota, numero di curve di livello = densità (mai l'intensità), forma del glifo
  = statuto di realtà, posizione radiale = rango di distanza dal polo. Il resto
  dell'interfaccia sta in neutri caldi: ogni colore aggiunto altrove ruba
  capacità di significazione al canvas.

## Convenzioni

- Commenti e messaggi di commit **in italiano**, come il resto del progetto.
- La palette vive in `app/src/styles/tokens.css` come custom properties, e il
  canvas le legge da lì via `getComputedStyle`: un colore, un posto solo.
  I valori sono in `s4Config` del notebook — vanno estratti, non riscritti.
- Niente dipendenze oltre `d3` e `htl` senza una voce in `DECISIONS.md`.
- Un artefatto pubblicato non carica nulla da CDN esterni.

## Cosa registrare

Quando prendi una decisione architetturale o ne scarti una alternativa,
aggiungi una voce a `docs/DECISIONS.md` con data, alternative scartate e
motivazione. Serve al capitolo di tesi sul design dell'interfaccia: è la
ragione per cui quel file esiste.
