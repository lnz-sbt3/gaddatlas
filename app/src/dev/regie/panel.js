import {PASSAGES,SAMPLE_IDS} from './passages.js';
import {evaluateDirection} from './evaluate.js';
import {attachRendering} from './render-options.js';
import {TOKENS,clamp} from './tokens.js';
import {prepareD} from './direction-d.js';
import {withZoom} from './zoom.js';
import './panel.css';

export function mountMotionLab({atlas,root}){
 const bridge=atlas.motionLabBridge;
 if(!bridge)throw Error('Il ponte di sviluppo non è disponibile');
 bridge.halt();atlas.classList.add('regie-atlas');bridge.canvas.style.pointerEvents='none';
 // L'apparato nascosto conserva uno spazio costante: i cambi di stato non lo mandano a capo
 // e non invalidano il fit del contesto.
 for(const child of [...atlas.children].slice(1)){
   const height=child.getBoundingClientRect().height;
   Object.assign(child.style,{height:height+'px',minHeight:height+'px',maxHeight:height+'px',overflow:'hidden'});
 }
 const panel=document.createElement('section');panel.className='motion-lab';panel.setAttribute('aria-label','Confronto delle regie del moto');
 panel.innerHTML=`<header><h1>Regie del moto</h1><p>Prova di sviluppo · capitolo 10</p><button type="button" data-fold aria-expanded="true">Riduci strumenti</button></header>
 <div class="lab-tools"><div class="lab-choices"><label>Regia<select data-direction><option value="A">A · Rincorsa chiusa</option><option value="B">B · In tempi</option><option value="C">C · Dal polo</option><option value="D" selected>D · Onda stretta</option></select></label><label>Passaggio<select data-passage>${PASSAGES.map(x=>`<option value="${x.id}">${x.label}</option>`).join('')}</select></label></div>
 <div class="lab-camera"><label>Durata della regia D<select data-duration>${TOKENS.directionD.durations.map(v=>`<option value="${v}"${v===1300?' selected':''}>${(v/1000).toLocaleString('it-IT')} s</option>`).join('')}</select></label><label>Zoom rispetto al fit<select data-zoom><option value="0">Camera della 4c</option>${TOKENS.zoom.levels.map(v=>`<option value="${v}">${v.toLocaleString('it-IT')}×</option>`).join('')}</select></label><label>Centro della prova<select data-anchor><option value="dense">Centro denso · Via Merulana</option><option value="middle">Zona intermedia · Marino</option><option value="edge">Bordo · Anzio</option></select></label></div>
 <div class="lab-transport"><button type="button" data-play>Riproduci</button><button type="button" data-reverse>Inverti</button><button type="button" data-reset>Inizio</button><label class="lab-progress">Parametro p<input data-progress type="range" min="0" max="1" step="0.001" value="0"></label><output data-position>0,000</output></div>
 <details><summary>Camera e movimento ridotto</summary><div class="lab-camera"><label>Camera<select data-camera><option value="fit">Torna al fit</option><option value="preserve">Conserva la posizione relativa</option><option value="follow">Segui il luogo</option></select></label><label>Luogo seguito<select data-place>${SAMPLE_IDS.map(id=>{const d=bridge.entities.allData.find(v=>v.properties.GazetteerEntity_ID===id);return`<option value="${id}"${id==='gaz_torraccio'?' selected':''}>${d?.properties.Toponym||id}</option>`}).join('')}</select></label><button type="button" data-reading>Prova lettura ravvicinata</button><label class="lab-check"><input type="checkbox" data-reduced> Simula movimento ridotto</label></div></details>
 <p class="lab-description" data-description></p><p class="lab-measure" data-measure></p><p class="lab-units">Rilievo: riferimenti distinti; altezza logaritmica a bande, base 1,47, massimo 9. Lo scrub è il parametro del passaggio, non il nastro delle 942 righe interpretative.</p><p role="alert" data-error hidden></p></div>`;
 document.body.append(panel);
 const q=s=>panel.querySelector(s),direction=q('[data-direction]'),passage=q('[data-passage]'),slider=q('[data-progress]'),camera=q('[data-camera]'),place=q('[data-place]'),reduced=q('[data-reduced]'),play=q('[data-play]'),trial=q('[data-duration]'),zoom=q('[data-zoom]'),anchor=q('[data-anchor]');
 let context,frame,p=0,raf=0,velocity=1,playing=false,reading=false,lastCpu=0;
 const descriptions={A:'La rincorsa resta riconoscibile; ogni tessera raggiunge esattamente la destinazione entro il tempo fissato.',B:'Separazione, riassetto, rilievo: la successione rende leggibile il cambio di rappresentazione.',C:'Il cambiamento si propaga dal polo per rango di distanza; i luoghi narrativi seguono il rango del proprio referente.',D:'Archi della rincorsa, velocità distribuita e onda per rango entro ±12%. Il rilievo segue l’assestamento; nessuna nuova tinta.'};
 function stop(){cancelAnimationFrame(raf);raf=0;playing=false;play.textContent='Riproduci'}
 function prepare(id=passage.value){stop();passage.value=id;const edge=PASSAGES.find(v=>v.id===id);const start=bridge.endpoint(edge.from),gains=bridge.gains(),end=bridge.endpoint(edge.to);
  const projection=bridge.projection,ranks=projection.distanceRank.map((v,i)=>v??projection.distanceRank[bridge.primaryHostOf[i]]??0),angles=projection.geographicAngle.map((v,i)=>{const a=v??projection.geographicAngle[bridge.primaryHostOf[i]]??0;return((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI)/(2*Math.PI)});
  const selectedIndex=bridge.entities.allData.findIndex(d=>d.properties.GazetteerEntity_ID===place.value);
  context={start,end,gains,ranks,angles,model:bridge.model,projection,config:bridge.config,fit:bridge.fit(),kind:edge.kind,selectedIndex,edge,reading:reading?{k:start.transform.k*TOKENS.camera.readingZoom,x:start.transform.x-bridge.model.width*TOKENS.camera.offset[0],y:start.transform.y-bridge.model.height*TOKENS.camera.offset[1]}:null};
  context=withZoom(context,Number(zoom.value)||null,anchor.value,bridge.entities.allData);
  if(direction.value==='D')context=prepareD(context,evaluateDirection);
  trial.disabled=direction.value!=='D';
  p=0;return seek(0);
 }
 function seek(value){
  const begin=performance.now();p=clamp(value);
  frame=attachRendering(evaluateDirection(context,direction.value,p,camera.value),bridge);
  bridge.render(frame);lastCpu=performance.now()-begin;
  slider.value=String(p);q('[data-position]').value=p.toLocaleString('it-IT',{minimumFractionDigits:3,maximumFractionDigits:3});
  q('[data-description]').textContent=descriptions[direction.value];q('[data-measure]').textContent=`Durata ${duration()} ms · ${p===0?'partenza':p===1?'arrivo esatto':'passaggio'}${matchReduced()?' · movimento ridotto':''}`;
  return frame;
 }
 const matchReduced=()=>reduced.checked||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=()=>matchReduced()?TOKENS.reducedMs:direction.value==='D'?Number(trial.value):TOKENS.duration[direction.value][context.kind];
 function atTime(elapsed,origin=0,sign=1){return seek(duration()===0?(sign>0?1:0):origin+sign*elapsed/duration());}
 function run(){
  if(playing){stop();return}if(matchReduced()){seek(velocity>0?1:0);return}
  if((velocity>0&&p===1)||(velocity<0&&p===0))seek(velocity>0?0:1);
  playing=true;play.textContent='Pausa';const origin=p,began=performance.now();
  const tick=now=>{
   // Un timestamp RAF può precedere l'istante del click nello stesso frame.
   atTime(Math.max(0,now-began),origin,velocity);
   if((velocity>0&&p===1)||(velocity<0&&p===0))stop();else raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
 }
 const safely=fn=>{try{q('[data-error]').hidden=true;return fn()}catch(e){stop();q('[data-error]').hidden=false;q('[data-error]').textContent='La prova si è fermata: '+e.message;throw e}};
 for(const el of[direction,passage,camera,place,zoom,anchor])el.addEventListener('change',()=>safely(()=>prepare()));
 trial.addEventListener('change',()=>{stop();seek(p)});
 slider.addEventListener('input',()=>{stop();safely(()=>seek(Number(slider.value)))});play.addEventListener('click',()=>safely(run));
 q('[data-reset]').addEventListener('click',()=>{stop();seek(0)});q('[data-reverse]').addEventListener('click',()=>{velocity*=-1;if(playing){stop();run()}else run()});
 q('[data-reading]').addEventListener('click',()=>{reading=!reading;q('[data-reading]').setAttribute('aria-pressed',String(reading));prepare()});
 reduced.addEventListener('change',()=>{stop();seek(p)});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{stop();seek(p)});
 q('[data-fold]').addEventListener('click',()=>{const folded=panel.classList.toggle('folded');q('[data-fold]').textContent=folded?'Apri strumenti':'Riduci strumenti';q('[data-fold]').setAttribute('aria-expanded',String(!folded))});
 let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);const saved=p;resizeFrame=requestAnimationFrame(()=>{resizeFrame=requestAnimationFrame(()=>{if(context){prepare();seek(saved)}})})});
 window.__GADDATLAS_MOTION_LAB__={
  configure({regia='D',passaggio=PASSAGES[0].id,camera:cam='fit',place:id='gaz_torraccio',closeup=false,zoom:level=0,anchor:area='dense',duration:ms=1300}={}){direction.value=regia;camera.value=cam;place.value=id;reading=closeup;zoom.value=String(level);anchor.value=area;trial.value=String(ms);return prepare(passaggio)},
  seek,atTime,play:run,stop,get frame(){return frame},get context(){return context},get cpu(){return lastCpu},duration,passages:PASSAGES,
  get state(){return {regia:direction.value,passaggio:passage.value,camera:camera.value,p,playing,zoom:Number(zoom.value),anchor:anchor.value}},
  measure(){return {cpu:lastCpu,p,duration:duration()}},
  renderBaseline(frame){bridge.render(frame)},bridge,
 };
 prepare();
}
