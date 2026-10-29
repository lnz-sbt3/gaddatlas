import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeContext2d} from '../src/render/context2d.js';
import config from '../src/model/config.js';
function fixture() {
  const context={canvas:{style:{}},setTransform(...matrix){this.matrix=matrix;},getTransform(){return this.matrix;}};
  return context;
}
test('bitmap a DPR 2 con dominio logico invariato e dimensioni CSS adattate',()=>{
 const context=fixture();const matrix=resizeContext2d(context,{cssWidth:600.5,cssHeight:531,width:1201,height:1062,dpi:2});
 assert.equal(context.canvas.width,1201);assert.equal(context.canvas.height,1062);
 assert.equal(context.canvas.style.width,'600.5px');assert.deepEqual(matrix,[1,0,0,1,0,0]);
});
test('tetto di area e di lato limita le allocazioni, anche con aspect ratio estremi',()=>{
 for(const [cssWidth,cssHeight] of [[16000,10000],[100000,20],[20,100000]]){
  const context=fixture();resizeContext2d(context,{cssWidth,cssHeight,width:1201,height:1062,dpi:4});
  assert.ok(context.canvas.width*context.canvas.height<=config.CANVAS_MAX_PIXELS);
  assert.ok(Math.max(context.canvas.width,context.canvas.height)<=config.CANVAS_MAX_EDGE);
 }
});
test('i viewport richiesti non riducono la densita a DPR 1 o 2',()=>{
 for(const dpi of [1,2])for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[768,1024]]){
  const context=fixture();const fit=Math.min(width/1201,height/1062),cssWidth=1201*fit,cssHeight=1062*fit;
  resizeContext2d(context,{cssWidth,cssHeight,width:1201,height:1062,dpi});
  assert.equal(context.canvas.width,Math.floor(cssWidth*dpi));assert.equal(context.canvas.height,Math.floor(cssHeight*dpi));
 }
});
