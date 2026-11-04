import type { Asset } from './domain.ts';

/** Keep ID-based lookup APIs, but bind every value to the asset's edit version.
 * Generations reject late batch answers even if a request cannot be cancelled. */
export class IndexState<F> {
  readonly sizes = new Map<string, number>();
  readonly flags = new Map<string, F>();
  private versions = new Map<string, string>();
  generation = 0;
  reconcile(assets: Asset[]) {
    const next = new Map(assets.map(a => [a.id, `${a.modified ?? 0}:${a.kind}:${a.width}:${a.height}`]));
    let changed = next.size !== this.versions.size;
    for (const [id, version] of this.versions) if (next.get(id) !== version) {
      this.sizes.delete(id); this.flags.delete(id); changed = true;
    }
    for (const [id, version] of next) if (this.versions.get(id) !== version) changed = true;
    this.versions = next;
    if (changed) this.generation++;
    return changed;
  }
  accepts(generation: number, id: string) { return generation === this.generation && this.versions.has(id); }
}
