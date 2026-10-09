import s4Config from "./config.js";

// Piano cumulativo per riferimento distinto e viste per focalizzatore.
export default function s4Terrain(gadda_real, s4Entities) {
  const { N_CHAPTERS } = s4Config;
  const { allData, allDataById } = s4Entities;
  const reliefRows = Array.isArray(gadda_real.relief) ? gadda_real.relief : [];
  const agentNameById = new Map((gadda_real.paths?.agents || []).map(a => [a.id, a.name || a.label || a.id]));
  const aliasTargetById = new Map((s4Config.ALIAS_GROUPS || []).flatMap(g => g.ids.map(id => [id, g.canonical])));

  function tileIndexOf(targetId) {
    return allDataById.get(targetId) ?? allDataById.get(aliasTargetById.get(targetId));
  }

  const rows = [];
  for (const r of reliefRows) {
    const i = tileIndexOf(r.targetId);
    if (i == null) continue;
    rows.push({ row: r, i });
  }

  const refsByTileChapter = Array.from({length: allData.length}, () =>
    Array.from({length: N_CHAPTERS + 1}, () => new Set())
  );
  const agentTotals = new Map();
  const agentTiles = new Map();
  const occAgent = new Map();

  function agentArray(agentId) {
    let arr = occAgent.get(agentId);
    if (!arr) {
      arr = new Float32Array(allData.length * (N_CHAPTERS + 1));
      occAgent.set(agentId, arr);
    }
    return arr;
  }

  for (const {row, i} of rows) {
    const c = Math.max(1, Math.min(N_CHAPTERS, Number(row.chapter) || 1));
    refsByTileChapter[i][c].add(row.referenceId);
    const agentId = row.agentId;
    agentTotals.set(agentId, (agentTotals.get(agentId) || 0) + 1);
    if (!agentTiles.has(agentId)) agentTiles.set(agentId, new Set());
    agentTiles.get(agentId).add(i);
    agentArray(agentId)[i * (N_CHAPTERS + 1) + c] += 1;
  }

  const occPlane = Array.from({length: allData.length}, (_, i) => {
    const arr = new Float32Array(N_CHAPTERS + 1);
    const seen = new Set();
    for (let c = 1; c <= N_CHAPTERS; c++) {
      for (const refId of refsByTileChapter[i][c]) seen.add(refId);
      arr[c] = seen.size;
    }
    return arr;
  });

  for (const arr of occAgent.values()) {
    for (let i = 0; i < allData.length; i++) {
      let s = 0;
      for (let c = 1; c <= N_CHAPTERS; c++) {
        const idx = i * (N_CHAPTERS + 1) + c;
        s += arr[idx];
        arr[idx] = s;
      }
    }
  }

  const agents = [
    { id: null, name: "tutti", total: rows.length, tiles: new Set(rows.map(d => d.i)).size },
    ...Array.from(agentTotals, ([id, total]) => ({
      id,
      name: agentNameById.get(id) || id,
      total,
      tiles: agentTiles.get(id)?.size || 0
    })).sort((a, b) => b.total - a.total)
  ];

  function occAt(i, c, agentId = null) {
    if (agentId == null) return occPlane[i]?.[c] || 0;
    const arr = occAgent.get(agentId);
    return arr ? arr[i * (N_CHAPTERS + 1) + c] || 0 : 0;
  }

  return { agents, occAt };
}
