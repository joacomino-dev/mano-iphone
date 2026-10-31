/** What PhotoLibrary.classify measures on a small local preview (never uploaded):
 * recognised-text coverage (0–1 of the frame) and line count, faces, sharpness
 * (variance of the Laplacian at 256 px) and mean brightness (0–1); on iOS 18+
 * also Apple's aesthetics score (−1…1) and its «utility» flag (documents,
 * receipts, screenshots). */
export type Insight = { text: number; lines: number; faces: number; sharp: number; luma: number; score?: number; utility?: boolean };

// Tunable thresholds, chosen to stay conservative: a missed blurry photo costs
// less than a good one shown as «baja calidad».
const TEXT_COVERAGE = .04, TEXT_LINES = 6, BLUR = 20, DARK = .06, BRIGHT = .97, UGLY = -.3;

/** text: 1 = mostly text (documents, receipts, transfers, chats); .5 = text
 * with a face (shown last in that filter); 0 = not text. A text image is never
 * «baja calidad»: it belongs to its own clean-up set. */
export function categorize(i: Insight): { low: boolean; text: number } {
  const textual = i.text >= TEXT_COVERAGE || i.lines >= TEXT_LINES || (!!i.utility && i.lines >= 2);
  const text = !textual ? 0 : i.faces > 0 ? .5 : 1;
  if (text) return { low: false, text };
  const exposure = i.luma < DARK || i.luma > BRIGHT;
  const low = i.score !== undefined ? (!i.utility && i.score < UGLY) || exposure : i.sharp < BLUR || exposure;
  return { low, text };
}

export function validInsight(value: unknown): value is Insight {
  const v = value as Record<string, unknown> | null;
  return !!v && typeof v === 'object' && ['text', 'lines', 'faces', 'sharp', 'luma'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]));
}
