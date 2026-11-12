// «Fototeca» grid (user, 2026-11-12): opens on the card in hand, mounts only the
// visible rows of a big library, selects by dragging, decides in batch (one undo
// restores the batch), toggles the pile filters and returns to the cards.
// Edge + synthetic bridge; not iPhone timing.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const results=[];
try{
 await context.addInitScript(installAppleFixture,{});
 await context.addInitScript(()=>{window.appleFixture.assets=Array.from({length:3000},(_,i)=>({id:`fixture-${i}`,kind:i%17===0?'video':'photo',date:1700000000000-i*3600000,width:1000,height:1500,duration:i%17===0?13:0,hasLocation:false,demo:true,bytes:1000000+i}));});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('.photo-card.front').waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
 const front=(await page.locator('.photo-card.front').getAttribute('data-testid')).replace('card-','');
 await page.getByTestId('open-grid').click();
 await page.locator('.grid-tile.is-current').waitFor();
 const visible=async()=>page.evaluate(()=>{const r=document.querySelector('.grid-scroller').getBoundingClientRect();return [...document.querySelectorAll('.grid-tile')].filter(t=>{const b=t.getBoundingClientRect();return b.top>=r.top+2&&b.bottom<=r.bottom-2;}).map(t=>Number(t.dataset.i)).sort((a,b)=>a-b);});
 const current=await page.evaluate(()=>{const r=document.querySelector('.grid-scroller').getBoundingClientRect(),b=document.querySelector('.grid-tile.is-current').getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom;});
 assert.ok(current,'the card in hand is on screen when the grid opens');
 const mounted=await page.locator('.grid-tile').count();
 assert.ok(mounted<150,`only visible rows mount (${mounted} of 3000)`);
 results.push(`opens on the card in hand; ${mounted}/3000 tiles mounted`);
 // Drag across a row and a half in «Seleccionar».
 await page.getByRole('button',{name:'Seleccionar',exact:true}).click();
 const vis=await visible();const a=await page.locator(`[data-i="${vis[0]}"]`).boundingBox(),z=await page.locator(`[data-i="${vis[4]}"]`).boundingBox();
 await page.mouse.move(a.x+8,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+40,a.y+a.height/2,{steps:3});await page.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),5,'dragging selects the whole range');
 assert.match(await page.locator('.grid-count').innerText(),/^5 seleccionadas$/);
 // Tap toggles one off.
 await page.locator(`[data-i="${vis[4]}"]`).click();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),4);
 results.push('drag selects a range; tap toggles');
 await page.locator('.grid-actions').getByRole('button',{name:/^Eliminar/}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.grid-tile.is-pending').length===4);
 assert.equal(await page.getByRole('button',{name:'Cancelar',exact:true}).count(),0,'deciding leaves «Seleccionar»');
 await page.locator('.grid-actions').getByRole('button',{name:'Deshacer la última decisión'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.grid-tile.is-pending').length===0);
 results.push('batch delete queues all four; one undo restores the batch');
 // Filters on: only videos.
 await page.getByRole('button',{name:'Volver a las cartas'}).click();
 await page.getByRole('button',{name:'Filtros',exact:true}).first().click();
 await page.locator('.native-sheet').getByText('Vídeos',{exact:true}).first().click();
 await page.getByRole('button',{name:/^Aplicar filtros/}).click();
 await page.locator('.photo-card.front').waitFor();
 await page.getByTestId('open-grid').click();await page.locator('.grid-tile').first().waitFor();
 assert.equal(await page.getByRole('switch',{name:'Filtros'}).getAttribute('aria-checked'),'true','filters start on when the pile is filtered');
 const videos=Number((await page.locator('.grid-title small').innerText()).replace(/\D/g,''));
 await page.getByRole('switch',{name:'Filtros'}).click();
 const all=Number((await page.locator('.grid-title small').innerText()).replace(/\D/g,''));
 assert.ok(videos>0&&videos<all&&all===3000,`filters on ${videos}, off ${all}`);
 results.push(`filters on/off: ${videos} → ${all}`);
 await page.getByRole('button',{name:'Volver a las cartas'}).click();
 assert.equal(await page.locator('.library-grid').count(),0);await page.locator('.photo-card.front').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS',results.join('; '));
}catch(e){console.log('FAIL grid flow',e.message);process.exitCode=1;}finally{await browser.close();}
