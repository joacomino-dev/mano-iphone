/* 5×7 camcorder OSD bitmap font, drawn as crisp SVG runs (no web font). */
const G: Record<string, string> = {
  '0': '.###.#...##..###.#.###..##...#.###.', '1': '..#...##....#....#....#....#...###.',
  '2': '.###.#...#....#...#...#...#...#####', '3': '#####...#...#.....#.....##...#.###.',
  '4': '...#...##..#.#.#..#.#####...#....#.', '5': '######....####.....#....##...#.###.',
  '6': '..##..#...#....####.#...##...#.###.', '7': '#####....#...#...#...#....#....#...',
  '8': '.###.#...##...#.###.#...##...#.###.', '9': '.###.#...##...#.####....#...#..##..', A: '.###.#...##...#######...##...##...#',
  B: '####.#...##...#####.#...##...#####.', C: '.###.#...##....#....#....#...#.###.', D: '###..#..#.#...##...##...##..#.###..',
  E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....', G: '.###.#...##....#.####...##...#.####',
  H: '#...##...##...#######...##...##...#', I: '.###...#....#....#....#....#...###.', J: '..###...#....#....#....#.#..#..##..',
  K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####', M: '#...###.###.#.##.#.##...##...##...#',
  N: '#...##...###..##.#.##..###...##...#', 'Ñ': '.##.##.##.#...###..##.#.##..###...#', O: '.###.#...##...##...##...##...#.###.',
  P: '####.#...##...#####.#....#....#....', Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..', U: '#...##...##...##...##...##...#.###.',
  V: '#...##...##...##...##...#.#.#...#..', W: '#...##...##...##.#.##.#.##.#.#.#.#.', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####', '?': '.###.#...#....#...#...#.........#..',
  '▶': '#....##...###..####.###..##...#....',
};
const NARROW: Record<string, string[]> = {
  ':': ['.', '#', '.', '.', '.', '#', '.'], '.': ['.', '.', '.', '.', '.', '.', '#'], ',': ['..', '..', '..', '..', '.#', '.#', '#.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'], ' ': ['..', '..', '..', '..', '..', '..', '..'], "'": ['#', '#', '.', '.', '.', '.', '.'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
};
function rows(char: string): string[] {
  if (NARROW[char]) return NARROW[char];
  const bits = G[char] ?? G['?'];
  return Array.from({ length: 7 }, (_, r) => bits.slice(r * 5, r * 5 + 5).padEnd(5, '.'));
}
/** Accents fold to their base letter (the OSD had none); Ñ keeps its tilde. */
export function osdText(text: string) {
  return text.toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ');
}
export function pixelPath(text: string) {
  let x = 0; let d = '';
  for (const char of osdText(text)) {
    const glyph = rows(char);
    glyph.forEach((row, y) => {
      for (let c = 0; c < row.length;) {
        if (row[c] !== '#') { c++; continue; }
        let run = 0; while (row[c + run] === '#') run++;
        d += `M${x + c} ${y}h${run}v1h-${run}z`; c += run;
      }
    });
    x += glyph[0].length + 1;
  }
  return { d, width: Math.max(1, x - 1) };
}

/** OSD fit: the largest pixel size (3 → 1 in half steps) at which the stack and
 * the duration fit inside the visible frame, padding included. If even 1 px is
 * too wide, the optional line (the place) is dropped first. Height may use at
 * most 45 % of the frame so the type never covers the picture. */
export function fitOsd(lines: string[], duration: string | undefined, box: { width: number; height: number }, optional?: string) {
  const pad = Math.max(8, Math.round(Math.min(box.width, box.height) * .045));
  const target = Math.max(1, Math.min(3, Math.round(Math.min(box.width, box.height * 1.4) / 140 * 2) / 2));
  const widthOf = (text: string) => pixelPath(text).width;
  const fits = (set: string[], px: number) => {
    const stack = set.length ? Math.max(...set.map(widthOf)) : 0;
    const dur = duration ? widthOf(duration) + (set.length ? 6 : 0) : 0;
    const height = set.length ? set.length * 7 + (set.length - 1) * 3 : duration ? 7 : 0;
    return (stack + dur) * px <= box.width - pad * 2 && height * px <= (box.height - pad * 2) * .45;
  };
  const attempt = (set: string[]) => { for (let px = target; px >= 1; px -= .5) if (fits(set, px)) return px; return 0; };
  const px = attempt(lines);
  if (px) return { pixel: px, pad, lines };
  const fewer = optional ? lines.filter(line => line !== optional) : lines;
  return { pixel: attempt(fewer) || 1, pad, lines: fewer };
}
