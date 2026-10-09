# REVIEW_2 — Revisione di fase 2

**9 ottobre 2026** · ramo `allinea-cap4-fase2` · da rivedere: Lorenzo Sabatino.

Questo file raccoglie le proposte e le bozze dei task T-33…T-54. Tutte sono già nei dati, con `Review_Status = bozza` dove sono letture. Per ogni riga basta scrivere nella colonna **OK / correzione**: «OK», oppure la correzione. Dopo la revisione applico le correzioni, porto a Violation le shape completate (StatusRationaleShape) e chiudo la fase (punto D).

Fonti: le pagine QP sono quelle degli estratti (copia digitale); dove serve il volume a stampa lo segnalo.

Sommario:

1. Motivazioni di statuto (T-33): 51 bozze
2. Statuto di castello e statuto di cinque luoghi Imagined
3. Incertezza tipizzata (T-34): 8 bozze
4. Livelli enunciativi (T-36): voce, memoria, momento del racconto
5. Partizione città / campagna (T-37): criterio e casi di confine
6. Revisioni (T-38)
7. Testimoni (T-40): metadati mancanti
8. Varianti e occorrenze di confronto (T-41, T-42)
9. Esclusioni (T-45)
10. Ancoraggio relazionale e fuori carta (T-47)
11. Forme attestate e soprannomi (T-48)
12. Percorsi tipizzati (T-54)

## 1. Motivazioni di statuto (T-33)

Bozze ricavate solo dalle descrizioni del censimento e dai passi del Cap. 4 (D-046). Le 49 dei luoghi non Imported sono le 49 avvertenze SHACL; due (Casal Bruciato, edicola) sono di luoghi Imported. Per ciascuna: lo statuto e la motivazione. Il tipo di motivazione è prova referenziale, prova testuale o lettura critica.

| id | luogo | statuto | tipo | motivazione proposta | fonte e pagina | OK / correzione |
|---|---|---|---|---|---|---|
| S-area_oltre_tevere | area_oltre_tevere | Transformed | prova testuale | Descrizione del censimento: «Area paesaggistica vaga e analogica, delimitata dal Tevere e costruita per accumulo descrittivo (castelli, vigne, colli, monti, piane)». | — | |
| S-barbiere | barbiere | Transformed | prova testuale | Descrizione del censimento: «Luogo generico: barbiere». | — | |
| S-bottega_ceccherelli | bottega_ceccherelli | Invented |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-buco_a_santignazio | buco_a_santignazio | Transformed |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-ca_francesi | ca_francesi | Transformed |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-camera_casello | camera_casello | Transformed | prova testuale | Parte di casello_km_20_25 nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. Descrizione del censimento: «camera da letto della Camilla Mattonari». | — | |
| S-cantinone_albano | cantinone_albano | Invented | prova testuale | Descrizione del censimento: «Ristorante non identificato nel territorio di Albano Laziale». | — | |
| S-casa_crocchiapani | casa_crocchiapani | Invented | prova testuale | Parte di tor_di_gheppio nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. Descrizione del censimento: «Abitazione immaginaria di Assunta (Tina) Crocchiapani». | — | |
| S-casa_del_butiro | casa_del_butiro | Imagined | prova testuale | Descrizione del censimento: «Casa immaginata nella zona dei Due Santi». | — | |
| S-casal_bruciato | casal_bruciato | Imported | prova referenziale | Casale reale dell'Agro romano, «Casal(e) Bruciato / Abbruciato / Abbrusciato» (Nibby, Dintorni di Roma, p. 569); posizione adottata TCI, alternativa IGM (D-037). Cap. 4, § 4.4 (r. 107): il disaccordo «non contrappone due differenti interpreti, bensì due distinti repertori cartografici». L'incertezza della posizione è SpatialDetermination, non statuto. | Manzotti 2010, p. 268–269 | |
| S-casello_km_20_25 | casello_km_20_25 | Transformed | prova testuale | Descrizione del censimento: «casello ferroviario in prossimità di Casal Bruciato». | — | |
| S-cassero | cassero | Invented |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-castel_porcano | castel_porcano | Imagined | lettura critica | Cap. 4, § 4.3 (r. 85): la denominazione è una «deformazione paraetimologica d'un toponimo reale» (Castelporziano, «il che penderebbe verso il luogo trasformato»), mentre la festa notturna «appartiene a uno spazio onirico e destrutturato, privo di collocazione metrica e dunque ascrivibile alla categoria dell'immaginato». Perimetro d'identità da dichiarare (H3, DC-09, DC-11). | Manzotti 2010, p. 273, 276 | |
| S-castello | castello | Invented | lettura critica | Luogo testuale della «stazione di Castello» (QP 279), bersaglio di due identificazioni concorrenti (Cap. 4, § 4.3, r. 93; § 4.4, r. 107): Castel Gandolfo (LS, A-0001) e Castel Savello (Manzotti 2010, p. 293, A-0002, adottata). Statuto da rivedere alla luce della lettura adottata (REVIEW_2). | Manzotti 2010, p. 293 | |
| S-casuccia_zamira | casuccia_zamira | Invented |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-cobianchi | cobianchi | Transformed | prova testuale | Descrizione del censimento: «Luogo specificato ma non identificabile». | — | |
| S-colli_saluberrimi | colli_saluberrimi | Transformed |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-ditta_ciurlani | ditta_ciurlani | Transformed |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-edicola_due_santi | edicola_due_santi | Imported | prova referenziale | Cap. 4, n. 24 (r. 601): «L'edicola dei Due Santi (QP 216, 219), che una prima lettura direbbe inventata, conserva secondo Manzotti una traccia nella piantina dei Castelli della guida del Touring». Imported (D-031); revisione della lettura di censimento (Imagined) in T-38. | Manzotti 2010, p. 246 | |
| S-gioielliere_catellani | gioielliere_catellani | Transformed | prova testuale | Descrizione del censimento: «negozio non identificabile». | — | |
| S-grotta_de_sor_pippo | grotta_de_sor_pippo | Invented | prova testuale | Descrizione del censimento: «Trattoria non meglio identificata nel territorio di Marino». | — | |
| S-laboratorio_zamira | laboratorio_zamira | Invented | prova testuale | Cap. 4, § 4.3 (r. 85): «il secondo “vortice” diegetico della bettola della Zamira, collocato in un non meglio precisato luogo della campagna dei Castelli», fra i luoghi inventati; r. 93: «la bettola della Zamira risiede ai Due Santi». | — | |
| S-montagne_degli_equi | montagne_degli_equi | Transformed | prova testuale | Descrizione del censimento: «Montagne appartenenti allo storico popolo degli Equi». | — | |
| S-monte_circeo | monte_circeo | Transformed | prova testuale | Descrizione del censimento: «Monte tirrenico, nel Lazio». | — | |
| S-monte_nuncupale | monte_nuncupale | Imagined | prova testuale | Cap. 4, § 4.3 (r. 85): «il Monte Nuncupale, posto a chiusura d'un orizzonte che spazia «da Rocca di Papa a Castel Savelli, giù: da Rocca Orsina al Monte Nuncupale, su» (QP 173)», fra i luoghi inventati. NB: nei dati è Imagined dopo la permutazione (D-030, D-035). | — | |
| S-orto_vigna_due_santi | orto_vigna_due_santi | Invented | prova testuale | Parte di laboratorio_zamira nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. Descrizione del censimento: «Luogo non precisato simile a un orto o una vigna, di fronte al laboratorio della Zamira, al lato opposto della via Appia». | — | |
| S-palazzo_219 | palazzo_219 | Transformed | prova testuale | Statuto Transformed confermato da LS (D-035, 9/10/2026). Cap. 4, tab. 4.2 (r. 273): «Palazzo al 219» come caso generatore di R07; DATA_CHECKS DC-08: edificio in una via reale, Transformed salvo diversa evidenza. Varianti 119 → 219 (QPL 285, 293 / QP 16, 25) in fase 2 (T-41). | — | |
| S-palazzo_del_mappamondo | palazzo_del_mappamondo | Transformed |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-palazzo_simonetti | palazzo_simonetti | Transformed | lettura critica | Palazzo reale (Simonetti o De Carolis) in via Lata, che QP 177 colloca in via Lanza, dove non esiste: trasformazione per rilocazione (D-036). Cap. 4, § 4.2 (r. 45): «la stampa del 1957 colloca in via Lanza – abbinamento privo di riscontro reale per l'edificio […] –, laddove il dattiloscritto registrava correttamente via Lata». | Pinotti 2025, p. 78 | |
| S-passaggio_livello_casal_bruciato | passaggio_livello_casal_bruciato | Transformed | prova testuale | Parte di casello_km_20_25 nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. | — | |
| S-pensione_burgess | pensione_burgess | Invented | prova testuale | Descrizione del censimento: «Albergo immaginario, possibile deformazione di Pensione Villa Borghese, via Sgambati 4, vicino Porta Pinciana». | — | |
| S-piani_alti_219 | piani_alti_219 | Transformed | prova testuale | Parte di palazzo_219 nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. Descrizione del censimento: «Interno del palazzo in via Merulana 219». | — | |
| S-piccarozzi | piccarozzi | Transformed | prova testuale | Descrizione del censimento: «Bar in galleria colonna». | — | |
| S-ponte_di_santa_fumia | ponte_di_santa_fumia | Transformed |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |
| S-ponte_divino_amore | ponte_divino_amore | Transformed | prova testuale | Descrizione del censimento: «Il «ponte» è il cavalcavia stradale della SP 91/b sulla ferrovia Roma–Velletri, oggi linea FL4. Non attraversa un corso d’acqua e non coincide con un ponte situato accanto al santuario.». | — | |
| S-porta_borgo_marino | porta_borgo_marino | Transformed | prova testuale | Descrizione del censimento: «Porta al confine del comune di Marino». | — | |
| S-pozzofondo | pozzofondo | Invented | prova testuale | Descrizione del censimento: «località immaginaria, luogo d'origine di Clelia Farcioni». | — | |
| S-robine_vecchie | robine_vecchie | Transformed | lettura critica | Cap. 4, § 4.3 (r. 83): «Robine Vecchie», che entrambe le edizioni conservano a testo (RR II, p. 154; QP 169), «non registrato nelle carte topografiche»: refuso per «Robinie vecchie» o «Rovine vecchie», oppure «ironico abbassamento» delle Rovine della zona; r. 93: situata «tra le Frattocchie e i Due Santi» (ancoraggio relazionale). | Terzoli 2015, p. 491 | |
| S-roccafringoli | roccafringoli | Imagined | prova testuale | Cap. 4, § 4.3 (r. 85): tra i luoghi inventati con «una precisa collocazione topografica», «Roccafringoli, situata «su su in cima ai monti, a monte Manno, quasi, che da Palestrina ce se va cor ciuccio» (QP 107)». NB: il capitolo lo dice inventato; nei dati è Imagined dopo la permutazione (D-030, D-035). | — | |
| S-scala_a | scala_a | Transformed | prova testuale | Interno del palazzo di via Merulana 219 (Is_Part_Of palazzo_219): Cap. 4, § 4.6 (r. 165): «lungo la scala A, al terzo piano, i coniugi Balducci risiedono esattamente «in faccia» alla contessa Menegazzi (QP 16)». Lo statuto segue quello del palazzo. | — | |
| S-scala_b | scala_b | Transformed | prova testuale | Interno del palazzo di via Merulana 219 (Is_Part_Of palazzo_219): Cap. 4, § 4.6 (r. 165), il dilemma se sia «meglio salire la scala A o la scala B» (Amigoni 1995, pp. 36–40). Lo statuto segue quello del palazzo. | — | |
| S-scale | scale | Transformed | prova testuale | Parte di palazzo_219 nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. Descrizione del censimento: «Interno del palazzo in via Merulana 219». | — | |
| S-scerpure | scerpure | Imagined | prova testuale | Cap. 4, § 4.3 (r. 85): «Scerpure, la favolosa città del maharajah posizionata «sulle rive, più o meno, del nativo Brahmaputra» (QP 141)», fra i luoghi inventati; «Scerpure esibisce un nome inventato a fronte d'una collocazione geografica nota». NB: nei dati è Imagined dopo la permutazione (D-030, D-035). | — | |
| S-stazione_carabinieri_castello | stazione_carabinieri_castello | Transformed | prova testuale | Parte di castello nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. | — | |
| S-stazione_pavona | stazione_pavona | Transformed | prova testuale | Descrizione del censimento: «Stazione del paese di Pavona, non meglio identificata». | — | |
| S-strada_di_campagna_celio | strada_di_campagna_celio | Transformed | prova testuale | Descrizione del censimento: «Strada non meglio qualificata nel quartiere del Celio». | — | |
| S-tenenza_carabinieri_marino | tenenza_carabinieri_marino | Transformed | lettura critica | Cap. 4, § 4.3 (r. 85): «Di segno spiccatamente trasformato appare […] la «Tenenza dei Carabinieri di Marino»: come ricorda Emilio Manzotti, negli anni Venti Marino ospitava unicamente una “stazione” dei carabinieri dipendente dalla tenenza di Frascati», sede definita «una re-invenzione romantica». | Manzotti 2010, p. 239, 293 | |
| S-terzo_piano_219 | terzo_piano_219 | Transformed | prova testuale | Parte di palazzo_219 nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte. Descrizione del censimento: «Interno del palazzo in via Merulana 219, terzo piano». | — | |
| S-tor_di_gheppio | tor_di_gheppio | Invented | prova testuale | Cap. 4, § 4.3 (r. 85): tra i luoghi inventati dotati di «una precisa collocazione topografica», «Tor di Gheppio (paese d'origine dell'Assunta Crocchiapani)»; § 4.4 (r. 115): «toponimo di finzione incastonato nella campagna dei Castelli, e dunque ascrivibile alla categoria dei luoghi inventati» (cfr. Cortellessa 2023, p. 679). | Cortellessa 2023, p. 679 | |
| S-via_delle_oche | via_delle_oche | Invented | prova testuale | Descrizione del censimento: «via topograficamente non precisata». | — | |
| S-villino_lungotevere | villino_lungotevere | Invented |  | Nessuna motivazione nei documenti del progetto (descrizione vuota, nessun passo del Cap. 4): da compilare. | — | |

## 2. Statuto di castello e di cinque luoghi Imagined

| caso | stato attuale | proposta | motivazione | OK / correzione |
|---|---|---|---|---|
| `castello` | Invented (S-castello, bozza) | **Imported** | La lettura adottata (A-0002, Manzotti 2010, p. 293) identifica la «stazione di Castello» (QP 279) con la stazione dei carabinieri di Castel Savello, un luogo reale nominato in forma ellittica. Con l'identificazione adottata il luogo non è più fittizio; «Castello» diventa forma attestata. Alternativa: Transformed, se l'ellissi si legge come deformazione del nome. Effetto: nessuno sulla carta (castello non ha occorrenze proprie); `stazione_carabinieri_castello`, che ne è parte, resta Transformed o segue. | |
| `roccafringoli` | Imagined (dopo la permutazione D-030) | **Invented** | Cap. 4, § 4.3, r. 85: Roccafringoli, Monte Nuncupale e Scerpure sono i luoghi «inventati» dotati «d'una precisa collocazione topografica» («su su in cima ai monti, a monte Manno, quasi», QP 107). È la definizione di Invented (luogo fittizio in una geografia nota). Riassegnazione caso per caso, non permutazione. | |
| `monte_nuncupale` | Imagined | **Invented** | Stesso passo: «da Rocca di Papa a Castel Savelli, giù: da Rocca Orsina al Monte Nuncupale, su» (QP 173). | |
| `scerpure` | Imagined | **Invented** | Stesso passo del Cap. 4 (r. 85), QP 140–141; ancorato alle rive del Brahmaputra. | |
| `casa_del_butiro`, `castel_porcano` | Imagined | da decidere | Entrambi hanno un ancoraggio relativo (Due Santi; Castelporziano). Se gli altri tre passano a Invented, restano Imagined solo questi due; la coerenza con la definizione («nessuna indicazione di posizione») va verificata sul testo (QP 193, 213). | |

Se le tre riassegnazioni sono confermate, i conteggi diventano Imported 260 · Transformed 30 · Invented 17 · Imagined 2 (castello Imported: Imported 261 · Invented 16), e lo stato `NotApplicable` (D-048) dei luoghi che non sono più Imagined va rivisto.

## 3. Incertezza tipizzata (T-34)

| id | luogo | tipo | asse | origine | motivazione | fonte e pagina | OK / correzione |
|---|---|---|---|---|---|---|---|
| U-0001 | casal_bruciato | Confusion | geometria | documentaria | La topografia di Gadda «pare combinare e forse confondere» le due ferrovie, «fondandosi […] più sulla memoria di escursioni in loco, che sui rilievi delle carte»; TCI e testo tra le due ferrovie, IGM a ovest della Roma–Napoli. Discrepanza fra testo e repertorio, non corretta (D-037). | Manzotti 2010, p. 268–269 | |
| U-0002 | castello | ContestedIdentification | identificazione | costruttiva | Due identificazioni concorrenti della «stazione di Castello» (QP 279): Castel Gandolfo (lettura immediata, A-0001) e Castel Savello (Manzotti, A-0002, adottata). Cap. 4, § 4.4 (r. 107). | Manzotti 2010, p. 293 | |
| U-0003 | palazzo_simonetti | ContestedIdentification | identificazione | documentaria | Quale palazzo reale sta dietro il «palazzo Simonetti» in via Lanza (QP 177): il palazzo Simonetti / De Carolis in via Lata del dattiloscritto (Pinotti) o il palazzo Odescalchi Simonetti di via Vittoria Colonna (Terzoli, cit. ivi). Cap. 4, § 4.2 (r. 45). | Pinotti 2025, p. 78 | |
| U-0004 | robine_vecchie | Discrepancy | nome | documentaria | «Robine Vecchie» (QP 169) non è registrato nelle carte topografiche: refuso per «Robinie vecchie» o «Rovine vecchie», oppure «ironico abbassamento» delle Rovine della zona; Pinotti conserva la lezione. Cap. 4, § 4.3 (r. 83). | Terzoli 2015, p. 491 | |
| U-0005 | edicola_due_santi | Incompleteness | geometria | costruttiva | Il tabernacolo ha traccia nella piantina dei Castelli del Touring (Manzotti), ma il progetto non dispone di una coordinata: la posizione deriva da Due Santi con uno scarto dichiarato di circa 40 m (D-031); il volume TCI citato è da verificare (DC-03). | Manzotti 2010, p. 246 | |
| U-0006 | monti_ernici | NonSpecificity | identificazione | documentaria | «d'in vetta al crinale degli Ernici o dei Simbruini» (QP 215): identificazione per disgiunzione, non risolta dal testo (WO T-16; Cap. 4, § 4.4). | Manzotti 2010, p. 290 | |
| U-0007 | carsoli | Oversight | nome | documentaria | «Càrsoli» (QP 210) in luogo della grafia corretta Carsòli, «frutto verosimilmente di un'attrazione analogica con la vicina Àrsoli» (Cap. 4, § 4.4, r. 111). Discrepanza di forma registrata, non corretta. | Manzotti 2010, p. 254 | |
| U-0008 | direttissima_roma_napoli | Anachronism | identificazione | documentaria | La direttissima Roma–Napoli fu ultimata e inaugurata dopo gli eventi narrati (marzo 1927) (Cap. 4, § 4.4, r. 111). Anacronismo registrato, non corretto. | Manzotti 2010, p. 270 | |

## 4. Livelli enunciativi (T-36, D-049)

| voce | proposta | fonte e pagina | OK / correzione |
|---|---|---|---|
| voce narrante, QP 211, Porta San Paolo (interp_00636, focalizzatore Pestalozzi) | narrator | Savettieri 2020, p. 44 | |
| voce narrante, QP 175, Ciampino e Santa Palomba (interp_00503, 00504, Santarella) | narrator | Perosa 2023a, p. 238 | |
| voce narrante, QP 61, Dosso Faiti e Monte Cengio (interp_00168, 00169, Ingravallo) | narrator | Cap. 4, § 4.3, r. 87 | |
| momento del racconto | posizione dell'occorrenza nel testo (capitolo, pagina), nessun tempo della storia o della stesura: la temporalità è esclusa (T-45). Il «tempo della stesura» di QP 211 (Savettieri 2020, p. 44) riguarda un'allusione, non un luogo | Cap. 4, R19; EXCLUSIONS, voce 1 | |
| nome dello studioso `matt` in Agents | «L. Matt»: nome per esteso da confermare | Cap. 4, bibliografia | |

| id | interpretazione | memoria | autore | fonte e pagina | OK / correzione |
|---|---|---|---|---|---|
| M-0001 | interp_00168 | AuthorMemory | perosa | Perosa 2023a, p. 103–104 | |
| M-0002 | interp_00168 | CharacterMemory | lugnani | Lugnani, cit. in Perosa 2023a, p. 104, n. 97 | |
| M-0003 | interp_00168 | AuthorMemory + CharacterMemory | cortellessa | Cortellessa 2023, p. 669 | |
| M-0004 | interp_00169 | AuthorMemory | perosa | Perosa 2023a, p. 103–104 | |
| M-0005 | interp_00169 | CharacterMemory | lugnani | Lugnani, cit. in Perosa 2023a, p. 104, n. 97 | |
| M-0006 | interp_00169 | AuthorMemory + CharacterMemory | cortellessa | Cortellessa 2023, p. 669 | |

Nessuna lettura della memoria è adottata (Cap. 4: «conservarle in parallelo»). Se il progetto vuole una propria lettura («indecidibile»), va aggiunta come asserzione di Lorenzo.

## 5. Partizione Roma città / campagna romana (T-37, D-050)

**Criterio proposto** (P-0001, Lorenzo, adottata, bozza): distanza dell'ancora primaria del luogo dal Campidoglio. **Città** fino a 10 km: la soglia cade in un vuoto dei dati, fra l'Acqua Marcia (8,4 km) e Castel di Leva (12,9). **Campagna romana**, Castelli compresi, fra 10 e 30 km. Oltre 60 km un luogo non appartiene a nessuna delle due zone. Assegnati 221 luoghi: 162 alla città, 59 alla campagna.

Il poligono comunale di `roma.geojson` è scartato: include l'Agro (Divino Amore, Castel di Leva, Tor di Gheppio) ed esclude il Vaticano.

| decisione | OK / correzione |
|---|---|
| criterio (distanza, soglie 10 e 30 km) | |
| poligono comunale scartato | |

**Casi di confine, non assegnati.** Nella colonna: città, campagna, nessuna.

| luogo | statuto | ancora primaria | km | perché è di confine | OK / zona |
|---|---|---|---|---|---|
| strada_di_campagna_celio | Transformed | gaz_celio | 1,4 | «campagna» dentro la citta' (Celio) | |
| tranvie_dei_castelli | Imported | gaz_tranvie_dei_castelli | 3,4 | linea tranviaria Roma–Castelli | |
| via_anziate | Imported | gaz_via_anziate | 3,9 | via che dalla citta' porta ad Anzio | |
| via_della_caffarella | Imported | gaz_via_della_caffarella | 4,0 | valle agricola dentro il comune, a 4 km dal centro | |
| via_appia | Imported | gaz_via_appia | 5,8 | via consolare che dal centro attraversa la campagna fino ai Castelli | |
| aniene | Imported | gaz_aniene | 6,1 | fiume che attraversa citta' e campagna | |
| acquedotto_claudio | Imported | gaz_acquedotto_claudio | 7,5 | acquedotto che entra in citta' dalla campagna | |
| acqua_pia_antica_marcia | Imported | gaz_acqua_pia_antica_marcia | 8,4 | acquedotto che entra in citta' dalla campagna | |
| via_ardeatina | Imported | gaz_via_ardeatina | 17,3 | via consolare che dalla citta' attraversa la campagna | |
| castel_porcano | Imagined | gaz_castel_porziano | 17,8 | Imagined; litorale (Castelporziano) | |
| ferrovia_roma_velletri | Imported | gaz_ferrovia_roma_velletri | 18,0 | linea ferroviaria Roma–Velletri | |
| casa_del_butiro | Imagined | gaz_due_santi | 18,4 | Imagined, ancorata ai Due Santi in modo relativo | |
| lazio | Imported | gaz_lazio | 22,9 | regione: scala superiore alla partizione | |
| litorale_fiumicino | Imported | gaz_fiumicino | 24,6 | litorale | |
| ostia | Imported | gaz_ostia | 24,6 | litorale, dentro il comune | |
| area_oltre_tevere | Transformed | gaz_colli_albani | 25,2 | ancorata ai Colli Albani: ancora da verificare | |
| colli_saluberrimi | Transformed | gaz_colli_albani | 25,2 | ancorata ai Colli Albani: campagna o colli? | |
| monte_nuncupale | Imagined | gaz_colli_albani | 25,2 | Imagined, ancorato ai Colli Albani in modo relativo | |
| tiburtino | Imported | gaz_tivoli | 27,5 | ancorato a Tivoli (27,5 km): quartiere Tiburtino o territorio di Tivoli? | |
| direttissima_roma_napoli | Imported | gaz_direttissima_roma_napoli | 30,6 | linea ferroviaria Roma–Napoli | |
| campoleone | Imported | gaz_campoleone | 31,1 | fra 30 e 60 km: limite esterno della campagna romana | |
| velletri | Imported | gaz_velletri | 33,7 | fra 30 e 60 km: limite esterno della campagna romana | |
| litorale_ladispoli | Imported | gaz_ladispoli | 34,1 | litorale, 34 km | |
| palestrina | Imported | gaz_palestrina | 34,2 | fra 30 e 60 km: limite esterno della campagna romana | |
| monte_soratte | Imported | gaz_monte_soratte | 41,9 | fra 30 e 60 km: limite esterno della campagna romana | |
| monte_manno | Imported | gaz_monte_manno | 42,8 | fra 30 e 60 km: limite esterno della campagna romana | |
| roccafringoli | Imagined | gaz_monte_manno | 42,8 | fra 30 e 60 km: limite esterno della campagna romana | |
| campo_morto | Imported | gaz_campo_morto | 44,4 | fra 30 e 60 km: limite esterno della campagna romana | |
| monteleone | Imported | gaz_monteleone | 48,9 | fra 30 e 60 km: limite esterno della campagna romana | |
| montagne_degli_equi | Transformed | gaz_monti_carseolani | 49,7 | fra 30 e 60 km: limite esterno della campagna romana | |
| monti_carseolani | Imported | gaz_monti_carseolani | 49,7 | fra 30 e 60 km: limite esterno della campagna romana | |
| anzio | Imported | gaz_anzio | 51,0 | fra 30 e 60 km: limite esterno della campagna romana | |
| carsoli | Imported | gaz_carsoli | 57,8 | fra 30 e 60 km: limite esterno della campagna romana | |

**Luoghi senza ancora (analisi non condotta, D-048).** La zona proposta è ricavata dal nome, non dal criterio.

| luogo | zona proposta | OK / zona |
|---|---|---|
| colli_albani | campagna | |
| colosseo | città | |
| fontanella_della_scrofa | città | |
| foro_italico | città | |
| galleria_colonna | città | |
| lungotevere_prati | città | |
| piazza_garibaldi | città | |
| piazza_san_pietro | città | |
| prati_di_castello | città | |
| quarto_di_santa_fumia | campagna | |
| san_callisto | città | |
| terme_di_caracalla | città | |

## 6. Revisioni (T-38, D-051)

| caso | scelta | OK / correzione |
|---|---|---|
| edicola: valore della lettura del censimento (C-edicola_due_santi) | `chora:Invented`. Nel censimento l'etichetta era «Imagined», che prima della correzione di D-030 designava il luogo fittizio in una geografia nota. Il messaggio del 9/10 dice «Imagined (censimento)»: se si vuole il valore letterale, va scritto Imagined, ma allora la revisione attraverserebbe la permutazione | |
| Casal Bruciato: l'IRI `gazetteer/gaz_casal_bruciato` (entità eliminata in D-029) resta come valore della lettura superata, senza tipo né coordinate | | |
| data delle tre letture del censimento | non registrata: lasciata vuota. Se esiste (anno del censimento), indicarla | |

## 7. Testimoni (T-40, D-052): metadati mancanti

| testimone | campo | stato | OK / valore |
|---|---|---|---|
| QPL | curatore / direttore | vuoto; il vecchio foglio delle opere diceva «Letteratura, Bonsanti» (direttore della rivista?) | |
| QPL | pagine e fascicolo per ciascuna puntata | vuoto (la redazione è citata da RR II, pp. 277–460) | |
| dtsFG | data | vuota; i capitoli nuovi sono consegnati fra il 23/4/1955 e il 6/2/1957 (Matt e Pinotti 2022, pp. 271–272) | |
| bzFG | data | vuota; probabilmente 1957 | |
| dtsFG, bzFG | segnatura nel Fondo Gelli | vuota | |
| derivazione dtsFG → bzFG | prov:wasDerivedFrom | non scritta: non documentata nei file del repository | |
| derivazione QP57 → RR II, QP57 → QP | prov:wasDerivedFrom | non scritte: non documentate nei file del repository | |
| Il sogno del brigadiere (1953), Sceneggiatura per il finale, Ingravola in campagna | opere o testimoni | non registrati: solo *Il palazzo degli ori*, come chiesto | |

## 8. Varianti e occorrenze di confronto (T-41, T-42; D-053, D-054)

| voce | stato | OK / correzione |
|---|---|---|
| estratti di QPL 285 e 293 (ref_00726, ref_00727) | vuoti: il repository non ha il testo di QPL. Il Cap. 4 cita «quer gran palazzo del centodicinnove» senza pagina. Sono 2 delle 3 avvertenze SHACL oltre le 49 | |
| estratto e pagina di dtsFG per via Lata (ref_00725) | vuoti (terza avvertenza) | |
| attribuzione di V-0003 (civico 119/219) a Matt e Pinotti 2022, schede 8, 11, 30, 31 | segue la citazione unica del Cap. 4, r. 45, che vale per entrambe le varianti del palazzo | |
| corrispondenza riga per riga QPL 285/293 ↔ QP 16/25 | non registrata (non documentata) | |
| occorrenza di confronto di dtsFG puntata a `via_lanza` (stesso luogo dell'occorrenza di QP 177) | regola di T-42 | |

## 9. Esclusioni (T-45, D-056)

| voce | stato | OK / correzione |
|---|---|---|
| figuralità delle occorrenze | **non aggiunta**. Il Cap. 4, § 4.6, r. 190 chiede di dichiararla «tra i fenomeni esclusi (R12)»; non era nell'elenco del 9/10 | |
| R02 dichiarato non soddisfatto (conseguenza dell'esclusione della temporalità) | scritto in EXCLUSIONS, voce 1 | |

## 10. Ancoraggio relazionale e fuori carta (T-47, D-057)

| voce | stato | OK / correzione |
|---|---|---|
| Robine Vecchie: ancoraggio «tra» Frattocchie e Due Santi, nessuna posizione, sospensione motivata, fuori carta (`offMap`) | applicato; la tessera sparisce dalla carta | |
| `interp_00473` (doppione di Robine, stesso passo e focalizzatore) eliminata: interpretazioni 960 → 959 | applicato | |
| Casal Bruciato: posizione solo dal casale (TCI), sei luoghi intorno come termini `near`; tolta la relazione `near` dell'interpretazione | applicato | |
| Edicola ai Due Santi AdjacentTo orto/vigna (QP 216, interp_00660) | applicato (T-53) | |

## 11. Forme attestate e soprannomi (T-48, D-059)

Soprannomi e varianti sul luogo:

| luogo | proprietà | forme | OK / correzione |
|---|---|---|---|
| palazzo_219 | soprannome (`chora:nickname`) | palazzo de li pescicani; er palazzo dell'oro | |
| due_santi | variante (`skos:altLabel`) | li Du Santi | |
| castel_savello | variante | Castel Savelli (QP 173) | |
| castel_porcano | variante | Castel Porcino (QP 213) | |
| casal_bruciato | variante (c'era già) | Casale Abbrusciato (QP 297) | |
| palazzo_219 | varianti rimaste in `Alternative_Toponym` | ben nota architettura; casermone color pidocchio; sto palazzo; camere al duecentodiciannove; il duecentodiciannove: sono perifrasi, già forme attestate sulle occorrenze. Proposta: toglierle dalle varianti | |
| milano | etichetta | l'etichetta è «Milanno», le 6 occorrenze stampano «Milano». Proposta: etichetta «Milano» (T-74) | |

**Forme attestate sulle occorrenze** (178; per luogo). Ogni forma è una sottostringa esatta dell'estratto della copia digitale: da confermare sul volume a stampa dove il dubbio conta. Le 149 occorrenze senza forma evocano il luogo con una descrizione o un pronome.

| luogo | etichetta | forme (riferimento, pagina) | OK / correzione |
|---|---|---|---|
| banca_commerciale_italiana | Banca Commerciale Italiana | «Banca Commerciale» (00224, QP 95) | |
| banco_di_santo_spirito | Banco di Santo Spirito | «Banco de Santo Spirito» (00225, QP 95); «Banco de Santo Spirito» (00235, QP 103); «Banco de Santo Spirito» (00285, QP 134) | |
| buco_a_santignazio | Buco a Sant'Ignazio | «Buco a Sant’Ignazzio» (00494, QP 200) | |
| campo_morto | Tenuta di Campo Morto | «Campo Morto» (00536, QP 212) | |
| cantinone_albano | Cantinone d'Albano | «cantina di Albano» (00188, QP 78) | |
| casa_crocchiapani | Casa Crocchiapani | «Crocchiapani» (00718, QP 299) | |
| casal_bruciato | Casal Bruciato | «Casale Abbrusciato» (00695, QP 297) | |
| casello_km_20_25 | Casello al chilometro 20-25 | «casello chilometro 20,25» (00586, QP 241); «chilometro 20,25» (00611, QP 262) | |
| castel_di_leva | Castel di Leva | «Castel de Leva» (00566, QP 237) | |
| castel_porcano | Castel Porcano | «Castel Porcino» (00539, QP 213) | |
| castel_savello | Castel Savello | «Castel Savelli» (00413, QP 173) | |
| castelli_romani | Castelli Romani | «Castelli» (00628, QP 273) | |
| collegio_romano | Collegio Romano | «Colleggio Romano» (00136, QP 57) | |
| dosso_faiti | Dosso Faiti | «Faiti» (00144, QP 61) | |
| due_santi | Due Santi | «li Du Santi» (00379, QP 159); «li Du Santi» (00385, QP 162); «li Du Santi» (00388, QP 163); «li Du Santi» (00452, QP 180); «li Du Santi» (00480, QP 197); «li Du Santi» (00533, QP 211); «li Du Santi» (00540, QP 215); «li Du Santi» (00552, QP 217); «li Du Santi» (00564, QP 234); «li Du Santi» (00620, QP 268) | |
| edicola_due_santi | Edicola ai Due Santi | «edicola delli Du Santi» (00553, QP 219) | |
| ferrovia_roma_velletri | Ferrovia Roma-Velletri | «ferrovia di Velletri» (00696, QP 297) | |
| fontanella_di_borghese | Fontanella di Borghese | «funtanella de Borghese» (00487, QP 199) | |
| forte_de_marmi | Forte de' Marmi | «Forte de marmo» (00147, QP 62) | |
| frascati | Frascati | «frascatano» (00011, QP 17) | |
| frattocchie | Frattocchie | «Fattocchie» (00724, RR II 219) | |
| gianicolo | Gianicolo | «Giannicolo» (00135, QP 56) | |
| grotta_de_sor_pippo | Grotta de Sor Pippo | «grotta der sor Pippo» (00125, QP 55) | |
| istituto_dellenciclopedia_treccani | Istituto dell'Enciclopedia Treccani | «Enciclopedia Treccani» (00073, QP 40) | |
| laboratorio_zamira | Laboratorio della Zamira Pacori | «laboratorio della Zamira» (00394, QP 166); «bottega» (00508, QP 206); «botteguccia» (00547, QP 216); «bottega» (00558, QP 222); «bottega» (00596, QP 247) | |
| litorale_ladispoli | Litorale di Ladispoli | «Ladìspoli» (00528, QP 210) | |
| milano | Milanno | «Milano» (00152, QP 65); «Milano» (00164, QP 70); «Milano» (00213, QP 92); «Milano» (00296, QP 138); «Milano» (00407, QP 170); «Milano» (00408, QP 170) | |
| monte_circeo | Monte Circeo | «monte della contessa Circia» (00537, QP 213) | |
| monte_velino | Monte Velino | «Velino» (00525, QP 210) | |
| monti_carseolani | Monti Carseolani | «Carseolani» (00519, QP 210) | |
| monti_simbruini | Monti Simbruini | «Simbruini» (00542, QP 215) | |
| palazzo_219 | Palazzo di via Merulana 219 | «palazzo der ducentodicinnove» (00007, QP 16); «er palazzo dell’oro» (00008, QP 16); «palazzo dell’Oro» (00027, QP 22); «ducentodicinnove» (00030, QP 24); «civico ducentodicinnove» (00036, QP 25); «palazzo dell’Oro» (00038, QP 25); «ben nota architettura» (00039, QP 26); «casermone color pidocchio» (00040, QP 26); «Sto palazzo» (00041, QP 26); «ducentodiciannove» (00046, QP 32); «ducentodicinnove» (00083, QP 41); «palazzo dell’Oro» (00097, QP 49); «ducentodiciannove» (00208, QP 85); «palazzo del ducentodicinnove» (00242, QP 105) | |
| palazzo_chigi | Palazzo Chigi | «Palazzo Chiggi» (00180, QP 77); «palazzo Chiggi» (00222, QP 93); «palazzo Chiggi» (00228, QP 97); «palazzo Chigge» (00269, QP 115) | |
| pantheon | Pantheon | «Panteone» (00078, QP 41) | |
| pensione_burgess | Pensione Burgess | «pensione Bergèss» (00466, QP 189); «Pensione Bergesse» (00467, QP 189) | |
| piazza_di_pietra | Piazza di Pietra | «piazza de Pietra» (00070, QP 40) | |
| piazza_di_spagna | Piazza di Spagna | «piazza de Spagna» (00673, QP 292) | |
| piazza_san_giovanni | Piazza San Giovanni | «San Giovanni» (00484, QP 199) | |
| piazza_san_lorenzo_in_lucina | Piazza San Lorenzo in Lucina | «San Lorenzo in Lucina» (00110, QP 53); «San Lorenzo in Lucina» (00278, QP 126) | |
| piazza_vittorio_emanuele | Piazza Vittorio Emanuele | «piazza Vittorio» (00179, QP 76); «piazza Vittorio» (00233, QP 103); «piazza Vittorio» (00292, QP 136); «piazza Vittorio» (00374, QP 158); «piazza Vittorio» (00482, QP 199); «piazza Vittorio» (00504, QP 204); «piazza Vittorio» (00506, QP 205); «piazza Vittorio» (00657, QP 280); «Piazza Vittorio Manuele» (00672, QP 291) | |
| ponte_divino_amore | Ponte al Divino Amore | «Divino Amore» (00405, QP 169); «Divino Amore» (00570, QP 237); «ponte del Divino Amore» (00571, QP 237); «ponte del Divino Amore» (00572, QP 238); «ponte del Divino Amore» (00583, QP 240); «ponte (del Divino Amore)» (00594, QP 245); «ponte del Divino Amore» (00697, QP 297) | |
| porta_borgo_marino | Porta del borgo di Marino | «porta del borgo» (00516, QP 210) | |
| pozzo_delle_cornacchie | Pozzo delle Cornacchie | «Pozzo de le Cornacchie» (00066, QP 40) | |
| pratica_di_mare | Pratica di Mare | «Pratica de Mare» (00712, QP 298) | |
| quartierino_prati | Quartierino Prati | «Prati» (00243, QP 105) | |
| reggio_calabria | Reggio Calabria | «Reggio (Calabria)» (00475, QP 192) | |
| sacro_cuore | Sacro Cuore | «Sacro Core» (00044, QP 28); «Sacro Core» (00151, QP 65); «Sacro Core» (00155, QP 66); «Sacro Core» (00297, QP 138); «Sacro Core» (00325, QP 144) | |
| san_giovanni_in_laterano | San Giovanni in Laterano | «San Giovanni» (00100, QP 51); «San Giovanni» (00294, QP 137); «San Giovanni Laterano» (00328, QP 148) | |
| san_lorenzo_al_verano | San Lorenzo al verano | «San Lorenzo ar Verano» (00303, QP 140) | |
| san_silvestro_in_capite | San Silvestro in Capite | «San Silvestro» (00112, QP 53) | |
| santa_maria_in_porta_paradisi | Santa Maria in Porta Paradisi | «Porta Paradisi» (00021, QP 20) | |
| santa_palomba | Santa Palomba | «Palomba» (00433, QP 175) | |
| santa_rita_invitacolo | Santa Rita Invitàcolo | «Santa Rita in Vitàcolo» (00626, QP 270) | |
| santandrea_della_valle | Sant'Andrea della Valle | «Sant’Andrea de la Valle» (00200, QP 81) | |
| santantonio_da_padova | Sant'Antonio da Padova | «Sant’Antonio de Padova» (00105, QP 52) | |
| santi_quattro_coronati | Santi Quattro Coronati | «Santi Quattro» (00020, QP 19); «Santi Quattro» (00058, QP 37); «Santi Quattro» (00106, QP 52); «Santi Quattro» (00227, QP 97); «Santi Quattro» (00241, QP 105); «Santi Quattro» (00320, QP 141) | |
| santo_stefano_del_cacco_celio_santo_stefano | Santo Stefano del Cacco, Celio-Santo Stefano | «Santo Stefano der Cacco» (00087, QP 43); «Santo Stefano del Cacco» (00381, QP 159) | |
| scala_a | Scala A | «La A» (00048, QP 32) | |
| scala_b | Scala B | «la B» (00103, QP 52) | |
| soriano_nel_cimino | Soriano nel Cimino | «Soriano ar Cimìno» (00293, QP 137) | |
| stazione_pavona | Stazione della Pavona | «stazzione» (00702, QP 298) | |
| strada_di_campagna_celio | Strada di campagna del Celio | «strada de campagna» (00444, QP 179) | |
| tempio_di_agrippa | Tempio di Agrippa | «Tempio d’Agrippa» (00450, QP 180) | |
| tenenza_carabinieri_marino | Tenenza dei Carabinieri di Marino | «carabinieri di Marino» (00438, QP 177) | |
| tor_di_gheppio | Tor di Gheppio | «Tor der Gheppio» (00704, QP 298); «Tor de Gheppio» (00719, QP 302) | |
| torraccio | Torraccio | «Toraccio» (00341, QP 152) | |
| tranvie_dei_castelli | Tranvie dei Castelli | «Tranvie de li Castelli» (00053, QP 36); «Tranvie de li Castelli» (00167, QP 73) | |
| trastevere | Trastevere | «trasteverino» (00455, QP 182) | |
| via_anziate | Via Anziate | «l'Anziate» (00398, QP 167); «Anziate» (00424, QP 173); «anziate» (00630, QP 273); «anziate» (00641, QP 274) | |
| via_ardeatina | Via Ardeatina | «l'Ardeatina» (00397, QP 167); «l'Ardeatina» (00423, QP 173); «l'ardeatina» (00633, QP 274); «l’ardeatina» (00707, QP 298) | |
| via_botteghe_oscure | Via Botteghe Oscure | «Botteghe Oscure» (00032, QP 25) | |
| via_campo_marzio | Via Campo Marzio | «Campo Marzio» (00080, QP 41) | |
| via_colonna_vittoria | Via Colonna Vittoria | «via Colonna» (00069, QP 40) | |
| via_degli_zingari | Via degli Zingari | «li Zingari» (00192, QP 81) | |
| via_dei_banchi_vecchi | Via dei Banchi Vecchi | «via de li Banchi Vecchi» (00162, QP 69); «de li Banchi Vecchi» (00284, QP 134); «de li Banchi Vecchi» (00298, QP 138) | |
| via_dei_capocci | Via dei Capocci | «via de li Capocci» (00193, QP 81) | |
| via_dei_fienili | Via dei Fienili | «via de’ Fienili» (00198, QP 81) | |
| via_dei_serpenti | Via dei Serpenti | «de li Serpenti» (00091, QP 45); «li Serpenti» (00092, QP 45) | |
| via_del_gesu | Via del Gesù | «via der Gesù» (00086, QP 43); «via der Gesù» (00352, QP 154); «via der Gesù» (00439, QP 177) | |
| via_della_caffarella | Via della Caffarella | «Caffarella» (00666, QP 285) | |
| via_della_falcognana | Via della Falcognana | «Falcognana» (00576, QP 238); «Falcognana» (00582, QP 240) | |
| via_della_palombella | Via della Palombella | «Palommella» (00077, QP 41) | |
| via_della_scrofa | Via della Scrofa | «la Scrofa» (00064, QP 40) | |
| via_delle_coppelle | Via delle Coppelle | «via de le Coppelle» (00065, QP 40) | |
| via_di_grotta_pinta | Via di Grotta Pinta | «Grotta Pinta» (00201, QP 81) | |
| via_di_pietra | Via di Pietra | «via de Pietra» (00071, QP 40) | |
| via_di_santo_stefano_rotondo | Via di Santo Stefano Rotondo | «Santo Stefano Rotondo» (00447, QP 180) | |
| via_frangipane | Via Frangipane | «via Frangipani» (00191, QP 81) | |
| via_labbricana | Via Labbricana | «Labbicana» (00107, QP 52) | |
| via_lanza | Via Lanza | «via Lata» (00725, dtsFG) | |
| via_massimo_dazeglio | Via Massimo d'Azeglio | «via Massimo Dazzélio» (00684, QP 294) | |
| via_merulana | Via Merulana | «Merulana» (00681, QP 292) | |
| via_monte_caprino | Via Monte Caprino | «via de Monte Caprino» (00196, QP 81) | |
| via_orazio | Via Orazio | «via Orà-zio» (00342, QP 153) | |
| via_panisperna | Via Panisperna | «via Panesperna» (00171, QP 74) | |
| vicolo_della_bucimazza | Vicolo della Bucimazza | «vicolo de la Bucimazza» (00197, QP 81) | |
| vicolo_delle_grotte_del_teatro | Vicolo delle Grotte del Teatro | «vicolo de le Grotte der Teatro» (00203, QP 81) | |
| villa_borghese | Villa Borghese | «Villa Porchese» (00495, QP 201) | |
| villino_lungotevere | Villino Lungotevere | «villino a lungotevere» (00244, QP 105) | |

## 12. Percorsi tipizzati (T-54, D-060)

Il tipo è una lettura (asserzione `route`, bozza). Tipi: compiuto, indicato, sognato, inferito, direzionale, proposto. La carta disegna come linee solo i compiuti (EXCLUSIONS, voce 4).

| id | percorso | tipo proposto | QP | motivazione | nota | OK / correzione |
|---|---|---|---|---|---|---|
| R-0001 | tragitto_torraccio_ponte_divino_amore | compiuto | 297 | «Discesero ai Torraccio […] Svoltarono sull'Appia a li Due Santi […] Valicò invece il binario»: Ingravallo, Di Pietrantonio, l'autista e Runzato percorrono il tragitto in auto. | L'ultimo nodo (ponte del Divino Amore) è un termine di paragone («simile a quello ch'era due chilometri più a nord, presso il ponte»), non un punto attraversato: da rivedere. | |
| R-0002 | tragitto_santarella_torraccio_divino_amore | inferito | 169 | La motocicletta di Santarella «si preannunciava di lontano, dal Torraccio, […] o dal Divino Amore»: le provenienze si ricavano dal rumore, «altre volte» da un luogo o dall'altro. | Separato dal tragitto di QP 297 (D-060). È un elenco disgiuntivo e abituale di provenienze, non una sequenza: potrebbe non essere un percorso. | |
| R-0003 | tragitto_tenenza_due_santi | compiuto | 208–215 | Pestalozzi e Cocullo scendono dalla caserma di Marino alla porta del borgo, prendono l'Appia, passano la Fontana e si fermano ai Due Santi. |  | |
| R-0004 | tragitto_brancaccio_piazza_san_giovanni | compiuto | 292 | «A largo Brancaccio, mentre che staveno svortando in via Merulana verso piazza San Giovanni»: il tragitto è in corso. | L'ultimo nodo è una direzione («verso piazza San Giovanni»): l'arrivo non è narrato. | |
| R-0005 | tragitto_viminale_merulana | compiuto | 25 | «Saliti sul PV e discesi appunto al Viminale, presero il tram di San Giovanni […] raggiunsero il civico ducentodicinnove». |  | |
| R-0006 | tragitto_appia_falcognana | indicato | 238 | «La strada era una sola, pe fortuna, salvo il primo pezzo però: la statale, l'Appia, poi ad angolo retto la deviazione della provinciale, pe Falcognana»: la strada spiegata dopo le indicazioni di Camilla (QP 237). | Incerto fra indicato e compiuto: il passo descrive la strada, il viaggio segue. | |
| R-0007 | tragitto_agostino_aquiro | compiuto | 40 | Il commendator Angeloni e i suoi pari «sogliono deambulare» da Sant'Agostino a Santa Maria in Aquiro. | Percorso abituale (iterativo). | |
| R-0008 | tragitto_cecchina_anziate | compiuto | 173 | La motocicletta di Santarella «infilava […] la mala curva d'aa stazione d'aa Cecchina», poi si fermava a Santa Palomba e a Campoleone, «il caso richiedendo». | Percorso abituale (iterativo), con fermate eventuali. | |
| R-0009 | tragitto_colonna_treccani | compiuto | 40 | Angeloni e i suoi pari «si avventurano» per via Colonna, piazza de Pietra, via de Pietra fino al Corso. | Percorso abituale (iterativo). | |
| R-0010 | tragitto_frattocchie_ciampino | inferito | 174 | «Oppure a metà le Frattocchie, doveva spengere: al passaggio dell'Appia, o a Ca' Francesi, a Tor Ser Paolo, alla stazione di Ciampino»: luoghi alternativi della fermata. | Come QP 169: elenco disgiuntivo e abituale, non una sequenza. | |
| R-0011 | tragitto_monti_piazza_esedra | compiuto | 182 | Diomede «si differiva passo passo da un quartiere all'altro: monticiano a le dieci, trasteverino a le quattro, a Piazza Colonna o a l'Esedra». | Percorso abituale (iterativo); l'ultimo nodo è disgiuntivo («o»). | |
| R-0012 | tragitto_rocca_di_papa_monte_nuncupale | compiuto | 173 | Santarella «da Rocca di Papa a Castel Savelli, giù: da Rocca Orsina al Monte Nuncupale, su». | Percorso abituale (iterativo). | |
| R-0013 | tragitto_chiara_pantheon | compiuto | 41 | Di quaresima Angeloni e i suoi pari «si contentano lungheggiar Santa Chiara […] imboccheno la Palommella e sfioreno er dedietro ar Panteone». | Percorso abituale (iterativo). | |
| R-0014 | tragitto_duesanti_frattocchie | compiuto | 56 | La corsa del tram dei Castelli: «Ai Due Santi, al Torraccio, a le Frattocchie […] era salita una quantità di persone». |  | |
| R-0015 | tragitto_policlinico_san_lorenzo_al_verano | compiuto | 139–140 | Il corteo funebre «spostò dar Policlinico a le otto […] tajarono pe la direttissima der viale Regina Margherita […] arrivarono a San Lorenzo ar Verano». |  | |
| R-0016 | tragitto_marino_albano_laziale | direzionale | 278 | Santarella «era a percorrere sulla sua motocicletta la via provinciale da Marino ad Albano»: il passo dà la strada e la sua direzione, non il tratto percorso. | Alternativa: compiuto. Il Cap. 4 (r. 194) chiama questo tipo «presunto». | |
| R-0017 | tragitto_marino_due_santi | compiuto | 206 | Pestalozzi «usciva (in motocicletta) dalla caserma […] di Marino per catapultarsi alla bottega-laboratorio». |  | |
| R-0018 | tragitto_marino_santo_stefano | compiuto | 153 | «arrivò a Santo Stefano in motocicletta il brigadiere Pestalozzi […] latore di un rapporto […] della Tenenza». | La partenza dalla Tenenza è inferita dal rapporto. L'ordine dei nodi è invertito (1 Santo Stefano, 2 Tenenza): da correggere. | |
| R-0019 | tragitto_merulana_policlinico | compiuto | 93 | L'autorità giudiziaria «era intervenuta […] a via Merulana, indi al Policlinico». | Il focalizzatore registrato è Liliana, ma chi si sposta è il giudice istruttore; se il percorso è quello del corpo, è un oggetto (DM-03, escluso). | |
| R-0020 | tragitto_sogno_casal_bruciato_campo_morto | sognato | 212 | Il sogno di Pestalozzi: «al passaggio a livello di Casal Bruciato il vetrone girasole... per fil a dest!», il Roma-Napoli che «filava filava», la fuga «verso le gore senza foce del Campo Morto». | Nuovo percorso (D-060). La lettura di Manzotti di «per fil a dest» (2010, p. 269) è una nota attribuita di fase 3. | |
| R-0021 | tragitto_castel_di_leva_casal_bruciato | indicato | 237 | Camilla indica la strada: «Pe la strada de Castel de Leva, fino ar ponte: poi, a sinistra, fino ar passaggio a livello de Casal Bruciato». | Nuovo percorso (D-060). Il nodo finale è il passaggio a livello: nei dati l'occorrenza è di casal_bruciato. | |

**Proposte senza percorso nei dati:**

| passo | proposta | motivazione | OK / correzione |
|---|---|---|---|
| QP 274 | **inferito**, forse tre percorsi alternativi | Le fughe ipotetiche di Retalli: dal casello a Casal Bruciato e oltre l'Ardeatina verso Ardea; «o in divergente ipotesi» a Santa Palomba Stazione sulla Roma-Napoli; o «verso la Solforata […] in direzione di Pratica di Mare», poi Ostia o Anzio. Sono ricostruzioni, non tragitti narrati | |
| QP 298 | **proposto** | Il ritorno suggerito dall'ometto: «potressimo scegne fino a Casal Bruciato: a imboccà l'ardeatina […] a Santa Palomba […] p'er Palazzo, potemo venì su diritti fino a la Pavona». È il percorso proposto del Cap. 4 | |
| Cap. 4, r. 194 | allineare «presunto» a «direzionale» (o viceversa) nel capitolo | Lo schema usa i sei tipi del 9/10 | |

