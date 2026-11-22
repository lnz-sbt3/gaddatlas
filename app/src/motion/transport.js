// Il clock avanza soltanto p. Contesto e valutazione non dipendono dal clock.
export const axesKey=s=>`${s.view}/${+s.axon}/${s.view==='diagram'?+s.narrative:0}`;
export function createAxisTransport(initial,token) {
 let current={...initial},active=null,requested={...initial};
 function sample(now){
  if(!active)return null;
  const dt=Math.max(0,now-active.at);active.at=now;
  let step=dt*active.rate;
  // Frenata d'arrivo: la curva geometrica del passaggio decelera solo verso p=1.
  // Quando il moto autonomo viaggia verso p=0 (riavvolgimento), o chiude in fretta
  // una richiesta superata, il passo rallenta nell'avvicinarsi all'estremo d'arrivo,
  // con una velocità minima che garantisce il completamento.
  if(active.rate<0||active.fast){
   const w=token.arrivalBrake||0;
   if(w>0){
    const dest=active.rate>0?1:0,s=Math.min(1,Math.abs(dest-active.p)/w);
    step*=Math.max(token.arrivalBrakeFloor||0,s*(2-s));
   }
  }
  active.p=Math.max(0,Math.min(1,active.p+step));
  return active;
 }
 return {
  get current(){return current},get active(){return active},get requested(){return requested},
  request(target,now){
   sample(now);requested={...target};if(!active)return;
   const key=axesKey(target),from=axesKey(active.from),to=axesKey(active.to);
   if(key===from||key===to){
    const sign=key===to?1:-1;
    if(Math.sign(active.rate)!==sign||active.fast){active.rate=sign/token.duration;active.fast=false;}
   }else if(!active.fast){
    // Ultima richiesta prevalente; il contesto corrente arriva al proprio estremo.
    const sign=Math.sign(active.rate),remaining=sign>0?1-active.p:active.p;
    active.rate=sign*Math.max(1/token.duration,remaining/token.catchup);active.fast=true;
   }
  },
  start(context,target,now,reverse=false){active={context,from:{...(reverse?target:current)},to:{...(reverse?current:target)},p:reverse?1:0,rate:(reverse?-1:1)/token.duration,at:now,fast:false};return active},
  advance(now){
   const a=sample(now);if(!a)return null;
   if(a.p===0&&a.rate<0||a.p===1&&a.rate>0){current={...(a.p===1?a.to:a.from)};active=null;return{...a,finished:true};}
   return a;
  },
  // Presa manuale: il gesto tiene p con velocità nulla; il rilascio riprende il moto verso un
  // estremo. Con una velocità massima (scorrimento guidato) p insegue il bersaglio senza
  // superarla, nei due versi: la corsa resta reversibile anche a metà passaggio.
  hold(p,now,maxRate=0){
   if(!active)return;
   const dt=Math.max(0,now-active.at);active.at=now;
   const target=Math.max(0,Math.min(1,p));
   if(maxRate>0){const step=dt*maxRate;active.p+=Math.max(-step,Math.min(step,target-active.p));}
   else active.p=target;
   active.rate=0;active.fast=false;
  },
  release(sign,now){if(!active)return;sample(now);active.rate=sign/token.duration;active.fast=false;},
  reset(target){current={...target};requested={...target};active=null;}
 };
}
