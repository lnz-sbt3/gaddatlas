import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import passageAccess,{collectFragments,fragmentName,PUBLIC_MODE} from '../build/passages.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const passagesDir=fileURLToPath(new URL('../../data/dist/passages/',import.meta.url));
const hasExcerpts=existsSync(passagesDir)&&readdirSync(passagesDir).some(n=>/^ch\d{2}\.json$/.test(n));
test('Frammenti singoli, attribuiti, senza capitoli o indice di URL',{skip:!hasExcerpts&&'estratti non presenti'},()=>{
 const items=collectFragments(root,'prova');assert.equal(items.size,717);assert.equal(new Set([...items.values()].map(v=>v.name)).size,717);
 for(const [id,v] of items){assert.match(v.name,/^[a-f0-9]{64}\.json$/);assert(!v.name.includes(id));const p=JSON.parse(v.source);assert.equal(p.referenceId,id);assert.equal(typeof p.excerpt,'string');assert(p.sourceReference);assert.equal(p.witnessLabel,'QP (Adelphi 2018)');assert(!('passages'in p));assert(!('chapters'in p));}
});
test('Nomi opachi deterministici entro la build e diversi al cambio del sale',()=>{assert.equal(fragmentName('a','ref_00001'),fragmentName('a','ref_00001'));assert.notEqual(fragmentName('a','ref_00001'),fragmentName('b','ref_00001'));});

// Copia minima della struttura (app/ e data/dist/passages/) con un solo riferimento.
function fixture(withExcerpt){
 const base=mkdtempSync(join(tmpdir(),'gaddatlas-passages-')),app=join(base,'app'),dir=join(base,'data/dist/passages');
 mkdirSync(join(app,'public/data'),{recursive:true});mkdirSync(dir,{recursive:true});
 writeFileSync(join(app,'public/data/gaddatlas.geojson'),JSON.stringify({relief:[{referenceId:'ref_00001'}]}));
 writeFileSync(join(app,'public/data/roma.geojson'),'{}');
 if(withExcerpt)writeFileSync(join(dir,'ch01.json'),JSON.stringify({passages:{ref_00001:{excerpt:'testo',sourceReference:'A 1',witnessLabel:'QP',page:1}}}));
 return app;
}
function run(app,{mode='production',command='build'}={}){
 const plugin=passageAccess(),emitted=[];
 plugin.configResolved({root:app,mode,command});
 const client=plugin.load('\0virtual:passage-access');
 plugin.generateBundle.call({emitFile:f=>emitted.push(f.fileName)});
 return{client,emitted};
}
test('Modalità rigida: senza estratti la build si ferma',()=>{
 const app=fixture(false);
 assert.throws(()=>collectFragments(app,'prova'),/Riferimenti testuali incompleti/);
 assert.throws(()=>run(app),/Riferimenti testuali incompleti/);
});
test('Modalità rigida: con gli estratti un frammento opaco per riferimento',()=>{
 const {client,emitted}=run(fixture(true));
 assert.match(client,/passagesAvailable=true/);
 assert.deepEqual(emitted.slice(0,2),['data/gaddatlas.geojson','data/roma.geojson']);
 assert.equal(emitted.length,3);assert.match(emitted[2],/^data\/readings\/[a-f0-9]{64}\.json$/);
});
test('Modalità pubblica: nessun estratto emesso, nessuna richiesta dal client',()=>{
 for(const withExcerpt of [false,true]){
  const {client,emitted}=run(fixture(withExcerpt),{mode:PUBLIC_MODE});
  assert.deepEqual(emitted,['data/gaddatlas.geojson','data/roma.geojson']);
  assert.match(client,/passagesAvailable=false/);assert.doesNotMatch(client,/readings|digest/);
 }
});
test('Sviluppo senza estratti: stesso comportamento della modalità pubblica',()=>{
 assert.match(run(fixture(false),{mode:'development',command:'serve'}).client,/passagesAvailable=false/);
 assert.match(run(fixture(true),{mode:'development',command:'serve'}).client,/passagesAvailable=true/);
});
