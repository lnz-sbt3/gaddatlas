import it from "../strings-it.js";
import s4Config from "../model/config.js";
// Installa gli handler dei controlli. Tiene fuori da createAtlas il wiring UI,
// lasciando li' solo le funzioni che mutano lo stato locale.
const s4ChartHandlers = (() => {
  function install({shell, constants, state, actions}) {
    const {
      PLAY_ICON, PAUSE_ICON,
      slider, chLabel, btn, mapBtn, pasticciaccioBtn, reliefBtn, focalizerSelect, rotSlider,
      stagePrevBtn, stageNextBtn, seqChapterBtn, seqPageBtn, orderBtn, seqSlider,
      ribbonPrevBtn, ribbonNextBtn, roleButtons, rotLeftBtn, rotRightBtn, rotResetBtn, grainToggle, seqRowBtn, ribbonWrap
    } = shell;
    const {stepDeg} = s4Config.ROTATION;
    const {SEQ_PLAY_MS, PLAY_MS, N_CHAPTERS} = constants;

    function clearPlayback() {
      const timer = state.playTimer();
      if (timer) clearInterval(timer);
      state.setPlayTimer(null);
      state.setPlaying(false);
      btn.textContent = PLAY_ICON;btn.setAttribute("aria-label",it.play);
    }

    slider.oninput = () => {
      state.setChapter(+slider.value);
      state.setSeqOccDirty(true);
      chLabel.textContent = slider.value;
      actions.updateSeqUi();
    };
    focalizerSelect.onchange = () => {
      actions.clearSelectedRoute();
      state.setFocalizer(focalizerSelect.value || null);
      if (state.seqMode()) actions.setSeqPos(actions.nearestSeqPos(state.seqPos()));
      state.setSeqOccDirty(true);
      actions.updateSeqUi();
    };
    seqSlider.oninput = () => {
      const track = actions.grainTrack();
      const idx = Math.max(0, Math.min(track.length - 1, +seqSlider.value || 0));
      if (track.length) actions.setSeqPos(track[idx]);
    };
    // Un passo del cursore (capitolo, pagina o riga secondo il modo e la granularità), comune a rotella e tasti.
    function stepCursor(direction, grain = null) {
      if (state.seqMode()) {
        const track = grain === "row" ? actions.seqTrack() : actions.grainTrack();
        if (!track.length) return;
        const j = grain === "row" ? actions.seqTrackIndex(state.seqPos(), track) : actions.grainIndex(state.seqPos(), track);
        const k = Math.max(0, Math.min(track.length - 1, j + direction));
        if (k !== j) actions.setSeqPos(track[k]);
      } else {
        const next = Math.max(1, Math.min(N_CHAPTERS, state.chapter() + direction));
        if (next === state.chapter()) return;
        state.setChapter(next); state.setSeqOccDirty(true); slider.value = next; chLabel.textContent = String(next); actions.updateSeqUi();
      }
    }
    // Modificatore: con Maiuscolo le frecce sul cursore delle pagine vanno per riga.
    seqSlider.onkeydown = e => {
      if (s4Config.GRAIN.variant !== "modificatore" || !e.shiftKey) return;
      const d = {ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1}[e.key];
      if (d) { e.preventDefault(); stepCursor(d, "row"); }
    };
    // Rotella sulla linea del tempo (cursore, nastro): avanza capitoli o pagine, mai lo zoom della figura.
    let wheelRest = 0;
    const onTimelineWheel = e => {
      e.preventDefault();
      wheelRest += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const threshold = e.deltaMode === 1 ? 3 : 100;
      while (Math.abs(wheelRest) >= threshold) { const d = Math.sign(wheelRest); wheelRest -= d * threshold; stepCursor(d); }
    };
    const timeline = [slider.closest(".ctl-row"), ribbonWrap].filter(Boolean);
    // Trascinamento sul nastro: il cursore segue il dito o il mouse di pagina in pagina.
    const ribbonSvg = ribbonWrap?.querySelector("svg");
    let ribbonDrag = null;
    const ribbonX = e => { const r = ribbonSvg.getBoundingClientRect(); return (e.clientX - r.left) * (ribbonSvg.__width || r.width) / r.width; };
    const onRibbonDown = e => { if (e.button > 0 || e.target.closest?.("[data-pos]")) return; ribbonDrag = e.pointerId; ribbonSvg.setPointerCapture(e.pointerId); onRibbonMove(e); };
    const onRibbonMove = e => { if (ribbonDrag !== e.pointerId || !ribbonSvg.__pick) return; const pos = ribbonSvg.__pick(ribbonX(e)); if (pos != null && pos !== state.seqPos()) actions.setSeqPos(pos); };
    const onRibbonUp = e => { if (ribbonDrag === e.pointerId) ribbonDrag = null; };
    if (ribbonSvg) { ribbonSvg.addEventListener("pointerdown", onRibbonDown); ribbonSvg.addEventListener("pointermove", onRibbonMove); ribbonSvg.addEventListener("pointerup", onRibbonUp); ribbonSvg.addEventListener("pointercancel", onRibbonUp); ribbonSvg.style.touchAction = "pan-y"; }
    for (const el of timeline) el.addEventListener("wheel", onTimelineWheel, {passive: false});
    if (grainToggle) grainToggle.onclick = e => {
      const b = e.target.closest("[data-grain]"); if (!b) return;
      state.setSeqGrain(b.dataset.grain); const t = actions.grainTrack(); if (t.length) actions.setSeqPos(t[actions.grainIndex(state.seqPos(), t)]); actions.updateSeqUi("cursor");
    };
    // Rotazione a scatti: dal valore corrente, con il perno fermato come per il cursore.
    function rotateTo(deg) {
      const d = ((Math.round(deg) % 360) + 360) % 360;
      actions.freezeRotPivot(); rotSlider.value = String(d); state.setPlanRot(d * Math.PI / 180);
    }
    const currentDeg = () => Math.round(state.planRot() * 180 / Math.PI);
    if (rotLeftBtn) rotLeftBtn.onclick = () => rotateTo(currentDeg() - stepDeg);
    if (rotRightBtn) rotRightBtn.onclick = () => rotateTo(currentDeg() + stepDeg);
    if (rotResetBtn) rotResetBtn.onclick = () => rotateTo(0);
    rotSlider.onpointerdown = () => actions.freezeRotPivot();
    rotSlider.oninput = () => state.setPlanRot((+rotSlider.value || 0) * Math.PI / 180);
    stagePrevBtn.onclick = () => actions.moveStage(-1);
    stageNextBtn.onclick = () => actions.moveStage(1);
    function setSeqModeExplicit(nextSeqMode) {
      if (!actions.seqEnabledNow()) return;
      if (state.playing() && state.playTimer()) clearPlayback();
      if (nextSeqMode && !state.seqMode()) {
        state.setSeqMode(true);
        actions.setSeqPos(actions.lastSeqPosOfChapter(state.chapter()));
        state.setSeqOccDirty(true);
        actions.updateSeqUi();
      } else if (!nextSeqMode && state.seqMode()) {
        state.setSeqMode(false);
        const c = actions.chapterOfCursor(state.seqPos());
        state.setChapter(c);
        slider.value = c;
        chLabel.textContent = String(c);
        state.setSeqOccDirty(true);
        actions.updateSeqUi();
      } else {
        actions.updateSeqUi();
      }
    }
    seqChapterBtn.onclick = () => setSeqModeExplicit(false);
    // Nei «tre tempi» pagina e riga sono due modi del cursore; altrove «per pagina» lascia la granularità scelta.
    seqPageBtn.onclick = () => { if (s4Config.GRAIN.variant === "tre-tempi") state.setSeqGrain("page"); setSeqModeExplicit(true); };
    if (seqRowBtn) seqRowBtn.onclick = () => { state.setSeqGrain("row"); setSeqModeExplicit(true); };
    if (ribbonPrevBtn) ribbonPrevBtn.onclick = () => actions.moveSeqChapter(-1);
    if (ribbonNextBtn) ribbonNextBtn.onclick = () => actions.moveSeqChapter(1);
    if (roleButtons) roleButtons.forEach((button, roleIndex) => {
      button.onclick = () => actions.toggleRoleFilter(roleIndex);
    });
    orderBtn.onclick = () => {
      if (state.focalizer() == null) return;
      state.setRoleSortTarget(state.roleSortTarget() > 0.5 ? 0 : 1);
      actions.updateSeqUi("order");
    };
    reliefBtn.onclick = () => {
      if (!state.diagramOpenedOnce()) return;
      if (state.tiltTarget() > 0) {
        actions.applyStage(state.crimpTarget() > 0.5
          ? (state.showFictitious() ? "diagram2d_fict" : "diagram2d")
          : "map2d");
      } else {
        actions.applyStage(state.crimpTarget() > 0.5 ? "diagram_axon" : "map_axon");
      }
    };
    mapBtn.onclick = () => actions.applyStage(state.tiltTarget() > 0 ? "map_axon" : "map2d");
    pasticciaccioBtn.onclick = () => {
      state.setShowFictitious(true);
      actions.applyStage(state.tiltTarget() > 0 ? "diagram_axon" : "diagram2d_fict");
    };
    btn.onclick = () => {
      state.setPlaying(!state.playing());
      btn.textContent = state.playing() ? PAUSE_ICON : PLAY_ICON;
      btn.setAttribute("aria-label",state.playing()?it.pause:it.play);
      if (state.playing()) {
        if (state.playTimer()) clearInterval(state.playTimer());
        if (state.seqMode()) {
          const track = actions.grainTrack();
          if (!track.length) { clearPlayback(); return; }
          let j = actions.grainIndex(state.seqPos(), track);
          const currentChapter = actions.chapterOfCursor(state.seqPos());
          const nextPos = j < track.length - 1 ? track[j + 1] : null;
          if (nextPos == null || actions.chapterOfCursor(nextPos) !== currentChapter) {
            let nextChapterPos = -1;
            for (let c = currentChapter + 1; c <= N_CHAPTERS && nextChapterPos < 0; c++) {
              nextChapterPos = actions.firstSeqPosOfChapter(c, track);
            }
            if (nextChapterPos < 0) { clearPlayback(); return; }
            actions.setSeqPos(nextChapterPos);
          }
          state.setPlayTimer(setInterval(() => {
            const currentTrack = actions.grainTrack();
            if (!currentTrack.length){ clearPlayback(); return; }
            let k = actions.grainIndex(state.seqPos(), currentTrack);
            if (k >= currentTrack.length - 1){ clearPlayback(); return; }
            if (actions.chapterOfCursor(currentTrack[k + 1]) !== actions.chapterOfCursor(state.seqPos())) {
              clearPlayback();
              return;
            }
            actions.setSeqPos(currentTrack[k + 1]);
          }, SEQ_PLAY_MS));
          return;
        }
        if (state.chapter() >= N_CHAPTERS) {
          state.setChapter(1);
          state.setSeqOccDirty(true);
          slider.value = 1;
          chLabel.textContent = "1";
          actions.updateSeqUi();
        }
        state.setPlayTimer(setInterval(() => {
          if (state.chapter() >= N_CHAPTERS){ clearPlayback(); return; }
          const next = state.chapter() + 1;
          state.setChapter(next);
          state.setSeqOccDirty(true);
          slider.value = next;
          chLabel.textContent = next;
          actions.updateSeqUi();
        }, PLAY_MS));
      } else if (state.playTimer()) clearPlayback();
    };

    return function dispose() {
      actions.cancelFrame();
      if (state.playTimer()) clearInterval(state.playTimer());
      slider.oninput = null;
      focalizerSelect.onchange = null;
      seqSlider.oninput = null; seqSlider.onkeydown = null;
      for (const el of timeline) el.removeEventListener("wheel", onTimelineWheel);
      rotSlider.onpointerdown = null;
      rotSlider.oninput = null;
      for (const button of [stagePrevBtn, stageNextBtn, seqChapterBtn, seqPageBtn,
        ribbonPrevBtn, ribbonNextBtn, orderBtn, reliefBtn, mapBtn, pasticciaccioBtn,
        btn, ...(roleButtons || [])]) {
        if (button) button.onclick = null;
      }
    };
  }

  return { install };
})();

export default s4ChartHandlers;
