# GaddAtlas — interfaccia

Interfaccia di GaddAtlas, atlante interattivo della spazialità narrativa di *Quer pasticciaccio brutto de via Merulana* di Carlo Emilio Gadda. L'atlante, in italiano, è scritto in JavaScript con D3 e Canvas; Vite risolve i moduli e produce il sito statico. Il grafo RDF da cui derivano i dati non serve al rendering nel browser: l'interfaccia legge file GeoJSON già esportati.

L'interfaccia pubblicata si consulta all'indirizzo https://lnz-sbt3.github.io/gaddatlas/. I testi dei passi non sono inclusi nella pubblicazione: per ogni riferimento il pannello del testo indica capitolo e pagina del testimone di riferimento (QP Adelphi 2018), e gli stessi riferimenti sono nei dati, in `app/public/data/gaddatlas.geojson`.

Le carte storiche del 1925 (Dintorni di Roma, Roma, Castelli Romani) sono incluse in `app/carte-storiche/` e compaiono sotto la figura, nella geografia, con il comando «Carta 1925»: un cursore ne regola la visibilità e «Interrogare» ne sceglie il trattamento.

## Struttura

- `app/index.html`, `app/src/`: l'applicazione (`main.js` carica i dati e monta l'atlante; `model/` dati e geometria, `render/` disegno, `interaction/` selezione, `motion/` transizioni, `ui/` comandi e pannelli, `styles/tokens.css` valori visivi, `strings-it.js` etichette).
- `app/src/dev/`: strumenti che il codice carica soltanto in sviluppo (profilazione, varianti di regia e di resa).
- `app/build/`: estensioni di Vite per i brani e per le carte storiche.
- `app/carte-storiche/`: le tre carte storiche, in WebP, con il loro `manifest.json`.
- `app/test/`: test con `node:test`.
- `.github/workflows/pages.yml`: costruisce la versione pubblica e la pubblica su GitHub Pages.
- `app/public/data/`: dati letti dall'interfaccia.
- `data/dist/`: atlante ridotto usato dai test e cartella `passages/`, vuota, dove la build cerca gli estratti (non distribuiti).

## Installazione ed esecuzione

Servono Node.js e npm (la build e i test sono stati verificati con Node.js 22).

1. Scaricare la repository e conservarne la struttura: la build cerca gli estratti in `data/dist/passages/` e un test legge `data/dist/atlas.slim.json`, entrambi fuori da `app/`.
2. Dalla cartella `app/`, installare le dipendenze esattamente come nel file di lock:

   ```bash
   npm ci
   ```

3. Avviare la versione di sviluppo:

   ```bash
   npm run dev
   ```

   Vite apre l'atlante nel browser, normalmente sulla porta 5173. Non servire i sorgenti con un semplice server di file: le dipendenze dei moduli richiedono Vite.

Senza gli estratti l'atlante funziona: al posto del passo il pannello del testo rinvia al testimone di riferimento (vedi «Senza estratti»).

## Build

```bash
npm run build             # produce app/dist/ con gli estratti
npm run build:pubblica    # produce app/dist/ senza estratti, come la versione pubblicata
npm run preview           # serve la build per controllarla
```

Il percorso base è configurabile, per esempio `BASE_PATH=/gaddatlas/ npm run build:pubblica`. Il frammento dell'indirizzo conserva lo stato della lettura anche cambiando percorso base.

`npm run build` richiede gli estratti e si ferma se ne manca uno. `npm run build:pubblica` (`vite build --mode pubblica`) non li usa: è la build che il workflow `.github/workflows/pages.yml` pubblica su GitHub Pages.

Entrambe le build copiano le immagini elencate in `app/carte-storiche/manifest.json` nella cartella `carte-storiche/` del sito; il workflow non ha bisogno di altri file.

## Test

Dalla cartella `app/`:

```bash
node --test
```

Senza estratti 65 test passano e uno è saltato: quello che controlla i frammenti prodotti dagli estratti reali.

## Senza estratti

Gli estratti del romanzo non si distribuiscono: `data/dist/passages/` contiene soltanto `LEGGIMI.md`. Senza estratti l'interfaccia si comporta come la versione pubblicata.

| Operazione | Con gli estratti | Senza estratti |
|---|---|---|
| `npm run dev` | l'atlante si avvia | l'atlante si avvia |
| Pannello del testo | mostra il passo con edizione e pagina, accompagnato dall'apparato (ruolo, focalizzatore, determinazione, nota critica) | al posto del passo mostra «Il testo del passo non è distribuito con questa pubblicazione.», il rinvio al testimone di riferimento con capitolo e pagina, e l'apparato |
| Server di sviluppo | serve un frammento per riferimento | non serve frammenti; il pannello non li richiede |
| `npm run build` | produce `app/dist/` con un frammento per riferimento | si interrompe con «Riferimenti testuali incompleti» |
| `npm run build:pubblica` | produce `app/dist/` senza estratti | produce `app/dist/` senza estratti |
| `node --test` | 66 test superati | 65 superati, 1 saltato |

Chi dispone degli estratti li mette in `data/dist/passages/`, un file per capitolo (`ch01.json` … `ch10.json`), con il formato che legge `app/build/passages.js`. La build pubblica un file per riferimento con un nome opaco, senza capitoli completi né indice degli indirizzi; i nomi opachi non sono un controllo d'accesso.

## Dati richiesti

| File | Uso | Presente in questa copia |
|---|---|---|
| `app/public/data/roma.geojson` | confine comunale di Roma (OpenStreetMap) | sì |
| `app/public/data/gaddatlas.geojson` | luoghi, tessere, interpretazioni e rilievo di GaddAtlas | sì |
| `data/dist/atlas.slim.json` | atlante ridotto, senza estratti; usato da un test | sì |
| `data/dist/passages/` | brani del romanzo, un file per capitolo; solo per `npm run build` | no: non si distribuiscono (vedi «Senza estratti») |
| `app/carte-storiche/` | tre carte storiche del 1925: 36 immagini WebP e `manifest.json` | sì |

`gaddatlas.geojson` e `atlas.slim.json` sono derivati dal grafo di GaddAtlas e appartengono al profilo pubblico dei dati. In questa copia una nota critica che citava il romanzo è riformulata senza citazione.

Le carte storiche sono in `app/carte-storiche/`. Per ciascuna delle tre carte ci sono tre trattamenti tonali (tenue, leggibile, minimo) e quattro livelli di risoluzione (divisori 1, 2, 4, 8), in WebP senza perdita sui pixel visibili: 36 immagini. `manifest.json` descrive le tre fonti (titolo, anno, risoluzione al suolo), la georeferenziazione nel piano di Mercatore, la cornice e l'ellisse di ritaglio. In sviluppo il codice usa `app/local-basemap/` se esiste, altrimenti questa cartella.

## Moduli di sviluppo

`app/src/dev/` e alcuni rami del codice servono soltanto in sviluppo. Sono tutti condizionati a `import.meta.env.DEV`, che `npm run build` rende falso: Vite li elimina dalla build di produzione, dove nessun parametro dell'indirizzo li riattiva. Con `npm run dev` si raggiungono così:

| Modulo | Come si raggiunge in sviluppo | Come si disattiva |
|---|---|---|
| Pannello di prova delle transizioni («Regia», `src/dev/regie/`) | aprendo il percorso `/__dev/moto/` | non aprire quel percorso; nella build non esiste |
| Sovrascritture dei parametri (`src/model/config.js`) | parametro `?lab=` con un oggetto JSON di parametri, oppure la chiave `gaddatlas:lab` della memoria locale del browser | togliere il parametro e cancellare la chiave `gaddatlas:lab` |
| Varianti della determinazione (`src/dev/determinazione/`) | con `?lab=` che imposta la determinazione in modalità `tensione` o `appoggi` | come sopra |
| Fondi «raster» e «tratti» (`src/render/fondo.js`, `src/dev/fondo/`) | con `?lab=` che sceglie il fondo `raster` (tessere chieste a `tile.openstreetmap.org`) o `tratti` | come sopra |
| Carta storica locale (`build/local-basemap.js`) | con un `manifest.json` in `app/local-basemap/` o nella cartella indicata da `LOCAL_BASEMAP_DIR`, al posto di `app/carte-storiche/` | togliere la cartella o la variabile |
| Interfaccia di prova (`window.__GADDATLAS_TEST__`, `src/dev/scrubbing.js`) | sempre presente in sviluppo, dalla console del browser | non ha effetti senza una chiamata esplicita |
| Registro dei tempi di disegno (`src/dev/profile-log.js`) | è incluso anche nella build, ma scrive in console solo con `PROFILE: true` in `src/model/config.js` | `PROFILE` vale `false` |

## Licenze

- **Codice**: licenza MIT (`LICENSE`).
- **Dati di GaddAtlas** (`app/public/data/gaddatlas.geojson`, `data/dist/atlas.slim.json`): licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/deed.it, con attribuzione a Lorenzo Sabatino, GaddAtlas.
- **Dati OpenStreetMap**: `app/public/data/roma.geojson`, `app/src/assets/fondo/orientamento-osm.json` e `app/src/dev/fondo/tratti-osm.json` sono estratti da OpenStreetMap tramite Overpass API, licenza Open Database License 1.0 (ODbL), © OpenStreetMap contributors. L'interfaccia mostra l'attribuzione quando disegna il fondo derivato da OpenStreetMap.
- **Caratteri** (`app/src/assets/fonts/`): SIL Open Font License 1.1 (vedi «Attribuzioni»).
- **Estratti del romanzo**: non sono inclusi. L'opera è protetta dal diritto d'autore; gli estratti, dove l'interfaccia li mostra, sono citazioni ai sensi dell'art. 70 della legge 633/1941 e le licenze MIT e CC BY 4.0 non si applicano a essi.

## Attribuzioni

- **Caratteri**, tutti con licenza SIL Open Font License 1.1:
  - Bodoni Moda, Copyright 2020 The Bodoni Moda Project Authors (https://github.com/indestructible-type/Bodoni);
  - Public Sans, Copyright 2015 The Public Sans Project Authors (https://github.com/uswds/public-sans);
  - Literata, Copyright 2017 The Literata Project Authors (https://github.com/googlefonts/literata), in un sottoinsieme latino; il testo della licenza è in `app/src/assets/fonts/literata-OFL.txt`, perché il sottoinsieme non lo porta nei metadati.
- **Fondo di orientamento**: © OpenStreetMap contributors (ODbL).
- **Carte storiche** (`app/carte-storiche/`): Touring Club Italiano, Guida d'Italia, Italia centrale e Roma e dintorni, 1925 (prima edizione); riproduzioni dalla Collezione Valerio Varriale, stagniweb.it.
- **Fondo «raster»** (solo in sviluppo): tessere standard di OpenStreetMap, © OpenStreetMap contributors.

## Come citare

Lorenzo Sabatino, *GaddAtlas: interfaccia*, 2026, https://github.com/lnz-sbt3/gaddatlas. Il progetto è descritto in https://w3id.org/gaddatlas. I metadati di citazione sono in `CITATION.cff`.

## Strumenti di assistenza

Per l'uso di strumenti di assistenza si rinvia alla dichiarazione generale della tesi di dottorato di cui questo lavoro fa parte.
