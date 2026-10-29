import {closedApproach,closedPiecewise} from '../motion/advance.js';

// Il contesto e' fissato una volta: seek non integra mai lo stato del seek precedente.
export function sampleTransition(context,p,overrides={}) {
  if(!Number.isFinite(p)||p<0||p>1)throw new RangeError('Parametro fuori intervallo');
  const {start,end,config,gains,phases,bornNarrative,primary,primaryGain}=context;
  const n=p===1?Infinity:Math.log1p(-p)/Math.log1p(-primaryGain);
  const s={...start,transform:{...start.transform},cogCenter:start.cogCenter.slice(),rotPivot:start.rotPivot.slice()};
  s.crimpEased=closedApproach(start.crimpEased,end.crimpEased,config.CRIMP_MORPH,n);
  s.tiltEased=closedApproach(start.tiltEased,end.tiltEased,.05,n);
  s.layoutPtsEased=start.layoutPtsEased.map((point,i)=>point.map((v,axis)=>{
    let value=v,last=0;
    for(let k=0;k<phases.length;k++){
      const until=k+1<phases.length?phases[k+1].after:Infinity;
      const count=Math.max(0,Math.min(n,until)-last);
      if(count>0)value=closedApproach(value,phases[k].points[i][axis],gains[i],count);
      if(n<=until)break;last=until;
    }
    return value;
  }));
  s.occEased=start.occEased.slice();s.birthEased=start.birthEased.slice();s.focalEased=start.focalEased.slice();
  s.fictBirthEased=start.fictBirthEased.map((v,i)=>closedPiecewise(v,bornNarrative[i].first,bornNarrative[i].last,config.BIRTH_MORPH,n,bornNarrative[i].after));
  s.roleSortEased=closedApproach(start.roleSortEased,end.roleSortEased,config.ROLE_SORT_MORPH,n);
  // Snapshot del LOD: la rincorsa resta fuori dalla valutazione e non dipende dai seek precedenti.
  s.lodEased=closedApproach(start.lodEased,end.lodEased,config.CRIMP_MORPH*3,n);
  s.previousCellScale=context.scaleAt(closedApproach(start.crimpEased,end.crimpEased,config.CRIMP_MORPH,Math.max(0,n-1)));
  s.pulse=.5;s.drop={x:-1e4,y:-1e4,tx:-1e4,ty:-1e4,s:0,ts:0,vs:0};
  if(overrides.crimp!=null)s.crimpEased=overrides.crimp;
  if(overrides.tilt!=null)s.tiltEased=overrides.tilt;
  if(overrides.narrative!=null)s.fictBirthEased=s.fictBirthEased.map((v,i)=>context.narrativeIndices.has(i)?overrides.narrative:0);
  return s;
}

export function createScrubber(bridge) {
  let context=null;
  return {
    begin(target){context=bridge.prepare(target);return {primary:context.primary,start:context.start.crimpEased,end:context.end.crimpEased};},
    seek(p,axes){if(!context)throw new Error('Fissare prima il contesto');return bridge.render(sampleTransition(context,p,axes));},
    assign(axes){if(!context)throw new Error('Fissare prima il contesto');const key=context.primary;
      const a=key==='narrative'?context.narrativeStart:context.start[key+'Eased'];
      const b=key==='narrative'?context.narrativeEnd:context.end[key+'Eased'];
      const value=axes[key]??a;return this.seek(a===b?0:(value-a)/(b-a),axes);},
    restore(){if(context){bridge.restore();context=null;}},
    snapshot(){return bridge.snapshot();}
  };
}
