import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../src/model/config.js';
import {attachMotionRendering,createIsolineTracer} from '../src/render/motion.js';

class RecordingPath {
  commands=[];
  addPath(path){this.commands.push(...path.commands);}
}

test('cache vettoriale: stessi comandi, invalidazione esatta e separazione dei passaggi',()=>{
  const previous=globalThis.Path2D;globalThis.Path2D=RecordingPath;
  try{
    let calls=0;
    const legacy=(stroke,fill,...args)=>{calls++;const recorded=args.slice();recorded[10]=null;stroke?.commands.push(recorded);fill?.commands.push(recorded);return true;};
    const context={},passage={},radii=new Float64Array([1,2,3]);
    const args=[10,20,radii,2,1,1,2,.31,.5,.8,null,0];
    const make=key=>attachMotionRendering({transition:{},alphaFactors:[]},{config,context,model:{N_GEO:1,N_INMAP:1},passage:key,traceIsoline:legacy}).transition.traceIsoline;
    const draw=(trace,values)=>{const stroke=new RecordingPath(),fill=new RecordingPath();assert.equal(trace(stroke,fill,...values),true);const expected=values.slice();expected[10]=null;assert.deepEqual(stroke.commands,[expected]);assert.deepEqual(fill.commands,[expected]);};
    draw(make(passage),args);draw(make(passage),args);assert.equal(calls,1);
    const moved=args.slice();moved[0]+=Number.EPSILON*64;draw(make(passage),moved);assert.equal(calls,2);
    const otherTile=args.slice();otherTile[2]=radii.slice();draw(make(passage),otherTile);assert.equal(calls,3);
    draw(make({}),args);assert.equal(calls,4);
    const withPicking=args.slice();withPicking[10]=[];draw(make(passage),withPicking);draw(make(passage),withPicking);assert.equal(calls,6);
  }finally{globalThis.Path2D=previous;}
});

test('cache vettoriale: una curva rifiutata non riutilizza comandi precedenti',()=>{
  const previous=globalThis.Path2D;globalThis.Path2D=RecordingPath;
  try{
    let calls=0;
    const trace=attachMotionRendering({transition:{}},{config,context:{},model:{N_GEO:1,N_INMAP:1},passage:{},traceIsoline(){calls++;return false;}}).transition.traceIsoline;
    const stroke=new RecordingPath(),fill=new RecordingPath(),args=[0,0,null,0,1,0,0,.2,1,1,null,0];
    assert.equal(trace(stroke,fill,...args),false);assert.equal(trace(stroke,fill,...args),false);
    assert.equal(calls,1);assert.deepEqual(stroke.commands,[]);assert.deepEqual(fill.commands,[]);
  }finally{globalThis.Path2D=previous;}
});

test('cache delle curve: il picking riceve punti indipendenti dalla memoria geometrica',()=>{
  const previous=globalThis.Path2D;globalThis.Path2D=RecordingPath;
  try{
    let calls=0;
    const trace=createIsolineTracer((stroke,fill,...args)=>{calls++;args[10].push([42,13]);return true;});
    const points=[],args=[0,0,null,1,1,1,1,.2,1,1,points,0];
    trace(null,null,...args);assert.deepEqual(points,[[42,13]]);points[0][0]=-99;
    trace(null,null,...args);assert.deepEqual(points,[[42,13]]);assert.equal(calls,1);
  }finally{globalThis.Path2D=previous;}
});
