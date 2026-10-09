// ===== CELLA: s4ProfileLog =====
  // -- CELLA: s4ProfileLog --
  const s4ProfileLog = (() => {
  function chartS4(args) {
    const nextFrame = args.profileFrame + 1;
    if (nextFrame % 60 === 0) {
      const frame = args.frame;
      console.log("[chartS4 profile]", {
        tiles: args.profileTiles,
        curves: args.profileCurves,
        fillCalls: args.profileFills,
        strokeCalls: args.profileStrokes,
        displayMs: +args.profileDisplayMs.toFixed(1),
        drawOrderMs: +args.profileDrawOrderMs.toFixed(1),
        reliefMs: +args.profileReliefMs.toFixed(1),
        baseContourMs: +(frame.profile ? frame.profile.baseContourMs : 0).toFixed(1),
        traceMs: +(frame.profile ? frame.profile.traceMs : 0).toFixed(1),
        fillBuildMs: +(frame.profile ? frame.profile.fillBuildMs : 0).toFixed(1),
        fillRasterMs: +(frame.profile ? frame.profile.fillRasterMs : 0).toFixed(1),
        strokePtsMs: +(frame.profile ? frame.profile.strokePtsMs : 0).toFixed(1),
        quadCount: frame.profile ? frame.profile.quadCount : 0,
        ribbonCount: frame.profile ? frame.profile.ribbonCount : 0,
        nestedBandCount: frame.profile ? frame.profile.nestedBandCount : 0,
        nestedFallbacks: frame.profile ? frame.profile.nestedFallbacks : 0,
        fillLenAAvg: frame.profile && frame.profile.fillLenCalls ? +(frame.profile.fillLenASum / frame.profile.fillLenCalls).toFixed(1) : 0,
        fillLenBAvg: frame.profile && frame.profile.fillLenCalls ? +(frame.profile.fillLenBSum / frame.profile.fillLenCalls).toFixed(1) : 0,
        bordersMs: +args.profileBordersMs.toFixed(1),
        rulerMs: +args.profileRulerMs.toFixed(1),
        tickMs: +args.profileTickMs.toFixed(1),
        tickOtherMs: +(args.profileTickMs - args.profileHitMs).toFixed(1),
        hitMs: +args.profileHitMs.toFixed(1),
        seqOccCallsPerSecond: +args.seqOccCallsPerSecond.toFixed(1),
        drawMs: +(performance.now() - args.profileT0).toFixed(1)
      });
    }
    return nextFrame;
  }

  return { chartS4 };
})();

export default s4ProfileLog;
