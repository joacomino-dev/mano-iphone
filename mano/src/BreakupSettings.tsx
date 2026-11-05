import type { BreakupMode, CensorStyle } from './people';

export function BreakupSettings({ person, mode, style='oval', change, choose }: {
  person?:string;mode?:BreakupMode;style?:CensorStyle;
  change:(value:{breakup?:BreakupMode;censorStyle?:CensorStyle})=>void;choose:()=>void;
}) {
  return <fieldset id="breakup-settings"><legend>Breakup Mode</legend>
    {!person&&<p className="setting-note">Selecciona una persona para censurar sus rostros. <button onClick={choose}>Elegir persona</button></p>}
    <div className="filter-chips" role="group" aria-label="Modo de Breakup">
      <button aria-pressed={!person||mode==='normal'} onClick={()=>change({breakup:'normal'})}>Normal</button>
      <button aria-pressed={!!person&&mode!=='normal'} disabled={!person} onClick={()=>change({breakup:'face'})}>Rostro censurado</button>
    </div>
    {person&&mode!=='normal'&&<><p className="setting-note">La foto permanece protegida hasta que la censura esté preparada.</p>
      <div className="filter-chips" role="group" aria-label="Estilo de censura">
        <button aria-pressed={style==='oval'} onClick={()=>change({censorStyle:'oval'})}>Óvalo desenfocado</button>
        <button aria-pressed={style==='eyes'} onClick={()=>change({censorStyle:'eyes'})}>Barra sobre los ojos</button>
      </div><p className="setting-note">La barra es una censura parcial y no garantiza ocultar la identidad. Sin ojos localizados con suficiente certeza se utiliza el óvalo.</p>
    </>}
  </fieldset>;
}
