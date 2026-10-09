# Esclusioni dichiarate

Che cosa il modello CHORA e l'atlante GaddAtlas **non** rappresentano, e perché
(requisito R12 del Capitolo 4). Ogni esclusione è una scelta, non una lacuna:
il dato assente per esclusione non va letto come dato mancante, né come prova
che il fenomeno manchi nel testo.

Ogni voce dà il fenomeno, che cosa resta fuori, dove eventualmente si trova
traccia del fenomeno, la decisione di riferimento.

---

## 1. Temporalità

La temporalità della storia, del racconto e del referente non è modellata. La
diacronia dei testimoni è registrata nel grafo (T-40) ma non è esposta
nell'interfaccia (DM-04).

- **Conseguenza:** il requisito R02 (temporalità di storia e memoria, del
  racconto, della scrittura e del referente annotate separatamente) non è
  soddisfatto. Il «momento del racconto» di R19 è la posizione dell'occorrenza
  nel testo (capitolo e pagina del riferimento), non un tempo (D-049).
  `prov:generatedAtTime` è la data dell'annotazione, non un tempo del testo.
- **Decisione:** Lorenzo Sabatino, 8 e 9 ottobre 2026 (work order T-45).

## 2. Percorsi degli oggetti

Il modello non rappresenta gli oggetti (per esempio i gioielli della
Menegazzi) come entità mobili con un itinerario proprio. I percorsi tipizzati
(compiuto, indicato, sognato, inferito, direzionale, proposto) riguardano solo
i personaggi.

- **Conseguenza:** nessun `chora:NarrativeRoute` ha per protagonista un oggetto;
  un focalizzatore collettivo (per esempio `corteo_funebre`) è un agente, non un
  oggetto.
- **Decisione:** DM-03 (7 ottobre 2026); work order T-54, T-70.

## 3. Diacronia dei testimoni nell'interfaccia

La successione dei testimoni (QPL → *Il palazzo degli ori* → QP) resta
nell'ontologia, nel grafo e nella documentazione, non nell'interfaccia.

- **Dove sta:** i testimoni e le derivazioni documentate (`chora:Witness`,
  `prov:wasDerivedFrom`, D-052); le occorrenze di confronto e le quattro
  varianti documentate (D-053). *Il palazzo degli ori* è un'opera correlata,
  senza occorrenze.
- **Conseguenza:** carta, rilievo, conteggi e brani usano solo le occorrenze del
  testimone di riferimento, QP (Adelphi 2018, nel volume a stampa). Le
  occorrenze degli altri testimoni non entrano nelle viste (D-053, D-054).
- **Decisione:** DM-04 (8 ottobre 2026); work order T-40…T-43.

## 4. Resa grafica dei percorsi non compiuti

I percorsi indicati, sognati, inferiti, direzionali e proposti sono registrati
e tipizzati nel grafo (T-54), ma non hanno una resa grafica sulla carta. Le
linee restano riservate ai percorsi compiuti, attestati e ordinati.

- **Conseguenza per l'interfaccia:** la carta disegna come linee solo i
  percorsi di tipo compiuto (`app/src/model/attested-routes.js`, D-060); gli
  altri tipi non hanno, per ora, alcuna resa. Un trattamento distinto per i
  percorsi non compiuti resta una decisione aperta del work order (T-64).
- **Decisione:** Lorenzo Sabatino, 9 ottobre 2026 (work order T-64).

---

## Copertura parziale dichiarata

Non sono esclusioni: il modello prevede il fenomeno, ma i dati lo coprono solo
in parte. L'assenza del valore vale «non annotato».

| Fenomeno | Annotato | Il resto | Decisione |
|---|---|---|---|
| Voce narrante (`chora:hasNarratingVoice`) | 5 interpretazioni, i casi discussi nel Cap. 4 (QP 61, 175, 211) | «non annotato»: non vuol dire che voce e focalizzatore coincidano | D-049 |
| Attribuzione della memoria (`chora:MemoryAssertion`) | QP 61, Dosso Faiti e Monte Cengio (Perosa, Lugnani, Cortellessa) | non annotato | D-049 |
| Partizione Roma città / campagna romana | 221 luoghi assegnati dal criterio di distanza | casi di confine e luoghi senza ancora non assegnati, in revisione | D-050 |
| Varianti di testimone | le quattro documentate dal Cap. 4 | le altre varianti non sono registrate | D-053 |
