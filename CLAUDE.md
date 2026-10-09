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

`docs/DECISIONS.md` contiene le decisioni motivate D-001…D-046; quelle dell'allineamento al
Capitolo 4 partono da D-019 (D-015…D-018 sono del porting, su `main`). Nel file sono in
ordine cronologico, non numerico. Prossimo numero libero: **D-047**. **Leggile
prima di proporre alternative architetturali.** Se una scelta ti sembra
sbagliata, dillo citando la decisione — non aggirarla in silenzio.

**Stato dei dati: allineato (chiusura della fase 1, 9 ottobre 2026).**
`data/dist/gaddatlas.geojson` dichiara `tripleCount 17263`, `buildVersion 4.3`,
`ontology CHORA`. ABox 16.093 triple, TBox 600; 309 luoghi (Imported 260 ·
Transformed 30 · Invented 14 · Imagined 5), 266 entità del gazetteer, 960
interpretazioni. Ogni task che cambia questi valori ne dà conto nella sua voce di
`DECISIONS.md`; un conteggio diverso senza una voce che lo spieghi vuol dire che i
derivati non sono allineati: `make all`. Il build è deterministico (D-022): due
`make all` consecutivi non devono produrre alcun diff.

Le tre non negoziabili:

1. **Niente framework reattivi** (D-001). Vite + moduli ES vanilla + `htl`. Il
   nucleo è un `<canvas>` con un loop `requestAnimationFrame` che muta array in
   place a 60fps: React combatte quel modello senza dare nulla in cambio.
2. **Non modificare i file derivati** (D-002, aggiornata da D-019 e D-020). Si
   toccano solo le sorgenti canoniche: `data/source/tables/*.tsv` (D-019),
   `data/source/mapping.yaml`, `data/source/void_seeds.json` e
   `ontology/chora.ttl` (D-020). Sono **derivati**: gli XLSX in
   `data/source/xlsx/` (`make xlsx`, per chi lavora in Excel), `ontology/chora.rdf`
   (RDF/XML per Protégé) e `ontology/chora.jsonld` (D-033), la documentazione in
   `ontology/docs/` (`make docs`), tutto ciò che sta in `data/dist/` (`make all`) e
   `app/public/data/` (`make publish-data`). Una modifica a mano lì sparisce al
   build successivo. Se Lorenzo lavora in Protégé, salva su `chora.ttl`.

3. **Nessun URL di hosting cablato** (D-007). Il `base` di Vite viene da una
   variabile d'ambiente. Il sito potrebbe passare da GitHub Pages a
   `projects.dharc.unibo.it`: deve restare una variabile, non una migrazione.

## Allineamento al Capitolo 4 della tesi (ottobre 2026) — lavoro in corso

Prima della Parte II il progetto va allineato a ciò che il Capitolo 4 afferma:
ipotesi H1–H8, requisiti R01–R22, proposizioni P1–P8. Le fonti di verità stanno in
`docs/thesis/`:

- `Capitolo 4.md` — il Capitolo 4 (conversione del docx). In caso di conflitto
  prevale;
- `GaddAtlas_Cap4_Allineamento_WorkOrder.md` (v1.2) — il censimento degli
  interventi (task T-xx), con matrice R → componenti, decisioni prese e aperte
  (§10) e ordine delle fasi (§11);
- `DATA_CHECKS_GaddAtlas.md` (v1.5) — registro dei controlli (DM-xx, DC-xx), con
  lo stato di ogni voce.

L'audit di fase 0 è in `docs/alignment/AUDIT_0.md`: file e righe di ogni task.
Dove ha corretto una premessa del work order, il work order è già stato
aggiornato.

**Regole di lavoro per questo filone:**

1. **Prima l'audit, poi le modifiche.** Ogni fase comincia con un audit in sola
   lettura scritto in `docs/alignment/AUDIT_<fase>.md`: per ogni task, file e righe
   coinvolti, stato attuale verificato e modifica proposta. Nessuna modifica finché
   Lorenzo non approva.
2. **Un task alla volta**, chiuso con un manifest (file e intervalli di righe) e con
   `make all && make audit && make shacl`. Riporta le triple e le violazioni prima
   e dopo.
3. **I task `DA DECIDERE` non si risolvono da soli:** prepara le opzioni e fermati.
4. **Nessuna sostituzione globale su valori semantici** (statuti, identificazioni,
   letture): ogni riassegnazione è caso per caso e motivata. **Unica eccezione,
   decisa da Lorenzo l'8/10/2026:** Invented e Imagined erano semplicemente
   invertiti di nome, e la correzione (DM-01, T-04) è una **permutazione
   completa**. Tutto ciò che era Imagined diventa Invented, tutto ciò che era
   Invented diventa Imagined, senza revisione critica. Si fa in modo atomico,
   passando per un valore temporaneo, così che nessun valore venga scambiato due
   volte; insieme si scambiano le definizioni SKOS nella TBox. Conteggi attesi
   dopo: Imported 260, Transformed 29, Invented 15, Imagined 5. Le riassegnazioni
   critiche successive (palazzo 219, palazzo Simonetti, edicola ecc.) seguono
   invece la regola generale.
5. Ogni decisione applicata va in `docs/DECISIONS.md` (da **D-019** in avanti), con
   requisito/ipotesi/data check di riferimento, stato precedente, motivazione con
   fonte e pagina, e la fase in cui è maturata (analisi del testo, prototipazione,
   revisione critica). Aggiorna lo stato della voce in `DATA_CHECKS_GaddAtlas.md`.
   È il materiale dell'Appendice J e dei capitoli 5–8.

**Invarianti semantiche introdotte dal Capitolo 4:**

- Statuto di realtà, dal concreto all'astratto: **Imported → Transformed →
  Invented → Imagined**. *Invented* = luogo fittizio in una geografia nota;
  *Imagined* = nessuna indicazione di posizione (Reuschel, Piatti e Hurni 2013).
  Legende, filtri e ordinamenti seguono quest'ordine.
- Precisione della localizzazione (SpatialDetermination: Precise / Relative /
  Approximate / Indeterminate) e statuto di realtà sono assi **indipendenti**:
  non vanno codificati con lo stesso canale.
- Ogni interpretazione è un'**asserzione attribuita** (chi, quando, su quale fonte,
  con quale storia di revisioni). Nessuna lettura è il default del modello: quella
  usata dall'interfaccia è marcata come «adottata dal progetto» ed è attribuita come
  le altre. Gli studiosi sono gli autori delle letture; Lorenzo è chi le codifica.
- **Niente `owl:sameAs` per i giudizi d'identità:** le identificazioni contese
  convivono come asserzioni alternative attribuite.
- **Niente indice unico di affidabilità:** l'incertezza ha un tipo, un asse
  (nome / identificazione / geometria), un'origine e un autore. «Non localizzato» ha
  tre valori (analisi non condotta, sospensione motivata, coordinata non
  applicabile) e non coincide con il dato mancante.
- **Il testo prevale sul repertorio:** discrepanze, sviste e anacronismi si
  registrano tipizzati, non si correggono. Le correzioni di lezione sono solo quelle
  dell'editore (es. Fattocchie → Frattocchie in QP 241).
- **Testo di riferimento:** QP (Adelphi 2018) nel volume **a stampa**. La copia
  digitale ha almeno una lezione non emendata: nel dubbio segnala, non correggere.
- I percorsi tipizzati (compiuto, indicato, sognato, inferito, direzionale,
  proposto) riguardano **solo i personaggi**: gli oggetti sono esclusi (DM-03).
  QP 237 («Pe la strada de Castel de Leva…») è un percorso *indicato*; il
  percorso *sognato* è QP 212.
- La diacronia dei testimoni (QPL → *Il palazzo degli ori* → QP) sta nel grafo e
  nella documentazione, **non** nell'interfaccia (DM-04).
- Le esclusioni sono pubbliche e motivate (`docs/EXCLUSIONS.md`, R12).

**Decisioni puntuali già prese (8/10/2026), da non rimettere in discussione:**

- il luogo `castello` **si mantiene**: è il luogo testuale della «stazione di
  Castello» e il bersaglio delle due identificazioni concorrenti (Castel
  Gandolfo, LS; Castel Savello, Manzotti 2010, p. 293). «Castel Savelli» è la
  lezione di QP 173: forma attestata, non grafia da uniformare (T-13);
- l'edicola ai Due Santi diventa **Imported**, con una nuova
  `gaz_edicola_due_santi` dalla piantina TCI (Manzotti 2010, p. 246); perde
  `Is_Part_Of = orto_vigna_due_santi`, sostituito da una relazione qualitativa
  (`Above` o `AdjacentTo`, da scegliere sul testo di QP 216). Si fa dopo T-04 (T-03);
- Casal Bruciato è il casale reale dell'Agro romano (non il quartiere del
  Tiburtino, eliminato): Imported, ancorato a `gaz_casale_abbruciato` nella
  posizione TCI adottata; la posizione IGM è l'alternativa (D-037, T-15).

## Comandi

```bash
make all        # fogli + TBox -> TTL -> geojson + passages -> audit
make audit      # nove invarianti fra sorgenti e derivati; esce 1 se falliscono
make shacl      # validazione SHACL, deve dire CONFORME
make queries    # 12 competency + 11 integrity query
make docs       # pyLODE dalla TBox
make xlsx       # TSV -> XLSX, per lavorare in Excel (nasce con T-80)
make publish-data  # copia GeoJSON e passages in app/public/data (nasce con T-83)

cd app
npm run dev     # dev server
npm run build   # build statica in app/dist
```

Dopo ogni modifica alle sorgenti dati: `make all && make audit`.

## Il porting da Observable — stato e regole

Il prototipo è `_archivio/chartD.js`: il notebook Observable appiattito, 5.306
righe. **Va versionato**, non ignorato: è l'artefatto che la tesi documenta.

**Stato (da `main`, settembre 2026): il porting è fatto.** I 34 moduli stanno in
`app/src/` (`model/`, `render/`, `interaction/`, `ui/`; `chartS4` portato senza
ristrutturarlo in `app/src/atlas.js`). I moduli che dipendono dai dati sono
funzioni factory, non IIFE (D-015); lo smontaggio degli handler è esplicito
(D-016); il pannello testuale è persistente per riferimento (D-018). **Restano
aperte tre verifiche** (D-017): selezione della route da terrazza, `dispose()` mai
invocata, confronto visivo a condizioni identiche. Gli screenshot di riferimento
del notebook sono in `_archivio/riferimento/`. Le regole qui sotto valgono per ogni
modifica al codice portato.

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
  = statuto di realtà, posizione radiale = rango di distanza dal polo. Niente
  riempimento delle celle Voronoi. Le linee sono riservate ai percorsi attestati e
  ordinati. Il canale per la SpatialDetermination e il segnale delle letture
  concorrenti sono **da decidere** (work order T-60, T-61): non introdurli senza
  una decisione registrata. Il resto
  dell'interfaccia sta in neutri caldi: ogni colore aggiunto altrove ruba
  capacità di significazione al canvas.

## Convenzioni

- Commenti e messaggi di commit **in italiano**, come il resto del progetto.
- La palette vive in `app/src/styles/tokens.css` come custom properties, e il
  canvas le legge da lì via `getComputedStyle`: un colore, un posto solo.
  I valori sono in `s4Config` del notebook — vanno estratti, non riscritti.
- Niente dipendenze oltre `d3` e `htl` senza una voce in `DECISIONS.md`.
- Prima di creare una voce D-0nn, aggiorna da `origin/main` e prendi il primo numero libero.
- Un artefatto pubblicato non carica nulla da CDN esterni.

## Cosa registrare

Quando prendi una decisione architetturale o ne scarti una alternativa,
aggiungi una voce a `docs/DECISIONS.md` (prossimo numero libero dopo l'ultima voce) con
data, alternative scartate e motivazione. Per le decisioni sui dati e sul modello
nate dal Capitolo 4 aggiorna anche `docs/thesis/DATA_CHECKS_GaddAtlas.md`. Serve al capitolo di tesi sul design dell'interfaccia: è la
ragione per cui quel file esiste.
