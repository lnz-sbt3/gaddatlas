# TERNE_IQ20 — Interpretazioni adottate multiple per occorrenza, luogo e focalizzatore

**9 ottobre 2026** · ramo `allinea-cap4-fase2` · documento per la decisione di Lorenzo (C4); nessun dato modificato.

IQ20 (D-070) chiede al più una interpretazione adottata per occorrenza, luogo e focalizzatore. Queste 6 terne ne hanno più di una, tutte del progetto e tutte adottate. Finché Lorenzo non decide, IQ20 resta un'avvertenza. Il «caso candidato» è una proposta di lettura, fra quelle del Cap. 4 (r. 93) e di D-057: disgiunzione, ancoraggio relazionale, referenza plurale, doppio ruolo.

## ref_00028 · QP 22 · luogo `via_delle_oche` · focalizzatore `ingravallo`

> lui, no, no, non era « bello »: e nemmeno gli riusciva di consolarsi con quel proverbio che aveva udito a Milano da una ragazza, al dispensario celtico di via delle Oche: « I òmen hin semper bèi. »

| interpretazione | luogo | ancora | relazione | ruolo | componente | focalizzatore |
|---|---|---|---|---|---|---|
| interp_00028 | via_delle_oche | gaz_milano | inside | projectedspace | — | ingravallo |
| interp_00029 | via_delle_oche | gaz_bologna | inside | projectedspace | — | ingravallo |

**Caso candidato:** identificazione contesa: il passo colloca via delle Oche a Milano («udito a Milano […] di via delle Oche»), ma una via delle Oche esiste a Bologna. Due identificazioni (IdentificationAssertion), non due ancore della stessa lettura.

**Decisione di Lorenzo:** Applicata (D-072): una sola interpretazione (interp_00029), ancorata a gaz_bologna (non c'è un'entità per la via); tolta interp_00028 (Milano). Nuova U-0009 (Discrepancy, asse geometria, origine documentaria, Lorenzo), fondata su ref_00028.

## ref_00088 · QP 44 · luogo `tevere_biferno` · focalizzatore `ingravallo`

> Più Ingravallo si buttava al folklore, tra Tevere e Biferno, più lo pizzicava dicendo pizzicarolo e guaglione

| interpretazione | luogo | ancora | relazione | ruolo | componente | focalizzatore |
|---|---|---|---|---|---|---|
| interp_00102 | tevere_biferno | gaz_tevere | overlaps | projectedspace | — | ingravallo |
| interp_00103 | tevere_biferno | gaz_biferno | overlaps | projectedspace | — | ingravallo |

**Caso candidato:** ancoraggio relazionale `between` («tra Tevere e Biferno»), come Robine Vecchie (D-057): un'interpretazione sola, senza posizione, con i due fiumi come termini.

**Decisione di Lorenzo:** Applicata (D-072): una sola interpretazione (interp_00102) con due ancore, gaz_tevere e gaz_biferno, relazione Between; resta in carta (ancora primaria gaz_biferno, regola D-038). Tolta interp_00103.

## ref_00271 · QP 116 · luogo `via_nicotera` · focalizzatore `giuliano_valdarena`

> il Valdarena: che abitava in Prati, in una bella camera-studio a via Nicotera: un villino […].

| interpretazione | luogo | ancora | relazione | ruolo | componente | focalizzatore |
|---|---|---|---|---|---|---|
| interp_00309 | via_nicotera | gaz_via_nicotera | — | marker | — | giuliano_valdarena |
| interp_00310 | via_nicotera | gaz_via_nicotera | — | setting | — | giuliano_valdarena |

**Caso candidato:** doppio ruolo: stessa ancora, ruoli marker e setting.

**Decisione di Lorenzo:** Applicata (D-072): due occorrenze distinte. ref_00271 («abitava in Prati, in una bella camera-studio a via Nicotera: un villino») con interp_00309 (marker); nuova ref_00730 («Sul marmo del cassettone, a via Nicotera, "fu rinvenuto"…», estratto fornito da Lorenzo) con interp_00310 (setting).

## ref_00404 · QP 169 · luogo `cassero` · focalizzatore `santarella`

> Si preannunciava di lontano, dal Torraccio, dalle ultime case de le Frattocchie, dalle Robine Vecchie altre volte o dal Cassero a Sant'Ignazio, o dal Divino Amore

| interpretazione | luogo | ancora | relazione | ruolo | componente | focalizzatore |
|---|---|---|---|---|---|---|
| interp_00474 | cassero | gaz_frattocchie | near | — | routenode tragitto_santarella_torraccio_divino_amore 4 | santarella |
| interp_00475 | cassero | gaz_pavona | near | — | routenode tragitto_santarella_torraccio_divino_amore 4 | santarella |

**Caso candidato:** ancoraggio relazionale («Cassero a Sant'Ignazio», fra Frattocchie e Pavona), come Robine Vecchie (D-057).

**Decisione di Lorenzo:** **Fase 3** (decisione di Lorenzo, 10/10/2026, D-074): restano le due interpretazioni attuali; IQ20 resta un'avvertenza con questo caso dichiarato. Lorenzo: un'ancora sola, «Cassero a Sant'Ignazio». Nel gazetteer non c'è un'entità per la località di Sant'Ignazio presso Frattocchie: c'è solo gaz_buco_a_santignazio, il Buco a Sant'Ignazio di Roma, che è un altro luogo. Serve l'entità (coordinate e fonte) prima di togliere le due interpretazioni. IQ20 = 1 per questa terna.

## ref_00491 · QP 200 · luogo `aliciaro` · focalizzatore `diomede`

> « O a li Quattro Cantoni, da l’Aliciaro, de dietro a San Carlo. »

| interpretazione | luogo | ancora | relazione | ruolo | componente | focalizzatore |
|---|---|---|---|---|---|---|
| interp_00584 | aliciaro | gaz_quattro_cantoni | inside | projectedspace | — | diomede |
| interp_00585 | aliciaro | gaz_san_carlo_alle_quattro_fontane | adjacentto | projectedspace | — | diomede |

**Caso candidato:** ancoraggio relazionale o referenza plurale: Quattro Cantoni e San Carlo alle Quattro Fontane sono contigui.

**Decisione di Lorenzo:** Applicata (D-072): una sola interpretazione (interp_00584), ancora gaz_quattro_cantoni, ancoraggio relazionale adjacentTo verso gaz_san_carlo_alle_quattro_fontane. Tolta interp_00585.

## ref_00577 · QP 239 · luogo `bivio_falcognana_casal_bruciato` · focalizzatore `cocullo`

> Pervennero a un bivio, col cavallo, già in vista del ponte detto del Divino Amore, con cui la provinciale sullodata soprappassa la ferrovia di Velletri.

| interpretazione | luogo | ancora | relazione | ruolo | componente | focalizzatore |
|---|---|---|---|---|---|---|
| interp_00699 | bivio_falcognana_casal_bruciato | gaz_via_della_falcognana | overlaps | marker | — | cocullo |
| interp_00700 | bivio_falcognana_casal_bruciato | gaz_ponte_divino_amore | near | marker | — | cocullo |
| interp_00701 | bivio_falcognana_casal_bruciato | gaz_ferrovia_roma_velletri | above | marker | — | cocullo |

**Caso candidato:** ancoraggio relazionale: il bivio fra via della Falcognana, ponte del Divino Amore e ferrovia Roma–Velletri.

**Decisione di Lorenzo:** Applicata (D-072): una sola interpretazione (interp_00699), ancora gaz_via_della_falcognana, ancoraggi relazionali near verso gaz_ponte_divino_amore e above verso gaz_ferrovia_roma_velletri. Tolte interp_00700 e interp_00701.


---

## Censimento di 2c (10/10/2026): menzioni multiple nella stessa occorrenza

Via Nicotera era un residuo della vecchia colonna «occurrences: 2», che metteva in una riga più menzioni della stessa pagina. Censiti gli altri casi possibili:

- **(i) estratti in cui lo stesso toponimo** (etichetta, variante, soprannome o forma attestata del luogo) **compare due o più volte**: 7 casi, sotto;
- **(ii) coppie di interpretazioni con stesso riferimento, luogo e focalizzatore ma ruolo diverso:** nessun altro caso dopo la divisione di via Nicotera.

Non toccati: li decide Lorenzo. Finché restano aperti, IQ20 resta un'avvertenza.

| riferimento | QP | luogo | forma ripetuta | volte | interpretazioni (ruolo, focalizzatore) | estratto | decisione di Lorenzo |
|---|---|---|---|---|---|---|---|
| ref_00148 | 63 | genova | Genova | 2 | interp_00172 (projectedspace, giuliano_valdarena) | Parto dopodomani per Genova. Mi sembrava d’averlo pure accennato, che mi stabilisco a Genova; quando c’era lei, quella domenica, a pranzo. Ho già disdetto la camera. || Resta unica (Lorenzo, 10/10/2026). |
| ref_00150 | 63 | scala_b | Scala B | 2 | interp_00174 (setting, sor_manuela) | La Pettacchioni rientrò, confermò. Era sulla scala B, per le pulizzie der giorno. Aveva principiato dall’alto, naturalmente. In realtà, granata alla mano, prima stava a parlottà sur pianerottolo, co la sora Cucco der quinto, de la scala B || Resta unica (Lorenzo, 10/10/2026). |
| ref_00151 | 65 | sacro_cuore | Sacro Core | 2 | interp_00175 (marker, luigia_zanchetti) | Riferirono ad Ingravallo che la Gina, la pupilla, era tornata dar Sacro Core, in quer momento. Il giovedì rientrava all’una: per la colazione. [...] Sì, un po’ prima della Gina, che annava ar Sacro Core alle otto. Non volle sostare a quella vista: «Nun me riesce de guardalla.» Se fece er segno de la croce. || Divisa (D-075): ref_00151 «era tornata dar Sacro Core» (interp_00175, marker) e ref_00731 «annava ar Sacro Core alle otto» (interp_00965, marker). |
| ref_00165 | 70 | padova | Padova | 2 | interp_00191 (projectedspace, remo_balducci) | Milano, Padova, eventualmente Bologna, perché aveva da annà pure a Padova. || Resta unica (Lorenzo, 10/10/2026). |
| ref_00177 | 76 | via_merulana | Via Merulana | 2 | interp_00205 (setting, narrator) | La mattina dopo i giornali diedero notizia del fatto. Era venerdì. Li cronisti e il telefono aveveno rotto l’anima tutta la sera: tanto a via Merulana che giù, a Sante Stefene. Sicché, la mattina, un subisso. «Orribile delitto a via Merulana,» gridavano li strilloni, co li pacchi fra li ginocchi de la gente: fino all’undici e tre quarti. || Divisa (D-075): ref_00177 «tanto a via Merulana che giù» (interp_00205, setting) e ref_00732 «Orribile delitto a via Merulana» (titolo gridato dagli strilloni; interp_00966, ruolo proposto marker). |
| ref_00241 | 105 | santi_quattro_coronati | Santi Quattro | 2 | interp_00276 (projectedspace, liliana); interp_00277 (projectedspace, remo_balducci) | E quella malinconia di Liliana. Quella specie di fissazione. E poi co li Santi Quattro là vicino. «Che Liliana, Madonna! guai a sentimme dì de portalla via da li Santi Quattro!» || Divisa (D-075), una menzione per focalizzatore: ref_00241 «co li Santi Quattro là vicino» (Liliana, interp_00276) e ref_00733 «portalla via da li Santi Quattro» (Remo Balducci, interp_00277). |
| ref_00661 | 284 | grottaferrata | Grottaferrata | 2 | interp_00816 (projectedspace, ascanio_lanciani); interp_00817 (projectedspace, nonna_lanciani) | Di Grottaferrata, ereno, concedè a malincuore la nonna: comune di Grottaferrata, na frazzione che se chiamava er Torraccio, dopo le Frattocchie. || Resta unica (Lorenzo, 10/10/2026). |


Gli estratti nuovi delle occorrenze divise sono presi dalla copia digitale (ref_00730 è fornito da Lorenzo): vanno verificati sul volume a stampa (DATA_CHECKS DC-23).
