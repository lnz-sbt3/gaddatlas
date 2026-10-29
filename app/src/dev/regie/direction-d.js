// Il pannello di sviluppo usa la stessa regia D del build; le regie A, B e C esistono solo in sviluppo.
import {prepareDirectionD,evaluateDirectionD,distributedProgress as progress,project} from '../../motion/direction-d.js';
import config from '../../model/config.js';
export {project};
export const distributedProgress=p=>progress(p,config.MOTION);
export const rankProgress=(p,rank)=>Math.max(0,Math.min(1,p+config.MOTION.rankAmplitude*(1-2*rank)*4*p*(1-p)));
export function prepareD(context){
 const iterator=prepareDirectionD({...context,token:config.MOTION,gestureCamera:context.start.transform});
 let result;do{result=iterator.next()}while(!result.done);return result.value;
}
export function evaluateD(input,p){
 const c=input.dPath?input:prepareD(input),f=evaluateDirectionD(c,p);
 f.motionLab=f.transition;return f;
}
