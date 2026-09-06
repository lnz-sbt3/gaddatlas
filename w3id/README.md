# Configurazione w3id.org

Due percorsi da registrare con una pull request su
[github.com/perma-id/w3id.org](https://github.com/perma-id/w3id.org):

| Percorso | Che cosa identifica | Cartella |
|---|---|---|
| `w3id.org/chora` | l'ontologia e i suoi vocabolari | `chora/` |
| `w3id.org/gaddatlas` | il dataset e le sue entità | `gaddatlas/` |

## Prima di aprire la PR

1. Chiudere D-008: il nome dell'ontologia fissa il percorso.
2. Sostituire `<HOST>` in entrambi i file con l'URL di pubblicazione.
3. Verificare che i percorsi siano ancora liberi (al 2026-09-06 lo erano).
4. Pubblicare almeno `ontology/chora.ttl` e `ontology/docs/index.html`,
   altrimenti i redirect puntano nel vuoto.

## Nota sulla content negotiation

La conneg dichiarata qui funziona **sul redirect**, non sull'host di
destinazione: w3id risponde 303 alla serializzazione giusta, poi GitHub Pages
serve il file statico. È il motivo per cui ogni serializzazione deve esistere
come file separato — `chora.ttl`, `chora.rdf`, `chora.jsonld` — generabili con:

```bash
python3 -c "
from rdflib import Graph
g = Graph(); g.parse('ontology/chora.ttl', format='turtle')
g.serialize('ontology/chora.rdf', format='xml')
g.serialize('ontology/chora.jsonld', format='json-ld', auto_compact=True)
"
```
