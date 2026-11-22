import{test}from'node:test';import assert from'node:assert/strict';import config from'../src/model/config.js';import{evaluateFrame}from'../src/motion/evaluate.js';import{prepareDirectionD,evaluateDirectionD}from'../src/motion/direction-d.js';
// Gli elementi che esistono solo nelle relazioni (luoghi narrativi, periferici
// senza sagoma) non partecipano alla cordata: posto fisso nel diagramma,
// opacità come funzione pura e simmetrica di p, nessun contributo alla
// lunghezza d'arco del passaggio.
const model={width:100,height:100,extentBase:50,N_GEO:2,N_INMAP:1,pts:[[20,30]],cellRings:[{},null,{}],normalizedCellScale:[.5,1,1],isoProfileMed:[5,0,3],axonZStep:2,terraceStep:.2,BANDS_MAX:9,geographicAngle:[0,1,0],config:{...config,TILT_REST:.75,TILT_MORPH:.05},bandsFor:n=>Math.min(9,Math.round(n)),spawnPointAlongAzimuth:()=>[110,120]};
function endpoint(crimp,narrative,tilt=0){const s={crimpEased:crimp,tiltEased:tilt,showFictitious:narrative,transform:{x:0,y:0,k:1},cogCenter:[50,50],rotPivot:[50,50],planRot:0,diagramScaleBaseK:1,previousCellScale:[1,1,1],layoutPtsEased:[[60,70],[80,90],narrative?[40,40]:[110,120]],birthEased:[1,1,1],fictBirthEased:[0,0,narrative?1:0],focalEased:[1,1,1],occEased:[2,3,4],routeHotSet:new Set(),routeHoverEased:0,focalizer:null,lodEased:crimp,pulse:.5};const f=evaluateFrame(model,s,1);return{...s,points:f.displayPts,scales:f.displayCellScale};}
function context(a,b,axisFrom,axisTo){const c={start:a,end:b,model,projection:{bbox:[0,0]},fit:1,gains:[.025,.08,.03],ranks:[0,.9,.3],token:config.MOTION,axisFrom,axisTo};const g=prepareDirectionD(c);let r;do{r=g.next()}while(!r.done);return r.value;}
const w=config.MOTION;

test('luoghi delle relazioni: fermi al proprio posto, fuori dalla lunghezza d’arco',()=>{
 const c=context(endpoint(1,true),endpoint(0,false),'diagram/0/1','map/0/0');
 // narrativo (indice 2) e periferico senza sagoma (indice 1): percorso nullo
 // nella tabella, nessun contributo alla lunghezza d'arco collettiva
 assert.ok(c.offmap.has(1));
 assert.ok(!c.offmap.has(2));
 for(const i of[1,2])assert.ok(c.dPath.lengths[i].at(-1)<1e-12);
 // posizione costante al posto del diagramma per ogni p intermedio
 const spot=c.start.points[2];
 for(const p of[.01,.2,.5,.8,.99]){
  const f=evaluateDirectionD(c,p);
  assert.ok(Math.hypot(f.displayPts[2][0]-spot[0],f.displayPts[2][1]-spot[1])<1e-9);
 }
});

test('luoghi delle relazioni: opacità pura e simmetrica, con la finestra delle annotazioni',()=>{
 const c=context(endpoint(1,true),endpoint(0,false),'diagram/0/1','map/0/0');
 const alpha=p=>evaluateDirectionD(c,p).transition.presence[2];
 // stessa finestra delle annotazioni: spenti alla fine della finestra d'uscita
 assert.equal(alpha(0),1);
 assert.equal(alpha(w.geoOut[1]),0);
 assert.equal(alpha(1),0);
 // monotona non crescente verso la mappa
 let prev=alpha(0);
 for(let k=1;k<=50;k++){const v=alpha(k/50);assert.ok(v<=prev+1e-12);prev=v;}
 // pura e simmetrica: la stessa p dà lo stesso valore in andata e al riavvolgimento
 const avanti=[.1,.3,.7].map(alpha);
 for(let k=2;k>=0;k--)assert.equal(alpha([.1,.3,.7][k]),avanti[k]);
});

test('commutatore dei luoghi narrativi a diagramma aperto: dissolvenza sul posto',()=>{
 const c=context(endpoint(1,false),endpoint(1,true),'diagram/0/0','diagram/0/1');
 const spot=c.end.points[2];
 let prev=-1;
 for(const p of[.05,.25,.5,.75,.95]){
  const f=evaluateDirectionD(c,p);
  assert.ok(Math.hypot(f.displayPts[2][0]-spot[0],f.displayPts[2][1]-spot[1])<1e-9);
  assert.ok(f.transition.presence[2]>prev);prev=f.transition.presence[2];
 }
 assert.equal(evaluateDirectionD(c,1).transition.presence[2],1);
});
