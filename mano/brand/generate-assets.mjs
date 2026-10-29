// CocoWash editable brand master. Every shape remains an ordinary SVG path.
// Run with COCO_SHARP_MODULE pointing to an installed sharp package when it is
// not installed locally. No network, generation APIs, user photos or CI needed.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require(process.env.COCO_SHARP_MODULE || 'sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'public/assets');
const palette = { teal:'#1D4042', cream:'#F2E7D5', red:'#B44238', ink:'#122D2E', coconut:'#AF6742', shade:'#955135', pink:'#EF9A98', pinkShade:'#DC787D', yellow:'#E9BC65' };
const {teal,cream,ink,coconut,shade,pink,pinkShade,yellow}=palette;
const wrap=(body,view='0 0 512 512',label='CocoWash: un coco cuida su cerebro')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" fill="none" role="img" aria-labelledby="title"><title id="title">${label}</title><desc>Isotipo vectorial editable. Coco de mirada pícara, tapa abierta y cerebro sonriente; una esponja toca directamente su parte superior.</desc>${body}</svg>`;
const full=`
<g id="lid" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${coconut}" d="M157 278C99 264 66 219 81 162C95 107 148 55 204 53C234 52 252 70 245 102C234 155 203 226 157 278Z"/>
 <path fill="${cream}" d="M157 258C114 244 94 211 107 166C120 122 161 77 202 76C218 76 227 86 221 106C208 153 183 218 157 258Z"/>
 <path d="M105 148L113 136M98 185L99 171M112 222L106 211M158 81L146 88" stroke="${shade}" stroke-width="6"/>
</g>
<g id="arms" stroke-linecap="round" stroke-linejoin="round">
 <path d="M354 322C401 301 411 274 388 236L351 179" stroke="${ink}" stroke-width="35"/>
 <path d="M354 322C401 301 411 274 388 236L351 179" stroke="${cream}" stroke-width="19"/>
</g>
<g id="feet" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="${cream}">
 <path d="M197 432C185 455 187 479 205 486C225 494 239 477 232 458L222 432Z"/>
 <path d="M328 422C341 428 348 443 348 452C357 438 369 429 380 436C392 444 385 465 367 475C350 485 326 472 312 455Z"/>
</g>
<g id="coconut" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${coconut}" d="M122 283C107 330 116 385 153 419C182 449 228 462 273 451C331 438 366 391 370 338C372 315 367 295 358 282Z"/>
 <path fill="${shade}" stroke="none" d="M129 348C142 392 181 427 233 436C287 445 339 412 362 370C345 420 306 448 262 454C204 462 154 428 136 390Z"/>
 <path d="M142 318L144 338M143 363L150 380M170 411L180 419M342 326L341 340M329 399L321 411" stroke="${shade}" stroke-width="7"/>
 <ellipse cx="244" cy="284" rx="124" ry="35" fill="${cream}"/>
 <path d="M139 289C176 307 309 312 351 287" stroke-width="6"/>
</g>
<g id="brain" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${pink}" d="M170 286C147 283 137 266 143 247C132 225 143 203 164 198C163 176 184 163 204 168C218 147 246 148 261 162C282 147 306 160 311 179C334 178 350 197 347 216C366 227 370 251 356 267C356 283 340 292 320 290Z"/>
 <path d="M165 244C162 230 167 216 179 210M202 183C212 181 220 185 223 193M264 178C258 186 259 195 266 201M323 235C332 242 332 254 327 262" stroke="${pinkShade}" stroke-width="8"/>
 <path d="M200 216C202 226 215 230 224 221M276 212C280 222 292 223 299 214" stroke-width="8"/>
 <path fill="${ink}" d="M236 241C249 248 261 247 272 237C276 253 265 268 253 267C244 266 239 257 236 241Z" stroke-width="4"/>
 <path d="M247 260C254 254 260 254 267 257" stroke="${pinkShade}" stroke-width="6"/>
 <path fill="${pink}" d="M178 276C163 268 150 275 151 285C151 295 166 300 180 299C194 307 209 299 202 288C198 281 190 278 178 276Z" stroke-width="7"/>
 <path fill="${pink}" d="M322 278C330 267 344 267 349 276C354 285 344 293 329 294L315 294" stroke-width="7"/>
</g>
<g id="sponge-contact" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${yellow}" d="M287 151C285 142 293 132 305 134L349 146C360 148 365 158 361 168L351 187C347 197 336 199 327 193L292 176C283 171 280 160 287 151Z"/>
 <path d="M303 148L304 148M318 172L319 172M345 174L345 174" stroke="${shade}" stroke-width="6"/>
 <path fill="${cream}" d="M353 177C344 175 340 168 343 161L347 150C340 149 337 154 333 156C327 159 322 153 325 146C333 128 348 131 361 140C371 147 375 164 365 176C362 180 357 181 353 177Z"/>
</g>
<g id="foam" fill="${cream}" stroke="${ink}" stroke-width="6">
 <path d="M123 276C116 264 123 255 134 257C135 245 150 244 155 255C166 251 174 260 169 270C179 276 172 286 162 284L135 287C126 287 120 283 123 276Z"/>
</g>
<g id="coconut-face" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${cream}" d="M199 347C200 377 223 390 241 377C250 370 254 355 251 341Z"/>
 <path fill="${cream}" d="M266 339C266 368 290 381 310 367C320 360 325 346 321 331Z"/>
 <path d="M194 347L253 333M263 339L323 325" stroke-width="10"/>
 <path fill="${ink}" stroke="none" d="M231 340L249 336C252 351 245 360 237 358C230 356 230 348 231 340ZM300 332L319 327C323 341 315 351 308 349C301 347 300 340 300 332Z"/>
 <path d="M250 405C264 415 278 410 285 400" stroke-width="9"/>
</g>
<g id="left-hand" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="${cream}">
 <path d="M133 379C113 393 110 412 123 430C108 433 113 450 133 454L155 456C173 458 178 441 163 435L149 432C139 417 141 408 148 399C154 389 143 372 133 379Z"/>
 <path d="M145 438L151 446" stroke-width="6"/>
</g>`;
const compact=`
<g id="lid" stroke="${ink}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${coconut}" d="M74 144C44 132 33 105 48 76C59 53 84 35 106 38C119 40 124 51 118 65C108 94 95 122 74 144Z"/>
 <path fill="${cream}" d="M73 131C53 121 48 103 59 82C70 61 89 48 103 50C109 51 110 57 107 64C99 85 88 113 73 131Z"/>
</g>
<g id="arm" stroke-linecap="round" stroke-linejoin="round">
 <path d="M202 175C228 158 231 143 219 124L198 96" stroke="${ink}" stroke-width="19"/>
 <path d="M202 175C228 158 231 143 219 124L198 96" stroke="${cream}" stroke-width="10"/>
</g>
<g id="coconut" stroke="${ink}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${coconut}" d="M66 147C56 174 67 207 90 223C115 242 151 244 177 226C202 209 211 178 203 150Z"/>
 <path fill="${shade}" stroke="none" d="M69 181C83 214 115 230 147 226C169 223 190 209 200 190C190 220 170 236 142 239C107 241 79 219 69 198Z"/>
 <ellipse cx="135" cy="148" rx="69" ry="19" fill="${cream}"/>
</g>
<g id="brain" stroke="${ink}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${pink}" d="M95 150C81 145 78 133 85 123C78 109 87 97 99 96C100 82 115 76 126 82C138 69 154 74 160 86C174 81 187 92 186 104C200 111 203 125 195 136C195 147 183 152 172 152Z"/>
 <path d="M99 120C98 113 101 108 107 106M139 87C135 93 137 100 142 102" stroke="${pinkShade}" stroke-width="4.5"/>
 <path d="M111 115C114 121 122 122 127 117M153 113C157 119 165 118 168 113" stroke-width="4.7"/>
 <path fill="${ink}" d="M132 129C140 134 147 133 154 127C156 138 147 144 141 141C136 139 134 134 132 129Z" stroke-width="2"/>
</g>
<g id="sponge-contact" stroke="${ink}" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${yellow}" d="M158 78C155 70 162 65 169 68L194 77C202 80 204 86 200 93L194 104C191 110 185 111 180 106L160 93C154 90 153 84 158 78Z"/>
 <path d="M168 79L168 79M183 96L183 96" stroke="${shade}" stroke-width="3.8"/>
 <path fill="${cream}" d="M197 99C191 98 189 93 191 88L194 82C189 82 187 86 184 84C179 80 184 72 191 72C202 72 211 86 205 96C203 100 200 102 197 99Z"/>
</g>
<g id="foam" fill="${cream}" stroke="${ink}" stroke-width="4">
 <path d="M69 144C65 136 71 132 77 134C79 126 87 128 89 134C97 132 100 140 94 145L80 150C73 151 68 149 69 144Z"/>
</g>
<g id="coconut-face" stroke="${ink}" stroke-width="5.3" stroke-linecap="round" stroke-linejoin="round">
 <path fill="${cream}" d="M104 181C104 199 119 208 131 198C138 193 138 182 136 175Z"/>
 <path fill="${cream}" d="M146 176C147 194 162 201 174 190C181 184 182 175 179 169Z"/>
 <path d="M102 181L137 172M144 176L180 166" stroke-width="6.5"/>
 <path fill="${ink}" stroke="none" d="M123 177L135 174C137 184 133 189 128 187C123 186 123 181 123 177ZM166 171L178 167C181 176 176 182 171 181C166 179 166 175 166 171Z"/>
 <path d="M135 216C143 222 153 218 157 212" stroke-width="5.8"/>
</g>`;
await fs.mkdir(assets,{recursive:true});
await fs.writeFile(path.join(assets,'cocowash.svg'),wrap(full));
await fs.writeFile(path.join(assets,'cocowash-compact.svg'),wrap(compact,'0 0 256 256'));
// One-color variant keeps transparent interiors; readable on contrasting surfaces.
const mono=compact.replaceAll(coconut,cream).replaceAll(shade,cream).replaceAll(pink,cream).replaceAll(pinkShade,cream).replaceAll(yellow,cream);
await fs.writeFile(path.join(assets,'cocowash-mono.svg'),wrap(mono,'0 0 256 256'));
await fs.writeFile(path.join(assets,'cocowash-wordmark.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 470 112" role="img" aria-labelledby="title"><title id="title">CocoWash</title><text x="8" y="80" font-family="Arial, sans-serif" font-size="80" font-weight="750" letter-spacing="-4" fill="${cream}">Coco<tspan fill="${palette.red}">Wash</tspan></text></svg>`);
const icon=wrap(`<path fill="${teal}" d="M0 0H1024V1024H0Z"/><g transform="translate(40 12) scale(3.7)">${compact}</g>`,'0 0 1024 1024','CocoWash');
await fs.writeFile(path.join(assets,'cocowash-icon.svg'),icon);
const iconBuffer=await sharp(Buffer.from(icon)).resize(1024,1024).flatten({background:teal}).removeAlpha().png().toBuffer();
await fs.writeFile(path.join(assets,'app-icon.png'),iconBuffer);
const nativeIcon=path.join(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
await fs.writeFile(nativeIcon,iconBuffer);
const outputDir=process.env.COCO_OUTPUT_DIR || path.join(root,'..','outputs');
await fs.mkdir(outputDir,{recursive:true});
for(const size of [32,48,64])await sharp(iconBuffer).resize(size,size).png().toFile(path.join(outputDir,`cocowash-icon-${size}.png`));
await fs.writeFile(path.join(outputDir,'cocowash-vector-master.svg'),wrap(full));
await fs.writeFile(path.join(root,'brand','palette.json'),JSON.stringify(palette,null,2)+'\n');
await sharp(Buffer.from(wrap(full))).resize(512,512).png().toFile(path.join(outputDir,'cocowash-full.png'));
const proofLabels=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820"><g fill="${teal}" font-family="Arial, sans-serif"><text x="46" y="55" font-size="30" font-weight="bold">CocoWash — construcción y reducción óptica</text><text x="46" y="86" font-size="17">Vectores editables · dos expresiones · contacto esponja / cerebro</text><text x="55" y="624" font-size="17">Ilustración completa</text><text x="522" y="624" font-size="17">Isotipo compacto</text><text x="875" y="144" font-size="17">Tamaños reales</text><text x="886" y="224" font-size="15">32</text><text x="967" y="224" font-size="15">48</text><text x="1070" y="224" font-size="15">64 px</text><text x="875" y="285" font-size="17">32 px ampliado × 6</text><text x="47" y="733" font-size="18">Petróleo #1D4042   ·   Marfil #F2E7D5   ·   Terracota #B44238</text><text x="47" y="766" font-size="15">Coco cálido #AF6742   ·   Cerebro #EF9A98   ·   Esponja #E9BC65</text></g></svg>`);
const proofLayers=[
 {input:await sharp(Buffer.from(wrap(full))).resize(450,450).png().toBuffer(),left:35,top:130},
 {input:await sharp({create:{width:306,height:390,channels:3,background:teal}}).png().toBuffer(),left:508,top:170},
 {input:await sharp(Buffer.from(wrap(compact,'0 0 256 256'))).resize(292,292).png().toBuffer(),left:515,top:203},
 {input:await sharp(iconBuffer).resize(32,32).png().toBuffer(),left:881,top:167},
 {input:await sharp(iconBuffer).resize(48,48).png().toBuffer(),left:958,top:159},
 {input:await sharp(iconBuffer).resize(64,64).png().toBuffer(),left:1051,top:151},
 {input:await sharp(iconBuffer).resize(32,32).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:875,top:314},
 {input:await sharp(iconBuffer).resize(64,64).greyscale().resize(96,96,{kernel:'nearest'}).png().toBuffer(),left:1079,top:362},
 {input:proofLabels,left:0,top:0}
];
await sharp({create:{width:1200,height:820,channels:3,background:cream}}).composite(proofLayers).png().toFile(path.join(outputDir,'cocowash-brand-proof.png'));
console.log(JSON.stringify({assets,outputDir,icon:await sharp(iconBuffer).metadata()},null,2));
