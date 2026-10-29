// Stessa operazione aritmetica delle rincorse esistenti, senza normalizzare il RAF.
export function approach(value,target,gain){return value+(target-value)*gain;}
export function advanceLayout(point,target,gain){
  point[0]+=(target[0]-point[0])*gain;
  point[1]+=(target[1]-point[1])*gain;
}
// Estensione continua in numero di frame, usata soltanto dallo scrubbing DEV.
export function closedApproach(start,target,gain,steps){
  if(steps===Infinity)return target;
  return target+(start-target)*Math.pow(1-gain,steps);
}
export function closedPiecewise(start,first,last,gain,steps,switchAfter){
  const firstSteps=Math.min(steps,switchAfter);
  const middle=closedApproach(start,first,gain,firstSteps);
  return steps<=switchAfter?middle:closedApproach(middle,last,gain,steps-switchAfter);
}
