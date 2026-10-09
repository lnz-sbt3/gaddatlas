// Intersezione raggio-cella: la cella Voronoi è convessa e contiene il
// generatore: un raggio da G in una direzione data la attraversa il bordo esattamente
// una volta. Scorro i lati del poligono GREZZO (pochi vertici) e risolvo il sistema
// lineare raggio<->segmento; restituisco la distanza minima positiva trovata (= dove
// il trattino deve fermarsi per restare dentro).
const s4RayCellDistance = function rayCellDistance(gx, gy, dx, dy, cell){
  let best = Infinity;
  for (let k=0;k<cell.length-1;k++){
    const ax=cell[k][0], ay=cell[k][1], bx=cell[k+1][0], by=cell[k+1][1];
    const ex = bx-ax, ey = by-ay;
    const det = ex*dy - ey*dx;
    if (Math.abs(det) < 1e-9) continue;
    const t = (ex*(ay-gy) - ey*(ax-gx)) / det;
    const u = (dx*(ay-gy) - dy*(ax-gx)) / det;
    if (t > 1e-9 && u >= -1e-6 && u <= 1+1e-6 && t < best) best = t;
  }
  return best === Infinity ? 0 : best;
};

export default s4RayCellDistance;
