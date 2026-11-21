// A constructed pixel example, not a field observation or a pretrained-model result.
export const EXAMPLE_CIRCLES = [[45, 45, 12], [125, 40, 10], [205, 48, 14], [275, 53, 11], [70, 130, 15], [160, 125, 12], [250, 140, 14], [135, 200, 11]] as const;
export async function createCounterExample(): Promise<Blob> {
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('This browser cannot create the test image.');
  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, 320, 240); ctx.fillStyle = '#344469';
  for (const [x, y, radius] of EXAMPLE_CIRCLES) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The example image could not be created.')), 'image/png'));
}
