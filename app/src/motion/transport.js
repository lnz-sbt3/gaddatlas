// Il clock avanza soltanto p. Contesto e valutazione non dipendono dal clock.
export const axesKey=s=>`${s.view}/${+s.axon}/${s.view==='diagram'?+s.narrative:0}`;
export function createAxisTransport(initial,{duration,catchup}) {
 let current={...initial},active=null,requested={...initial};
 function sample(now){
  if(!active)return null;
  const dt=Math.max(0,now-active.at);active.at=now;
  active.p=Math.max(0,Math.min(1,active.p+dt*active.rate));
  return active;
 }
 return {
  get current(){return current},get active(){return active},get requested(){return requested},
  request(target,now){
   sample(now);requested={...target};if(!active)return;
   const key=axesKey(target),from=axesKey(active.from),to=axesKey(active.to);
   if(key===from||key===to){
    const sign=key===to?1:-1;
    if(Math.sign(active.rate)!==sign||active.fast){active.rate=sign/duration;active.fast=false;}
   }else if(!active.fast){
    // Ultima richiesta prevalente; il contesto corrente arriva al proprio estremo.
    const sign=Math.sign(active.rate),remaining=sign>0?1-active.p:active.p;
    active.rate=sign*Math.max(1/duration,remaining/catchup);active.fast=true;
   }
  },
  start(context,target,now,reverse=false){active={context,from:{...(reverse?target:current)},to:{...(reverse?current:target)},p:reverse?1:0,rate:(reverse?-1:1)/duration,at:now,fast:false};return active},
  advance(now){
   const a=sample(now);if(!a)return null;
   if(a.p===0&&a.rate<0||a.p===1&&a.rate>0){current={...(a.p===1?a.to:a.from)};active=null;return{...a,finished:true};}
   return a;
  },
  // Foglio: il gesto tiene p con velocità nulla; il rilascio riprende il moto verso un estremo.
  hold(p,now){if(!active)return;sample(now);active.p=Math.max(0,Math.min(1,p));active.rate=0;active.fast=false;},
  release(sign,now){if(!active)return;sample(now);active.rate=sign/duration;active.fast=false;},
  reset(target){current={...target};requested={...target};active=null;}
 };
}
