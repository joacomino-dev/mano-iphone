import { Component, type ReactNode } from 'react';
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { reportError } from './diagnostics';

/** Contains a failure of the anchored view: the session stays usable and the
 * cause is reported, instead of React unmounting the whole app (blank screen). */
export class InspectorBoundary extends Component<{ children: ReactNode; close: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { reportError('inspector', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="inspection is-pinned" role="alertdialog" aria-label="Vista ampliada no disponible">
      <div className="inspection-shade" style={{ opacity: .94 }} onClick={this.props.close}/>
      <div className="inspection-fallback"><WarningCircleIcon size={28}/><p>No se pudo abrir la vista ampliada.</p>
        <button onClick={this.props.close}><XIcon size={18} weight="bold"/>Cerrar</button></div>
    </div>;
  }
}
