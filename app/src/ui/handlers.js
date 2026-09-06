// ===== CELLA: s4ChartHandlers =====
// -- CELLA: s4ChartHandlers --
// Installa gli handler dei controlli. Tiene fuori da chartS4 il wiring UI,
// lasciando li' solo le funzioni che mutano lo stato locale.
const s4ChartHandlers = (() => {
  function install({shell, constants, state, actions}) {
    const {
      PLAY_ICON, PAUSE_ICON,
      slider, chLabel, btn, mapBtn, pasticciaccioBtn, reliefBtn, focalizerSelect, rotSlider,
      stagePrevBtn, stageNextBtn, seqChapterBtn, seqPageBtn, orderBtn, seqSlider,
      ribbonPrevBtn, ribbonNextBtn, roleButtons
    } = shell;
    const {SEQ_PLAY_MS, PLAY_MS, N_CHAPTERS} = constants;

    function clearPlayback() {
      const timer = state.playTimer();
      if (timer) clearInterval(timer);
      state.setPlayTimer(null);
      state.setPlaying(false);
      btn.textContent = PLAY_ICON;
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
      const track = actions.seqTrack();
      const idx = Math.max(0, Math.min(track.length - 1, +seqSlider.value || 0));
      if (track.length) actions.setSeqPos(track[idx]);
    };
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
    seqPageBtn.onclick = () => setSeqModeExplicit(true);
    if (ribbonPrevBtn) ribbonPrevBtn.onclick = () => actions.moveSeqChapter(-1);
    if (ribbonNextBtn) ribbonNextBtn.onclick = () => actions.moveSeqChapter(1);
    if (roleButtons) roleButtons.forEach((button, roleIndex) => {
      button.onclick = () => actions.toggleRoleFilter(roleIndex);
    });
    orderBtn.onclick = () => {
      if (state.focalizer() == null) return;
      state.setRoleSortTarget(state.roleSortTarget() > 0.5 ? 0 : 1);
      actions.updateSeqUi();
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
      if (state.playing()) {
        if (state.playTimer()) clearInterval(state.playTimer());
        if (state.seqMode()) {
          const track = actions.seqTrack();
          if (!track.length) { clearPlayback(); return; }
          let j = actions.seqTrackIndex(state.seqPos(), track);
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
            const currentTrack = actions.seqTrack();
            if (!currentTrack.length){ clearPlayback(); return; }
            let k = actions.seqTrackIndex(state.seqPos(), currentTrack);
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
      seqSlider.oninput = null;
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
