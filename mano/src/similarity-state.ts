import type { Asset } from './domain.ts';

export function photoVersions(assets: readonly Asset[]) {
  return new Map(assets.filter(a=>a.kind!=='video').map(a=>[a.id,`${a.modified??0}:${a.kind}:${a.width}:${a.height}:${a.date}`]));
}
/** An unchanged subset can reuse an existing complete grouping. Added/edited
 * photos need a new pass; video/favorite/group arrivals do not change similarity.
 * This checks actual IDs/versions, not just the persisted 32-bit fingerprint. */
export function unchangedPhotos(previous: ReadonlyMap<string,string>, assets: readonly Asset[]) {
  for(const [id,version] of photoVersions(assets))if(previous.get(id)!==version)return false;
  return true;
}
export class SimilarityCoverage {
  private completed: Map<string,string> | undefined;
  private attempted: Map<string,string> | undefined;
  clear() { this.completed=undefined;this.attempted=undefined; }
  retry() { this.attempted=undefined; }
  begin(assets: readonly Asset[]) { this.completed=undefined;return this.attempted=photoVersions(assets); }
  needsPass(assets: readonly Asset[]) { return !this.attempted||!unchangedPhotos(this.attempted,assets); }
  complete(assets: readonly Asset[]) { this.completed=photoVersions(assets);this.attempted=this.completed; }
  reuse(assets: readonly Asset[]) {
    if(!this.completed||!unchangedPhotos(this.completed,assets))return false;
    // Release versions of disappeared IDs as well as avoiding another native pass.
    this.completed=photoVersions(assets);this.attempted=this.completed;return true;
  }
}
