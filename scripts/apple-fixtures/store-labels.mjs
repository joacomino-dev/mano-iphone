// Test contract only: exact shipped translations, never a second UI dictionary.
import fs from 'node:fs';
const keys=['Filtros','Ajustes','Terminar','Eliminar','Recuperar','Cerrar'];
const file=process.argv[2],contract=JSON.parse(fs.readFileSync(file,'utf8'));contract.storeScreenLabels={};
for(const lang of ['es','en','fr','de','it','ar','ja']){
 const table=lang==='es'?{}:(await import(`../../mano/src/locales/${lang}.ts`)).default;
 contract.storeScreenLabels[lang]=Object.fromEntries(keys.map(key=>[key,table[key]??key]));
}
fs.writeFileSync(file,JSON.stringify(contract));
