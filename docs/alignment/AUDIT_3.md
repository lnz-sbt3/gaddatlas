# AUDIT_3 — Fase 3: loci critici (sola lettura)

**10 ottobre 2026** · `main` a `c8528ca` · audit in sola lettura, nessuna sorgente modificata.

Fonte: il documento di Lorenzo «Loci critici – saggi», in sintesi nel messaggio del 10/10, con citazioni da Manzotti 2010, Terzoli 2015, Italia 2020 e Pinotti 2025. Nei dati entrano solo estratti brevi (colonna nuova `Quotation`, A4), con pagina.

**Principio:** nessun luogo annotato esce dall'interfaccia. Transformed, Invented e Imagined non hanno coordinate proprie, ma compaiono nel Diagramma dalle ancore. Lo stato `offMap` di D-057 è un errore da eliminare (blocco F).

---

## 1. Letture da inserire

Colonne: **id** proposto · **tipo** · **soggetto** · **valore** · **autore** · **fonte** · **pagina** · **adottata** · **fondamento** · **estratto breve**. Gli id seguono il tipo: N = denominazione (NamingAssertion), K = commento (CommentaryAssertion), T = attestazione nel repertorio, I = identificazione, U = incertezza, V = variante. «—» = non dichiarato o non pertinente; «default» = fondamento di default (D-070).

### 1.1 Robine Vecchie (ref_00403, QPa 169)

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| N-0001 | Naming | reference/ref_00403 | chora:TypoHypothesis | terzoli | terzoli_2015 | 491–492 | no | ref_00403 | ipotesi di refuso per «Robinie vecchie» |
| N-0002 | Naming | reference/ref_00403 | chora:TypoHypothesis | terzoli | terzoli_2015 | 491–492 | no | ref_00403 | refuso per «Rovine vecchie» (Rovina del Pecoraro, della Strega, del Fenilone, presso la Cecchignola) |
| N-0003 | Naming | reference/ref_00403 | chora:IronicLowering | terzoli | terzoli_2015 | 491–492 | no¹ | ref_00403 | «ironico abbassamento» delle «rovine», per parafrasi e paronomasia |
| K-0001 | Commentary | reference/ref_00403 | — | italia | italia_2020 | 102–103 | — | ref_00403 | secondo Italia, Pinotti 2018 emenda «Robine» come refuso di Garzanti 1992 |
| K-0002 | Commentary | reference/ref_00403 | — | lorenzo_sabatino | witness/qpa | 169 | — | ref_00403 | «In Pinotti 2018 non c'è emendamento di "Robine": QPa 169 legge "Robine Vecchie"» (risponde a K-0001, decisione 5) |

¹ S-robine_vecchie (statuto) non adotta nessuna delle tre ipotesi: nessuna NamingAssertion è adottata.

### 1.2 Cassero e Sant'Ignazio (ref_00404, QPa 169)

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| U-0010 | Uncertainty (asse nome, origine documentaria) | reference/ref_00404 | chora:Incompleteness | terzoli | terzoli_2015 | 492 | — | ref_00404 | «toponimi non segnalati nelle carte topografiche» |

**Dati:** il Cassero resta con una sola interpretazione, interp_00474. Le sue due ancore diventano `gaz_frattocchie` e `gaz_divino_amore` (il santuario: l'entità esiste), con relazione `near`, come tevere_biferno. Si toglie interp_00475 (Pavona). Nessuno stato di localizzazione; il luogo resta nel Diagramma. IQ20 va a 0 e poi a Violation; la voce Sant'Ignazio (DC-21) si chiude.

### 1.3 Frattocchie / Fattocchie e la variante «Marino»

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| K-0003 | Commentary | reference/ref_00588 (QPa 241) | — | italia | italia_2020 | 101 | — | ref_00588 | nessun elemento fa pensare a un'invenzione gaddiana; l'emendamento di Pinotti 2018 è giustificato (concorde con V-0001) |
| V-0005 | Variant | reference/ref_00132 (QPa 56, cap. II, «Ai Due Santi, al Torraccio, a le Frattocchie») | reference/ref_00734 (**nuova**, QPL, «Marino», pagina RR II da completare, estratto vuoto) | terzoli | terzoli_2015 | 142 | — | ref_00132 | le fermate del tram sostituiscono la sola «Marino» di QPL |

**Conflitto da decidere (decisione 2):** la regola di T-42 (D-054, controllo dell'audit «ogni variante collega due occorrenze dello stesso luogo») vieta V-0005. Le due occorrenze sono di luoghi diversi: il percorso tragitto_duesanti_frattocchie contro Marino. Lo stesso vale per la variante «da Faraja» di § 1.9.

### 1.4 Ca' Francesi, Tor ser Paolo, Fontana di Papa, osteria al bivio

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| I-0001 | Identification | narrativeplace/ca_francesi | gazetteer/gaz_ca_francesi | terzoli | terzoli_2015 | 512 | sì² | default | «località nei pressi della stazione delle Frattocchie» |
| I-0002 | Identification | narrativeplace/tor_ser_paolo | gazetteer/gaz_tor_ser_paolo | terzoli | terzoli_2015 | 512 | sì² | default | «o Torre Messer Paoli, tra via Cavona e via dei Laghi, presso Marino» |
| I-0003 | Identification | narrativeplace/fontana_di_papa | gazetteer/gaz_fontana_di_papa | terzoli | terzoli_2015 | 658 | sì² | ref_00529 (QPa 211, «verso la Fontana») | Fontana di Papa, frazione di Ariccia, una decina di km a sud delle Frattocchie lungo l'Anziatina |
| T-0021 | RepertoryAttestation | gazetteer/gaz_fontana_di_papa | source/bertarelli_1924 | terzoli | terzoli_2015 | 658 (Guida 1924, p. 561) | — | — | Guida 1924, p. 561 |
| I-0004, T-0022 | Identification + RepertoryAttestation | **osteria al bivio: nessun luogo e nessuna occorrenza nei dati** | un'«Osteria» sul bivio fra Appia Antica e strada del Divino Amore, cart. 1 e cart. 4 («Ost.») | terzoli | terzoli_2015 | 776 | — | ? | «osteriuccia… bivio» |

² Coerenti con le ancore attuali: un'identificazione adottata per un luogo che ha già ancore proprie non cambia la vista (D-045). Proposta: adottate (decisione 11).

**Osteria (decisione 1):** negli estratti di QPa non c'è «osteri(uccia)». Servono la pagina di QPa e l'estratto, poi un luogo (nuovo, o `bivio_falcognana_casal_bruciato`). L'entità «Osteria» non esiste: senza coordinate se non adottata. Mi fermo su questo caso.

### 1.5 Topografia della guida (Terzoli 2015, pp. 418–419)

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| T-0001 | RepertoryAttestation | gazetteer/gaz_ciampino | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Ciampino» sulla cart. 4 |
| T-0002 | RepertoryAttestation | gazetteer/gaz_tor_ser_paolo | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Tor ser Paolo» sulla cart. 4 |
| T-0003 | RepertoryAttestation | gazetteer/gaz_frattocchie | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Frattocchie» sulla cart. 4 |
| T-0004 | RepertoryAttestation | gazetteer/gaz_torraccio | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Torraccio» sulla cart. 4 |
| T-0005 | RepertoryAttestation | gazetteer/gaz_due_santi | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Due Santi» sulla cart. 4 |
| T-0006 | RepertoryAttestation | — (nessuna entità) | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Ponte di Santa Fumia» sulla cart. 4 |
| T-0007 | RepertoryAttestation | gazetteer/gaz_casale_abbruciato | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Casal Abbruciato» sulla cart. 4 |
| T-0008 | RepertoryAttestation | gazetteer/gaz_ponte_divino_amore | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Ponte del Divino Amore» sulla cart. 4 |
| T-0009 | RepertoryAttestation | gazetteer/gaz_pavona | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Pavona» sulla cart. 4 |
| T-0010 | RepertoryAttestation | gazetteer/gaz_solforata | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Zolforata» sulla cart. 4 |
| T-0011 | RepertoryAttestation | gazetteer/gaz_pratica_di_mare | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Pratica di Mare» sulla cart. 4 |
| T-0012 | RepertoryAttestation | gazetteer/gaz_ca_francesi | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Ca' dei Francesi» sulla cart. 4 |
| T-0013 | RepertoryAttestation | gazetteer/gaz_falcognana | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Falcognana» sulla cart. 4 |
| T-0014 | RepertoryAttestation | gazetteer/gaz_cecchina | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Cecchina» sulla cart. 4 |
| T-0015 | RepertoryAttestation | gazetteer/gaz_albano_laziale | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Albano» sulla cart. 4 |
| T-0016 | RepertoryAttestation | gazetteer/gaz_zagarolo | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Zagarolo» sulla cart. 4 |
| T-0017 | RepertoryAttestation | gazetteer/gaz_marino | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Marino» sulla cart. 4 |
| T-0018 | RepertoryAttestation | gazetteer/gaz_ariccia | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Ariccia» sulla cart. 4 |
| T-0019 | RepertoryAttestation | gazetteer/gaz_santa_palomba | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Santa Palomba» sulla cart. 4 |
| T-0020 | RepertoryAttestation | gazetteer/gaz_rocca_di_papa | source/bertarelli_1925 (cart. 4, tra pp. 736–737) | terzoli | terzoli_2015 | 418–419 | — | — | «Rocca di Papa» sulla cart. 4 |
| K-0004 | Commentary | **work/quer_pasticciaccio** (decisione 4) | — | terzoli | terzoli_2015 | 418–419 | — | — | «la topografia di QP è strettamente legata a quella della guida del Touring», anche per le indicazioni stradali date ai personaggi |

19 delle 20 entità esistono. Manca **Ponte di Santa Fumia**: il luogo `ponte_di_santa_fumia` è ancorato a `gaz_quarto_di_santa_fumia` (decisione 3). Le motivazioni degli statuti generati dei luoghi con queste ancore citeranno l'attestazione (regola ETL: se l'ancora primaria ha una RepertoryAttestation, la motivazione nomina repertorio e carta).

### 1.6 Casal Bruciato e dintorni

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| T-0023 | RepertoryAttestation | gazetteer/gaz_casale_abbruciato | source/bertarelli_1924 (cart. 2, tra pp. 480–481) | terzoli | terzoli_2015 | 766 | — | — | «C. Abbruciato» sulla cartina del 1924 (concorde con L-0001) |
| T-0024 | RepertoryAttestation | Ponte di Santa Fumia: **nessuna entità** (decisione 3) | source/bertarelli_1925 (cart. 4) | terzoli | terzoli_2015 | 911 | — | — | Ponte di Santa Fumia sulla cart. 4 |
| K-0005 | Commentary | route/tragitto_torraccio_ponte_divino_amore (QPa 297: Anziate → ponte di Santa Fumia → Tor di Gheppio → Casal Bruciato) | — | terzoli | terzoli_2015 | 911 (cfr. Terzoli 2008, pp. 109–113) | — | carrier ref_00698 | la strada dall'Anziate a Casal Bruciato, parallela alla Falcognana, corrisponde alla planimetria delle cart. 4 e 1 |
| K-0006 | Commentary | narrativeplace/casello_km_20_25 | — | terzoli | terzoli_2015 | 911³ | — | default | Terzoli lo chiama «immaginario» (commento: lo statuto non cambia) |
| K-0007 | Commentary | narrativeplace/tor_di_gheppio | — | terzoli | terzoli_2015 | 911³ | — | default | Terzoli la chiama «immaginaria» (commento: lo statuto non cambia) |
| K-0008 | Commentary | route/tragitto_sogno_casal_bruciato_campo_morto (R-0020, QPa 212) | — | manzotti | manzotti_2010 | 268–269 | — | ref_00534 | «per fil a dest»: passaggio a livello sulla Roma–Velletri presso il casello km 20,25, fra Santa Maria delle Mole (km 17,55) e Pavona (km 23,38); premonizione dell'itinerario di fuga |

³ Pagina da confermare: il messaggio colloca questi commenti sotto Terzoli 2015, p. 911 (decisione 8). La nota «fase 3» di R-0020 è sostituita da K-0008.

### 1.7 Monti Ernici, tenenza di Marino, Castel Porcano

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| T-0025 | RepertoryAttestation | gazetteer/gaz_monti_ernici | source/bertarelli_1924 (cart. 2) | terzoli | terzoli_2015 | 696 (Guida 1924, p. 498) | — | — | Guida 1924, p. 498 |
| I-0005 | Identification | narrativeplace/tenenza_carabinieri_marino | gazetteer/**gaz_palazzo_colonna_marino** (nuova, **senza coordinate**) | manzotti | manzotti_2010 | 239–240 | no | default | palazzo Frangipani-Orsini-Colonna su piazza Umberto I (oggi della Repubblica), non la palazzina in Pierangeli; «re-invenzione romantica» |
| S-tenenza_carabinieri_marino | Status (esistente) | — | Transformed | **manzotti** (era Lorenzo) | manzotti_2010 | 293–294 | sì | default | stessa motivazione |
| K-0009 | Commentary | narrativeplace/marino | — | manzotti | manzotti_2010 | 292–294 | — | default | Marino come topografia familiare (Longone-Lukones) e luogo di delizie enologiche |
| N-0004 | Naming | narrativeplace/castel_porcano | chora:Paraetymology, `playsOn` gazetteer/gaz_castel_porziano | manzotti | manzotti_2010 | 273 | — | ref_00538, ref_00539 | gioco paraetimologico su Castelporziano (Real Tenuta; TCI Italia centrale I, p. 569); vale anche per «Castel Porcino» |
| K-0010 | Commentary | reference/ref_00539 («Castel Porcino») | — | manzotti | manzotti_2010 | 276 | — | ref_00539 | lo slittamento Porcano → Porcino sottolinea lo spostamento del sogno verso la Zamira |

Le ancore attuali della tenenza (gaz_marino) non cambiano.

### 1.8 Palazzo Simonetti, Mappamonno

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| I-0006 | Identification | narrativeplace/palazzo_simonetti | gazetteer/gaz_palazzo_odescalchi_simonetti (esiste) | terzoli | terzoli_2015 | 535–536 | no | ref_00435 | palazzo Odescalchi Simonetti, via Vittoria Colonna 11 (indirizzo romano di Gadda, pensione White) |
| I-0007 | Identification | narrativeplace/palazzo_simonetti | gazetteer/**gaz_palazzo_de_carolis_simonetti** (nuova, senza coordinate) | grassadonia, lagossi, marchetti (originalSource glm) | terzoli_2015 | 536 | no | ref_00435 | palazzo De Carolis Simonetti, via del Corso 307 / via Lata 3 |
| I-0008 | Identification | narrativeplace/palazzo_simonetti | gazetteer/gaz_palazzo_de_carolis_simonetti | pinotti | pinotti_2025 | 78 | no | ref_00435, ref_00725 (dtsFG «via Lata») | stesso edificio, dalla lezione di dtsFG |
| N-0005 | Naming | reference/ref_00437 («palazzo der Mappamonno») | chora:Synecdoche, `playsOn` gaz_palazzo_venezia | terzoli | terzoli_2015 | 537 | — | ref_00437 | Palazzo Venezia indicato dalla Sala del Mappamondo |
| I-0009 | Identification | narrativeplace/palazzo_del_mappamondo | gazetteer/gaz_palazzo_venezia | terzoli | terzoli_2015 | 537 | **sì** | ref_00437 | Palazzo Venezia, sede di Mussolini |
| I-0010 | Identification | narrativeplace/palazzo_del_mappamondo | gazetteer/gaz_palazzo_chigi (esiste) | glm (originalSource) | terzoli_2015 | 537 | no | ref_00437 | Palazzo Chigi (Sala dei Mappamondi) |

L'adozione e le ancore di palazzo Simonetti restano quelle di D-036: nessuna identificazione adottata. Per S-palazzo_del_mappamondo (statuto, oggi autore Lorenzo) va deciso se passa a Terzoli (decisione 7).

### 1.9 «A la Vite» e Ditta Ciurlani

Il luogo **`vite` esiste già** (ref_00493, QPa 200, «O magari a la Vite…», Diomede; Imported, ancorato a `gaz_via_della_vite`, che esiste con coordinate). Non va creato: si aggiungono le letture.

| id | tipo | soggetto | valore | autore | fonte | pag. | adott. | fondamento | estratto |
|---|---|---|---|---|---|---|---|---|---|
| I-0011 | Identification | narrativeplace/vite | gazetteer/gaz_via_della_vite | terzoli | terzoli_2015 | ? (decisione 14) | sì | ref_00493 | ristorante Le Grotte, via della Vite |
| V-0006 | Variant | reference/ref_00493 | reference/ref_00735 (**nuova**, dtsFG, «da Faraja», pagina del dattiloscritto non registrata) | pinotti | pinotti_2025 | 78 | — | ref_00493 | dtsFG «da Faraja» = Gran Caffè Faraglia, angolo piazza Venezia / via Cesare Battisti |
| N-0006 | Naming | narrativeplace/ditta_ciurlani | chora:OnomasticPun | terzoli | terzoli_2015 | 433–435, 644 | — | default | «Ciurlani» e il truffaldino |

V-0006 ha lo stesso conflitto di V-0005 (luoghi diversi, decisione 2). S-ditta_ciurlani riceve la pagina «433–435, 644»: la voce Ciurlani si chiude.

**Non inseriti:** Terzoli 2015, p. 877 (Torraccio / *Il palazzo degli ori*: diacronia, DM-04) e p. 861 (non c'è una lettura sul percorso Marino–Albano da sostenere).

### 1.10 Entità del gazetteer

| entità | esiste | azione |
|---|---|---|
| gaz_divino_amore, gaz_fontana_di_papa, gaz_tor_ser_paolo, gaz_ca_francesi, gaz_palazzo_odescalchi_simonetti, gaz_palazzo_venezia, gaz_palazzo_chigi, gaz_via_della_vite, gaz_castel_porziano, gaz_monti_ernici e le 19 della guida | sì | nessuna |
| gaz_palazzo_colonna_marino (palazzo Frangipani-Orsini-Colonna, Marino) | no | **creare senza coordinate** (I-0005 non adottata) |
| gaz_palazzo_de_carolis_simonetti (via del Corso 307 / via Lata 3) | no | **creare senza coordinate** (I-0007, I-0008 non adottate) |
| Osteria al bivio | no | ferma (decisione 1) |
| Ponte di Santa Fumia | no | decisione 3 |
| Gran Caffè Faraglia | no | solo se la variante V-0006 richiede un luogo (decisione 2) |

**Nessuna lettura adottata richiede coordinate nuove.** Le identificazioni adottate (I-0001, I-0002, I-0003, I-0009, I-0011) puntano a entità con coordinate.

### 1.11 Agenti e fonti nuovi

- **Agenti:** `terzoli` (Maria Antonietta Terzoli), `italia` (P. Italia), `grassadonia`, `lagossi`, `marchetti` (nomi da completare: non sono nella bibliografia del Cap. 4).
- **Fonti** (blocco B):
  - **bertarelli_1924** (*Italia centrale* I, Guida TCI). Assorbe `tci_italia_centrale_1`: la carta di L-0001 è la cart. 2, tra pp. 480–481 (conferma: Terzoli 2015, p. 766), e la voce «data della carta TCI» si chiude;
  - **bertarelli_1925** (*Roma e dintorni* = *Italia centrale* IV). Assorbe `tci_guida_1925`; vi rinvia anche «TCI, Italia centrale IV, p. 761» di Manzotti (pp. 239–240);
  - **italia_2020** (bibliografia del Cap. 4);
  - **glm** (Grassadonia, Lagossi, Marchetti, citati di seconda mano in Terzoli 2015, pp. 535–537, con `chora:originalSource`; riferimento da completare);
  - **terzoli_2008**: anno 2008, con la nota «Terzoli 2015 lo cita come 2007 (p. 419) e 2008 (p. 911), stesse pp. 109–113: anno da verificare»;
  - **Censimento GaddAtlas**: data 2026.
  - Le carte sono locatori (`chora:sourcePage` dell'atto, es. «cart. 4, tra pp. 736–737»), non fonti distinte (decisione 13).
- **DC-03** (edicola, Manzotti 2010, p. 246): annotata la cart. 1 del 1925 come candidata (Terzoli 2015, p. 419 rinvia a Manzotti 2010: 246); la voce resta aperta.

**Totale letture nuove:**

| tipo | n. |
|---|---|
| RepertoryAttestation | 22, con l'Osteria 24 |
| Identification | 10, con l'Osteria 11 |
| Commentary | 10 |
| Naming | 6 |
| Variant | 2 |
| Uncertainty | 1 |
| **totale** | **51** (54 con le letture ferme) |

S-tenenza_carabinieri_marino e S-ditta_ciurlani si correggono.

---

## 2. Presenza nell'interfaccia (censimento sul GeoJSON pubblicato)

| | n. | dettaglio |
|---|---|---|
| NarrativePlace con almeno un'interpretazione | 296 | |
| presenti nel GeoJSON | 295 | gli Imported nella tessera dell'ancora primaria, gli altri con tessera propria |
| **assenti** | **1** | **robine_vecchie**: interpretazione senza ancora diretta, solo un ancoraggio relazionale Between → regola `offMap` di D-057 (`build_geojson.py` r. 485–498, 690–712, 868) |
| senza ancora | 1 | robine_vecchie (stessa causa) |
| voci `offMap` nel GeoJSON | 1 | robine_vecchie |
| codice dell'app che usa `offMap` | 0 | l'esclusione sta solo nell'adapter |

**NarrativePlace senza occorrenze (dichiarati, non toccati): 13.**

- I **12** «analisi non condotta» (D-048): colli_albani, colosseo, fontanella_della_scrofa, foro_italico, galleria_colonna, lungotevere_prati, piazza_garibaldi, piazza_san_pietro, prati_di_castello, quarto_di_santa_fumia, san_callisto, terme_di_caracalla.
- **castello**, che non ha occorrenze proprie: la «stazione di Castello», che ne è parte, le ha ed è in carta.

---

## 3. Modifiche proposte

**F, nessun luogo fuori dall'interfaccia** (prima di tutto):

- **TBox:** definizione di `chora:RelationalAnchoring`: «I termini (relata) sono ancore del luogo; la relazione dice come vi si lega». Tolta la frase «It produces no geometry… stays off the map». Commento della sezione D-057 aggiornato.
- **ETL:** ogni termine relazionale che è un'entità del gazetteer diventa anche `chora:anchorsToEntity` dell'interpretazione. Un termine che è un luogo narrativo (l'orto per l'edicola) resta solo relazionale.
  - **Effetto:** Robine Vecchie ha le ancore gaz_frattocchie e gaz_due_santi, come tevere_biferno.
  - **Effetto collaterale da verificare:** le interpretazioni di Casal Bruciato (11), Aliciaro e bivio acquistano ancore. Per Casal Bruciato l'ancora primaria resta il casale (D-038, la più frequente). Per Aliciaro e il bivio, `refers_to_entity_ID` si allunga e l'ospite della tessera nel Diagramma potrebbe cambiare (decisione 9).
- **Robine Vecchie:** tolti `SuspendedWithReason` e il motivo. L'incertezza sul nome resta in U-0004 e in N-0001…N-0003.
- **Adapter:** tolti `off_map`, l'elenco `offMap` e `excludedUnanchored` (o sempre 0). Un luogo interpretato senza ancore farebbe fallire il build.
- **Controlli permanenti:**
  - (a) **IQ21** e una shape SHACL-SPARQL **Violation**: ogni NarrativePlace con un'interpretazione adottata ha almeno un'ancora, diretta, ereditata con `isPartOf`, da identificazione adottata o dai termini relazionali;
  - (b) `audit_alignment.py`: ogni luogo con un'interpretazione adottata compare nel GeoJSON (tessera propria o tessera dell'ancora primaria), altrimenti `make audit` fallisce;
  - (c) nessun campo `offMap` nel GeoJSON.
- **App:** nessun codice da togliere. Verifica visiva: Robine Vecchie e il Cassero nel Diagramma dallo stadio 2, con glifo, presso le ancore.
- **D-057:** nota di correzione nella voce.

**A, modello:**

- `chora:RepertoryAttestation` (reifica `chora:attestedInRepertory`, GazetteerEntity → chora:Source; materializzata per tutte, non sono alternative).
- `chora:NamingAssertion` (reifica `chora:nameReading`, PlaceReference ∪ NarrativePlace → `chora:NamingMechanismScheme`: Paraetymology, Synecdoche, Paronomasia, IronicLowering, TypoHypothesis, OnomasticPun). `chora:playsOn` (lettura → GazetteerEntity, facoltativa, colonna `Plays_On`).
- `chora:CommentaryAssertion`, senza proprietà reificata e senza valore: esclusa dalla `ReifiedTypeShape` (che vale solo per i tipi con `reifiesProperty`); `AssertionShape` ammette `assertsValue` vuoto solo per questo tipo. Soggetto: occorrenza, luogo, percorso, entità e, se decidi così, l'opera (decisione 4).
- `chora:quotation` (langString, sull'atto), colonna `Quotation`.
- Mapping (`documentation`) e shape per i tre tipi. Per la risposta di K-0002 a K-0001: `cito:disagreesWith` (proposta, decisione 5).

**B, fonti:** come in § 1.11. In `Locations.tsv` una colonna `Repertory_Locator` (→ `chora:sourcePage` della geometria) per la cart. 2 di L-0001.

**C, letture:** come in § 1. Inoltre:

- la regola ETL che cita l'attestazione nelle motivazioni degli statuti generati;
- la pagina di S-ditta_ciurlani;
- l'autore di S-tenenza_carabinieri_marino;
- la nota di R-0020;
- il Cassero in un'interpretazione.

**D, esclusioni:** due voci nuove in `docs/EXCLUSIONS.md`: le partizioni città/campagna dei critici (nel grafo c'è solo l'ipotesi metrica P-0001), e la frizione dei luoghi di soglia (`chora:Threshold` senza istanze).

**E, documentazione e query:**

- `docs/MODELLO_LETTURE.md`: sostituisce TBOX_2 come riferimento; TBOX_2 e AUDIT_2b marcati superati.
- `ontology/queries/loci_critici.rq` (7 query), eseguita da `make queries`.
- DATA_CHECKS e work order.

**Stima:** circa 51 letture × circa 25 triple (lettura, atto, associazioni, codifica per gli studiosi) ≈ +1.300 nell'ABox, più le ancore dei termini relazionali (+30) e le fonti e gli agenti (+60). TBox ≈ +60.

---

## 4. Decisioni aperte (per Lorenzo)

1. **Osteria al bivio** (Terzoli 2015, p. 776): pagina e estratto di QPa, e luogo (nuovo, o `bivio_falcognana_casal_bruciato`). Fermo.
2. **Varianti di sostituzione** (V-0005 «Marino» ↔ fermate del tram; V-0006 «da Faraja» ↔ «a la Vite»): la regola «stesso luogo» (D-054) le vieta. Proposta: `chora:variantKind` con due valori, variante di forma (la regola attuale) e **variante di sostituzione** (luoghi diversi, ammessa e dichiarata). L'occorrenza dell'altro testimone punta al luogo che nomina: `marino`; per Faraja un luogo nuovo `faraglia`, senza interpretazioni, che quindi non entra nell'interfaccia, oppure nessun luogo.
3. **Ponte di Santa Fumia:** attestare `gaz_quarto_di_santa_fumia` (l'ancora attuale del luogo) o creare `gaz_ponte_di_santa_fumia` senza coordinate.
4. **Commento sul principio della guida** (K-0004): soggetto l'opera (`work/quer_pasticciaccio`)?
5. **Risposta di Lorenzo a Italia** (K-0002 → K-0001): `cito:disagreesWith`?
6. **Cassero:** `gaz_divino_amore` (il santuario, proposta) o `gaz_ponte_divino_amore`.
7. **S-palazzo_del_mappamondo:** l'autore passa a Terzoli, o resta Lorenzo con I-0009 attribuita a Terzoli?
8. **Pagina** dei commenti di Terzoli su casello e Tor di Gheppio «immaginari» (p. 911?).
9. **Termini relazionali come ancore per tutti gli ancoraggi relazionali** (non solo Robine): effetto sulle tessere di Aliciaro e del bivio; confronto visivo.
10. **Nomi** di Grassadonia, Lagossi, Marchetti e riferimento della loro opera.
11. **Identificazioni coerenti con le ancore** (I-0001, I-0002, I-0003, I-0011): adottate (proposta) o no.
12. **Pagina RR II** di «Marino» in QPL.
13. **Carte come locatori** dentro un'unica fonte per volume (proposta), invece di una fonte per carta.
14. **Pagina di Terzoli 2015** per «Le Grotte» (I-0011).
