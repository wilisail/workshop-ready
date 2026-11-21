export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 16_000_000;
export interface ImageInfo { mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; width: number; height: number; }

export function inspectRaster(bytes: Uint8Array): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let mimeType: ImageInfo['mimeType'] | undefined, width = 0, height = 0;
  const has = (position: number, values: number[]) => values.every((v,i) => bytes[position+i] === v);
  if (bytes.length >= 33 && has(0,[137,80,78,71,13,10,26,10]) && has(12,[73,72,68,82])) {
    mimeType = 'image/png'; width = view.getUint32(16); height = view.getUint32(20);
    for (let p = 8; p + 12 <= bytes.length;) {
      const size = view.getUint32(p);
      if (has(p+4,[97,99,84,76])) throw new Error('Choose a still PNG image; animated images are not accepted.');
      if (has(p+4,[73,68,65,84])) break;
      if (size > bytes.length-p-12) break;
      p += size+12;
    }
  } else if (has(0,[255,216])) {
    mimeType = 'image/jpeg';
    for (let p = 2; p+3 < bytes.length;) {
      if (bytes[p] !== 255) break;
      while (bytes[p+1] === 255) p++;
      const marker = bytes[p+1];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) { p += 2; continue; }
      const size = view.getUint16(p+2);
      if (size < 2 || p+2+size > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && size >= 8) { height = view.getUint16(p+5); width = view.getUint16(p+7); break; }
      p += size+2;
    }
  } else if (bytes.length >= 30 && has(0,[82,73,70,70]) && has(8,[87,69,66,80])) {
    mimeType = 'image/webp';
    if (has(12,[86,80,56,88])) {
      if (bytes[20] & 2) throw new Error('Choose a still WebP image; animated images are not accepted.');
      width = 1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16); height = 1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);
    } else if (has(12,[86,80,56,76]) && bytes[20] === 47) {
      width = 1+bytes[21]+((bytes[22]&63)<<8); height = 1+(bytes[22]>>6)+(bytes[23]<<2)+((bytes[24]&15)<<10);
    } else if (has(12,[86,80,56,32]) && has(23,[157,1,42])) { width = view.getUint16(26,true)&16383; height = view.getUint16(28,true)&16383; }
  }
  if (!mimeType || !width || !height) throw new Error('Choose a valid still JPG, PNG or WebP image. The file header could not be read.');
  if (width*height > MAX_IMAGE_PIXELS || width > 10000 || height > 10000) throw new Error('Use an image of 16 megapixels or less. Resize the photo before importing it.');
  return { mimeType, width, height };
}
export async function prepareImage(file: File): Promise<ImageInfo & { blob: Blob; sha256: string }> {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Choose one image up to 8 MB.');
  const buffer = await file.arrayBuffer();
  const info = inspectRaster(new Uint8Array(buffer));
  if (file.type && file.type !== info.mimeType) throw new Error('The file contents do not match its declared image format.');
  const bitmap = await createImageBitmap(file);
  try { if (bitmap.width*bitmap.height > MAX_IMAGE_PIXELS) throw new Error('The decoded image is larger than 16 megapixels.'); }
  finally { bitmap.close(); }
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const sha256 = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
  return { ...info, blob: new Blob([buffer], { type: info.mimeType }), sha256 };
}
