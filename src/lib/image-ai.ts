import type { FirebaseSettings } from './storage.ts';
import type { LocalAvailability } from './capacity.ts';
import { IMAGE_OPTIONS, runImageCount } from './image-analysis.ts';
import type { ImageCountInput, ImageCountRuntime, ImageRoute } from './image-analysis.ts';

const checkedApps = new Set<string>();
export async function checkImageAvailability(): Promise<LocalAvailability> {
  const api = (globalThis as unknown as { LanguageModel?: { availability(options: unknown): Promise<string> } }).LanguageModel;
  if (!api?.availability) return 'unavailable';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([api.availability(IMAGE_OPTIONS),new Promise<string>(resolve => { timer=setTimeout(()=>resolve('unknown'),2500); })]);
    return ['available','downloadable','downloading','unavailable'].includes(value) ? value as LocalAvailability : 'unknown';
  } catch { return 'unknown'; } finally { if(timer) clearTimeout(timer); }
}
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve,reject) => {
    const abort = () => reject(signal.reason || new DOMException('Cancelled','AbortError'));
    signal.addEventListener('abort',abort,{once:true});
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}
function readBase64(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve,reject) => {
    signal.throwIfAborted();
    const reader = new FileReader();
    const abort = () => reader.abort();
    signal.addEventListener('abort',abort,{once:true});
    reader.onload = () => { const data=String(reader.result).split(',')[1]; data ? resolve(data) : reject(new Error('The image could not be encoded.')); };
    reader.onerror = () => reject(new Error('The saved image could not be read.'));
    reader.onabort = () => reject(new DOMException('Cancelled','AbortError'));
    reader.onloadend = () => signal.removeEventListener('abort',abort);
    reader.readAsDataURL(blob);
  });
}
function configId(settings: FirebaseSettings): string {
  let hash=2166136261;
  for(const ch of JSON.stringify([settings.config,settings.siteKey])) hash=Math.imul(hash^ch.charCodeAt(0),16777619);
  return 'field-images-'+(hash>>>0).toString(16);
}
export function firebaseImageRuntime(settings: FirebaseSettings | null, onProgress: (message: string)=>void): ImageCountRuntime {
  return {
    availability: checkImageAvailability,
    async generate(input: ImageCountInput, route: ImageRoute, prompt: string) {
      input.signal.throwIfAborted();
      if (!settings?.config.apiKey || !settings.config.projectId || !settings.config.appId || !settings.model.trim()) throw new Error('Save your Firebase web configuration and a vision-capable model in Data & settings first. The image remains saved locally.');
      const debug = import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG === 'true';
      if (route.mode !== 'local' && !settings.siteKey.trim() && !debug) throw new Error('Add the public App Check site key before requesting cloud inference.');
      onProgress(route.explanation);
      const [appSDK,checkSDK,aiSDK] = await Promise.all([import('firebase/app'),import('firebase/app-check'),import('firebase/ai')]);
      input.signal.throwIfAborted();
      const name=configId(settings), app=appSDK.getApps().find(a=>a.name===name)||appSDK.initializeApp(settings.config,name);
      if (route.mode !== 'local' && !checkedApps.has(name)) {
        if(debug) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN=true;
        checkSDK.initializeAppCheck(app,{provider:new checkSDK.ReCaptchaEnterpriseProvider(settings.siteKey||'localhost-debug-only'),isTokenAutoRefreshEnabled:true});
        checkedApps.add(name);
      }
      const ai=aiSDK.getAI(app,{backend:new aiSDK.GoogleAIBackend()});
      const makeModel=(mode: ImageRoute['mode'])=>aiSDK.getGenerativeModel(ai,{
        mode: mode==='cloud'?aiSDK.InferenceMode.ONLY_IN_CLOUD:mode==='local'?aiSDK.InferenceMode.ONLY_ON_DEVICE:mode==='cloud-first'?aiSDK.InferenceMode.PREFER_IN_CLOUD:aiSDK.InferenceMode.PREFER_ON_DEVICE,
        inCloudParams:{model:settings.model,generationConfig:{temperature:0.1,maxOutputTokens:2048,responseMimeType:'application/json',responseSchema:aiSDK.Schema.object({properties:{count:aiSDK.Schema.integer({nullable:true}),countable:aiSDK.Schema.boolean(),qualityWarnings:aiSDK.Schema.array({items:aiSDK.Schema.string(),maxItems:8}),explanation:aiSDK.Schema.string()}})}},
        onDeviceParams:{createOptions:IMAGE_OPTIONS},
      },{timeout:60000});
      let model=makeModel(route.mode), routingNote=route.explanation;
      if(route.prepareDevice) {
        try { await abortable(model.initializeDeviceModel(),input.signal); }
        catch(err) {
          input.signal.throwIfAborted();
          if(route.mode==='local' || !navigator.onLine) throw err;
          model=makeModel('cloud'); routingNote='Local image-model preparation failed. The selected preference permits cloud fallback.';
        }
      }
      input.signal.throwIfAborted();
      const imageData=await readBase64(input.blob,input.signal);
      input.signal.throwIfAborted();
      onProgress(route.mode==='local'?'Counting on the prepared device model…':'Requesting an image count…');
      const result=await abortable(model.generateContent([prompt,{type:'inlineData',inlineData:{data:imageData,mimeType:input.blob.type}}],{signal:input.signal}),input.signal);
      input.signal.throwIfAborted();
      return {text:result.response.text(),source:result.response.inferenceSource,routingNote};
    },
  };
}
export function countSavedImage(input: ImageCountInput, settings: FirebaseSettings | null, onProgress: (message:string)=>void) {
  return runImageCount(input,firebaseImageRuntime(settings,onProgress));
}
export function imageError(error: unknown): string {
  if (!(error instanceof Error)) return 'The request failed. Your saved image and earlier results are unchanged.';
  if(error.name==='AbortError') return 'Stopped waiting. No late result will be saved. A request already sent may still finish and incur provider charges.';
  if(/app.?check|403|permission.denied/i.test(error.message)) return 'Firebase rejected the request. Check App Check, the deployed domain and project configuration. Your image is still saved locally.';
  if(/429|quota|resource.exhausted/i.test(error.message)) return 'The cloud quota was reached. No count was saved. Retry later or review the image manually.';
  if(/404|model.*not.*found|unsupported.*model/i.test(error.message)) return 'The configured model is unavailable or does not support this request. Check the enabled vision model in Firebase.';
  return error.message.slice(0,600);
}
