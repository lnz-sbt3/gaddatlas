import it from "../strings-it.js";
import s4Config from "../model/config.js";

// Il bitmap segue i pixel CSS e il DPR; le coordinate del modello restano canoniche.
// fit, ox, oy: scala e posizione del riquadro del modello nel canvas (px CSS); senza, il canvas è il riquadro.
export function resizeContext2d(context, {cssWidth, cssHeight, width, height, dpi = devicePixelRatio, fit = cssWidth / width, ox = 0, oy = 0}) {
  const {CANVAS_MAX_PIXELS, CANVAS_MAX_EDGE} = s4Config;
  const density = Math.min(dpi, Math.sqrt(CANVAS_MAX_PIXELS / (cssWidth * cssHeight)),
    CANVAS_MAX_EDGE / cssWidth, CANVAS_MAX_EDGE / cssHeight);
  const canvas = context.canvas;
  const bitmapWidth = Math.max(1, Math.floor(cssWidth * density));
  const bitmapHeight = Math.max(1, Math.floor(cssHeight * density));
  if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
  if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const sx = bitmapWidth / cssWidth, sy = bitmapHeight / cssHeight;
  context.setTransform(sx * fit, 0, 0, sy * fit, sx * ox, sy * oy);
  return context.getTransform();
}

const context2d = (width, height, dpi = devicePixelRatio) => {
  const context = document.createElement("canvas").getContext("2d");
  context.canvas.tabIndex=0;context.canvas.setAttribute("role","img");context.canvas.setAttribute("aria-label",it.canvasName);context.canvas.setAttribute("aria-description",it.canvasHelp);
  resizeContext2d(context, {cssWidth: width, cssHeight: height, width, height, dpi});
  return context;
};
export default context2d;
