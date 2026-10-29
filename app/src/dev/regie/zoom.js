import {evaluateFrame} from '../../motion/evaluate.js';
import {TOKENS} from './tokens.js';
import {project} from './direction-d.js';

// Una camera fissa per il passaggio, ancorata allo stato iniziale. Non segue il luogo.
export function withZoom(context,level,anchor,entities){
 if(level==null)return context;
 const id=TOKENS.zoom.anchors[anchor],index=entities.findIndex(d=>d.properties.GazetteerEntity_ID===id);
 if(index<0)throw Error('Centro della prova di zoom assente');
 const a=context.start,initial=evaluateFrame(context.model,a,context.fit),point=project(initial,context,a.points[index]);
 const zoomEndpoint=e=>{
  const transform={k:e.transform.k*level,x:context.model.width/2+(e.transform.x-point[0])*level,y:context.model.height/2+(e.transform.y-point[1])*level};
  const snapshot={...e,transform,previousCellScale:e.scales.slice()};
  snapshot.lodEased=evaluateFrame(context.model,snapshot,context.fit).lodTarget;
  return snapshot;
 };
 return {...context,start:zoomEndpoint(a),end:zoomEndpoint(context.end),reading:null,zoom:{level,anchor,id,index}};
}
