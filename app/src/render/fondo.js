// Fondo della figura a carta storica spenta (PAPER.mode):
// 'grana'  la pergamena con una grana di carta deterministica (disegnata in atlas.js);
// 'raster' una carta attuale sobria (tessere standard di OpenStreetMap, ridotte a grigio caldo e attenuate), fusa per
//          moltiplica: solo in sviluppo; pubblicarla richiederebbe tessere proprie;
// 'tratti' pochi tratti vettoriali (Tevere e Aniene, laghi, autostrade e grandi strade, OpenStreetMap) sulla pergamena:
//          i dati sono un file di sviluppo, fuori dal build.
// Il fondo vale solo nella geografia e solo a carta storica spenta.
// 'orientamento': solo elementi stabili rispetto al 1925, da OpenStreetMap, inclusi nel build:
// Tevere e Aniene, laghi Albano e di Nemi (campitura leggerissima), Mura Aureliane e gianicolensi, linea di costa.
// Nessuna strada, ferrovia o confine. Acqua in grigio azzurrato, mura in grigio neutro più sottile dei bordi di
// cella (bruno caldo); nessun tratteggio. Nessuna richiesta di rete: il modulo dati è locale.
export const ORIENTAMENTO_STYLE = {
  fiume: {stroke: '88,118,136', alpha: .72, widthCSS: .7},
  costa: {stroke: '88,118,136', alpha: .55, widthCSS: .6},
  lago: {fill: '88,118,136', fillAlpha: .16, stroke: '88,118,136', alpha: .55, widthCSS: .5},
  mura: {stroke: '112,110,108', alpha: .8, widthCSS: .55}
};
export function createFondo({projection, onReady = () => {}}){
  let orient = null, loading = false;
  async function loadOrient(){ if (orient || loading) return; loading = true; orient = (await import('../assets/fondo/orientamento-osm.json')).default; onReady(); }
  function drawOrient(context, alpha, unit){
    if (!orient) { loadOrient(); return; }
    context.save(); context.globalAlpha *= alpha; context.lineJoin = 'round'; context.lineCap = 'round';
    for (const kind of ['lago', 'costa', 'fiume', 'mura']) {
      const st = ORIENTAMENTO_STYLE[kind], path = new Path2D();
      for (const f of orient.features) if (f.properties.k === kind) f.geometry.coordinates.forEach((c, j) => { const p = projection(c); if (p) j ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]); });
      if (st.fill) { context.fillStyle = `rgba(${st.fill},${st.fillAlpha})`; context.fill(path); }
      context.strokeStyle = `rgba(${st.stroke},${st.alpha})`; context.lineWidth = st.widthCSS * unit; context.stroke(path);
    }
    context.restore();
  }
  const dev = import.meta.env.DEV ? createDevFondo({projection, onReady}) : null;
  return {
    draw(context, options){
      if (options.alpha <= .01) return;
      if (options.mode === 'orientamento') drawOrient(context, options.alpha, options.unit);
      else dev?.draw(context, options);
    },
    credit: mode => mode === 'orientamento' ? '© OpenStreetMap contributors' : dev ? dev.credit(mode) : ''
  };
}
function createDevFondo({projection, onReady}){
  let data = null, loading = false;
  const tiles = new Map();
  async function loadData(){
    if (data || loading || !import.meta.env.DEV) return; loading = true;
    data = (await import('../dev/fondo/tratti-osm.json')).default; onReady();
  }
  const TILE = 256, URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  // Ogni tessera si riduce a un grigio caldo attenuato (luminanza, contrasto 0,55) prima di fondersi con la pergamena.
  function soften(img){
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let j = 0; j < a.length; j += 4) { const l = .2126 * a[j] + .7152 * a[j + 1] + .0722 * a[j + 2], v = 255 - (255 - l) * .55; a[j] = v; a[j + 1] = v * .97; a[j + 2] = v * .92; }
    g.putImageData(d, 0, 0); return c;
  }
  const lon2x = (lon, z) => (lon + 180) / 360 * 2 ** z, lat2y = (lat, z) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z;
  const x2lon = (x, z) => x / 2 ** z * 360 - 180, y2lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / 2 ** z; return 180 / Math.PI * Math.atan(Math.sinh(n)); };
  function tile(z, x, y){
    const key = `${z}/${x}/${y}`; let t = tiles.get(key);
    if (!t) { const img = new Image(); t = {ready: null}; img.crossOrigin = 'anonymous'; img.onload = () => { t.ready = soften(img); onReady(); }; img.src = URL_TEMPLATE.replace('{z}', z).replace('{x}', x).replace('{y}', y); tiles.set(key, t); if (tiles.size > 400) tiles.delete(tiles.keys().next().value); }
    return t.ready;
  }
  // Rettangolo del mondo visibile: angoli del canvas riportati nel piano della figura (anche in rilievo).
  function visibleLonLat(context){
    const inv = context.getTransform().invertSelf(), c = context.canvas, pts = [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height]].map(([x, y]) => { const p = inv.transformPoint({x, y}); return projection.invert([p.x, p.y]); });
    return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  }
  function drawRaster(context, alpha, offset){
    const m = context.getTransform(), devicePerWorld = Math.hypot(m.a, m.b);
    const z = Math.max(5, Math.min(17, Math.round(Math.log2(projection.scale() * devicePerWorld * 2 * Math.PI / TILE))));
    const [w, s, e, n] = visibleLonLat(context), x0 = Math.floor(lon2x(w, z)), x1 = Math.floor(lon2x(e, z)), y0 = Math.floor(lat2y(n, z)), y1 = Math.floor(lat2y(s, z));
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 60) return;
    context.save(); context.globalAlpha *= alpha; context.globalCompositeOperation = 'multiply';
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const img = tile(z, x, y); if (!img) continue;
      const a = projection([x2lon(x, z), y2lat(y, z)]), b = projection([x2lon(x + 1, z), y2lat(y + 1, z)]);
      context.drawImage(img, a[0] - offset[0], a[1] - offset[1], b[0] - a[0], b[1] - a[1]);
    }
    context.restore();
  }
  function drawTratti(context, alpha, unit, offset){
    if (!data) { loadData(); return; }
    const STYLE = {strada: ['120,90,70', .38, .9], fiume: ['86,112,124', .7, 1.6], lago: ['86,112,124', .6, 1.1]};
    context.save(); context.globalAlpha *= alpha; context.globalCompositeOperation = 'multiply'; context.lineJoin = 'round'; context.lineCap = 'round';
    for (const kind of ['strada', 'lago', 'fiume']) {
      const [rgb, a, wCSS] = STYLE[kind], path = new Path2D();
      for (const f of data.features) if (f.properties.k === kind) f.geometry.coordinates.forEach((c, j) => { const p = projection(c); if (p) j ? path.lineTo(p[0] - offset[0], p[1] - offset[1]) : path.moveTo(p[0] - offset[0], p[1] - offset[1]); });
      context.strokeStyle = `rgba(${rgb},${a})`; context.lineWidth = wCSS * unit; context.stroke(path);
    }
    context.restore();
  }
  return {
    // offset: coordinate del mondo usate dal disegno (bbox), perché il canvas trasla di -bbox prima del piano.
    draw(context, {mode, alpha, unit, offset = [0, 0]}){
      if (alpha <= .01) return;
      if (mode === 'raster' && import.meta.env.DEV) drawRaster(context, alpha, offset);
      if (mode === 'tratti' && import.meta.env.DEV) drawTratti(context, alpha, unit, offset);
    },
    credit: mode => mode === 'raster' ? '© OpenStreetMap contributors' : mode === 'tratti' ? '© OpenStreetMap contributors (ODbL)' : ''
  };
}
