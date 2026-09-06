// ===== CELLA: context2d =====
const context2d = (width, height, dpi = devicePixelRatio) => {
  const canvas = document.createElement("canvas");
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  context.scale(dpi, dpi);
  return context;
};

export default context2d;
