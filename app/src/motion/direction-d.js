import {evaluateFrame} from './evaluate.js';
export const clamp=v=>Math.max(0,Math.min(1,v));
export const lerp=(a,b,p)=>a+(b-a)*p;
export const ease=p=>{p=clamp(p);return p*p*p*(p*(p*6-15)+10)};
export const windowAt=(p,[a,b])=>ease((p-a)/(b-a));
const chase=(p,g,steps)=>p===0?0:p===1?1:(1-Math.pow(1-g,steps*p))/(1-Math.pow(1-g,steps));
export function distributedProgress(p,token){
 if(p===0||p===1)return p;
 const w=token.deceleration,v=1/(1-w/2),h=(p-(1-w))/w;
 return p<=1-w?v*p:v*((1-w)+w*(h-h*h*h+.5*h*h*h*h));
}
const rankAt=(p,r,t)=>clamp(p+t.rankAmplitude*(1-2*r)*4*p*(1-p));
export function project(f,c,point){
 const dx=point[0]-f.rotPivot[0],dy=point[1]-f.rotPivot[1];
 return[f.transform.x+(f.rotPivot[0]+f.rotCosNow*dx-f.rotSinNow*dy-c.projection.bbox[0])*f.transform.k,
 f.transform.y+(f.rotPivot[1]+(f.rotSinNow*dx+f.rotCosNow*dy)*f.tiltNow-c.projection.bbox[1])*f.transform.k];
}
function unproject(f,c,point){
 const x=(point[0]-f.transform.x)/f.transform.k+c.projection.bbox[0]-f.rotPivot[0];
 const y=((point[1]-f.transform.y)/f.transform.k+c.projection.bbox[1]-f.rotPivot[1])/f.tiltNow;
 return[f.rotPivot[0]+f.rotCosNow*x+f.rotSinNow*y,f.rotPivot[1]-f.rotSinNow*x+f.rotCosNow*y];
}
// Seme a rincorsa chiusa: solo il sottoinsieme necessario a D, senza regie DEV.
function seed(c,p,live=c.start){
 const a=c.start,b=c.end,config=c.model.config,q=ease(p);
 const s={...live,fictBirthEased:live.fictBirthEased.slice(),crimpEased:lerp(a.crimpEased,b.crimpEased,chase(p,config.CRIMP_MORPH,c.token.chaseSteps)),
 tiltEased:lerp(a.tiltEased,b.tiltEased,chase(p,config.TILT_MORPH,c.token.chaseSteps)),
 layoutPtsEased:a.layoutPtsEased.map((v,i)=>{const w=b.layoutPtsEased[i];if(v[0]===w[0]&&v[1]===w[1])return v.slice();const k=chase(p,c.gains[i],c.token.chaseSteps);return[lerp(v[0],w[0],k),lerp(v[1],w[1],k)];}),
 cogCenter:a.cogCenter.map((v,k)=>lerp(v,b.cogCenter[k],q)),rotPivot:a.rotPivot.map((v,k)=>lerp(v,b.rotPivot[k],q)),
 diagramScaleBaseK:lerp(a.diagramScaleBaseK,b.diagramScaleBaseK,q),
 transform:{x:lerp(a.transform.x,b.transform.x,q),y:lerp(a.transform.y,b.transform.y,q),k:lerp(a.transform.k,b.transform.k,q)},
 lodEased:lerp(a.lodEased,b.lodEased,q)};
 const f=evaluateFrame(c.model,s,c.fit);
 if(p===0||p===1){const e=p===0?a:b;f.displayPts=e.points.map(v=>v.slice());f.displayCellScale=e.scales.slice();}
 return f;
}
function inverseLength(lengths,p){
 const total=lengths.at(-1);if(total<1e-9)return p*(lengths.length-1);
 const value=clamp(p)*total;let lo=0,hi=lengths.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(lengths[m]<value)lo=m;else hi=m;}
 return lo+(value-lengths[lo])/Math.max(1e-12,lengths[hi]-lengths[lo]);
}
function curve(points,x,axis){
 const k=Math.min(points.length-2,Math.floor(x)),t=x-k,a=points[k][axis],b=points[k+1][axis];
 const m0=(points[Math.min(k+1,points.length-1)][axis]-points[Math.max(0,k-1)][axis])/(k?2:1);
 const m1=(points[Math.min(k+2,points.length-1)][axis]-a)/(k+2<points.length?2:1);
 return(2*t*t*t-3*t*t+1)*a+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*b+(t*t*t-t*t)*m1;
}
// Ogni next produce un solo campione. L'orchestrazione assegna il budget, qui
// non ci sono clock, DOM, timer o memoria nascosta del valutatore.
export function* prepareDirectionD(input){
 const c=input,n=c.token.tableSamples,N=c.start.points.length;
 const paths=Array.from({length:N},()=>[]),lengths=Array.from({length:N},()=>[0]),scales=Array.from({length:N},()=>[]),global=[0];
 const sf=seed(c,0),ef=seed(c,1),offmap=[];
 for(let i=c.model.N_INMAP;i<c.model.N_GEO;i++)if(!c.model.cellRings[i])offmap.push(i);
 const stationary=new Set(offmap),viewChanged=c.start.crimpEased!==c.end.crimpEased;
 for(let k=0;k<=n;k++){
  const f=seed(c,k/n);let distance=0;
  for(let i=0;i<N;i++){
   let point=project(f,c,f.displayPts[i]);
   if(stationary.has(i)&&viewChanged){const endpoint=c.end.crimpEased>.5?ef:sf;point=project(endpoint,c,endpoint.displayPts[i]);}
   paths[i].push(point);scales[i].push(f.displayCellScale[i]);
   if(k){const step=Math.hypot(...point.map((v,j)=>v-paths[i][k-1][j]));lengths[i].push(lengths[i][k-1]+step);if(!stationary.has(i))distance+=step;}
  }
  if(k)global.push(global[k-1]+distance);
  yield k;
 }
 const context={...c,dPath:{paths,lengths,scales,global},offmap:stationary,stationary: lengths.map((v,i)=>v.at(-1)<1e-9&&Math.abs(scales[i][0]-scales[i].at(-1))<1e-9)};
 // Finestra in p, ancorata all'attraversamento effettivo, estremi mai alterati.
 const startFull=c.start.lodEased>=.5,endFull=c.end.lodEased>=.5;
 if(startFull!==endFull){
  let lo=0,hi=1;
  for(let k=0;k<32;k++){const p=(lo+hi)/2,s=distributedProgress(movement(context,p),c.token),q=inverseLength(global,s)/n;
   if((seed(c,q).lodEased>=.5)===startFull)lo=p;else hi=p;yield n+1+k;}
  const center=(lo+hi)/2,w=c.token.lodWindow/2;
  context.lodBlend={from:Math.max(0,center-w),to:Math.min(1,center+w),start:+startFull,end:+endFull};
 }
 return context;
}
// Fra rilievo e rilievo, cambiando vista: tre tempi continui. Le terrazze si richiudono su un solo livello
// [0, c0], le tessere si spostano [c0, c1], le terrazze si riaprono [c1, 1] (token axonPhases, heightFloor).
const axonToAxon=c=>c.start.tiltEased>0&&c.end.tiltEased>0&&c.start.crimpEased!==c.end.crimpEased&&!!c.token.axonPhases;
function movement(c,p){
 const t=c.token;if(axonToAxon(c)){const [c0,c1]=t.axonPhases;return clamp((p-c0)/(c1-c0));}
 return clamp(p/(c.start.tiltEased!==c.end.tiltEased?t.positionEnd:1));
}
export function evaluateDirectionD(c,p,live=c.start){
 if(!Number.isFinite(p)||p<0||p>1)throw RangeError('Parametro fuori intervallo');
 const a=c.start,b=c.end,t=c.token,changedTilt=a.tiltEased!==b.tiltEased,end=changedTilt?t.positionEnd:1;
 const s=distributedProgress(movement(c,p),t),table=c.dPath,q=inverseLength(table.global,s)/t.tableSamples;
 const f=seed(c,q,live),height=changedTilt?windowAt(p,[end,1]):0;
 const presence=[],tileTilt=[],borderAlpha=[];
 for(let i=0;i<f.displayPts.length;i++){
  const local=rankAt(s,c.ranks[i],t),x=c.stationary[i]?0:inverseLength(table.lengths[i],local),k=Math.min(t.tableSamples-1,Math.floor(x));
  if(!c.stationary[i]||c.offmap.has(i))f.displayPts[i]=unproject(f,c,[curve(table.paths[i],x,0),curve(table.paths[i],x,1)]);
  const delta=live.layoutOffset?.[i];if(delta){f.displayPts[i][0]+=delta[0]*f.cogScaleDyn*(i>=c.model.N_GEO?1:f.crimpEased);f.displayPts[i][1]+=delta[1]*f.cogScaleDyn*(i>=c.model.N_GEO?1:f.crimpEased);}
  f.displayCellScale[i]=lerp(table.scales[i][k],table.scales[i][k+1],x-k);
  const fict=i>=c.model.N_GEO,off=c.offmap.has(i);
  const from=fict?+(a.showFictitious&&a.crimpEased>.5):off?+(a.crimpEased>.5):1;
  const to=fict?+(b.showFictitious&&b.crimpEased>.5):off?+(b.crimpEased>.5):1;
  let born=changedTilt&&to>from?windowAt(p,[end,1]):changedTilt&&to<from?windowAt(p,t.withdraw):rankAt(distributedProgress(p,t),c.ranks[i],t);
  if(fict&&to>from)born=-Math.expm1(-t.narrativeLead*born)/-Math.expm1(-t.narrativeLead);
  const placed=!fict||!!(c.narrativePlacement?c.narrativePlacement[live.chapter].placedFict.has(i):a.fictBirthEased[i]>0||b.fictBirthEased[i]>0);
  presence[i]=lerp(from,to,born)*(fict?(placed?(live.birthEased[i]||0):0):1);
  f.fictBirthEased[i]=fict&&presence[i]>0?1:0;
  tileTilt[i]=changedTilt?lerp(a.tiltEased,b.tiltEased,height):a.tiltEased;
  borderAlpha[i]=lerp(a.crimpEased>.5?.42:c.model.config.GRID_ALPHA,b.crimpEased>.5?.42:c.model.config.GRID_ALPHA,local)*presence[i];
 }
 if(p===0||p===1){const e=p===0?a:b;f.displayPts=e.points.map(v=>v.slice());f.displayCellScale=e.scales.slice();}
 const planeTilt=f.tiltEased;f.tiltEased=Math.max(f.tiltEased,...tileTilt);f.zScaleDraw=f.zScaleNow*tileTilt[0];
 if(axonToAxon(c)){const [c0,c1]=t.axonPhases,floor=t.heightFloor??.1,h=p<=c0?1-windowAt(p,[0,c0])*(1-floor):p>=c1?floor+windowAt(p,[c1,1])*(1-floor):floor;f.zScaleDraw*=h;f.heightPhase=h;}
 const sourcePlanar=a.tiltEased===0,targetPlanar=b.tiltEased===0;
 const geographicAlpha=a.crimpEased===b.crimpEased?(a.crimpEased>.5?0:1):a.crimpEased>.5?windowAt(p,t.geoIn):1-windowAt(p,t.geoOut);
 const annotationAlpha=a.crimpEased===b.crimpEased?(a.crimpEased>.5?1:0):a.crimpEased>.5?1-windowAt(p,t.geoOut):windowAt(p,t.geoIn);
 const gridBlend=a.crimpEased===b.crimpEased?(a.crimpEased>.5?1:0):a.crimpEased>.5?1-windowAt(p,t.geoIn):windowAt(p,t.border);
 f.transition={p,planeTilt,presence,tileTilt,borderAlpha,geographicAlpha,annotationAlpha,gridBlend,
 endpointPaint:{enabled:!(sourcePlanar&&targetPlanar),planar:sourcePlanar?1-windowAt(p,t.pigmentOut):targetPlanar?windowAt(p,t.pigmentIn):0}};
 if(c.lodBlend){const w=c.lodBlend;f.transition.lodMix=lerp(w.start,w.end,windowAt(p,[w.from,w.to]));}
 f.offmapPresenceValue=1;f.reliefVisible=presence.map(v=>v>1e-9);f.layers={...f.layers,romaAlpha:geographicAlpha};
 // Gesti della camera durante il passaggio: delta uniforme, mai auto-fit.
 if(live.transform){const origin=c.gestureCamera||a.transform,ratio=live.transform.k/origin.k;f.transform={k:f.transform.k*ratio,x:live.transform.x+(f.transform.x-origin.x)*ratio,y:live.transform.y+(f.transform.y-origin.y)*ratio};f.invK=1/f.transform.k;}
 return f;
}
