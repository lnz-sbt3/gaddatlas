// Valutazione senza tempo, DOM o memoria interna. Gli ingressi appartengono
// all'avanzamento; gli array restituiti appartengono esclusivamente al frame.
export function evaluateFrame(model, snapshot, fit) {
  const {width,height,extentBase,N_GEO,N_INMAP,pts,cellRings,normalizedCellScale,
    isoProfileMed,axonZStep,terraceStep,config,bandsFor,spawnPointAlongAzimuth}=model;
  const s=snapshot, {crimpEased:c,tiltEased:t,transform,cogCenter}=s;
  const invK=1/transform.k,tiltNow=1-(1-config.TILT_REST)*t;
  const cogScaleDyn=(config.DIAG_SCREEN_FRAC*Math.min(width,height))/(2*extentBase*s.diagramScaleBaseK);
  const zScaleNow=1+(cogScaleDyn-1)*c;
  const zScaleDraw=t>=.999?zScaleNow:zScaleNow*t;
  const rotNow=t>.01?s.planRot:0,rotSinNow=Math.sin(rotNow),rotCosNow=Math.cos(rotNow);
  // Il calcolo misura il LOD con le scale del draw precedente: il ritardo resta esplicito.
  let acc=0,n=0;
  for(let i=0;i<N_INMAP;i++)if(isoProfileMed[i]>0){acc+=isoProfileMed[i]*s.previousCellScale[i];n++;}
  const alzataPx=axonZStep*zScaleNow*transform.k/Math.max(.001,tiltNow);
  const pedataPx=terraceStep*(n?acc/n:0)*transform.k;
  const gain=1+(config.LOD_DIAG_GAIN-1)*c;
  const lodMinNow=config.LOD_MIN/gain,lodFullNow=config.LOD_FULL/gain;
  // Unita' CSS e soglie relative allo stesso fit: stesso rapporto conservato.
  const lodCss={alzataPx:alzataPx*fit,pedataPx:pedataPx*fit,min:lodMinNow*fit,full:lodFullNow*fit};
  const lodTarget=Math.max(0,Math.min(1,(Math.min(alzataPx,pedataPx)-lodMinNow)/Math.max(.01,lodFullNow-lodMinNow)));
  const frame={...s,fit,invK,tiltNow,cogScaleDyn,zScaleNow,zScaleDraw,rotNow,rotSinNow,rotCosNow,
    lodTarget,lodCss,lod:{alzataPx,pedataPx},lodMinNow,lodFullNow,
    lodCollapse:s.lodEased<.5,effRadius:config.RADIUS*invK,effInfluence:config.RADIUS*3*invK};
  frame.displayPts=s.layoutPtsEased.map((layout,i)=>{
    const cogX=cogCenter[0]+(layout[0]-cogCenter[0])*cogScaleDyn;
    const cogY=cogCenter[1]+(layout[1]-cogCenter[1])*cogScaleDyn;
    if(i>=N_GEO)return[cogX,cogY];
    const p=cellRings[i]?pts[i]:spawnPointAlongAzimuth(frame,model.geographicAngle[i]);
    return[p[0]+(cogX-p[0])*c,p[1]+(cogY-p[1])*c];
  });
  frame.displayCellScale=cellRings.map((cr,i)=>cr?1+(normalizedCellScale[i]*cogScaleDyn-1)*c:cogScaleDyn);
  frame.cognitiveBirthScale=s.birthEased.map(v=>.35+.65*v);
  const offmap=Math.max(0,Math.min(1,c/config.FICT_CRIMP_THRESHOLD));
  frame.offmapPresenceValue=offmap;
  frame.alphaFactors=s.focalEased.map((v,i)=>[
    v==null?1:v,
    s.routeHoverEased<=.01||s.routeHotSet.size===0||s.routeHotSet.has(i)?1:1-(1-config.FOCAL_DIM_ALPHA)*s.routeHoverEased,
    i>=N_INMAP&&i<N_GEO?offmap:1
  ]);
  frame.bands=s.occEased.map(v=>s.focalizer!=null?Math.min(model.BANDS_MAX,Math.round(v||0)):bandsFor(v||0));
  frame.reliefVisible=cellRings.map((cr,i)=>{
    const fict=i>=N_GEO,off=i>=N_INMAP&&i<N_GEO;
    if(!cr&&!fict&&!off)return false;
    if(fict&&s.fictBirthEased[i]<=config.BIRTH_EPSILON)return false;
    if(off&&offmap<=config.BIRTH_EPSILON)return false;
    return !(c>.01&&(fict?s.fictBirthEased[i]:s.birthEased[i])<=config.BIRTH_EPSILON);
  });
  frame.layers={romaAlpha:1-c,gridMode:c<=.01?'shared':'cells',gridAlpha:config.GRID_ALPHA,
    glyphAlpha:s.fictBirthEased.map((v,i)=>frame.reliefVisible[i]?contentAlphaOf(frame,i,{presence:v}):0),
    reliefAlpha:s.occEased.map((_,i)=>!frame.reliefVisible[i]?0:t>.01?contentAlphaOf(frame,i):(i>=N_GEO?config.FICT_RELIEF_ALPHA:config.ISO_ALPHA)*(s.focalizer!=null?contentAlphaOf(frame,i):1)),
    cellAlpha:s.birthEased.map((v,i)=>c<=.01?config.GRID_ALPHA:.42*contentAlphaOf(frame,i,{presence:i>=N_GEO?s.fictBirthEased[i]:(v<.999?v:1),crimp:true})),
    pulse:s.pulse,pulseAlpha:.35+.45*s.pulse};
  return frame;
}

export function contentAlphaOf(frame,i,opts={}) {
  const presence=opts.presence==null?1:opts.presence;
  const crimp=opts.crimp?frame.crimpEased:1;
  const [focal,route,offmap]=frame.alphaFactors[i];
  return presence*crimp*focal*route*offmap;
}
