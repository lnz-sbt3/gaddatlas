import { html } from "htl";

// I capitoli vengono richiesti solo quando aperti, mai precaricati in blocco.
export default function createTextPanel({ relief, entities, agents, aliasGroups = [], loadJSON }) {
  const chapters = new Map();
  let indexPromise;
  let revision = 0;
  const names = new Map(agents.map(agent => [agent.id, agent.name]));
  const aliases = new Map(aliasGroups.flatMap(group => group.ids.map(id => [id, group.canonical])));
  const byTile = new Map();
  for (const row of relief) {
    const tile = entities.allDataById.get(row.targetId) ?? entities.allDataById.get(aliases.get(row.targetId));
    if (tile == null) continue;
    if (!byTile.has(tile)) byTile.set(tile, []);
    byTile.get(tile).push(row);
  }
  const body = html`<div class="text-panel-body"></div>`;
  const title = html`<h2 id="text-panel-title"></h2>`;
  const count = html`<p class="text-panel-count" aria-live="polite"></p>`;
  const close = html`<button type="button" aria-label="Chiudi il pannello testuale">Chiudi</button>`;
  const element = html`<aside class="text-panel" hidden aria-labelledby="text-panel-title">
    <header>${close}${title}${count}</header>${body}
  </aside>`;
  close.onclick = () => { revision++; element.hidden = true; };

  function index() {
    if (!indexPromise) indexPromise = loadJSON("passages/index.json").catch(error => {
      indexPromise = null;
      throw error;
    });
    return indexPromise;
  }
  async function chapterData(chapter, manifest) {
    if (!chapters.has(chapter)) {
      chapters.set(chapter, loadJSON(`passages/${manifest.chapters[chapter].file}`).catch(error => {
        chapters.delete(chapter);
        throw error;
      }));
    }
    return chapters.get(chapter);
  }
  function apparatus(rows) {
    return rows.map(row => html`<div class="text-interpretation">
      <dl>
        <dt>Focalizzatore</dt><dd>${names.get(row.agentId) || row.agentId || "Non indicato"}</dd>
        <dt>Ruolo narrativo</dt><dd>${row.role || "Non indicato"}</dd>
        <dt>Determinazione spaziale</dt><dd>${row.determination || "Non indicata"}</dd>
      </dl>
      ${row.criticalNote ? html`<p class="critical-note">${row.criticalNote}</p>` : null}
    </div>`);
  }
  async function show(tile, referenceId = null) {
    const current = ++revision;
    const feature = entities.allData[tile];
    if (!feature) return;
    element.hidden = false;
    title.textContent = feature.properties.Toponym;
    const grouped = new Map();
    for (const row of byTile.get(tile) || []) {
      if (!grouped.has(row.referenceId)) grouped.set(row.referenceId, []);
      grouped.get(row.referenceId).push(row);
    }
    count.textContent = `${grouped.size} ${grouped.size === 1 ? "riferimento" : "riferimenti"}`;
    body.replaceChildren(html`<p role="status">Caricamento dei riferimenti…</p>`);
    body.scrollTop = 0;
    try {
      if (!grouped.size) {
        body.replaceChildren(html`<p>Nessun riferimento testuale disponibile.</p>`);
        return;
      }
      const manifest = await index();
      if (current !== revision) return;
      const groups = new Map();
      for (const [id, rows] of grouped) {
        const chapter = manifest.referenceToChapter[id];
        if (!chapter) throw new Error(`Capitolo non disponibile per ${id}`);
        if (!groups.has(chapter)) groups.set(chapter, []);
        groups.get(chapter).push({id, rows});
      }
      body.replaceChildren();
      const ordered = [...groups].sort(([a], [b]) => a - b);
      for (const [chapter, refs] of ordered) {
        const content = html`<div></div>`;
        const section = html`<details class="text-chapter"><summary>Capitolo ${chapter} · ${refs.length} ${refs.length === 1 ? "riferimento" : "riferimenti"}</summary>${content}</details>`;
        let loaded = false, loading = false;
        async function render() {
          if (loaded || loading || current !== revision) return;
          loading = true;
          content.replaceChildren(html`<p role="status">Caricamento del capitolo…</p>`);
          try {
            const data = await chapterData(chapter, manifest);
            if (current !== revision) return;
            refs.sort((a, b) => (data.passages[a.id]?.page ?? Infinity) - (data.passages[b.id]?.page ?? Infinity) || a.id.localeCompare(b.id));
            const articles = refs.map(({id, rows}) => {
              const passage = data.passages[id];
              // Senza attribuzione non si mostra il brano.
              const available = passage?.excerpt && passage?.sourceReference;
              return html`<article class=${id === referenceId ? "text-reference selected" : "text-reference"} data-reference-id=${id} tabindex="-1">
                ${available ? html`<blockquote>${passage.excerpt}</blockquote>
                  <p class="text-source">Carlo Emilio Gadda, <cite>Quer pasticciaccio brutto de via Merulana</cite> · ${passage.work === "quer_pasticciaccio_adelphi" ? "Adelphi, 2018 · " : ""}${passage.sourceReference}</p>`
                  : html`<p>Brano o attribuzione non disponibili per ${id}.</p>`}
                ${apparatus(rows)}
              </article>`;
            });
            content.replaceChildren(...articles);
            loaded = true;
            const selected = articles.find(article => article.dataset.referenceId === referenceId);
            if (selected) {
              body.scrollTop += selected.getBoundingClientRect().top - body.getBoundingClientRect().top;
              selected.focus({preventScroll: true});
            }
          } catch (error) {
            if (current !== revision) return;
            const retry = html`<button type="button">Riprova</button>`;
            retry.onclick = render;
            content.replaceChildren(html`<p role="alert">Impossibile caricare il capitolo: ${error.message}</p>`, retry);
          } finally { loading = false; }
        }
        if (grouped.size === 1) {
          body.append(content);
          void render();
        } else {
          section.ontoggle = () => { if (section.open) void render(); };
          body.append(section);
          section.open = referenceId ? refs.some(ref => ref.id === referenceId) : chapter === ordered[0][0];
          if (section.open) void render();
        }
      }
    } catch (error) {
      if (current !== revision) return;
      const retry = html`<button type="button">Riprova</button>`;
      retry.onclick = () => show(tile, referenceId);
      body.replaceChildren(html`<p role="alert">Impossibile caricare i riferimenti: ${error.message}</p>`, retry);
    }
  }
  return { element, show, dispose() { revision++; close.onclick = null; body.replaceChildren(); } };
}
