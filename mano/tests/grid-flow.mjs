// «Fototeca» grid (user, 2026-11-12, third pass): opens centred on the card in hand,
// mounts only visible rows, tap selects, sideways drag selects a range, holding opens
// one photo large, «Anclar» shows the selection large with ‹ › rotation, the shrunk
// decision bar decides the selection (one undo restores it), the split Filtros button
// toggles and edits, pinch changes density keeping the working photo in view.
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
 await page.getByTestId('open-grid').click();
 await page.locator('.grid-tile.is-current').waitFor();
 const visible=async()=>page.evaluate(()=>{const r=document.querySelector('.grid-scroller').getBoundingClientRect(),d=document.querySelector('.grid-dock').getBoundingClientRect();return [...document.querySelectorAll('.grid-tile')].filter(t=>{const b=t.getBoundingClientRect();return b.top>=r.top+2&&b.bottom<=d.top-2;}).map(t=>Number(t.dataset.i)).sort((a,b)=>a-b);});
 const centred=async()=>page.evaluate(()=>{const r=document.querySelector('.grid-scroller').getBoundingClientRect(),d=document.querySelector('.grid-dock').getBoundingClientRect(),c=document.querySelector('.grid-tile.is-current');if(!c)return false;const b=c.getBoundingClientRect();return b.top>=r.top&&b.bottom<=d.top;});
 assert.ok(await centred(),'the card in hand is on screen, above the dock, when the grid opens');
 const mounted=await page.locator('.grid-tile').count();
 assert.ok(mounted<150,`only visible rows mount (${mounted} of 3000)`);
 assert.equal(await page.getByRole('button',{name:/^Ver más/}).count(),0,'no density button: pinch only');
 assert.equal(await page.locator('.grid-header').getByRole('button',{name:/^Terminar/}).count(),1,'«Terminar» stays top right');
 results.push(`opens on the card in hand; ${mounted}/3000 tiles; no density button; Terminar on top`);
 // Pinch keeps the working photo in view however often it changes density.
 const pinch=async(from,to)=>page.evaluate(([from,to])=>{const el=document.querySelector('.grid-scroller'),r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/3;
  const fire=(type,id,dx)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,isPrimary:id===1,clientX:cx+dx,clientY:cy,bubbles:true,pointerType:'touch'}));
  fire('pointerdown',1,-from);fire('pointerdown',2,from);for(let k=1;k<=6;k++){const d=from+(to-from)*k/6;fire('pointermove',1,-d);fire('pointermove',2,d);}fire('pointerup',1,-to);fire('pointerup',2,to);},[from,to]);
 const cols=async()=>page.evaluate(()=>{const t=[...document.querySelectorAll('.grid-tile')];const y=t[0]?.style.transform.split(',')[1];return t.filter(x=>x.style.transform.split(',')[1]===y).length;});
 for(let k=0;k<4;k++){await pinch(k%2?40:120,k%2?120:40);await page.waitForTimeout(150);assert.equal(await cols(),k%2?3:5);assert.ok(await centred(),`pinch ${k+1} keeps the working photo in view`);}
 results.push('pinch 3 ↔ 5 four times, working photo always in view');
 // Tap selects; a sideways drag selects a range.
 let vis=await visible();
 await page.locator(`[data-i="${vis[0]}"]`).click();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),1,'a tap selects');
 await page.locator(`[data-i="${vis[0]}"]`).click();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),0,'a second tap deselects');
 const a=await page.locator(`[data-i="${vis[0]}"]`).boundingBox(),z=await page.locator(`[data-i="${vis[4]}"]`).boundingBox();
 await page.mouse.move(a.x+8,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+40,a.y+a.height/2,{steps:3});await page.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),5,'dragging sideways selects the range');
 assert.match(await page.locator('.grid-selection').innerText(),/5 seleccionadas/);
 results.push('tap selects/deselects; sideways drag selects a range');
 // Anclar: the selection large, rotated with ‹ ›.
 await page.locator('.grid-selection').getByRole('button',{name:'Anclar'}).click();
 await page.locator('.inspection.is-pinned').waitFor();
 assert.match(await page.locator('.inspect-set').innerText(),/1 de 5/);
 await page.locator('.inspect-set').getByRole('button',{name:'Siguiente'}).click();
 assert.match(await page.locator('.inspect-set').innerText(),/2 de 5/);
 await page.locator('.inspect-set').getByRole('button',{name:'Anterior'}).click();await page.locator('.inspect-set').getByRole('button',{name:'Anterior'}).click();
 assert.match(await page.locator('.inspect-set').innerText(),/5 de 5/,'rotation wraps around');
 await page.locator('.inspection').getByRole('button',{name:'Cerrar'}).click();
 await page.waitForFunction(()=>!document.querySelector('.inspection'));
 assert.equal(await page.locator('.grid-tile.is-selected').count(),5,'closing the anchored set keeps the selection');
 results.push('Anclar shows the 5 large with ‹ › rotation; selection kept');
 // Decide with the shrunk bar; one undo restores the batch.
 await page.locator('.grid-dock').getByRole('button',{name:/^Eliminar 5/}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.grid-tile.is-pending').length===5);
 assert.equal(await page.locator('.grid-selection').count(),0,'deciding clears the selection');
 assert.ok(await page.locator('.grid-dock').getByRole('button',{name:/^Eliminar/}).isDisabled(),'no selection: decisions are off');
 await page.locator('.grid-dock').getByRole('button',{name:'Deshacer la última decisión'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.grid-tile.is-pending').length===0);
 results.push('dock bar deletes the five; Deshacer restores them; bar off without selection');
 // Holding a photo opens it large.
 vis=await visible();const hold=await page.locator(`[data-i="${vis[2]}"]`).boundingBox();
 await page.mouse.move(hold.x+hold.width/2,hold.y+hold.height/2);await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();
 await page.locator('.inspection.is-pinned').waitFor();
 assert.equal(await page.locator('.inspect-set').count(),0,'one photo: no rotation control');
 await page.locator('.inspection').getByRole('button',{name:'Cerrar'}).click();await page.waitForFunction(()=>!document.querySelector('.inspection'));
 assert.equal(await page.locator('.grid-tile.is-selected').count(),0,'holding does not select');
 results.push('holding opens one photo large without selecting it');
 // Album from the selection.
 await page.locator(`[data-i="${vis[1]}"]`).click();
 await page.locator('.grid-dock').getByRole('button',{name:'Guardar en un álbum'}).click();
 await page.locator('.native-sheet').getByRole('button',{name:'Fixture'}).click();
 await page.waitForFunction(()=>!document.querySelector('.grid-selection'));
 results.push('album from the selection saves and clears it');
 // Filtros: editing from the grid (shared with the pile), then the funnel toggles.
 const total=async()=>Number((await page.locator('.grid-progress .pile-count').innerText()).split('/').pop().replace(/\D/g,''));
 assert.equal(await total(),3000);
 await page.getByRole('button',{name:'Editar filtros'}).click();
 await page.locator('.native-sheet').getByText('Vídeos',{exact:true}).first().click();
 await page.getByRole('button',{name:/^Aplicar filtros/}).click();
 await page.waitForFunction(()=>!document.querySelector('.native-sheet'));
 const videos=await total();
 assert.ok(videos>0&&videos<3000,`edited filters apply to the grid at once (${videos})`);
 await page.getByRole('switch',{name:'Quitar los filtros de la fototeca'}).click();
 assert.equal(await total(),3000,'the funnel turns the filters off: whole library');
 await page.getByRole('switch',{name:'Aplicar los filtros a la fototeca'}).click();
 assert.equal(await total(),videos,'and back on');
 results.push(`Filtros edits (${videos} videos) and toggles (3000 ↔ ${videos})`);
 await page.getByRole('button',{name:'Volver a las cartas'}).click();
 assert.equal(await page.locator('.library-grid').count(),0);await page.locator('.photo-card.front').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS',results.join('; '));
}catch(e){console.log('FAIL grid flow',e.message);process.exitCode=1;}finally{await browser.close();}
