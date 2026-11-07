// Browser DOM/layout checks with synthetic media. No VoiceOver or Apple device.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';import {installAppleFixture} from './apple-fixture.mjs';
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/rc-accessibility');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});const results=[];
for(const lang of ['es','en'])for(const [width,height]of [[375,667],[390,844],[440,956]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 const name=`${lang} ${width}x${height} keyboard actions, reduced motion and enlarged root text`;
 try{
  await context.addInitScript(installAppleFixture,{language:lang});const page=await context.newPage();page.setDefaultTimeout(8000);
  await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');await page.locator('.photo-card').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  const labels=lang==='es'?['Conservar','Añadir a Favoritas','Eliminar','Dejar para más tarde']:['Keep','Add to Favorites','Delete','Leave for later'];
  const geometry=[];
  for(const fontSize of ['100%','200%']){
   await page.evaluate(fontSize=>document.documentElement.style.fontSize=fontSize,fontSize);await page.waitForTimeout(100);
   for(const label of labels){const button=page.getByRole('button',{name:label,exact:true});assert.equal(await button.count(),1,label);const rect=await button.boundingBox();
    assert.ok(rect&&rect.width>=44&&rect.height>=44,`${label}: touch target ${JSON.stringify(rect)}`);
    assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,`${label}: outside viewport`);
    await button.focus();assert.equal(await button.evaluate(el=>el===document.activeElement),true);
    geometry.push({fontSize,label,rect});
   }
  }
  await page.getByRole('button',{name:labels[0],exact:true}).focus();await page.keyboard.press('Enter');
  const undo=page.getByRole('button',{name:lang==='es'?'Deshacer la última decisión':'Undo the last decision',exact:true});await undo.waitFor();await undo.focus();await page.keyboard.press('Enter');
  await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')).record.history.length),0);
  await page.getByRole('button',{name:labels[2],exact:true}).focus();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:lang==='es'?/^Terminar/:/^Finish/}).click();
  await page.getByRole('heading',{name:lang==='es'?'Una última mirada':'One last look',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='deleteAssets')),false,'discard must not call destructive native method');
  const destructive=page.getByRole('button',{name:lang==='es'?/^Eliminar 1/:/^Delete 1/});
  await destructive.scrollIntoViewIfNeeded();await destructive.focus();await page.waitForTimeout(150);
  const rect=await destructive.boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44&&rect.y>=0&&rect.y+rect.height<=height+1,'review deletion control is unreachable');
  await page.screenshot({path:path.join(out,`${lang}-${width}-review.png`)});
  await page.locator('.review-primary').getByRole('button',{name:lang==='es'?'Recuperar':'Recover',exact:true}).click();
  await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')).record.pending.length),0);
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='deleteAssets')),false);
  results.push({name,status:'PASS',geometry});
 }catch(e){results.push({name,status:'FAIL',error:e.message});}finally{await context.close();}
 console.log(results.at(-1).status,name,results.at(-1).error??'');
}
await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),boundary:'Edge DOM/layout with synthetic Capacitor bridge. Root font enlargement is not native Dynamic Type. VoiceOver, native focus order, contrast and real safe areas are not certified.',results},null,2)+'\n');
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
