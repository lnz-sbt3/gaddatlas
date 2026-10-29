import {evaluateFrame} from '../../motion/evaluate.js';
import {TOKENS,clamp,lerp,ease,windowAt,finiteChase} from './tokens.js';
import {evaluateD} from './direction-d.js';

// Nessun clock, DOM o stato di avanzamento: tutte le regie sono funzioni di p.
export function evaluateDirection(context,direction,p,camera='fit'){
  if(!Number.isFinite(p)||p<0||p>1)throw new RangeError('Parametro fuori intervallo');
  if(direction==='D')return evaluateD(context,p,evaluateDirection,camera);
  const {start:a,end:b,model,fit,ranks,angles,gains,kind}=context;
  const c=p===0?a.crimpEased:p===1?b.crimpEased:lerp(a.crimpEased,b.crimpEased,direction==='A'?finiteChase(p,context.config.CRIMP_MORPH):ease(p));
  const move=direction==='B'?windowAt(p,TOKENS.phases.move):ease(p);
  const changedTilt=a.tiltEased!==b.tiltEased;
  const tiltProgress=direction==='B'&&kind==='coupled'?windowAt(p,TOKENS.phases.relief):direction==='A'?finiteChase(p,TOKENS.chase.tilt):ease(p);
  const t=lerp(a.tiltEased,b.tiltEased,tiltProgress);
  const snapshot={...a,crimpEased:c,tiltEased:t,pulse:.5,
    layoutPtsEased:a.layoutPtsEased.map((v,i)=>v.map((x,j)=>lerp(x,b.layoutPtsEased[i][j],direction==='A'?finiteChase(p,gains[i]):move))),
    previousCellScale:a.previousCellScale.map((v,i)=>lerp(v,b.previousCellScale[i],move)),
    fictBirthEased:a.fictBirthEased.map((v,i)=>lerp(v,b.fictBirthEased[i],ease(p))),
    cogCenter:a.cogCenter.map((v,j)=>lerp(v,b.cogCenter[j],ease(p))),rotPivot:a.rotPivot.map((v,j)=>lerp(v,b.rotPivot[j],ease(p))),
    transform:{...a.transform},roleSortEased:lerp(a.roleSortEased,b.roleSortEased,ease(p)),
    lodEased:lerp(a.lodEased,b.lodEased,ease(p)),drop:{x:-1e4,y:-1e4,tx:-1e4,ty:-1e4,s:0,ts:0,vs:0},hostIndex:-1,hoverTerrace:-1,
  };
  const f=evaluateFrame(model,snapshot,fit),N=f.displayPts.length;
  const progress=new Array(N),presence=new Array(N),tileTilt=new Array(N),borderAlpha=new Array(N);
  const fromDiagram=a.crimpEased>.5,toDiagram=b.crimpEased>.5;
  for(let i=0;i<N;i++){
    const order=TOKENS.rankWeight*ranks[i]+(1-TOKENS.rankWeight)*angles[i];
    const local=direction==='A'?finiteChase(p,gains[i]):direction==='B'?ease((clamp((p-TOKENS.phases.move[0])/(TOKENS.phases.move[1]-TOKENS.phases.move[0]))-TOKENS.stagger*order)/(1-TOKENS.stagger)):ease((p-TOKENS.rankSpread*ranks[i])/TOKENS.rankSpan);
    progress[i]=local;
    // B/C cambiano il percorso, mai le posizioni di destinazione.
    if(direction!=='A')f.displayPts[i]=a.points[i].map((v,j)=>lerp(v,b.points[i][j],local));
    f.displayCellScale[i]=lerp(a.scales[i],b.scales[i],direction==='B'?Math.max(windowAt(p,TOKENS.phases.separate)*.2,local):local);
    const fict=i>=model.N_GEO,off=i>=model.N_INMAP&&i<model.N_GEO;
    const from=fict?a.fictBirthEased[i]:off?(fromDiagram?1:0):a.birthEased[i];
    const to=fict?b.fictBirthEased[i]:off?(toDiagram?1:0):b.birthEased[i];
    let presenceProgress=direction==='A'?finiteChase(p,context.config.BIRTH_MORPH):direction==='B'?windowAt(p,to>from?TOKENS.phases.narrative:TOKENS.phases.withdraw):local;
    if(kind==='narrative'&&direction==='B')presenceProgress=ease(p);
    presence[i]=lerp(from,to,presenceProgress);
    f.fictBirthEased[i]=fict&&presence[i]>0?1:0; // Maschera tecnica; la presenza effettiva resta unica.
    tileTilt[i]=changedTilt&&direction==='C'?lerp(a.tiltEased,b.tiltEased,local):t;
    borderAlpha[i]=lerp(fromDiagram?.42:context.config.GRID_ALPHA,toDiagram?.42:context.config.GRID_ALPHA,local)*presence[i];
  }
  if(p===0||p===1){const e=p===0?a:b;f.displayPts=e.points.map(v=>v.slice());f.displayCellScale=e.scales.slice();}
  f.zScaleDraw=f.zScaleNow*t;
  // Presenza esplicita: nessuna moltiplicazione nascosta per una soglia di crimp.
  f.offmapPresenceValue=1;
  f.reliefVisible=presence.map(v=>v>0);
  const mapAlpha=1-windowAt(p,TOKENS.phases.geoOut);
  const geographicAlpha=fromDiagram===toDiagram?(fromDiagram?0:1):fromDiagram?windowAt(p,TOKENS.phases.geoIn):mapAlpha;
  f.layers={...f.layers,romaAlpha:geographicAlpha};
  f.transform=cameraAt(context,f,p,camera);
  f.invK=1/f.transform.k;
  f.motionLab={direction,p,progress,presence,tileTilt,borderAlpha,geographicAlpha,
    gridBlend:fromDiagram===toDiagram?(fromDiagram?1:0):fromDiagram?1-windowAt(p,TOKENS.phases.geoIn):windowAt(p,TOKENS.phases.border),
    annotationAlpha:fromDiagram===toDiagram?(fromDiagram?1:0):fromDiagram?1-windowAt(p,TOKENS.phases.geoOut):windowAt(p,TOKENS.phases.geoIn),
    projection:context.projection,kind};
  return f;
}
function cameraAt(context,frame,p,mode){
  const {start:a,end:b,model,reading,selectedIndex,projection}=context,q=ease(p);
  const origin=reading||a.transform,target={...b.transform};
  if(mode==='preserve'){
    const ratio=origin.k/a.transform.k;target.k*=ratio;
    target.x+=origin.x-a.transform.x;target.y+=origin.y-a.transform.y;
  }else if(mode==='follow'&&selectedIndex>=0){
    const i=selectedIndex,pt=frame.displayPts[i],pivot=frame.rotPivot;
    const dx=pt[0]-pivot[0],dy=pt[1]-pivot[1];
    const world=[pivot[0]+frame.rotCosNow*dx-frame.rotSinNow*dy,pivot[1]+(frame.rotSinNow*dx+frame.rotCosNow*dy)*frame.tiltNow];
    const zoom=origin.k,old=a.points[i],r=a.rotPivot,angle=a.tiltEased>.01?a.planRot:0;
    const dx0=old[0]-r[0],dy0=old[1]-r[1],tilt0=1-(1-model.config.TILT_REST)*a.tiltEased;
    const anchor=[origin.x+(r[0]+Math.cos(angle)*dx0-Math.sin(angle)*dy0-projection.bbox[0])*zoom,
      origin.y+(r[1]+(Math.sin(angle)*dx0+Math.cos(angle)*dy0)*tilt0-projection.bbox[1])*zoom];
    return{x:anchor[0]-(world[0]-projection.bbox[0])*zoom,y:anchor[1]-(world[1]-projection.bbox[1])*zoom,k:zoom};
  }
  return{x:lerp(origin.x,target.x,q),y:lerp(origin.y,target.y,q),k:lerp(origin.k,target.k,q)};
}
