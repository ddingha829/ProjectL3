const controls='button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
export function popoverItems(root:ParentNode|null){
 return Array.from(root?.querySelectorAll<HTMLElement>(controls)||[]).filter(element=>element.getClientRects().length>0&&!element.closest('[inert],[aria-hidden="true"]'));
}
/** Resolve Tab's destination before exit animation makes the panel inert. */
export function leavePopover(panel:HTMLElement|null,trigger:HTMLElement|null,backward:boolean){
 if(backward){trigger?.focus({preventScroll:true});return;}
 const outside=popoverItems(document).filter(element=>!panel?.contains(element)),index=trigger?outside.indexOf(trigger):-1;
 (outside[index+1]||trigger)?.focus({preventScroll:true});
}
