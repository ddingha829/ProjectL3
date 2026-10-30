/** Reconcile the entire modal stack: parent and child portals can mount together. */
const owners=new Map<HTMLElement,number>();
const originalInert=new Map<HTMLElement,boolean>();
let originalOverflow='',originalRootOverflow='';
const activeOwners=()=>[...owners.keys()].filter(element=>element.isConnected).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
export function getDialogSurface(){const top=activeOwners().at(-1);return top?.querySelector<HTMLElement>('[aria-modal="true"]')||top||null;}
const signal=()=>window.dispatchEvent(new Event('l2:dialog-stack-change'));
function reconcile(){
 const active=activeOwners();
 const top=active.at(-1);
 for(const element of Array.from(document.body.children)){
  if(!(element instanceof HTMLElement)||['SCRIPT','STYLE','LINK'].includes(element.tagName))continue;
  if(!originalInert.has(element))originalInert.set(element,element.inert);
  element.inert=element===top?originalInert.get(element)!:true;
 }
 signal();
}
export function isolateDialog(overlay:HTMLElement){
 if(!owners.size){originalOverflow=document.body.style.overflow;originalRootOverflow=document.documentElement.style.overflow;}
 owners.set(overlay,(owners.get(overlay)||0)+1);document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';reconcile();
 let released=false;
 return()=>{
  if(released)return;released=true;const remaining=(owners.get(overlay)||1)-1;if(remaining)owners.set(overlay,remaining);else owners.delete(overlay);
  if(owners.size){reconcile();return;}
  for(const [element,inert] of originalInert)element.inert=inert;originalInert.clear();
  document.body.style.overflow=originalOverflow;document.documentElement.style.overflow=originalRootOverflow;signal();
 };
}
