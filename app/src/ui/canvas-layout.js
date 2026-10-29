// Contratto del guscio: l'unico punto che traduce il layout in spazio disponibile.
// Il renderer riceve dimensioni CSS e fit, senza conoscere controlli o pannello.
// Due inquadrature (config FRAME.mode): 'pieno' il canvas copre tutta l'area e la figura è inquadrata nel
// riquadro lasciato libero dai margini dei comandi (ox, oy); 'riquadro' il canvas è il riquadro.
export default function observeCanvasLayout({wrap, viewBox, width, height, onResize, mode = "pieno"}) {
  let frame = 0, densityFrame = 0, previous = "", lastDpr = window.devicePixelRatio || 1;
  viewBox.style.display = "grid";
  viewBox.style.placeItems = "center";
  viewBox.style.overflow = "hidden";
  viewBox.dataset.frame = mode;
  function measure() {
    frame = 0;
    if (!wrap.isConnected) return;
    const outer = wrap.getBoundingClientRect(), inner = viewBox.getBoundingClientRect();
    const chromeHeight = outer.height - inner.height;
    // La cornice riserva i margini della figura con il padding del contenitore (token --figure-*).
    const box = getComputedStyle(viewBox), padX = parseFloat(box.paddingLeft) + parseFloat(box.paddingRight), padY = parseFloat(box.paddingTop) + parseFloat(box.paddingBottom);
    const availableWidth = viewBox.clientWidth;
    const availableHeight = Math.max(1, window.innerHeight - Math.max(0, outer.top) - chromeHeight);
    if (!(availableWidth > 0)) return;
    viewBox.style.height = `${availableHeight}px`;
    const fit = Math.min(Math.max(1, availableWidth - padX) / width, Math.max(1, availableHeight - padY) / height);
    const dpr = window.devicePixelRatio || 1;
    const padLeft = parseFloat(box.paddingLeft), padTop = parseFloat(box.paddingTop);
    const key = [availableWidth, availableHeight, padX, padY, padLeft, padTop, dpr].join(":");
    if (key === previous) return;
    previous = key;
    // Posizione del riquadro d'inquadratura dentro l'area: centrato nello spazio fra i margini.
    const ox = padLeft + (availableWidth - padX - width * fit) / 2, oy = padTop + (availableHeight - padY - height * fit) / 2;
    if (mode === "pieno") onResize({width: availableWidth, height: availableHeight, cssWidth: availableWidth, cssHeight: availableHeight, fit, ox, oy, box: {left: ox, top: oy, width: width * fit, height: height * fit}, dpr});
    else onResize({width: availableWidth, height: availableHeight, cssWidth: width * fit, cssHeight: height * fit, fit, ox: 0, oy: 0, box: null, dpr});
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(measure); }
  // Anche l'emulazione può cambiare DPR senza resize o eventi media-query.
  // Si legge solo uno scalare: il DOM si misura soltanto quando cambia.
  function watchDensity() {
    const dpr = window.devicePixelRatio || 1;
    if (dpr !== lastDpr) { lastDpr = dpr; schedule(); }
    densityFrame = requestAnimationFrame(watchDensity);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(wrap);
  for (const child of wrap.children) if (child !== viewBox) observer.observe(child);
  window.addEventListener("resize", schedule);
  watchDensity(); schedule();
  return () => {
    observer.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(densityFrame);
    window.removeEventListener("resize", schedule);
  };
}
