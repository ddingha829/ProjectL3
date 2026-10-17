import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

// No pre-existing cookies, motion preference, service worker or injected app state.
const browsers=[['Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'],['Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']];
for(const [name,executablePath] of browsers){
 if(!fs.existsSync(executablePath))continue;
 const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.setViewport({width:390,height:844});
  const naturalReduced=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.goto('http://localhost:3013',{waitUntil:'networkidle2'});await page.waitForSelector('input[name=title]:not(:disabled)');
  const sample=()=>page.evaluate(()=>({mode:document.documentElement.dataset.motion,stored:localStorage.getItem('l2_test_motion'),gradient:getComputedStyle(document.querySelector('.quick-input-surface'),'::before').transform,letter:getComputedStyle(document.querySelector('.memo-prompt>span')).transform}));
  const before=await sample();assert.equal(before.mode,'on');assert.equal(before.stored,null);
  const rect=await page.$eval('.quick-input-surface',e=>{const r=e.getBoundingClientRect();return{x:r.x+20,y:r.y+r.height*.6,width:r.width-40,height:60};});
  const first=Buffer.from(await page.screenshot({clip:rect}));await new Promise(resolve=>setTimeout(resolve,1000));const second=Buffer.from(await page.screenshot({clip:rect}));const after=await sample();
  assert.notEqual(before.gradient,after.gradient);assert.notEqual(before.letter,after.letter);assert(!first.equals(second),'gradient paint must visibly change, not only computed style');
  console.log(`PASS ${name}: natural reduced=${naturalReduced}; fresh default On; forced reduced signal still animates; gradient pixels and letter position change`);
 }finally{await browser.close();}
}
