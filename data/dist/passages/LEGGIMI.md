# Estratti non distribuiti

Questa cartella è vuota di proposito. Gli estratti del romanzo (*Quer pasticciaccio brutto de via Merulana* di Carlo Emilio Gadda, opera protetta dal diritto d'autore) non fanno parte di questa repository e non si distribuiscono.

Il codice dell'interfaccia cerca qui un file per capitolo, con nome `ch01.json` … `ch10.json`. Senza questi file:

- `npm run build` si interrompe con l'errore «Riferimenti testuali incompleti»; `npm run build:pubblica` produce la versione pubblicata, senza estratti;
- `npm run dev` avvia l'atlante; al posto del passo il pannello del testo rinvia al testimone di riferimento, con capitolo e pagina;
- il test sui frammenti degli estratti reali (`test/passages.test.js`) è saltato.

Il README, nella sezione «Senza estratti», descrive il comportamento in dettaglio.
