import {test} from 'node:test';import assert from 'node:assert/strict';
import {evaluateFrame} from '../src/motion/evaluate.js';
import {closedApproach,closedPiecewise} from '../src/motion/advance.js';
import {sampleTransition} from '../src/dev/scrubbing.js';
import roleBandsFactory, {readRoleSnapshot} from '../src/render/role-bands.js';
import routeSelectionFactory from '../src/interaction/route-selection.js';
const model={width:100,height:100,extentBase:50,N_GEO:2,N_INMAP:1,pts:[[20,30]],cellRings:[{},null,{}],normalizedCellScale:[.5,1,1],isoProfileMed:[5,0,3],axonZStep:2,terraceStep:.2,BANDS_MAX:9,geographicAngle:[0,1,0],
 config:{TILT_REST:.75,DIAG_SCREEN_FRAC:.9,RADIUS:40,LOD_DIAG_GAIN:2,LOD_MIN:.9,LOD_FULL:2,FICT_CRIMP_THRESHOLD:.5,BIRTH_EPSILON:.015,FOCAL_DIM_ALPHA:.2,GRID_ALPHA:.22,FICT_RELIEF_ALPHA:.5,ISO_ALPHA:.25},
 bandsFor:n=>n<=0?0:Math.min(9,Math.floor(Math.log(n)/Math.log(1.47))+1),spawnPointAlongAzimuth:()=>[110,120]};
const snapshot=()=>({crimpEased:.4,tiltEased:.3,transform:{x:0,y:0,k:1},cogCenter:[50,50],rotPivot:[50,50],planRot:0,diagramScaleBaseK:1,previousCellScale:[1,1,1],layoutPtsEased:[[60,70],[80,90],[40,40]],birthEased:[1,1,1],fictBirthEased:[0,0,.5],focalEased:[1,1,1],occEased:[2,3,4],routeHotSet:new Set(),routeHoverEased:0,focalizer:null,lodEased:1,pulse:.5});
test('valutazione deterministica, senza mutazioni e senza orologio',()=>{
 const s=snapshot(),before=structuredClone(s);const a=evaluateFrame(model,s,.75);
 const oldDate=Date.now,oldPerformance=globalThis.performance;
 Date.now=()=>{throw Error('tempo proibito')};globalThis.performance={now:()=>{throw Error('tempo proibito')}};
 try{assert.deepEqual(evaluateFrame(model,s,.75),a)}finally{Date.now=oldDate;globalThis.performance=oldPerformance}
 assert.deepEqual(s,before);assert.deepEqual(a.displayPts[0],[35.6,45.2]);
});
test('lo snapshot di layout distingue le storie a parita di assi',()=>{
 const a=snapshot(),b=snapshot();b.layoutPtsEased[0]=[90,90];
 assert.notDeepEqual(evaluateFrame(model,a,1).displayPts,evaluateFrame(model,b,1).displayPts);
});
test('continuita geometrica locale e discontinuita legacy dei bordi dichiarata',()=>{
 const a=snapshot(),b=snapshot();a.crimpEased=.4-1e-8;b.crimpEased=.4+1e-8;
 const x=evaluateFrame(model,a,1),y=evaluateFrame(model,b,1);
 assert.ok(Math.hypot(x.displayPts[0][0]-y.displayPts[0][0],x.displayPts[0][1]-y.displayPts[0][1])<1e-5);
 a.crimpEased=.01-1e-8;b.crimpEased=.01+1e-8;
 assert.equal(evaluateFrame(model,a,1).layers.gridMode,'shared');assert.equal(evaluateFrame(model,b,1).layers.gridMode,'cells');
});
test('il fit scala metriche e soglie CSS conservando il target LOD',()=>{
 const s=snapshot(),a=evaluateFrame(model,s,1),b=evaluateFrame(model,s,.5);
 assert.equal(a.lodTarget,b.lodTarget);assert.equal(a.lodCss.min/2,b.lodCss.min);
});
test('forma chiusa: medesima rincorsa e cambio di target ai frame interi',()=>{
 let v=12;for(let n=1;n<=100;n++){v+=(80-v)*.025;assert.ok(Math.abs(v-closedApproach(12,80,.025,n))<1e-11)}
 v=12;for(let n=1;n<=100;n++){v+=((n<=21?80:40)-v)*.025;assert.ok(Math.abs(v-closedPiecewise(12,80,40,.025,n,21))<1e-11)}
});
test('scrubbing avanti/indietro senza memoria del percorso; segnali ambientali congelati',()=>{
 const start=snapshot(),end={...start,crimpEased:1,tiltEased:1,lodEased:1,roleSortEased:1};start.roleSortEased=0;
 const ctx={start,end,config:{CRIMP_MORPH:.0325,BIRTH_MORPH:.14,ROLE_SORT_MORPH:.14},primaryGain:.0325,gains:[.025,.1,.04],phases:[{after:0,points:[[90,90],[100,100],[60,60]]}],bornNarrative:[0,0,1].map(v=>({first:v,last:v,after:Infinity})),scaleAt:()=>[1,1,1],narrativeIndices:new Set([2])};
 const forward=Array.from({length:21},(_,i)=>sampleTransition(ctx,i/20));
 for(let i=20;i>=0;i--){assert.deepEqual(sampleTransition(ctx,i/20),forward[i]);assert.equal(forward[i].pulse,.5);assert.equal(forward[i].drop.s,0)}
 assert.deepEqual(forward[20].layoutPtsEased,ctx.phases[0].points);
});

test('lo snapshot dei ruoli resta leggibile dopo un rebuild del controller',()=>{
 const roles=roleBandsFactory.create({allDataLength:1,roleCap:4,bandsMax:4,bandsLogBase:1.47});
 const input={roleStack:new Int8Array([0,1,0,1]),rolePosStack:new Int32Array([10,11,12,13]),roleCounts:new Int16Array([4]),roleOrder:['Setting','Marker'],linear:true};
 roles.rebuild(input);const saved=roles.snapshot();
 const reader=readRoleSnapshot(saved,{roleTreadRgb:(role,k)=>[role,k,0],mixRgb:(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),wallFromTreadRgb:t=>t});
 const position=reader.posOfBand(0,2,false),tint=reader.bandTint({tileIndex:0,sortEased:.4})(2);
 roles.rebuild({...input,roleStack:new Int8Array([1,1,1,1]),rolePosStack:new Int32Array([20,21,22,23])});
 assert.equal(reader.posOfBand(0,2,false),position);assert.deepEqual(reader.bandTint({tileIndex:0,sortEased:.4})(2),tint);
 assert.notEqual(roles.posOfBand(0,2,false),position);
});
test('ripristino del checkpoint: route e terrazza sorgente sopravvivono allo scrubbing',()=>{
 const route=routeSelectionFactory.create({getFocalizer:()=>1,getLodEased:()=>1,getHostIndex:()=>3,getHoverTerrace:()=>2,getRoleSortTarget:()=>0,roleBands:{posOfBand:()=>0},sequence:[{referenceId:'ref-stabile'}],routeIdByReferenceId:new Map([['ref-stabile','route-stabile']])});
 route.selectFromTerrace();const saved={id:route.id,tileIndex:route.tileIndex,terrace:route.terrace};route.clear();route.restore(saved.id,saved);
 assert.deepEqual({id:route.id,tileIndex:route.tileIndex,terrace:route.terrace},saved);
 route.restore(saved.id);assert.equal(route.tileIndex,-1);assert.equal(route.terrace,-1);
});
