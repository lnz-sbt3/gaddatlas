// Varianti di sviluppo della determinazione (fuori dal build): contorni «tensione» e «appoggi».
// La resa 'continuita' è nel renderer (render/painters.js, parametri DETERMINATION in model/config.js);
// le altre due si scelgono con ?lab={"DETERMINATION.mode":"tensione"|"appoggi"}.
// Il renderer passa i punti del contorno in px CSS, con strokeStyle già impostato.
import config from '../../model/config.js';
export const CLASSES=['Precise','Relative','Approximate','Indeterminate'];
export const OPTIONS=[
 {id:'continuita',name:'Continuità',principle:'Il segno resta integro, si articola, si sospende, diventa puntiforme.',cost:'Un bordo corto può non contenere un intero ritmo; rischio di confusione con i posti fantasma.'},
 {id:'tensione',name:'Tensione',principle:'La linea è ferma, poi flessibile, poi oscillante: astrazione senza sfocare.',cost:'La variazione della traccia può sembrare una diversa forma del rilievo; non è una fascia di errore geografico.'},
 {id:'appoggi',name:'Appoggi',principle:'Le incisioni attraversano il bordo, vi si appoggiano, se ne discostano, rimangono sospese.',cost:'Il dettaglio locale richiede spazio e può sembrare una decorazione o un segno di selezione.'}
];
export const TOKENS={width:config.DETERMINATION.width,dash:config.DETERMINATION.dash,amplitude:{Precise:0,Relative:.4,Approximate:.9,Indeterminate:1.5},wavelength:8,tickLength:3,tickGap:12};

export function resample(points,step=.7){
 const lengths=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%points.length][0],p[1]-points[(i+1)%points.length][1])),total=lengths.reduce((a,b)=>a+b,0),n=Math.max(8,Math.ceil(total/step)),result=[];
 let edge=0,offset=0;
 for(let j=0;j<n;j++){const distance=j*total/n;while(edge<points.length-1&&offset+lengths[edge]<distance)offset+=lengths[edge++];const a=points[edge],b=points[(edge+1)%points.length],t=(distance-offset)/Math.max(1e-9,lengths[edge]);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}
 return {points:result,length:total};
}
function normal(points,i){const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.max(1e-9,Math.hypot(dx,dy));return[-dy/d,dx/d]}
function path(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath()}
export function paintContour(ctx,points,kind,option){
 if(!CLASSES.includes(kind))throw Error('Determinazione non ammessa');
 const sampled=resample(points),p=sampled.points;
 ctx.save();ctx.lineWidth=TOKENS.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);
 if(option==='continuita'){ctx.setLineDash(TOKENS.dash[kind]);path(ctx,points);ctx.stroke()}
 else if(option==='tensione'){
  const waves=Math.max(1,Math.round(sampled.length/TOKENS.wavelength));
  const q=p.map((v,i)=>{const n=normal(p,i),a=TOKENS.amplitude[kind]*Math.sin(2*Math.PI*waves*i/p.length);return[v[0]+n[0]*a,v[1]+n[1]*a]});path(ctx,q);ctx.stroke();
 }else if(option==='appoggi'){
  path(ctx,points);ctx.stroke();
  const count=Math.max(1,Math.floor(sampled.length/TOKENS.tickGap));
  for(let j=0;j<count;j++){
   const i=Math.floor((j+.5)*p.length/count),[x,y]=p[i],n=normal(p,i),t=[n[1],-n[0]],point=(u,v)=>[x+n[0]*u+t[0]*v,y+n[1]*u+t[1]*v];
   ctx.beginPath();
   if(kind==='Precise'){ctx.moveTo(...point(-1.5,0));ctx.lineTo(...point(1.5,0))}
   else if(kind==='Relative'){ctx.moveTo(...point(0,-1));ctx.lineTo(...point(0,1));ctx.lineTo(...point(1.8,1))}
   else if(kind==='Approximate'){ctx.moveTo(...point(1.1,-1.4));ctx.quadraticCurveTo(...point(2.2,0),...point(1.1,1.4))}
   else{ctx.moveTo(...point(2,-1.5));ctx.lineTo(...point(2,1.5))}
   ctx.stroke();
  }
 }else throw Error('Proposta non ammessa');
 ctx.restore();return sampled.length;
}
