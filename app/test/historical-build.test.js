import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import localBasemap,{PUBLISHED_DIR} from '../build/local-basemap.js';

// Cartella app/ minima con una carta di un solo livello, nella cartella di pubblicazione o in quella locale.
function fixture({folder=PUBLISHED_DIR,file='dintorni-tenue-1.webp'}={}){
 const app=mkdtempSync(join(tmpdir(),'gaddatlas-carte-'));
 if(!folder)return app;
 const dir=join(app,folder);mkdirSync(dir,{recursive:true});
 const level={treatment:'tenue',divisor:1,file};
 writeFileSync(join(dir,'manifest.json'),JSON.stringify({version:2,sources:[{id:'dintorni',levels:[level]}],levels:[{...level,source:'dintorni'}]}));
 writeFileSync(join(dir,'dintorni-tenue-1.webp'),'immagine');
 return app;
}
function run(app,command='build'){
 const plugin=localBasemap(),emitted=[];
 plugin.configResolved({root:app,base:'/gaddatlas/',command});
 const client=plugin.load('\0historical-manifest');
 if(command==='build')plugin.generateBundle.call({emitFile:f=>emitted.push(f.fileName)});
 return{manifest:JSON.parse(client.replace(/^export default |;$/g,'')),emitted};
}
test('Build con la cartella di pubblicazione: immagini emesse sotto carte-storiche/',()=>{
 const {manifest,emitted}=run(fixture());
 assert.equal(manifest.assetBase,'carte-storiche/');
 assert.deepEqual(emitted,['carte-storiche/dintorni-tenue-1.webp']);
});
test('Build senza cartella di pubblicazione: nessuna carta, anche con la cartella locale',()=>{
 for(const app of [fixture({folder:null}),fixture({folder:'local-basemap'})]){
  const {manifest,emitted}=run(app);
  assert.equal(manifest,null);assert.deepEqual(emitted,[]);
 }
});
test('Sviluppo: cartella locale sotto __local_basemap/, altrimenti la cartella di pubblicazione',()=>{
 assert.equal(run(fixture({folder:'local-basemap'}),'serve').manifest.assetBase,'__local_basemap/');
 assert.equal(run(fixture(),'serve').manifest.levels[0].file,'dintorni-tenue-1.webp');
});
test('Un nome di file con un percorso ferma la build',()=>{
 assert.throws(()=>run(fixture({file:'../fuori.webp'})),/nome di file non valido/);
});
