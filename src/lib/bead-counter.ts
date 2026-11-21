// Shared CPU-only image baseline. No learned weights, network calls or biological inference.
export const COUNTER_VERSION = 'bead-components-v1';
export const MAX_COUNTER_SIDE = 768;
export const COUNTER_MODEL = 'Colour / connected-components baseline v1';
export interface CounterOptions {
  foreground: 'dark' | 'light' | 'colour'; threshold: number; minArea: number; maxArea: number;
  roi: { x: number; y: number; width: number; height: number };
}
export interface CounterMark { x: number; y: number; width: number; height: number; area: number; accepted: boolean; }
export interface CounterEvidence {
  version: typeof COUNTER_VERSION; width: number; height: number; options: CounterOptions;
  pixelSha256: string; foregroundPixels: number; candidates: number; rejected: number; marks: CounterMark[];
}
export interface CounterResult {
  count: number | null; countable: boolean; qualityWarnings: string[]; explanation: string;
  evidence: CounterEvidence;
}
export const defaultCounterOptions = (): CounterOptions => ({ foreground: 'dark', threshold: 130, minArea: 12, maxArea: 10000, roi: { x: 0, y: 0, width: 100, height: 100 } });
const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export function validateCounterOptions(value: unknown): CounterOptions {
  if (!isObject(value) || !['dark', 'light', 'colour'].includes(String(value.foreground))) throw new Error('Choose a supported bead foreground.');
  const integer = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
  if (!integer(value.threshold, 0, 255) || !integer(value.minArea, 1, 100000) || !integer(value.maxArea, 1, MAX_COUNTER_SIDE ** 2) || (value.minArea as number) > (value.maxArea as number)) throw new Error('Use valid threshold and pixel-area limits.');
  const r = value.roi;
  if (!isObject(r) || !['x', 'y', 'width', 'height'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k])) || (r.x as number) < 0 || (r.y as number) < 0 || (r.width as number) <= 0 || (r.height as number) <= 0 || (r.x as number) + (r.width as number) > 100 || (r.y as number) + (r.height as number) > 100) throw new Error('The count area must fit inside the image (percentages).');
  return { foreground: value.foreground as CounterOptions['foreground'], threshold: value.threshold as number, minArea: value.minArea as number, maxArea: value.maxArea as number, roi: { x: r.x as number, y: r.y as number, width: r.width as number, height: r.height as number } };
}
export function countBeadPixels(rgb: Uint8Array, width: number, height: number, rawOptions: unknown, pixelSha256: string, kind = 'bead_proxy'): CounterResult {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16 || width > MAX_COUNTER_SIDE || height > MAX_COUNTER_SIDE || rgb.length !== width * height * 3) throw new Error('Invalid or oversized RGB image.');
  if (!/^[a-f0-9]{64}$/.test(pixelSha256)) throw new Error('Invalid pixel fingerprint.');
  if (kind !== 'bead_proxy') throw new Error('This baseline supports bead-proxy tests only. Real larvae need a separately validated image method or human review.');
  const options = validateCounterOptions(rawOptions), r = options.roi;
  const x0 = Math.floor(width * r.x / 100), y0 = Math.floor(height * r.y / 100), x1 = Math.min(width, Math.ceil(width * (r.x + r.width) / 100)), y1 = Math.min(height, Math.ceil(height * (r.y + r.height) / 100));
  if (x1 - x0 < 8 || y1 - y0 < 8) throw new Error('Select a count area at least 8 pixels wide and high.');
  const mask = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let foregroundPixels = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const p = y * width + x, k = p * 3, red = rgb[k], green = rgb[k + 1], blue = rgb[k + 2];
    const luminance = (77 * red + 150 * green + 29 * blue) >> 8;
    const selected = options.foreground === 'dark' ? luminance <= options.threshold : options.foreground === 'light' ? luminance >= options.threshold : Math.max(red, green, blue) - Math.min(red, green, blue) >= options.threshold;
    if (selected) { mask[p] = 1; foregroundPixels++; }
  }
  const marks: CounterMark[] = []; let count = 0, candidates = 0, rejected = 0, ambiguous = 0, borderObjects = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const seed = y * width + x; if (mask[seed] !== 1) continue;
    let head = 0, tail = 1, area = 0, minX = x, maxX = x, minY = y, maxY = y;
    mask[seed] = 2; queue[0] = seed;
    while (head < tail) {
      const p = queue[head++], py = Math.floor(p / width), px = p % width;
      area++; minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
        const np = ny * width + nx; if (mask[np] === 1) { mask[np] = 2; queue[tail++] = np; }
      }
    }
    if (area < options.minArea) continue;
    candidates++;
    const bw = maxX - minX + 1, bh = maxY - minY + 1, border = minX === x0 || minY === y0 || maxX === x1 - 1 || maxY === y1 - 1;
    const shape = Math.max(bw / bh, bh / bw) > 1.8 || area / (bw * bh) < 0.5;
    const accepted = area <= options.maxArea && !border && !shape;
    if (accepted) count++; else { rejected++; if (border) borderObjects++; else ambiguous++; }
    if (marks.length < 250) marks.push({ x: minX, y: minY, width: bw, height: bh, area, accepted });
  }
  const coverage = foregroundPixels / ((x1 - x0) * (y1 - y0));
  const warnings = ['Bead-proxy baseline only; no species, infection, emergence or dengue inference.', 'Touching beads can merge; reflections and debris can create components. Review every estimate.'];
  if (borderObjects) warnings.push('Objects touch the count-area boundary. Adjust the area or foreground settings.');
  if (ambiguous) warnings.push('Large or irregular components were rejected; crowding or unsuitable settings may hide beads.');
  if (coverage > 0.45) warnings.push('Foreground occupies too much of the selected area for this simple baseline.');
  if (candidates > 250) warnings.push('More than 250 candidate regions; this image is too dense for the demonstration counter.');
  if (!candidates) warnings.push('No candidate regions passed the chosen size threshold; this does not prove an empty container.');
  const countable = rejected === 0 && candidates <= 250 && coverage <= 0.45;
  return { count: countable ? count : null, countable, qualityWarnings: warnings,
    explanation: countable ? `Found ${count} separated, approximately round foreground regions in the selected area. This is a parameter-dependent computer-vision estimate, not a trained larvae model.` : 'This image/settings combination has clipped, irregular, large or dense regions. No count was accepted; adjust settings or enter a human review.',
    evidence: { version: COUNTER_VERSION, width, height, options, pixelSha256, foregroundPixels, candidates, rejected, marks } };
}
