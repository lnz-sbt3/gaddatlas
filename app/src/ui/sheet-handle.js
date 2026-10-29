import it from '../strings-it.js';

// Angolo del foglio: la presa del guscio. Il gesto sceglie un asse (relazioni o rilievo) nei primi
// pixel e governa il progresso dello stesso passaggio della regia D; tastiera e tocco equivalenti.
// La maniglia governa la rappresentazione, mai la camera.
const DIRECTIONS={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
const NS='http://www.w3.org/2000/svg';

export default function createSheetHandle({container,canvas,obstacle=null,config,controller}){
 const {sizeCSS,foldCSS,travelCSS,lockCSS,flickCSSPerMs}=config;
 const element=document.createElement('div');element.className='sheet-handle';element.style.setProperty('--sheet-size',`${sizeCSS}px`);
 const button=document.createElement('button');button.type='button';button.className='sheet-grip';
 button.setAttribute('aria-label',it.sheetName);button.setAttribute('aria-describedby','sheet-hint');
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','sheet-fold');
 const under=document.createElementNS(NS,'polygon'),flap=document.createElementNS(NS,'polygon'),crease=document.createElementNS(NS,'line');
 under.setAttribute('class','sheet-under');flap.setAttribute('class','sheet-flap');crease.setAttribute('class','sheet-crease');
 svg.append(under,flap,crease);button.append(svg);
 const hint=document.createElement('p');hint.id='sheet-hint';hint.className='sheet-hint';
 element.append(hint,button);container.append(element);

 let drag=null,shown='';
 // Quadrilatero del foglio: l'angolo C si piega lungo la linea A–B; P è il riflesso di C, cioè la punta che si muove.
 function draw(p,direction){
  const s=sizeCSS,along=Math.max(0,Math.min(1,p));
  const grow=foldCSS+along*travelCSS,major=direction==='left'||direction==='right'?'x':direction?'y':null;
  const wx=major==='y'?foldCSS+along*travelCSS*.5:grow,wy=major==="x"?foldCSS+along*travelCSS*.5:grow;
  const C=[s,s],A=[s-wx,s],B=[s,s-wy],ux=B[0]-A[0],uy=B[1]-A[1],t=((C[0]-A[0])*ux+(C[1]-A[1])*uy)/(ux*ux+uy*uy),F=[A[0]+ux*t,A[1]+uy*t],P=[2*F[0]-C[0],2*F[1]-C[1]];
  const pts=a=>a.map(q=>q.map(v=>v.toFixed(2)).join(',')).join(' ');
  under.setAttribute('points',pts([A,C,B]));flap.setAttribute('points',pts([A,P,B]));
  crease.setAttribute('x1',A[0].toFixed(2));crease.setAttribute('y1',A[1].toFixed(2));crease.setAttribute('x2',B[0].toFixed(2));crease.setAttribute('y2',B[1].toFixed(2));
 }
 function place(){
  const bottom=obstacle&&!obstacle.hidden?obstacle.offsetHeight:0;
  element.style.left=`${canvas.offsetLeft+canvas.clientWidth-sizeCSS}px`;
  element.style.top=`${canvas.offsetTop+Math.min(canvas.clientHeight,container.clientHeight-bottom)-sizeCSS}px`;
 }
 // Stato dal motore: p e direzione del passaggio attivo, oppure riposo con gli assi disponibili.
 function update({p=0,direction=null,label}){
  const key=`${p.toFixed(3)}|${direction}|${label}|${obstacle?.hidden}`;if(key===shown)return;shown=key;place();
  draw(p,direction);hint.textContent=label;element.classList.toggle('is-moving',p>0);
 }
 function lock(dx,dy){
  if(Math.hypot(dx,dy)<lockCSS)return null;
  return Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
 }
 button.addEventListener('pointerdown',event=>{
  if(event.button>0)return;event.preventDefault();button.setPointerCapture(event.pointerId);button.focus();
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,direction:null,accepted:false,last:[event.clientX,event.clientY,event.timeStamp],velocity:0};
 });
 button.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.direction){drag.direction=lock(dx,dy);if(drag.direction)drag.accepted=controller.start(drag.direction);}
  if(!drag.accepted)return;
  const [ux,uy]=DIRECTIONS[drag.direction],along=dx*ux+dy*uy,dt=Math.max(1,event.timeStamp-drag.last[2]);
  drag.velocity=((event.clientX-drag.last[0])*ux+(event.clientY-drag.last[1])*uy)/dt;drag.last=[event.clientX,event.clientY,event.timeStamp];
  controller.move(along/travelCSS);
 });
 function finish(event){
  if(!drag||event.pointerId!==drag.id)return;
  const d=drag;drag=null;
  // Il lancio vale solo se il dito si muoveva ancora al rilascio.
  const velocity=event.timeStamp-d.last[2]>80?0:d.velocity;
  if(d.accepted)controller.end(velocity>flickCSSPerMs?1:velocity<-flickCSSPerMs?-1:0);
  else if(!d.direction&&event.type==='pointerup')controller.key('Enter');
 }
 button.addEventListener('pointerup',finish);button.addEventListener('pointercancel',finish);
 button.addEventListener('keydown',event=>{if(controller.key(event.key)){event.preventDefault();event.stopPropagation();}});
 // Il click da tastiera (Invio, Spazio) è già gestito da keydown; quello del puntatore da pointerup.
 button.addEventListener('click',event=>event.preventDefault());
 // Riquadro 1:1 in px CSS, angolo del foglio in basso a destra; la piega può uscire dalla presa.
 const extent=sizeCSS+foldCSS+travelCSS;
 svg.setAttribute('viewBox',`${sizeCSS-extent} ${sizeCSS-extent} ${extent} ${extent}`);svg.setAttribute('width',extent);svg.setAttribute('height',extent);
 draw(0,null);
 return{element,update,place,dispose(){element.remove();}};
}
