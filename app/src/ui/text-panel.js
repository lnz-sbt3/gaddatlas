import {html} from 'htl';
import {passagePath,passagesAvailable} from 'virtual:passage-access';
import it from '../strings-it.js';
import s4Config from '../model/config.js';

// Solo il riferimento corrente richiede un estratto. Nessun caricamento per capitolo.
export default function createTextPanel({relief,entities,agents,aliasGroups=[],loadJSON,onClose=()=>{},onSelect=()=>{},onLocate=null}){
 let revision=0,request=0,pendingLoads=0,returnFocus=null;
 let selection={place:null,reference:null};
 const names=new Map(agents.map(a=>[a.id,a.name]));
 const aliases=new Map(aliasGroups.flatMap(g=>g.ids.map(id=>[id,g.canonical]))),byTile=new Map();
 for(const row of relief){const tile=entities.allDataById.get(row.targetId)??entities.allDataById.get(aliases.get(row.targetId));if(tile==null)continue;if(!byTile.has(tile))byTile.set(tile,[]);byTile.get(tile).push(row);}
 const body=html`<div class="text-panel-body"></div>`,title=html`<h2 id="text-panel-title"></h2>`,count=html`<p class="text-panel-count" aria-live="polite"></p>`;
 const close=html`<button type="button" aria-label=${it.closeText}>${it.close}</button>`;
 const anchorsLine=html`<p class="text-anchors" hidden></p>`;
 // «Ritrova nella figura»: centra la camera sulla tessera attiva senza cambiare vista.
 const locate=html`<button type="button" class="text-locate">${it.findButton}</button>`;locate.onclick=()=>onLocate?.();locate.hidden=!onLocate;
 const element=html`<aside class="text-panel" hidden aria-labelledby="text-panel-title"><header>${close}${title}${anchorsLine}${count}${locate}</header>${body}</aside>`;
 function hide({restoreFocus=false}={}){revision++;request++;element.hidden=true;selection={place:null,reference:null};body.replaceChildren();if(restoreFocus&&returnFocus?.isConnected)returnFocus.focus();}
 function closePanel(){hide({restoreFocus:true});onClose();}
 close.onclick=closePanel;
 const keydown=event=>{if(event.key==='Escape'&&!element.hidden){event.preventDefault();closePanel();}};
 document.addEventListener('keydown',keydown);
 function apparatus(rows){return rows.map(row=>html`<div class="text-interpretation"><dl>
  <dt>${it.focalizer}</dt><dd>${names.get(row.agentId)||row.agentId||it.notSpecified}</dd>
  <dt>${it.role}</dt><dd>${row.role||it.notSpecified}</dd>
  <dt>${it.determination}</dt><dd>${row.determination||it.notSpecifiedFeminine}</dd>
  </dl>${row.criticalNote?html`<p class="critical-note">${row.criticalNote}</p>`:null}</div>`);}
 // Tre forme della citazione (config PANEL.variant), stesso contenuto:
 // 'scheda'   estratto, fonte, apparato;
 // 'margine'  il folio della pagina a margine dell'estratto, l'apparato in una riga;
 // 'edizione' testatina capitolo · pagina, toponimo evidenziato nell'estratto, apparato come in un'edizione.
 function highlight(text,toponym){
  const fold=t=>t.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(),plain=fold(text);
  const words=[toponym,...toponym.split(/\s+/).filter(w=>w.length>3).reverse()];
  for(const w of words){const i=plain.indexOf(fold(w));if(i>=0)return[text.slice(0,i),html`<mark>${text.slice(i,i+w.length)}</mark>`,text.slice(i+w.length)];}
  return[text];
 }
 function quotation(passage,rows,toponym,source){
  const variant=s4Config.PANEL.variant,row=rows[0];
  if(variant==='margine')return[html`<div class="ref-margin"><p class="ref-folio" aria-label=${it.folioLabel(passage.page??row.page,row.chapter)}>${passage.page??row.page}<small>${it.chapterShort(row.chapter)}</small></p><blockquote>${passage.excerpt}</blockquote></div>`,source,html`<div class="ref-apparatus-row">${apparatus(rows)}</div>`];
  if(variant==='edizione')return[html`<p class="ref-running-head">${it.runningHead(row.chapter,passage.page??row.page)}</p>`,html`<blockquote class="ref-edition">${highlight(passage.excerpt,toponym)}</blockquote>`,source,html`<section class="ref-apparatus" aria-label=${it.apparatusLabel}><h3>${it.apparatusLabel}</h3>${apparatus(rows)}</section>`];
  return[html`<blockquote>${passage.excerpt}</blockquote>`,source,...apparatus(rows)];
 }
 // Senza estratti (modalità pubblica): nessuna richiesta; restano il rinvio all'edizione e l'apparato.
 function withheld(rows){
  const row=rows[0],where=it.chapterPage(row.chapter,row.page);
  return[html`<p class="text-withheld">${it.passageWithheld}</p>`,html`<p class="text-source">${it.author}, <cite>${it.work}</cite> · ${it.referenceWitness}${where?` · ${where}`:''}</p>`,...apparatus(rows)];
 }
 async function show(tile,referenceId=null,{focusReturn=null}={}){
  const current=++revision;request++;
  const feature=entities.allData[tile];if(!feature)return;
  if(element.hidden)returnFocus=focusReturn||document.activeElement;
  if(focusReturn)returnFocus=focusReturn;
  selection={place:feature.properties.GazetteerEntity_ID,reference:referenceId};element.hidden=false;title.textContent=feature.properties.Toponym;body.scrollTop=0;
  // Luogo narrativo: statuto e ancore dichiarate nei dati. Con più ancore la tessera sta accanto a una e lascia uno
  // spazio con l'eco del glifo accanto alle altre; la relazione spaziale («fra», «presso»…) compare solo se è asserita.
  anchorsLine.replaceChildren();anchorsLine.hidden=true;
  const anchors=(feature.properties.refers_to_entity_ID||[]).map(id=>entities.allDataById.get(id)).filter(t=>t!=null);
  if(feature.properties.reality_status&&feature.properties.reality_status!=='imported'&&anchors.length){
   const links=anchors.map(t=>{const b=html`<button type="button" class="text-anchor">${entities.allData[t].properties.Toponym}</button>`;b.onclick=async()=>{await show(t,null,{focusReturn});onSelect();};return b;});
   anchorsLine.append(it.statusName[feature.properties.reality_status]||feature.properties.reality_status,' · ',it.anchoredTo(anchors.length),' ',...links.flatMap((b,i)=>i?[i===links.length-1?it.and:', ',b]:[b]));
   if(anchors.length>1)anchorsLine.append(html`<small>${it.ghostNote(anchors.length-1)}</small>`);
   anchorsLine.hidden=false;
  }
  const grouped=new Map();for(const row of byTile.get(tile)||[]){if(!grouped.has(row.referenceId))grouped.set(row.referenceId,[]);grouped.get(row.referenceId).push(row);}
  count.textContent=it.references(grouped.size);body.replaceChildren();
  if(!grouped.size){body.append(html`<p>${it.noReferences}</p>`);close.focus({preventScroll:true});return;}
  const groups=new Map();for(const [id,rows] of grouped){const c=rows[0].chapter;if(!groups.has(c))groups.set(c,[]);groups.get(c).push({id,rows});}
  const slots=new Map();let activeContent=null;
  async function read(id,explicit=true){
   if(current!==revision||!slots.has(id))return;
   const token=++request,{article,content,rows,section}=slots.get(id);
   if(activeContent)activeContent.replaceChildren();activeContent=content;
   if(section)section.open=true;
   for(const [key,s] of slots)s.article.classList.toggle('selected',explicit&&key===id);
   if(explicit){selection.reference=id;onSelect();}
   const reveal=()=>{if(explicit){body.scrollTop+=article.getBoundingClientRect().top-body.getBoundingClientRect().top;article.focus({preventScroll:true});}};
   if(!passagesAvailable){content.replaceChildren(...withheld(rows));reveal();return;}
   content.replaceChildren(html`<p role="status">${it.loadingPassage}</p>`);pendingLoads++;
   try{
    const path=await passagePath(id);if(token!==request||current!==revision)return;
    const passage=await loadJSON(path);
    if(token!==request||current!==revision)return;
    const available=passage.referenceId===id&&passage.excerpt&&passage.sourceReference;
    const source=available&&html`<p class="text-source">${it.author}, <cite>${it.work}</cite> · ${passage.witnessLabel?`${passage.witnessLabel} · `:''}${passage.sourceReference}</p>`;
    content.replaceChildren(...(available?quotation(passage,rows,feature.properties.Toponym,source):[html`<p>${it.missingPassage(id)}</p>`,...apparatus(rows)]));
    reveal();
   }catch(error){if(token!==request||current!==revision)return;const retry=html`<button type="button">${it.retry}</button>`;retry.onclick=()=>read(id,explicit);content.replaceChildren(html`<p role="alert">${it.passageError}</p>`,retry);if(import.meta.env.DEV)console.error(error);
   }finally{pendingLoads--;}
  }
  const ordered=[...groups].sort(([a],[b])=>a-b);
  for(const [chapter,refs] of ordered){
   refs.sort((a,b)=>(a.rows[0].page??Infinity)-(b.rows[0].page??Infinity)||a.id.localeCompare(b.id));
   const chapterBody=html`<div></div>`;const section=grouped.size===1?null:html`<details class="text-chapter"><summary>${it.chapterReferences(chapter,refs.length)}</summary>${chapterBody}</details>`;
   for(const {id,rows} of refs){const content=html`<div></div>`,button=html`<button type="button" class="text-reference-open">${it.readReference(rows[0].page)}</button>`,article=html`<article class="text-reference" data-reference-id=${id} tabindex="-1">${button}${content}</article>`;button.onclick=()=>read(id);slots.set(id,{article,content,rows,section});chapterBody.append(article);}
   body.append(section||chapterBody);if(section)section.open=referenceId?refs.some(r=>r.id===referenceId):chapter===ordered[0][0];
  }
  await read(referenceId&&slots.has(referenceId)?referenceId:ordered[0][1][0].id,referenceId!=null);
 }
 return{element,show,close:hide,getSelection:()=>({...selection}),get busy(){return pendingLoads>0||(!element.hidden&&!!body.querySelector('[role="status"]'));},dispose(){revision++;request++;document.removeEventListener('keydown',keydown);close.onclick=null;body.replaceChildren();}};
}
