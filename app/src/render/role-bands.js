import * as d3 from "d3";

// ===== CELLA: s4RoleBands =====
// -- CELLA: s4RoleBands --
// Stato compatto dei colori e delle identita' delle terrazze.
const s4RoleBands = (() => {
  function create({allDataLength, roleCap, bandsMax, bandsLogBase, bandsCap}) {
    const CAP = roleCap ?? bandsCap;
    const NB = bandsMax ?? bandsCap;
    const LOGB = Math.log(bandsLogBase ?? 1.55);
    const bandRoleChrono = new Int8Array(allDataLength * NB).fill(-1);
    const bandRoleGrouped = new Int8Array(allDataLength * NB).fill(-1);
    // Posizione in sequenza dell'occorrenza rappresentata; -1 indica una banda aggregata.
    const bandPosChrono = new Int32Array(allDataLength * NB).fill(-1);
    const bandPosGrouped = new Int32Array(allDataLength * NB).fill(-1);
    const dominantRoleOf = new Int8Array(allDataLength).fill(-1);
    const roleMixOf = Array.from({length: allDataLength}, () => []);
    const bandCountOf = new Uint8Array(allDataLength);
    const occCountOf = new Int16Array(allDataLength);
    const lastRoleByTile = new Int8Array(allDataLength).fill(-1);
    const chapterRankByTile = new Int32Array(allDataLength).fill(-1);
    let chapterStepCountValue = 0;
    const openingOrdinal = Array.from({length: NB + 2}, (_, k) =>
      k <= 0 ? 1 : Math.max(1, Math.ceil(Math.pow(bandsLogBase ?? 1.55, k - 1)))
    );

    function bandsForCount(n) {
      if (n <= 0) return 0;
      return Math.min(NB, Math.floor(Math.log(n) / LOGB) + 1);
    }

    function rebuild({roleStack, rolePosStack, roleCounts, roleLen, roleOrder, linear}) {
      const countsSource = roleCounts || roleLen;
      bandRoleChrono.fill(-1); bandRoleGrouped.fill(-1);
      bandPosChrono.fill(-1);  bandPosGrouped.fill(-1);
      bandCountOf.fill(0); occCountOf.fill(0); dominantRoleOf.fill(-1);
      for (let i = 0; i < roleMixOf.length; i++) roleMixOf[i] = [];
      const roleCount = roleOrder.length;
      const counts = new Int16Array(roleCount);
      const mixCounts = new Int16Array(roleCount);
      // In modo lineare la banda k rappresenta l'occorrenza k.
      const ordAt = linear ? (k => k) : (k => openingOrdinal[k]);

      for (let i = 0; i < allDataLength; i++) {
        const n = Math.min(CAP, countsSource[i] | 0);
        occCountOf[i] = n;
        if (!n) continue;
        const B = linear ? Math.min(NB, n) : bandsForCount(n);
        bandCountOf[i] = B;
        const src = i * CAP;
        const dst = i * NB;
        mixCounts.fill(0);
        for (let k = 0; k < n; k++) {
          const r = roleStack[src + k];
          if (r >= 0 && r < roleCount) mixCounts[r]++;
        }
        roleMixOf[i] = Array.from(mixCounts);

        let carry = -1, carryPos = -1;
        for (let k = 1; k <= B; k++) {
          const ord = Math.min(n, ordAt(k));
          let r = roleStack[src + (ord - 1)];
          let p = rolePosStack ? rolePosStack[src + (ord - 1)] : -1;
          if (r < 0) { r = carry; p = carryPos; }
          if (r >= 0) { carry = r; carryPos = p; }
          bandRoleChrono[dst + (k - 1)] = r;
          bandPosChrono[dst + (k - 1)] = linear ? (rolePosStack ? rolePosStack[src + (k - 1)] : -1) : p;
        }

        // Riempimento all'indietro dei ruoli mancanti.
        let back = -1;
        for (let k = B; k >= 1; k--) {
          const v = bandRoleChrono[dst + (k - 1)];
          if (v >= 0) back = v;
          else if (back >= 0) bandRoleChrono[dst + (k - 1)] = back;
        }

        const top = bandRoleChrono[dst + (B - 1)];
        for (let k = B; k < NB; k++) bandRoleChrono[dst + k] = top;

        // Ruolo dominante usato dalla vista sintetica.
        counts.fill(0);
        for (let k = 0; k < B; k++) {
          const r = bandRoleChrono[dst + k];
          if (r >= 0 && r < roleCount) counts[r]++;
        }
        let best = -1, bestC = 0, ties = 0;
        for (let q = 0; q < roleCount; q++) {
          if (counts[q] > bestC) { bestC = counts[q]; best = q; ties = 1; }
          else if (counts[q] === bestC && bestC > 0) ties++;
        }
        dominantRoleOf[i] = ties > 1 ? -2 : best;

        // L'ordinamento per ruolo mantiene allineati colore e identita' della terrazza.
        const rec = [];
        for (let k = 0; k < B; k++) rec.push({r: bandRoleChrono[dst + k], p: bandPosChrono[dst + k], k});
        rec.sort((a, b) =>
          d3.descending(a.r >= 0 ? counts[a.r] : -1, b.r >= 0 ? counts[b.r] : -1) ||
          d3.ascending(a.r, b.r) ||
          d3.ascending(a.k, b.k)
        );
        for (let k = 0; k < NB; k++) {
          bandRoleGrouped[dst + k] = k < rec.length ? rec[k].r : top;
          bandPosGrouped[dst + k]  = k < rec.length ? rec[k].p : -1;
        }
      }
    }

    function rebuildRecency({focalizer, cursorPos, cursorChapter, track, sequence, effRoleIdx, rowAllowed = null}) {
      lastRoleByTile.fill(-1);
      chapterRankByTile.fill(-1);
      chapterStepCountValue = 0;
      if (focalizer == null) return;
      const seenByTile = new Map();
      for (let j = 0; j < track.length; j++) {
        const pos = track[j];
        if (pos > cursorPos) break;
        const row = sequence[pos];
        if (!row) continue;
        if (rowAllowed && !rowAllowed(row)) continue;
        const t = row.tileIndex;
        let seen = seenByTile.get(t);
        if (!seen) { seen = new Set(); seenByTile.set(t, seen); }
        const ref = row.referenceId;
        if (seen.has(ref)) continue;
        seen.add(ref);
        const rowChapter = Number(row.chapter) || -1;
        const r = effRoleIdx(row);
        if (r >= 0) lastRoleByTile[t] = r;
        if (rowChapter === cursorChapter) {
          chapterStepCountValue++;
          chapterRankByTile[t] = chapterStepCountValue;
        }
      }
    }

    function bandTint({tileIndex, painters, sortEased}) {
      const base = tileIndex * NB;
      return k => {
        const slot = Math.max(0, Math.min(NB - 1, k - 1));
        const chrono = painters.roleTreadRgb(bandRoleChrono[base + slot], k);
        const grouped = painters.roleTreadRgb(bandRoleGrouped[base + slot], k);
        const tread = painters.mixRgb(chrono, grouped, sortEased);
        return [tread, painters.wallFromTreadRgb(tread)];
      };
    }

    function dominantTint({tileIndex, painters}) {
      const idx = dominantRoleOf[tileIndex];
      return () => {
        const tread = idx === -2 ? painters.rolePluralTreadRgb(1) : painters.roleTreadRgb(idx, 1);
        return [tread, painters.wallFromTreadRgb(tread)];
      };
    }

    return {
      bandRoleChrono, bandCountOf, occCountOf, dominantRoleOf, roleMixOf,
      // L'identita' segue l'ordinamento di destinazione e non il crossfade cromatico.
      posOfBand: (i, k, grouped) =>
        (grouped ? bandPosGrouped : bandPosChrono)[i * NB + Math.max(0, Math.min(NB - 1, k - 1))],
      lastRoleByTile,
      chapterRankByTile, chapterStepCount: () => chapterStepCountValue,
      rebuild, rebuildRecency, bandTint, dominantTint
    };
  }

  return { create };
})();

export default s4RoleBands;
