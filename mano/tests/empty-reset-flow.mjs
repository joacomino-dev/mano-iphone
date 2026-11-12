// An empty filtered pile offers «Resetear filtros» under «Cambiar filtros» and
// deals a fresh hand at once (user, 2026-11-12). Stamp words follow Ajustes.
// Edge + synthetic bridge.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});
const results=[];
async function open(extra){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(installAppleFixture,{});
 if(extra)await context.addInitScript(extra);
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(url);
 await page.locator('.photo-card.front').waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
 return [context,page];
}
try{
 // 1. Only photos in the library, filter to videos: nothing left, reset brings the pile back.
 let [context,page]=await open();
 await page.getByRole('button',{name:'Filtros',exact:true}).first().click();
 await page.locator('.native-sheet').getByText('Vídeos',{exact:true}).first().click();
 await page.getByRole('button',{name:/^Aplicar filtros/}).click();
 await page.locator('.empty-state').waitFor();
 assert.match(await page.locator('.empty-state p').innerText(),/Prueba con otros filtros o resetéalos\./);
 const order=await page.locator('.empty-state button').allInnerTexts();
 assert.deepEqual(order.slice(0,2).map(s=>s.trim()),['Cambiar filtros','Resetear filtros'],'reset sits right under «Cambiar filtros»');
 await page.getByTestId('reset-filters').click();
 await page.locator('.photo-card.front').waitFor();
 assert.equal(await page.locator('.empty-state').count(),0,'the pile is dealt again without opening the sheet');
 results.push('reset filters deals a fresh hand');
 // 2. Without filters there is nothing to reset: no button.
 assert.equal(await page.getByTestId('reset-filters').count(),0);
 await context.close();
 // 3. Stamp words: shown for a newcomer, hidden when Ajustes turns them off.
 [context,page]=await open();
 await page.getByRole('button',{name:'Conservar',exact:true}).click();
 await page.locator('.decision-stamp').waitFor();
 assert.equal(await page.locator('.decision-stamp .stamp-lettering').count(),1,'a newcomer sees the word');
 await context.close();
 [context,page]=await open(()=>{const raw=JSON.parse(localStorage.getItem('cocowash-display-v1')||'{}');localStorage.setItem('cocowash-display-v1',JSON.stringify({...raw,stampWords:false}));});
 await page.getByRole('button',{name:'Conservar',exact:true}).click();
 await page.locator('.decision-stamp').waitFor();
 assert.equal(await page.locator('.decision-stamp .stamp-lettering').count(),0,'words off in Ajustes: the stamp alone');
 assert.equal(await page.locator('.decision-stamp img').count(),1);
 results.push('stamp words follow the setting');
 await context.close();
 console.log('PASS',results.join('; '));
}catch(e){console.log('FAIL empty/reset flow',e.message);process.exitCode=1;}finally{await browser.close();}
