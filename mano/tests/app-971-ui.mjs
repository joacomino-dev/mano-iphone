import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.COCOWASH_QA_URL??'http://127.0.0.1:4311';
try {
 const page=await browser.newPage({viewport:{width:1100,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('cocowash-onboarding-v2','done'));
 await page.goto(base);await page.locator('.hand-space article').first().waitFor();await page.waitForTimeout(1700);
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-demo-session-v1')));
 const first=(await read()).context.handIds;
 const logo=page.locator('.header-brand');assert.equal(await logo.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 const b=await logo.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
 assert.deepEqual((await read()).context.handIds,first);
 const finish=page.locator('#review-trigger'),f=await finish.boundingBox();
 await page.mouse.click(f.x+f.width/2,f.y+f.height/2);assert.equal(await page.locator('.empty-finish-message').count(),0);
 assert.equal(await page.locator('.session-done').count(),0);assert.equal(await page.locator('[role=dialog]').count(),0);
 await page.locator('#filter-trigger').click();assert.equal(await page.getByText('Personas',{exact:true}).count(),0);await page.keyboard.press('Escape');
 let lastAt=0;
 for(let i=0;i<35;i++){lastAt=await page.evaluate(()=>Date.now());await page.getByRole('button',{name:'Dejar para más tarde',exact:true}).click();}
 await page.waitForFunction(at=>{const s=JSON.parse(localStorage.getItem('cocowash-demo-session-v1'));return s?.record.history.length===30&&s.record.history.at(-1).at>=at;},lastAt);
 const saved=await read();assert.equal(saved.record.history.length,30);const hand=saved.context.handIds;
 await page.reload();await page.locator('.hand-space article').first().waitFor();await page.waitForTimeout(1700);
 const restored=await read();assert.equal(restored.record.history.length,30);assert.deepEqual(restored.context.handIds,hand);
 const expected=restored.record.history.at(-1).context.handIds;
 await page.getByRole('button',{name:'Deshacer la última decisión'}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cocowash-demo-session-v1')).record.history.length===29);
 assert.deepEqual((await read()).context.handIds,expected);assert.deepEqual(errors,[]);
 const result={webDemoOnly:true,logoInert:true,emptyFinishKeepsSession:true,peopleHiddenOnWeb:true,undoThirtySaved:true,reloadHandExact:true,undoHandExact:true,errors};
 console.log(JSON.stringify(result));
 if(process.env.COCOWASH_QA_REPORT)fs.writeFileSync(process.env.COCOWASH_QA_REPORT,JSON.stringify(result,null,2));
 if(process.env.COCOWASH_QA_SCREENSHOT)await page.screenshot({path:process.env.COCOWASH_QA_SCREENSHOT});
} finally {await browser.close();}
