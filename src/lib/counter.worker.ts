import { countBeadPixels } from './bead-counter.ts';
self.onmessage = (event: MessageEvent) => {
  const { pixels, width, height, options, pixelSha256, kind } = event.data;
  try { self.postMessage({ result: countBeadPixels(new Uint8Array(pixels), width, height, options, pixelSha256, kind) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Local counting failed.' }); }
};
