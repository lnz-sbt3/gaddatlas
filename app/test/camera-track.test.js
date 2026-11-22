import{test}from'node:test';import assert from'node:assert/strict';import config from'../src/model/config.js';import{buildCameraTrack}from'../src/motion/direction-d.js';
// La traccia di camera dei passaggi fra relazioni e geografia: estremi esatti
// sulle camere di partenza e d'arrivo, scala monotona fra le due.
const base={model:{N_GEO:2,config:{...config}},token:config.MOTION,projection:{bbox:[0,0]},view:{x0:0,y0:0,x1:100,y1:100},
 aliveGeo:[true,true],sguardoF:[0]};
const frame=(transform,crimp)=>({transform,crimpEased:crimp,tiltEased:0,rotPivot:[50,50],rotCosNow:1,rotSinNow:0,tiltNow:1,
 points:[[10,20],[30,40]],scales:[1,1]});
test('traccia di camera: estremi esatti e scala monotona',()=>{
 const a=frame({x:0,y:0,k:1},0),b=frame({x:-40,y:-30,k:4},1);
 const cam=buildCameraTrack({...base,start:a,end:b});
 assert.ok(cam);
 for(const[f,atteso]of[[cam(0),a.transform],[cam(1),b.transform]])
  for(const k of['x','y','k'])assert.ok(Math.abs(f[k]-atteso[k])<1e-9);
 let prev=cam(0).k;
 for(let i=1;i<=100;i++){const k=cam(i/100).k;assert.ok(k>=prev-1e-12);prev=k;}
 // verso opposto: scala monotona anche in discesa
 const giu=buildCameraTrack({...base,start:b,end:a});
 prev=giu(0).k;
 for(let i=1;i<=100;i++){const k=giu(i/100).k;assert.ok(k<=prev+1e-12);prev=k;}
});
test('traccia di camera: nessuna traccia a camere uguali o senza cambio di vista',()=>{
 const a=frame({x:0,y:0,k:1},0),b=frame({x:0,y:0,k:1},1);
 assert.equal(buildCameraTrack({...base,start:a,end:b}),null);
 const c=frame({x:-40,y:-30,k:4},0);
 assert.equal(buildCameraTrack({...base,start:a,end:c}),null); // crimp uguale
});
