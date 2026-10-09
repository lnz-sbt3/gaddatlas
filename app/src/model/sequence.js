import * as d3 from "d3";
import s4Config from "./config.js";

// Indice sequenziale dei riferimenti a livello pagina. La chiave di lettura e'
// (page, referenceId), con referenceId
// confrontato come stringa zero-padded: niente parsing numerico del riferimento.
export default function s4Sequence(gadda_real, s4Entities) {
  const { N_CHAPTERS } = s4Config;
  const { allData, allDataById } = s4Entities;
  const reliefRows = Array.isArray(gadda_real.relief) ? gadda_real.relief : [];
  const aliasTargetById = new Map((s4Config.ALIAS_GROUPS || []).flatMap(g => g.ids.map(id => [id, g.canonical])));

  function tileIndexOf(targetId) {
    return allDataById.get(targetId) ?? allDataById.get(aliasTargetById.get(targetId));
  }

  function pageKey(row) {
    const p = Number(row.page);
    return Number.isFinite(p) ? p : Infinity;
  }

  const resolved = [];
  reliefRows.forEach((row, sourceIndex) => {
    const tileIndex = tileIndexOf(row.targetId);
    if (tileIndex == null) return;
    resolved.push({ ...row, tileIndex, sourceIndex });
  });

  const sequence = resolved
    .slice()
    .sort((a, b) =>
      d3.ascending(pageKey(a), pageKey(b)) ||
      d3.ascending(String(a.referenceId || ""), String(b.referenceId || "")) ||
      d3.ascending(a.sourceIndex, b.sourceIndex)
    )
    .map((row, pos) => ({ ...row, pos }));

  const sequenceByAgent = new Map();
  for (const row of sequence) {
    const agentId = row.agentId;
    if (!sequenceByAgent.has(agentId)) sequenceByAgent.set(agentId, []);
    sequenceByAgent.get(agentId).push(row.pos);
  }

  const birthPos = Array.from({length: allData.length}, () => Infinity);
  for (const row of sequence) {
    if (row.pos < birthPos[row.tileIndex]) birthPos[row.tileIndex] = row.pos;
  }

  function chapterOfCursor(pos) {
    const p = Math.max(0, Math.min(sequence.length - 1, Math.floor(pos)));
    return sequence[p]?.chapter ?? 1;
  }

  // Route e' un ruolo relazionale, rappresentato da isRouteNode quando role e' nullo.
  const ROLE_IDX = new Map(s4Config.ROLE_ORDER.map((r, k) => [r, k]));
  function effRoleIdx(row) {
    const r = row.role || (row.isRouteNode ? "Route" : null);
    if (r == null) return -1;
    return ROLE_IDX.has(r) ? ROLE_IDX.get(r) : -1;
  }
  // Capienza dello stack cronologico dei ruoli per tessera.
  const BANDS_CAP = 32;
  const roleStack = new Int8Array(allData.length * BANDS_CAP).fill(-1);
  const rolePosStack = new Int32Array(allData.length * BANDS_CAP).fill(-1);
  const roleLen   = new Uint8Array(allData.length);

  // Buffer riusato: occUpTo restituisce sempre lo stesso Float32Array, valido fino
  // alla chiamata successiva. La funzione fa una sola passata lineare sulla
  // sequenza ordinata e conta referenceId distinti per tessera.
  const occBuf = new Float32Array(allData.length);
  const seenRefsByTile = Array.from({length: allData.length}, () => new Set());
  function occUpTo(pos, agentId = null, roleMask = null) {
    occBuf.fill(0);
    roleStack.fill(-1); rolePosStack.fill(-1); roleLen.fill(0);
    for (const seen of seenRefsByTile) seen.clear();
    if (!sequence.length || pos < 0) return occBuf;
    const stop = Math.min(sequence.length - 1, Math.floor(pos));
    // Filtro ruolo intenzionale: maschera completa = nessun filtro e le righe senza
    // ruolo restano valide; maschera parziale = contano solo righe con ruolo attivo,
    // quindi le righe role -1 sono escluse.
    const roleMaskComplete = !roleMask || roleMask.every(Boolean);
    for (let k = 0; k <= stop; k++) {
      const row = sequence[k];
      if (agentId != null && row.agentId !== agentId) continue;
      const roleIdx = effRoleIdx(row);
      if (!roleMaskComplete && !(roleIdx >= 0 && roleMask[roleIdx])) continue;
      const seen = seenRefsByTile[row.tileIndex];
      const ref = row.referenceId;
      if (seen.has(ref)) continue;
      seen.add(ref);
      occBuf[row.tileIndex] += 1;
      const t = row.tileIndex;
      if (roleLen[t] < BANDS_CAP) {
        const slot = t * BANDS_CAP + roleLen[t]++;
        roleStack[slot] = roleIdx;
        rolePosStack[slot] = row.pos;
      }
    }
    return occBuf;
  }

  const lastPosByChapter = Array.from({length: N_CHAPTERS + 1}, () => -1);
  for (const row of sequence) {
    const c = Math.max(1, Math.min(N_CHAPTERS, Number(row.chapter) || 1));
    lastPosByChapter[c] = Math.max(lastPosByChapter[c], row.pos);
  }
  for (let c = 1; c <= N_CHAPTERS; c++) {
    if (lastPosByChapter[c] < 0) lastPosByChapter[c] = lastPosByChapter[c - 1];
  }

  return {
    sequence, sequenceByAgent, chapterOfCursor, occUpTo, birthPos, lastPosByChapter,
    roleStack, rolePosStack, roleLen, BANDS_CAP
  };
}
