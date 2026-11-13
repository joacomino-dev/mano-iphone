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
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',hasTouch:true});
const results=[];
try{
 await context.addInitScript(installAppleFixture,{});
 await context.addInitScript(()=>{window.appleFixture.assets=Array.from({length:3000},(_,i)=>({id:`fixture-${i}`,kind:i%17===0?'video':'photo',date:1700000000000-i*3600000,width:1000,height:1500,duration:i%17===0?13:0,hasLocation:false,demo:true,bytes:1000000+i}));});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('.photo-card.front').waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
 // Pinch in on the card (zooming out, as in Photos) opens the grid; the header and the progress row never change.
 const progressBefore=await page.locator('.archive-progress .pile-count').innerText();
 // A real two-finger touch pinch (CDP), as on the phone.
 const card=await page.locator('.photo-card.front').boundingBox(),cx=card.x+card.width/2,cy=card.y+card.height/2;
 const cdp=await context.newCDPSession(page);const touch=(type,d)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:cx-d,y:cy,id:1},{x:cx+d,y:cy,id:2}]});
 await touch('touchStart',110);for(let k=1;k<=8;k++)await touch('touchMove',110-70*k/8);await touch('touchEnd',40);
 await page.locator('.library-grid').waitFor();
 await page.locator('.grid-tile.is-current').waitFor();
 const visible=async()=>page.evaluate(()=>{const r=document.querySelector('.grid-scroller').getBoundingClientRect(),d=document.querySelector('.grid-dock').getBoundingClientRect();return [...document.querySelectorAll('.grid-tile')].filter(t=>{const b=t.getBoundingClientRect();return b.top>=r.top+2&&b.bottom<=d.top-2;}).map(t=>Number(t.dataset.i)).sort((a,b)=>a-b);});
 const centred=async()=>page.evaluate(()=>{const r=document.querySelector('.grid-scroller').getBoundingClientRect(),d=document.querySelector('.grid-dock').getBoundingClientRect(),c=document.querySelector('.grid-tile.is-current');if(!c)return false;const b=c.getBoundingClientRect();return b.top>=r.top&&b.bottom<=d.top;});
 assert.ok(await centred(),'the card in hand is on screen, above the dock, when the grid opens');
 const mounted=await page.locator('.grid-tile').count();
 assert.ok(mounted<150,`only visible rows mount (${mounted} of 3000)`);
 assert.equal(await page.getByRole('button',{name:/^Ver más/}).count(),0,'no density button: pinch only');
 assert.equal(await page.locator('.archive-header').getByRole('button',{name:/^Terminar/}).count(),1,'«Terminar» stays top right');
 assert.equal(await page.locator('.archive-progress .pile-count').innerText(),progressBefore,'the progress row does not change when entering the grid');
 assert.equal(await page.locator('.library-grid .grid-title, .library-grid header').count(),0,'no second header: the name stays CocoWash');
 results.push(`pinch in opens it on the card in hand; ${mounted}/3000 tiles; header and progress unchanged; no density button`);
 // Pinch keeps the working photo in view however often it changes density.
 const pinch=async(from,to)=>page.evaluate(([from,to])=>{const el=document.querySelector('.grid-scroller'),r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/3;
  const fire=(type,id,dx)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,isPrimary:id===1,clientX:cx+dx,clientY:cy,bubbles:true,pointerType:'touch'}));
  fire('pointerdown',1,-from);fire('pointerdown',2,from);for(let k=1;k<=6;k++){const d=from+(to-from)*k/6;fire('pointermove',1,-d);fire('pointermove',2,d);}fire('pointerup',1,-to);fire('pointerup',2,to);},[from,to]);
 const cols=async()=>page.evaluate(()=>{const t=[...document.querySelectorAll('.grid-tile')];const y=t[0]?.style.transform.split(',')[1];return t.filter(x=>x.style.transform.split(',')[1]===y).length;});
 for(let k=0;k<4;k++){await pinch(k%2?40:120,k%2?120:40);await page.waitForTimeout(150);assert.equal(await cols(),k%2?3:5);assert.ok(await centred(),`pinch ${k+1} keeps the working photo in view`);}
 results.push('pinch 3 ↔ 5 four times, working photo always in view');
 // A finger lifted over the dock never reaches the grid; the next pinch must still work.
 await page.evaluate(()=>{const el=document.querySelector('.grid-scroller'),dock=document.querySelector('.grid-dock'),r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/3;
  const fire=(t,type,id,dx)=>t.dispatchEvent(new PointerEvent(type,{pointerId:id,isPrimary:id===11,clientX:cx+dx,clientY:cy,bubbles:true,pointerType:'touch'}));
  fire(el,'pointerdown',11,-120);fire(el,'pointerdown',12,120);fire(el,'pointermove',11,-60);fire(el,'pointermove',12,60);fire(el,'pointerup',11,-60);fire(dock,'pointerup',12,60);});
 const before=await cols();await pinch(before===3?120:40,before===3?40:120);await page.waitForTimeout(150);
 assert.equal(await cols(),before===3?5:3,'a pinch after a finger lifted outside the grid still switches density');
 results.push('pinch keeps working after a finger lifts over the dock');
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
 // A single tap on the photo rotates to the next one.
 const settled=()=>page.waitForFunction(()=>document.querySelectorAll('.inspection-photo').length===1);
 await settled();let box=await page.locator('.inspection-photo').boundingBox();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(500);
 assert.match(await page.locator('.inspect-set').innerText(),/1 de 5/,'a tap rotates (wraps from 5 to 1)');
 // Swiping decides: right keeps, left deletes; the photo leaves the set.
 const swipe=async(dx,dy)=>{await settled();await page.waitForTimeout(250);box=await page.locator('.inspection-photo').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx/2,y+dy/2,{steps:4});await page.mouse.move(x+dx,y+dy,{steps:4});await page.mouse.up();};
 await swipe(180,0);await page.waitForFunction(()=>/1 de 4/.test(document.querySelector('.inspect-set')?.innerText??''));
 await swipe(-180,0);await page.waitForFunction(()=>/1 de 3/.test(document.querySelector('.inspect-set')?.innerText??''));
 await page.locator('.inspection.is-pinned').first().waitFor({timeout:3000});
 await page.locator('.inspection').getByRole('button',{name:'Cerrar'}).click();
 await page.waitForFunction(()=>!document.querySelector('.inspection'));
 assert.equal(await page.locator('.grid-tile.is-selected').count(),3,'the two decided photos leave the selection');
 assert.equal(await page.locator('.grid-tile.is-pending').count(),1,'the swiped-left photo is queued for deletion');
 await page.locator('.grid-dock').getByRole('button',{name:'Deshacer la última decisión'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.grid-tile.is-pending').length===0);
 await page.locator('.grid-dock').getByRole('button',{name:'Deshacer la última decisión'}).click();await page.waitForTimeout(300);
 results.push('Anclar: ‹ › and tap rotate; swipe right keeps, left deletes, photo leaves the set');
 // Back to five selected for the batch below.
 await page.locator('.grid-selection').getByRole('button',{name:'Quitar la selección'}).click();
 await page.mouse.move(a.x+8,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+40,a.y+a.height/2,{steps:3});await page.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),5);
 // Decide with the shrunk bar; one undo restores the batch.
 await page.locator('.grid-dock').getByRole('button',{name:/^Eliminar 5/}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.grid-tile.is-pending').length===5);
 assert.equal(await page.locator('.grid-selection').count(),0,'deciding clears the selection');
 await page.locator('.grid-dock').getByRole('button',{name:/^Eliminar/}).click();
 assert.match(await page.locator('.center-notice').innerText(),/No hay fotos seleccionadas/,'no selection: a press explains, nothing is decided');
 assert.equal(await page.locator('.grid-tile.is-pending').count(),5);
 await page.locator('.grid-dock').getByRole('button',{name:'Deshacer la última decisión'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.grid-tile.is-pending').length===0);
 results.push('dock bar deletes the five; Deshacer restores them; without selection a press says so');
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
 const total=async()=>Number(await page.locator('.library-grid').getAttribute('data-count'));
 assert.equal(await total(),3000);
 await page.locator('.archive-header').getByRole('button',{name:'Filtros',exact:true}).click();
 await page.locator('.native-sheet').getByText('Vídeos',{exact:true}).first().click();
 await page.getByRole('button',{name:/^Aplicar filtros/}).click();
 await page.waitForFunction(()=>!document.querySelector('.native-sheet'));
 const videos=await total();
 assert.ok(videos>0&&videos<3000,`edited filters apply to the grid at once (${videos})`);
 await page.locator('.archive-header').getByRole('switch',{name:'Desactivar filtros'}).click();
 assert.equal(await total(),3000,'the funnel turns the filters off: whole library');
 await page.locator('.archive-header').getByRole('switch',{name:'Activar filtros'}).click();
 assert.equal(await total(),videos,'and back on');
 results.push(`Filtros edits (${videos} videos) and toggles (3000 ↔ ${videos})`);
 // The selection survives going back to the cards and returning; a decision on the cards ends it.
 let keepSel=(await visible())[2];await page.locator(`[data-i="${keepSel}"]`).click();
 await page.getByRole('button',{name:'Volver a las cartas'}).click();await page.waitForFunction(()=>!document.querySelector('.library-grid'));
 await page.getByTestId('open-grid').click();await page.locator('.grid-tile.is-selected').waitFor();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),1,'selection kept across modes');
 await page.getByRole('button',{name:'Volver a las cartas'}).click();await page.waitForFunction(()=>!document.querySelector('.library-grid'));
 await page.getByRole('button',{name:'Conservar',exact:true}).first().click();await page.waitForTimeout(300);
 await page.getByTestId('open-grid').click();await page.locator('.grid-tile').first().waitFor();
 assert.equal(await page.locator('.grid-tile.is-selected').count(),0,'a decision on the cards ends the selection');
 results.push('selection survives switching modes until a card is decided');
 // One photo selected: share sits by Anclar, and «Revisar en orden desde aquí» deals the pile from it, filters off.
 await page.locator('.archive-header').getByRole('switch',{name:'Desactivar filtros'}).click();
 const one=(await visible())[3];await page.locator(`[data-i="${one}"]`).click();
 assert.equal(await page.locator('.grid-selection').getByRole('button',{name:'Compartir'}).count(),1,'share next to Anclar');
 const pickId=await page.locator(`[data-i="${one}"]`).getAttribute('data-id');
 await page.getByRole('button',{name:'Revisar en orden desde aquí'}).click();
 await page.waitForFunction(()=>!document.querySelector('.library-grid'));
 await page.waitForFunction(id=>document.querySelector('.photo-card.front')?.getAttribute('data-testid')===`card-${id}`,pickId);
 assert.equal(await page.getByRole('switch',{name:'Activar filtros'}).count(),1,'the pile now runs with filters off');
 results.push('one selected: share by Anclar; «Revisar en orden desde aquí» deals the pile from that photo, filters off');
 await page.locator('.photo-card.front').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS',results.join('; '));
}catch(e){console.log('FAIL grid flow',e.message);process.exitCode=1;}finally{await browser.close();}
