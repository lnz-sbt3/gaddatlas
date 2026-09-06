# Avvertenza sugli estratti testuali

La cartella `data/dist/passages/` contiene 722 estratti brevi da *Quer
pasticciaccio brutto de via Merulana* di Carlo Emilio Gadda.

## Regime giuridico

L'opera è protetta dal diritto d'autore. Carlo Emilio Gadda è morto nel 1973:
i diritti patrimoniali scadono il **31 dicembre 2043** (art. 25 L. 633/1941,
70 anni dalla morte dell'autore).

Gli estratti sono riprodotti come **citazioni** ai sensi dell'art. 70, comma 1,
L. 633/1941, che consente «il riassunto, la citazione o la riproduzione di
brani o di parti di opera e la loro comunicazione al pubblico […] per uso di
critica o di discussione, nei limiti giustificati da tali fini e purché non
costituiscano concorrenza all'utilizzazione economica dell'opera».

## Vincoli che il progetto si impone

Questi vincoli sono parte del design, non raccomandazioni:

1. **Brevità.** Estratto mediano: 24 parole (141 caratteri). Massimo nel
   dataset: 93 parole. Lo script `tools/build_passages.py` applica un tetto
   di 700 caratteri per riferimento.
2. **Frammentarietà.** I brani sono non contigui e legati ciascuno a un
   riferimento spaziale distinto. Il testo del romanzo non è ricostruibile
   dalla loro lettura sequenziale.
3. **Funzione critica.** Ogni estratto è presentato dentro il suo apparato
   interpretativo — ruolo narrativo, focalizzatore, determinazione spaziale —
   e non come lettura autonoma.
4. **Nessuna esportazione in blocco.** L'interfaccia non offre né deve offrire
   un download cumulativo dei brani. La suddivisione per capitolo di
   `data/dist/passages/` risponde anche a questo criterio.
5. **Attribuzione sempre presente.** Ogni brano è accompagnato dal
   riferimento di edizione e pagina (`sourceReference`).

## Riutilizzo

Le licenze MIT e CC BY 4.0 di questo repository **non si applicano** al
contenuto del campo `excerpt`. Chi effettua un fork del progetto e ne
ridistribuisce i dati è responsabile della propria valutazione dei limiti
della citazione nel proprio ordinamento.

Per usi che eccedano la citazione critica occorre rivolgersi agli aventi
diritto e all'editore dell'edizione di riferimento.
