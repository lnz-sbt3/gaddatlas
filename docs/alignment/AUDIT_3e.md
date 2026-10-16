# AUDIT_3e — Fase 3e: cartella `docs/esperimenti/` (sola lettura)

**16 ottobre 2026** · ramo `fase3e-esperimenti` da `main` a `978afb9` · audit in sola lettura, nessun file aggiunto alla repository, nessun commit.

Pacchetto: `esperimenti_pkg.zip` (in `~/Downloads`), estratto per l'audit in una cartella vuota dello scratchpad, fuori dalla repository. Contiene 11 file sotto `docs/esperimenti/`, esattamente quelli elencati nel prompt; nessun file riservato (`blocks.json`, `entities_merged.json`, `ner_xlmr.json`, output GeoJSON e TTL del pilota, cache, `.xlsx`).

| File | Righe di dati | Byte |
|---|---|---|
| `README.md` | — | 2.990 |
| `pilota/codice/run_pipeline.py`, `07_geocode_nominatim.py`, `08_export_geojson_rdf.py` | — | 11.777, 2.180, 2.495 |
| `pilota/candidati.tsv` | 31 | 2.543 |
| `pilota/occorrenze.tsv` | 30 | 1.663 |
| `pilota/geocodifiche.tsv` | 24 | 3.098 |
| `individuazione/protocollo.md` | — | 2.011 |
| `individuazione/proposte.tsv` | 1.315 | 143.385 |
| `individuazione/riepilogo.tsv` | 15 | 529 |
| `confronto/confronta.py` | — | 5.238 |

Prossimo numero libero in `DECISIONS.md`: **D-093** (ultima voce D-092). Prossima voce in DATA_CHECKS: **DC-35** (ultima DC-34).

---

## A1. Controllo del testo protetto

**Metodo.**
- Per ognuno dei 744 estratti di `data/source/tables/References.tsv`, tutte le sequenze di 6 parole consecutive: 9.335 sequenze distinte.
- Normalizzazione: NFKC, minuscole, apostrofi tipografici (’ ‘ ` ´ ʼ) uniformati e trattati come separatori (l’alba → l alba), punteggiatura sostituita da spazi.
- Ricerca in ogni file del pacchetto, testo normalizzato nello stesso modo; corrispondenze consecutive fuse in un'unica segnalazione.
- **Controllo del controllo:** un file di prova con «POVERA FIGLIOLA avrebbe atteso l'alba, sul tavolaccio!» (maiuscole, apostrofo dritto, punteggiatura diversa) è riconosciuto come ref_00744.

**Esito: nessuna corrispondenza** in nessuno degli 11 file.

**Campi TSV oltre i 120 caratteri: 4, tutti in `pilota/geocodifiche.tsv`, colonna `risultato_nominatim`.** Sono indirizzi restituiti da Nominatim, non testo del romanzo:

| Riga | Lunghezza | Inizio |
|---|---|---|
| 6 | 172 | «Ambasciata della Repubblica Federale di Germania in Italia, 4, Via San Martino della Battaglia, …» |
| 8 | 130 | «Chiesa di Santo Stefano del Cacco, Via Santo Stefano del Cacco, Pigna, …» |
| 13 | 121 | «Santa Maria Porta Paradisi, Via Antonio Canova, Campo Marzio, …» |
| 15 | 172 | come la riga 6 |

`proposte.tsv` non ha colonne di forme, estratti o note (colonne: riga, capitolo, pagina, modalita, luogo_proposto, stato_proposto, ancora_proposta, statuto_ipotesi, agenti_proposti, percorso_segnalato, esito, occorrenze_abbinate). `candidati.tsv` e `geocodifiche.tsv` hanno una colonna `forma` con forme brevi (toponimi riconosciuti dal pilota, per esempio «Italia», «Roma», «stra»), entro le 6 parole.

---

## A2. Coerenza con il dataset

Confronto con `References.tsv` su `main` (`978afb9`):

| File | Colonna | Id `ref_…` | Inesistenti | Pagine diverse da `Source_Reference` |
|---|---|---|---|---|
| `pilota/candidati.tsv` | `occorrenza_abbinata` | 15 | 0 | 0 |
| `pilota/occorrenze.tsv` | `occorrenza` | 30 | 0 | 0 |
| `individuazione/proposte.tsv` | `occorrenze_abbinate` | 315 | 0 | **14**, tutte di ±1 pagina |

- **Tutti gli id esistono ancora su `main`** e sono occorrenze del testimone di riferimento (`qpa`). Nessuno è fra quelli aggiunti dopo `133692c` (D-091, ref_00737–ref_00744).
- **Le 14 differenze di pagina** sono 9 casi in cui l'occorrenza sta una pagina prima della proposta e 5 una pagina dopo. Sono le proposte abbinate a occorrenze della pagina adiacente, secondo il criterio «stessa pagina ±1» dichiarato nel README del pacchetto (estratti a cavallo di pagina). Non sono errori. Righe: 13 (p. 168 → ref_00396, 00397, 00398 a p. 167), 90 (179 → ref_00443 a 178), 121 (181 → ref_00456, 00457, 00458 a 182), 419 (209 → ref_00516 a 210), 463 (212 → ref_00533 a 211), 681 (238 → ref_00580 a 239), 1157, 1158 e 1159 (292 → ref_00671, ref_00672, ref_00670 a 291), 1173 (293 → ref_00681 a 292).
- **Copertura del pilota:** su `main` le occorrenze QPa delle pp. 11–24 sono 30, e sono esattamente le 30 di `pilota/occorrenze.tsv` (nessuna mancante, nessuna in più).
- **Zagarolo (QP 20).** `candidati.tsv`: pagina 20, forma «Zagarolo», origine modello, giudizio «da verificare», occorrenza abbinata «assente dal dataset». Geocodificato da Nominatim (41,838 N, 12,831 E). Nel dataset il luogo `zagarolo` e `gaz_zagarolo` esistono, con occorrenze a partire da QPa 108 (ref_00256 e seguenti), ma **a pagina 20 non c'è un'occorrenza di Zagarolo**. Le occorrenze di p. 20 sono lazio, marsica, piceno, sannio, collina_molisana e santa_maria_in_porta_paradisi. La premessa della voce DC è confermata (A4).

---

## A3. Codice del pilota

- **Nessuna credenziale, chiave, token d'accesso, password, indirizzo e-mail o percorso personale** (`/Users/…`, `/home/…`, `C:\…`). «Token» compare solo come tokenizzazione del modello NER (`AutoTokenizer`).
- **URL presenti:**
  - Nominatim (`https://nominatim.openstreetmap.org/search?`, in `run_pipeline.py:158` e `07_geocode_nominatim.py:20`);
  - namespace standard (`http://schema.org/`, `http://www.w3.org/ns/prov#`);
  - **il namespace storico `https://atlantegadda.org/id/`** (`run_pipeline.py:214`, `08_export_geojson_rdf.py:39`): è il namespace del pilota, precedente a CHORA e a w3id (D-008, D-013). **Va segnalato e non cambiato.**
- **User-Agent** delle richieste a Nominatim: «GaddAtlas/1.0» (`run_pipeline.py:159`) e «AtlanteGadda/1.0» (`07_geocode_nominatim.py:21`), senza recapito. È storico e non si cambia; lo segnalo perché la policy di Nominatim chiede un recapito.
- **Percorsi relativi di input e output:** `QP_Adelphi.pdf` (`run_pipeline.py:13`, una copia digitale del romanzo, non inclusa), `data/geocoded.json`, `data/entities_merged.json`, `data/atlante_pilot.geojson`, `data/atlante_pilot.ttl`, `cache/geocode.json`. **Rischio da segnalare:** eseguiti dalla radice della repository, questi script scriverebbero proprio nella `data/` del progetto i file riservati (`entities_merged.json`, `atlante_pilot.ttl`…). Nessuno di questi percorsi è oggi in `.gitignore`. Non propongo di cambiare il codice; propongo una riga d'avvertenza nel rinvio di `CLAUDE.md` (A4). L'aggiunta dei percorsi a `.gitignore` sarebbe una modifica di configurazione oltre il perimetro: domanda 3.
- `confronto/confronta.py` legge i fogli riservati da `ESTRAZIONE_DIR` (default `materiali_riservati/`) e le tabelle da `TABLES_DIR` (default `data/source/tables`), e ne cita i nomi (`GaddAtlas_cap7_estrazione_spaziale.xlsx` ecc.). I nomi dei file non sono contenuto protetto.
- **Fine riga.** Hanno a capo **CRLF** sei file: i tre script del pilota, `individuazione/proposte.tsv`, `individuazione/riepilogo.tsv` e `pilota/geocodifiche.tsv` (nella prima versione di questo audit avevo indicato solo i tre script, perché avevo controllato solo i `.py`; corretto in fase B). `confronta.py`, i due `.md`, `candidati.tsv` e `occorrenze.tsv` hanno LF. `.gitattributes` impone `* text=auto eol=lf`, quindi all'aggiunta git li **normalizza a LF**, nella repository e nella working copy. Il contenuto non cambia, ma i byte sì. È la regola della repository (D-022: build e CI su Linux). **Domanda 1.**

---

## A4. Rinvii proposti (solo righe da aggiungere)

**`README.md`, sezione «Struttura del repository»** (r. 32–58), dopo la riga di `docs/EXCLUSIONS.md`:

```
└── docs/esperimenti/              esperimenti di estrazione: materiali di verifica dell'Appendice A, senza testo del romanzo
```

(la riga oggi finale, `docs/EXCLUSIONS.md`, passa da `└──` a `├──`)

**`CLAUDE.md`**, nei «Vincoli che non vanno rotti», in coda al punto **Estratti gaddiani**:

> `docs/esperimenti/` (materiali di verifica dell'Appendice A, D-093) **non contiene testo del romanzo**: solo pagine, forme brevi, identificatori e giudizi. I materiali con righe di testo o estratti (output del pilota, fogli dell'individuazione assistita) restano fuori dalla repository. Gli script del pilota scrivono in `data/` e `cache/` con percorsi relativi: non vanno eseguiti dalla radice della repository.

**`NOTICE-EXCERPTS.md`**, dopo il primo paragrafo:

> La cartella `docs/esperimenti/` (materiali di verifica dell'Appendice A della tesi) non contiene estratti del romanzo: solo numeri di pagina, forme brevi, identificatori delle occorrenze e giudizi. Il controllo è registrato in D-093.

(Lo segnalo e non lo tocco: il primo paragrafo di `NOTICE-EXCERPTS.md` dice «722 estratti brevi», un valore fermo al settembre 2026. Oggi gli estratti sono 744, di cui 738 nel testimone di riferimento. Domanda 4.)

**`docs/thesis/DATA_CHECKS_GaddAtlas.md`**, nuova voce aperta in § B, dopo DC-34, e una riga in una nuova sezione H:

| ID | Oggetto | Stato nel dataset | Evidenza | Azione | Task | Stato |
|---|---|---|---|---|---|---|
| DC-35 | Zagarolo a QP 20 | Il luogo `zagarolo` (`gaz_zagarolo`) ha occorrenze a partire da QPa 108; nessuna occorrenza a QPa 20 | Il pilota di riconoscimento automatico (ottobre 2025) riconosce «Zagarolo» a p. 20, con giudizio «da verificare» e senza occorrenza abbinata (`docs/esperimenti/pilota/candidati.tsv`) | LS verifica sul volume se il passo di QPa 20 andava annotato secondo la soglia di D-091 | — | Aperto (D-093) |

---

## A5. Manifest

**Aggiunti** (11 file, contenuto invariato salvo la normalizzazione degli a capo, domanda 1):
- `docs/esperimenti/README.md`
- `docs/esperimenti/pilota/codice/run_pipeline.py`, `07_geocode_nominatim.py`, `08_export_geojson_rdf.py`
- `docs/esperimenti/pilota/candidati.tsv`, `occorrenze.tsv`, `geocodifiche.tsv`
- `docs/esperimenti/individuazione/protocollo.md`, `proposte.tsv`, `riepilogo.tsv`
- `docs/esperimenti/confronto/confronta.py`

**Modificati** (solo righe aggiunte):
- `README.md` (struttura del repository, 1 riga più il raccordo `├──`);
- `CLAUDE.md` (Estratti gaddiani);
- `NOTICE-EXCERPTS.md` (1 paragrafo);
- `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-35, sezione H, intestazione di versione);
- `docs/DECISIONS.md` (D-093).

**Nuovo:** `docs/alignment/AUDIT_3e.md`.

**Non toccati:** dati, ontologia, app, test, derivati, documenti storici, tesi. Atteso dopo `make all && make audit && make shacl`: nessuna differenza nei derivati, 45.624 triple.

---

## Domande prima di procedere

1. **Fine riga dei tre script del pilota.** Va bene la normalizzazione CRLF → LF imposta da `.gitattributes`? È la mia proposta: il contenuto resta identico, e registro in D-093 che i byte differiscono dall'archivio solo per gli a capo. L'alternativa è un'eccezione `-text` per `docs/esperimenti/pilota/codice/*.py` in `.gitattributes`, che però modifica la configurazione della repository.
2. **Testo dei rinvii** in A4 (README, CLAUDE.md, NOTICE-EXCERPTS, DC-35): approvato così?
3. **`.gitignore`:** aggiungo i percorsi di output del pilota (`data/geocoded.json`, `data/entities_merged.json`, `data/atlante_pilot.*`, `cache/`), per evitare che un'esecuzione dalla radice li porti nella repository? Oppure basta l'avvertenza in `CLAUDE.md`?
4. **`NOTICE-EXCERPTS.md`, «722 estratti»:** lo correggo nella stessa riga (744, di cui 738 del testimone di riferimento) o resta fuori da questa fase?
