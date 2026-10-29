import it from '../strings-it.js';

// Manifest a più sorgenti (versione 2): ogni carta ha la sua piramide e
// il suo ritaglio (ellisse valida o cornice cartografica); si dispongono per 'order', la più dettagliata sopra. Un solo
// insieme di comandi. Con HISTORICAL.stack 'pila' le carte si compongono in uno strato a parte e la pila entra nella
// figura una sola volta, con la visibilità del cursore; con 'sovrapposte' ciascuna carta entra per conto suo.
export function createHistoricalMap(options){
  const {manifest,config,onChange=()=>{}}=options;
  if(manifest.version!==2)return createHistoricalSource(options);
  const parts=[...manifest.sources].sort((a,b)=>a.order-b.order).map((source,i)=>createHistoricalSource({...options,
    manifest:{...source,sphere_radius_m:manifest.sphere_radius_m,default_treatment:manifest.default_treatment,levels:source.levels},silent:i>0}));
  const first=parts[0];
  if(config.HISTORICAL.stack==='pila')return createStack(parts,{config,onChange});
  return {element:first.element,
    draw(context,frame,snapshot,fitScale){parts.forEach((p,i)=>p.draw(context,frame,snapshot.parts?.[i]||p.snapshot(),fitScale));},
    reserve(){let r=null;for(const p of parts)r=p.reserve()||r;return r;},
    snapshot(){const each=parts.map(p=>p.snapshot());return{revision:each.reduce((n,e)=>n+e.revision,0),opacity:first.opacity,texture:each.some(e=>e.texture),parts:each};},
    get ready(){return parts.every(p=>p.ready||p.failed)},get failed(){return parts.every(p=>p.failed)},get diagnostics(){return parts.map(p=>p.diagnostics)},
    get treatments(){return first.treatments},get treatment(){return first.treatment},get opacity(){return first.opacity},get lens(){return first.lens},
    setLens:v=>parts.forEach(p=>p.setLens(v)),setOpacity:v=>parts.forEach(p=>p.setOpacity(v)),setTreatment:v=>parts.forEach(p=>p.setTreatment(v)),
    setClipMode:v=>parts.forEach(p=>p.setClipMode(v)),setReserveMode:v=>parts.forEach(p=>p.setReserveMode(v)),
    dispose(){parts.forEach(p=>p.dispose());}};
}
// Pila: le carte si disegnano opache, nell'ordine, in uno strato grande quanto il canvas; lo strato entra nella figura
// con la visibilità del cursore e la fusione della carta. Dove una carta più dettagliata esiste copre quella sotto.
function createStack(parts,{config,onChange}){
  let opacity=1,lens=null,revision=0,layer=null,reserveState=null,reserveMode='global';
  parts.forEach(p=>p.setOpacity(1));
  function changed(){revision++;onChange();}
  function draw(context,frame,snapshot,fitScale,tiles=null){
    reserveState=null;
    if(snapshot.opacity<=0||parts.every(p=>p.failed))return;
    const canvas=context.canvas;
    if(!layer)layer=document.createElement('canvas');
    if(layer.width!==canvas.width||layer.height!==canvas.height){layer.width=canvas.width;layer.height=canvas.height;}
    const g=layer.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,layer.width,layer.height);
    const matrix=context.getTransform();g.setTransform(matrix);
    let strength=0;
    parts.forEach((p,i)=>{strength=Math.max(strength,p.draw(g,frame,snapshot.parts?.[i]||p.snapshot(),fitScale,tiles,true)||0);});
    if(!strength)return;
    context.save();context.setTransform(1,0,0,1,0,0);
    if(lens){const k=canvas.width/Math.max(1,canvas.clientWidth),lensPath=new Path2D();lensPath.arc(lens.x*k,lens.y*k,lens.r*k,0,2*Math.PI);context.clip(lensPath);}
    context.globalAlpha*=snapshot.opacity;context.globalCompositeOperation=config.HISTORICAL.blend||'source-over';
    context.drawImage(layer,0,0);context.restore();
    reserveState={alpha:snapshot.opacity*strength,matrix};
  }
  function reserve(){
    if(!reserveState)return null;const {alpha,matrix}=reserveState;
    return{alpha,clip(context){if(reserveMode!=='domain')return;const m=context.getTransform(),union=new Path2D();context.setTransform(matrix);
      for(const p of parts)union.addPath(p.domain);context.clip(union);context.setTransform(m);}};
  }
  return {element:parts[0].element,draw,reserve,
    snapshot(){const each=parts.map(p=>p.snapshot());return{revision:revision+each.reduce((n,e)=>n+e.revision,0),opacity,texture:each.some(e=>e.texture),parts:each};},
    get ready(){return parts.every(p=>p.ready||p.failed)},get failed(){return parts.every(p=>p.failed)},get diagnostics(){return{opacity,parts:parts.map(p=>p.diagnostics)}},
    get treatments(){return parts[0].treatments},get treatment(){return parts[0].treatment},get opacity(){return opacity},get lens(){return lens},
    setLens(value){lens=value;changed();},setOpacity(value){opacity=Math.max(0,Math.min(1,Number(value)));changed();},
    setTreatment:v=>parts.forEach(p=>p.setTreatment(v)),setClipMode:v=>parts.forEach(p=>p.setClipMode(v)),
    setReserveMode(value){if(!['global','domain'].includes(value))throw Error('Unknown reserve mode');reserveMode=value;changed();},
    dispose(){parts.forEach(p=>p.dispose());layer=null;}};
}
// Una carta: piramide, ritaglio (ellisse valida dell'affine o cornice cartografica) e disegno. Con 'composite' disegna
// opaca e senza fusione nello strato della pila e restituisce la propria intensità.
function createHistoricalSource({manifest,projection,cellRings,config,onChange=()=>{}}){
  const R=manifest.sphere_radius_m,scale=projection.scale()/R,center=projection.center(),translation=projection.translate();
  const origin=[R*center[0]*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+center[1]*Math.PI/360))];
  const world=([x,y])=>[translation[0]+scale*(x-origin[0]),translation[1]-scale*(y-origin[1])];
  const topLeft=world(manifest.origin_mercator),step=manifest.mercator_m_per_pixel*scale;
  const domain=new Path2D();
  // Ritaglio: ellisse dichiarata nel manifest, altrimenti cornice cartografica, altrimenti ellisse valida dell'affine.
  const outline=manifest.ellipse_mercator||manifest.frame_mercator;
  if(outline){outline.forEach((p,i)=>{const [x,y]=world(p);i?domain.lineTo(x,y):domain.moveTo(x,y);});domain.closePath();}
  else{
    const matrix=manifest.source_to_mercator_matrix,offset=manifest.source_to_mercator_origin;
    const a=world(offset),mx=matrix.map(row=>row[0]*manifest.valid_radius),my=matrix.map(row=>row[1]*manifest.valid_radius);
    const ellipse=new Path2D();ellipse.ellipse(0,0,1,1,0,0,2*Math.PI);
    domain.addPath(ellipse,new DOMMatrix([mx[0]*scale,-mx[1]*scale,my[0]*scale,-my[1]*scale,a[0],a[1]]));
  }
  // Comparsa con lo zoom (manifest 'appear', in px CSS per texel della carta): da trasparente a piena.
  const appearOf=css=>manifest.appear?Math.max(0,Math.min(1,(css-manifest.appear.from_css_texel)/(manifest.appear.to_css_texel-manifest.appear.from_css_texel))):1;
  const cells=new Path2D();
  for(const cell of cellRings)if(cell?.ring){cell.ring.forEach((p,i)=>i?cells.lineTo(...p):cells.moveTo(...p));cells.closePath();}
  // Due ritagli, solo in sviluppo: nessun controllo o risorsa nel build.
  let clipMode='ellipse';
  let opacity=1,treatment=manifest.default_treatment,revision=0,request=0,disposed=false,current=null,pending=null,failed=false;
  const controller=new AbortController(),cache=new Map();
  const ui=document.createElement('section');ui.className='historical-controls';ui.setAttribute('aria-label',it.historicalSection);
  const label=document.createElement('label'),title=document.createElement('span');title.textContent=it.historicalSlider;
  const input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.step=1;input.value=100;input.setAttribute('aria-label',it.historicalSlider);label.append(title,input);
  const ends=document.createElement('div');ends.className='historical-ends';
  const currentLabel=document.createElement('span'),historicalLabel=document.createElement('span');currentLabel.textContent=it.currentBase;historicalLabel.textContent=it.historicalBase;ends.append(currentLabel,historicalLabel);
  const credit=document.createElement('small');credit.textContent=it.historicalCredit;ui.append(label,ends,credit);ui.hidden=true;
  function changed(){revision++;onChange();}
  function setOpacity(value){opacity=Math.max(0,Math.min(1,Number(value)));input.value=String(Math.round(opacity*100));changed();}
  input.addEventListener('input',()=>setOpacity(+input.value/100),{signal:controller.signal});
  async function load(level){
    if(cache.has(level.file))return cache.get(level.file);
    const res=await fetch(import.meta.env.BASE_URL+'__local_basemap/'+level.file,{signal:controller.signal});
    if(!res.ok)throw Error('Historical resource unavailable');
    let bitmap=await createImageBitmap(await res.blob());if(disposed){bitmap.close();return null;}
    // Amplificazione dell'inchiostro (config HISTORICAL.gain per trattamento): i trattamenti sono quasi bianchi per
    // costruzione e, fusi per moltiplica, resterebbero sotto la soglia di percettibilità. La carta resta bianca (neutra).
    const gain=config.HISTORICAL.gain?.[level.treatment]||1;
    if(gain!==1){const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bitmap,0,0);
      const img=g.getImageData(0,0,c.width,c.height),d=img.data;for(let j=0;j<d.length;j+=4){const v=255-gain*(255-d[j]),t=v<0?0:v;d[j]=d[j+1]=d[j+2]=t;}
      g.putImageData(img,0,0);bitmap.close();bitmap=await createImageBitmap(c);if(disposed){bitmap.close();return null;}}
    cache.set(level.file,bitmap);
    for(const [key,value]of cache)if(key!==level.file&&key!==current?.file){value.close();cache.delete(key);}
    return bitmap;
  }
  function want(level){
    if(level.file===current?.file||level.file===pending?.file||failed)return;
    pending=level;const generation=++request;
    load(level).then(bitmap=>{
      if(disposed||generation!==request)return;current={...level,bitmap};pending=null;
      for(const [key,value]of cache)if(key!==level.file){value.close();cache.delete(key);}
      changed();
    }).catch(()=>{if(disposed||generation!==request)return;failed=true;pending=null;current=null;for(const v of cache.values())v.close();cache.clear();changed();});
  }
  const levels=()=>manifest.levels.filter(level=>level.treatment===treatment).sort((a,b)=>b.divisor-a.divisor);
  want(levels()[0]);let previousUi='';
  // Ultima carta disegnata: alpha effettiva e trasformazione, per la riserva delle isoipse.
  let reserveState=null;
  // Ritaglio per tessera: ogni tessera porta con sé la carta del suo luogo, alla sua scala, in ogni stato e
  // passaggio. tiles = [{ring, g:[gx,gy], at:[x,y], s, alpha}], coordinate del mondo come le tessere disegnate.
  const tileBox=new WeakMap();
  function ringBox(ring){let b=tileBox.get(ring);if(!b){b=[Infinity,Infinity,-Infinity,-Infinity];for(const [x,y] of ring){if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;}tileBox.set(ring,b);}return b;}
  function draw(context,frame,snapshot,fitScale,tiles=null,composite=false){
    reserveState=null;
    const perTile=!!tiles&&frame.crimpEased>.001;
    const support=tiles?1:frame.layers.romaAlpha,active=support>0&&snapshot.opacity>0&&!failed;
    const state=`${support>0&&!failed&&!!snapshot.texture}|${active&&!!snapshot.texture}`;
    if(state!==previousUi){ui.hidden=!(support>0&&!failed&&snapshot.texture);credit.hidden=!(active&&snapshot.texture);previousUi=state;}
    if(support<=0||failed||snapshot.opacity<=0)return 0;
    const mat=context.getTransform(),density=Math.max(Math.hypot(mat.a,mat.b),Math.hypot(mat.c,mat.d))*step;
    const available=levels(),chosen=available.find(level=>density*level.divisor<=config.HISTORICAL.maxDeviceTexel)||available.at(-1);want(chosen);
    const cssTexel=step*fitScale*frame.transform.k;
    const fade=Math.max(0,Math.min(1,(config.HISTORICAL.fadeEnd-cssTexel)/(config.HISTORICAL.fadeEnd-config.HISTORICAL.fadeStart)));
    if(!snapshot.texture)return 0;
    const opacity=composite?1:snapshot.opacity,blend=composite?'source-over':config.HISTORICAL.blend||'source-over',w=snapshot.texture.width*step*snapshot.divisor,h=snapshot.texture.height*step*snapshot.divisor;
    if(perTile){
      const mapBox=[topLeft[0],topLeft[1],topLeft[0]+w,topLeft[1]+h];
      for(const t of tiles){
        const b=ringBox(t.ring);if(b[2]<mapBox[0]||b[0]>mapBox[2]||b[3]<mapBox[1]||b[1]>mapBox[3])continue;
        const tileFade=Math.max(0,Math.min(1,(config.HISTORICAL.fadeEnd-cssTexel*t.s)/(config.HISTORICAL.fadeEnd-config.HISTORICAL.fadeStart)));
        const a=opacity*tileFade*appearOf(cssTexel*t.s)*t.alpha;if(a<=.002)continue;
        context.save();const path=new Path2D();
        t.ring.forEach(([x,y],j)=>{const px=t.at[0]+(x-t.g[0])*t.s,py=t.at[1]+(y-t.g[1])*t.s;j?path.lineTo(px,py):path.moveTo(px,py);});path.closePath();context.clip(path);
        context.transform(t.s,0,0,t.s,t.at[0]-t.g[0]*t.s,t.at[1]-t.g[1]*t.s);context.clip(domain);
        context.globalAlpha*=a;context.globalCompositeOperation=blend;context.drawImage(snapshot.texture,topLeft[0],topLeft[1],w,h);context.restore();
      }
      reserveState={alpha:opacity*fade*appearOf(cssTexel),matrix:context.getTransform()};
      return fade*appearOf(cssTexel);
    }
    const appear=appearOf(cssTexel);
    if(!fade||!appear)return 0;
    context.save();
    // Lente: la carta si vede solo in un cerchio attorno al puntatore (px CSS del canvas); nella pila la applica lo strato.
    if(lens&&!composite){const m=context.getTransform(),c=context.canvas,k=c.width/Math.max(1,c.clientWidth);context.setTransform(k,0,0,k,0,0);const lensPath=new Path2D();lensPath.arc(lens.x,lens.y,lens.r,0,2*Math.PI);context.clip(lensPath);context.setTransform(m);}
    if(clipMode==='cells')context.clip(cells);context.clip(domain);context.globalAlpha*=opacity*support*fade*appear;
    // Fusione (config HISTORICAL.blend): 'multiply' lascia il fondo pergamena e porta solo gli inchiostri della carta;
    // 'source-over' la incolla con la sua carta, più chiara del fondo, che buca la figura.
    context.globalCompositeOperation=blend;
    context.drawImage(snapshot.texture,topLeft[0],topLeft[1],w,h);context.restore();
    reserveState={alpha:opacity*support*fade*appear,matrix:context.getTransform()};
    return support*fade*appear;
  }
  // Riserva attiva solo con la carta davvero visibile, con la sua alpha effettiva. 'global' su tutto il
  // rilievo; 'domain' (solo in sviluppo) ritaglia sul dominio della carta.
  let reserveMode='global',lens=null;
  function reserve(){
    if(!reserveState)return null;const {alpha,matrix}=reserveState;
    return{alpha,clip(context){if(reserveMode!=='domain')return;const m=context.getTransform();context.setTransform(matrix);if(clipMode==='cells')context.clip(cells);context.clip(domain);context.setTransform(m);}};
  }
  return {element:ui,draw,reserve,snapshot:()=>({revision,opacity,texture:current?.bitmap,divisor:current?.divisor}),get domain(){return domain},
    get ready(){return !!current&&!pending},get failed(){return failed},
    get diagnostics(){return{opacity,treatment,clipMode,reserveMode,revision,level:current?.divisor,decodedPixels:[...cache.values()].reduce((n,b)=>n+b.width*b.height,0),pending:!!pending,failed}},
    setClipMode(value){if(!['cells','ellipse'].includes(value))throw Error('Unknown historical clip');clipMode=value;changed();},
    setReserveMode(value){if(!['global','domain'].includes(value))throw Error('Unknown reserve mode');reserveMode=value;changed();},
    // Lente (variante 'lente' dei comandi): {x, y, r} in px CSS del canvas, oppure null.
    setLens(value){lens=value;changed();},get lens(){return lens},get treatments(){return [...new Set(manifest.levels.map(l=>l.treatment))]},get treatment(){return treatment},get opacity(){return opacity},
    setOpacity,setTreatment(value){if(!manifest.levels.some(v=>v.treatment===value))throw Error('Unknown treatment');treatment=value;want(levels()[0]);changed();},
    dispose(){disposed=true;controller.abort();request++;for(const bitmap of cache.values())bitmap.close();cache.clear();ui.remove();}
  };
}
