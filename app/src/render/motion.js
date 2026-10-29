import backdrop from './map-backdrop.js';
import {windowAt} from '../motion/direction-d.js';

// Regia D: usa path, isoipse, colori e glifi del renderer esistente.
export function attachMotionRendering(f,{config,context,model,traceIsoline,passage}){
  const lab=f.transition,geo=model.N_GEO,local=model.N_INMAP;
  const geometry=geometryFor(config,context);
  let painterFrame;
  if(traceIsoline){
    let trace=passage&&isolineCaches.get(passage);
    if(!trace){trace=createIsolineTracer(traceIsoline,{numeric:false});if(passage)isolineCaches.set(passage,trace);}
    lab.traceIsoline=trace;
  }
  lab.alpha=(i,opts={})=>{
    const [focal,route]=f.alphaFactors[i];
    return focal*route*lab.presence[i]*(i<geo?(opts.presence??1):1)*(opts.crimp?f.crimpEased:1);
  };
  lab.tileFrame=(frame,i)=>{
    // Scratch del solo disegno sincrono: non entra nel frame valutato né nel seek.
    painterFrame??={...frame,motionGeometry:{...geometry}};
    painterFrame.tiltEased=lab.tileTilt[i];painterFrame.zScaleDraw=frame.zScaleNow*lab.tileTilt[i];painterFrame.lodMix=lab.lodMix;
    painterFrame.motionGeometry.planarRgb=i>=geo?geometry.fictRgb:lab.endpointPaint?.enabled?geometry.inkRgb:geometry.geoRgb;
    painterFrame.motionGeometry.planarStroke=i>=geo?config.FICT_RELIEF_ALPHA:config.ISO_ALPHA;
    return painterFrame;
  };
  lab.backdrop=args=>{
    const annotation=lab.annotationAlpha;
    const result=backdrop.draw({...args,crimpEased:annotation,segments:[],cellRings:[],N_INMAP:args.N_GEO,offmapPresence:()=>0});
    context.lineJoin='round';context.lineCap='round';context.lineWidth=args.BORDER_WIDTH*args.invK;
    const grid=lab.gridBlend;
    if(grid<1){context.beginPath();for(const {poly}of args.segments){context.moveTo(...poly[0]);for(let j=1;j<poly.length;j++)context.lineTo(...poly[j]);}context.strokeStyle=`rgba(${args.GRID_COLOR},${args.GRID_ALPHA*(1-grid)})`;context.stroke();}
    if(grid>0){for(let i=0;i<args.cellRings.length;i++){
      const cr=args.cellRings[i],alpha=lab.borderAlpha[i]*grid*f.alphaFactors[i][0]*f.alphaFactors[i][1]*(i>=geo?1:(f.birthEased[i]<.999?f.birthEased[i]:1));
      if(!cr?.ring||alpha<=0)continue;
      context.beginPath();cr.ring.forEach(([x,y],j)=>{const p=args.cellPoint(i,x,y,false);j?context.lineTo(...p):context.moveTo(...p)});context.closePath();context.strokeStyle=`rgba(${args.GRID_COLOR},${alpha})`;context.stroke();
    }
    for(let i=local;i<geo;i++)if(!args.cellRings[i]&&lab.presence[i]>0){context.beginPath();context.arc(...f.displayPts[i],args.cognitiveTileRadius[i]*f.displayCellScale[i],0,2*Math.PI);context.strokeStyle=`rgba(${args.GRID_COLOR},${lab.borderAlpha[i]*grid*f.alphaFactors[i][0]*f.alphaFactors[i][1]*f.birthEased[i]})`;context.stroke();}}
    return result;
  };
  lab.planar=({i,B,px,py,radii,rMin,sCell,rMed,seed,packing,traceIsoline,isoFillAlpha})=>{
    const alpha=lab.alpha(i),rgb=i>=geo?config.FICT_HUE_RGB:config.HUE_RGB;
    const path=new Path2D();const fills=Array.from({length:B+1},()=>new Path2D());
    // Ogni livello viene costruito una volta: addPath copia gli stessi comandi,
    // senza trasformazione o nuova rasterizzazione, nel contorno aggregato.
    for(let k=1;k<=B;k++){(lab.traceIsoline||traceIsoline)(null,fills[k],px,py,radii,rMin,sCell,rMin,rMed,seed,k/B,packing,null,0);path.addPath(fills[k]);}
    if(config.ISO_FILL)for(let k=1;k<=B;k++){context.fillStyle=`rgba(${rgb},${isoFillAlpha(k)*alpha})`;context.fill(fills[k]);}
    context.lineWidth=config.ISO_WIDTH*f.invK;context.strokeStyle=`rgba(${rgb},${(i>=geo?config.FICT_RELIEF_ALPHA:config.ISO_ALPHA)*alpha})`;context.stroke(path);
  };
  lab.paintRelief=(args,drawAxon)=>{
    if(lab.endpointPaint?.enabled){
      const pigment=lab.endpointPaint.planar;
      if(pigment>0){context.save();context.globalAlpha*=pigment;lab.planar(args);context.restore();}
      if(pigment<1){context.save();context.globalAlpha*=1-pigment;drawAxon();context.restore();}
      return;
    }
    // Le due primitive pittoriche non coincidono a tilt=0: raccordo locale continuo,
    // sulla stessa tessera e nella sola finestra dichiarata, senza nuovo fondale.
    const mix=windowAt(lab.tileTilt[args.i],config.MOTION.planarHandoff);
    if(mix<1){context.save();context.globalAlpha*=1-mix;lab.planar(args);context.restore();}
    if(mix>0){context.save();context.globalAlpha*=mix;drawAxon();context.restore();}
  };
  return f;
}

// Conserva solo primitive geometriche con ingressi esattamente uguali.
// Nessun bitmap, stile, layer o contorno di Roma. Gli output di picking sono
// copiati: chi li modifica non può alterare la cache o un altro fotogramma.
export function createIsolineTracer(traceIsoline,{numeric=true}={}){
  const cache=new Map();
  return (stroke,fill,...args)=>{
    const out=args[10];if(out&&!numeric)return traceIsoline(stroke,fill,...args);
    const key=args[7]+'|'+args[8],needsPath=!!(stroke||fill);let entry=cache.get(key),generated=false;
    if(!entry||entry.args.length!==args.length||(needsPath&&!entry.path)||(out&&!entry.points)||!args.every((v,i)=>i===10||v===entry.args[i])){
      const path=needsPath?new Path2D():null,values=args.slice();values[10]=out||null;
      const result=traceIsoline(path,null,...values);let points=null;
      if(result&&out){points=new Float64Array(out.length*2);for(let i=0;i<out.length;i++){points[2*i]=out[i][0];points[2*i+1]=out[i][1];}}
      entry={args,path,points,result};generated=true;
      if(cache.size>=4096&&!cache.has(key))cache.clear();cache.set(key,entry);
    }
    if(entry.result){
      if(stroke)stroke.addPath(entry.path);if(fill)fill.addPath(entry.path);
      if(out&&!generated){out.length=0;for(let i=0;i<entry.points.length;i+=2)out.push([entry.points[i],entry.points[i+1]]);}
    }
    return entry.result;
  };
}

// Solo costanti angolari, mai geometrie di una tessera o risultati di un seek.
const geometries=new WeakMap();
const isolineCaches=new WeakMap();
function geometryFor(config,context){
  let entry=geometries.get(context);
  if(entry?.config===config)return entry;
  const angles=Array.from({length:config.ISO_ANGLES},(_,k)=>{
    const a=k/config.ISO_ANGLES*6.2831853;
    return [Math.cos(a),Math.sin(a),Math.sin(a*2),Math.cos(a*2),Math.sin(a*3),Math.cos(a*3),Math.sin(a*5),Math.cos(a*5)];
  });
  const baseContour=(frame,px,py,r,radii,sCell,rMed,seed,align)=>{
    const started=frame.profile?performance.now():0;
    const p=seed*6.2831853,d=config.ISO_DRIFT*6.2831853*(1-Math.max(0,Math.min(1,align||0)));
    const f1=p+d,f2=p*1.7-d*.6,f3=p*2.3+d*1.4;
    const sf1=Math.sin(f1),cf1=Math.cos(f1),sf2=Math.sin(f2),cf2=Math.cos(f2),sf3=Math.sin(f3),cf3=Math.cos(f3);
    const pts=angles.map(([ca,sa,s2,c2,s3,c3,s5,c5],k)=>{
      const bound=radii?radii[k]*sCell:r,shape=rMed+(bound-rMed)*config.ISO_ECC_DAMP;
      const noise=(s2*cf1+c2*sf1)*.5+(s3*cf2+c3*sf2)*.32+(s5*cf3+c5*sf3)*.18;
      let rr=shape*(1+noise*config.ISO_WOBBLE);const budget=bound*config.ISO_MARGIN;if(rr>budget)rr=budget;
      return [px+ca*rr,py+sa*rr];
    });
    if(frame.profile)frame.profile.baseContourMs+=performance.now()-started;
    return pts;
  };
  const quadStrip=(frame,a,za,b,zb,rgb,alpha,cullBackfaces)=>{
    const n=Math.min(a.length,b.length);if(n<2||alpha<=0)return;
    const begin=frame.profile?performance.now():0,path=new Path2D();let drawn=0,area=0;
    if(cullBackfaces){let j=a.length-1,p=a[j];for(let i=0;i<a.length;i++){const q=a[i];area+=p[1]*q[0]-p[0]*q[1];p=q;}}
    const da=(za||0)/Math.max(.001,frame.tiltNow),db=(zb||0)/Math.max(.001,frame.tiltNow);
    const ax=da*frame.rotSinNow,ay=da*frame.rotCosNow,bx=db*frame.rotSinNow,by=db*frame.rotCosNow;
    context.fillStyle=`rgba(${rgb},${alpha})`;
    for(let j=0;j<n;j++){
      const j2=(j+1)%n;
      if(cullBackfaces){const dx=a[j2][0]-a[j][0],dy=a[j2][1]-a[j][1],nx=area>=0?dy:-dy,ny=area>=0?-dx:dx;if(frame.tiltNow*(nx*frame.rotSinNow+ny*frame.rotCosNow)<=0)continue;}
      path.moveTo(a[j][0]-ax,a[j][1]-ay);path.lineTo(a[j2][0]-ax,a[j2][1]-ay);path.lineTo(b[j2][0]-bx,b[j2][1]-by);path.lineTo(b[j][0]-bx,b[j][1]-by);path.closePath();drawn++;
    }
    if(!drawn)return;
    const fill=frame.profile?performance.now():0;
    if(frame.profile){frame.profile.quadCount+=drawn;frame.profile.fillLenASum+=a.length;frame.profile.fillLenBSum+=b.length;frame.profile.fillLenCalls++;frame.profile.fillBuildMs+=fill-begin;}
    context.fill(path);
    if(frame.profile){frame.profile.fillRasterMs+=performance.now()-fill;frame.profile.fillCalls++;}
  };
  const closedPolygon=(path,pts,z,reverse,frame)=>{
    const n=pts.length;if(n<2)return false;
    const dz=(z||0)/Math.max(.001,frame.tiltNow),zx=dz*frame.rotSinNow,zy=dz*frame.rotCosNow;
    const first=reverse?pts[n-1]:pts[0];path.moveTo(first[0]-zx,first[1]-zy);
    for(let j=1;j<n;j++){const src=reverse?pts[n-1-j]:pts[j];path.lineTo(src[0]-zx,src[1]-zy);}
    path.closePath();return true;
  };
  const strokePoints=(frame,groups,pts,z,rgb,alpha,width)=>{
    if(!pts||pts.length<2)return;
    const started=frame.profile?performance.now():0,key=`${rgb}|${alpha}|${width}`;
    let group=groups.get(key);if(!group){group={rgb,alpha,width,path:new Path2D()};groups.set(key,group);}
    closedPolygon(group.path,pts,z,false,frame);
    if(frame.profile)frame.profile.strokePtsMs+=performance.now()-started;
  };
  const hex=config.INK_COLOR.replace('#',''),inkRgb=[0,2,4].map(k=>parseInt(hex.slice(k,k+2),16));
  entry={config,baseContour,quadStrip,closedPolygon,strokePoints,inkRgb,geoRgb:config.HUE_RGB.split(',').map(Number),fictRgb:config.FICT_HUE_RGB.split(',').map(Number)};
  geometries.set(context,entry);return entry;
}
