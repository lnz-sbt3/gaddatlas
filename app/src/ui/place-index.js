import {html} from 'htl';
import it from '../strings-it.js';

// Indice indipendente dal canvas: riutilizzabile nel guscio e accessibile anche fuori inquadratura.
// Criterio dello Stradario: odonimo riconosciuto dalla parola iniziale, più gli odonimi senza prefisso dichiarati.
// Tutto il resto sta nei Luoghi.
const ODONYM = /^(via|viale|vicolo|vico|piazza|piazzale|piazzetta|largo|corso|lungotevere|salita|strada|clivo|circonvallazione|passeggiata|borgo)\b/i;
const ODONYMS_WITHOUT_PREFIX = new Set(["Campo de' Fiori", 'Lungara', 'Ripetta', 'Pozzo delle Cornacchie', 'Quattro Cantoni']);
export const isStreet = name => ODONYM.test(name) || ODONYMS_WITHOUT_PREFIX.has(name);

// Indice indipendente dal canvas: due blocchi (Stradario, Luoghi), una sola ricerca che li filtra entrambi.
export default function createPlaceIndex({entities,relief,aliasGroups=[],onSelect}){
 const rowsByTile=new Map(),aliases=new Map(aliasGroups.flatMap(g=>g.ids.map(id=>[id,g.canonical])));
 for(const row of relief){const tile=entities.allDataById.get(row.targetId)??entities.allDataById.get(aliases.get(row.targetId));if(tile==null)continue;if(!rowsByTile.has(tile))rowsByTile.set(tile,new Map());rowsByTile.get(tile).set(row.referenceId,row);}
 const choices=entities.allData.map((d,i)=>({i,name:d.properties.Toponym,id:d.properties.GazetteerEntity_ID,street:isStreet(d.properties.Toponym)})).sort((a,b)=>a.name.localeCompare(b.name,'it')||a.id.localeCompare(b.id));
 const trigger=html`<button type="button" class="keyboard-entry">${it.places}</button>`;
 const search=html`<input type="search" aria-label=${it.searchPlaces}>`,reference=html`<select size="5" aria-label=${it.reference}></select>`,status=html`<p role="status"></p>`;
 const streets=html`<select size="7" aria-labelledby="place-index-streets"></select>`,places=html`<select size="7" aria-labelledby="place-index-places"></select>`;
 const streetsHead=html`<h3 id="place-index-streets"></h3>`,placesHead=html`<h3 id="place-index-places"></h3>`;
 const submit=html`<button type="submit">${it.openText}</button>`,close=html`<button type="button">${it.close}</button>`;
 const form=html`<form><h2 id="place-index-title">${it.places}</h2><label>${it.searchPlaces}${search}</label>
  <div class="place-index-blocks"><section>${streetsHead}${streets}</section><section>${placesHead}${places}</section></div>
  <label>${it.reference}${reference}</label>${status}<div>${submit}${close}</div></form>`;
 const dialog=html`<dialog class="place-index" aria-labelledby="place-index-title">${form}</dialog>`;
 // La scelta è nell'uno o nell'altro blocco: selezionare in uno svuota l'altro.
 let current=null;
 const pick=(list,other)=>{if(list.value==='')return;current=Number(list.value);other.selectedIndex=-1;references();};
 function references(){const rows=current==null?[]:[...(rowsByTile.get(current)?.values()||[])].sort((a,b)=>a.chapter-b.chapter||a.page-b.page||a.referenceId.localeCompare(b.referenceId));reference.replaceChildren(html`<option value="">${it.allReferences}</option>`,...rows.map(r=>html`<option value=${r.referenceId}>${it.readReference(r.page)}</option>`));reference.selectedIndex=0;reference.disabled=!rows.length;submit.disabled=current==null;}
 function filter(){
  const fold=t=>t.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('it'),query=fold(search.value.trim());
  const list=choices.filter(c=>fold(c.name).includes(query)),a=list.filter(c=>c.street),b=list.filter(c=>!c.street);
  streets.replaceChildren(...a.map(c=>html`<option value=${c.i}>${c.name}</option>`));places.replaceChildren(...b.map(c=>html`<option value=${c.i}>${c.name}</option>`));
  streetsHead.textContent=it.indexStreets(a.length);placesHead.textContent=it.indexPlaces(b.length);
  streets.disabled=!a.length;places.disabled=!b.length;
  current=null;if(a.length){streets.selectedIndex=0;current=a[0].i;}else if(b.length){places.selectedIndex=0;current=b[0].i;}
  status.textContent=list.length?it.indexCount(a.length,b.length):it.noPlaces;references();
 }
 streets.onchange=()=>pick(streets,places);places.onchange=()=>pick(places,streets);
 streets.onfocus=()=>pick(streets,places);places.onfocus=()=>pick(places,streets);
 for(const select of[streets,places,reference])select.addEventListener('keydown',event=>{if(event.key!=='Home'&&event.key!=='End')return;event.preventDefault();select.selectedIndex=event.key==='Home'?0:select.options.length-1;select.dispatchEvent(new Event('change',{bubbles:true}));});
 trigger.onclick=()=>{filter();dialog.showModal();search.focus();};search.oninput=filter;
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();}});
 close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>trigger.focus());
 form.onsubmit=async event=>{event.preventDefault();if(submit.disabled||current==null)return;const tile=current,id=reference.value||null;dialog.close();await onSelect(tile,id,{focusReturn:trigger});};
 return{trigger,dialog,dispose(){dialog.remove();trigger.remove();}};
}

// Rosa di scelta al tocco: quando il bersaglio di 44 px CSS copre almeno due tessere, il lettore sceglie il nome.
// Non sostituisce il picking: elenca le tessere che il picking esistente trova nell'area del dito.
export function createPlaceRose({container,onChoose}){
 const title=html`<h2 id="place-rose-title">${it.roseTitle}</h2>`,hint=html`<p></p>`,list=html`<ul></ul>`;
 const close=html`<button type="button" class="place-rose-close">${it.roseClose}</button>`;
 const element=html`<section class="place-rose" role="dialog" aria-modal="false" aria-labelledby="place-rose-title" hidden>${title}${hint}${list}${close}</section>`;
 let returnFocus=null;
 function hide(restore=true){if(element.hidden)return;element.hidden=true;list.replaceChildren();if(restore)returnFocus?.focus();returnFocus=null;}
 function open(candidates,clientX,clientY,focusReturn){
  hint.textContent=it.roseHint(candidates.length);returnFocus=focusReturn;
  list.replaceChildren(...candidates.map(c=>{const button=html`<button type="button">${c.name}</button>`;button.onclick=()=>{hide(false);onChoose(c.tile);};return html`<li>${button}</li>`;}));
  element.hidden=false;
  const box=container.getBoundingClientRect(),w=element.offsetWidth,h=element.offsetHeight,pad=8;
  const left=Math.max(pad,Math.min(clientX-box.left+pad,container.clientWidth-w-pad)),top=Math.max(pad,Math.min(clientY-box.top+pad,container.clientHeight-h-pad));
  element.style.left=`${left+container.scrollLeft}px`;element.style.top=`${top+container.scrollTop}px`;
  list.querySelector('button')?.focus();
 }
 close.onclick=()=>hide();
 element.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}});
 container.append(element);
 return{element,open,close:hide,dispose(){element.remove();}};
}
