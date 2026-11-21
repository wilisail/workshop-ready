import { currentQA, isQADate, ORIGINS, validateQARecord } from './qa-records.ts';
import type { QAOrigin, QAPayload, QARecord } from './qa-records.ts';

export const STUDY_VERSION = 'study-descriptives-v1';
export const STUDY_SOFTWARE = '0.5.0';
export const TEMPLATES = { counting: 'Counting accuracy', prediction: 'Container-performance prediction planning' } as const;
export const UNITS = { container: 'Container', container_batch: 'Container and release cycle', site: 'Location / site' } as const;
export const REVIEW_DECISIONS = { comments: 'Comments recorded', changes_requested: 'Changes requested', reviewed: 'Reviewed with stated limitations' } as const;
export const STUDY_REFERENCES = [
  {title:'NC3Rs Experimental Design Assistant',url:'https://eda.nc3rs.org.uk/about'},
  {title:'Experimental units and sample-size justification',url:'https://eda.nc3rs.org.uk/experimental-design-group'},
];
export interface StudyPlan {
  template: keyof typeof TEMPLATES; title:string; question:string; primaryOutcome:string; hypothesis:string;
  expectedOrigin:QAOrigin; unit:keyof typeof UNITS; plannedUnits:number|null;
  comparator:string; samplingRationale:string; allocation:string; blinding:string;
  inclusion:string; exclusion:string; analysisPlan:string; missingDataPlan:string;
  repeatedMeasuresPlan:string; references:string;
}
export interface PlanRevision {number:number;savedAt:string;status:'draft'|'recorded';reason:string;data:StudyPlan;}
export interface CountPair {
  id:string;observationRef:string;unitRef:string;observedOn:string;origin:QAOrigin;
  estimate:number|null;reference:number|null;method:string;referenceMethod:string;referenceReviewer:string;
  referenceIndependent:boolean;blinding:'yes'|'no'|'unknown';excluded:boolean;exclusionReason:string;
}
export interface StudyDataset {id:string;planRevision:number;capturedAt:string;notes:string;pairs:CountPair[];qaRecords:QARecord[];}
export interface CountSummary {observations:number;excluded:number;missingPairs:number;validPairs:number;units:number;mae:number|null;bias:number|null;maximumError:number|null;unitBalancedMae:number|null;}
export interface QASummary {observations:number;units:number;labelled:number;failed:number;satisfactory:number;unresolved:number;missingSetup:number;waterTemperature:number;}
export interface StudyRun {id:string;planRevision:number;datasetId:string;createdAt:string;algorithmVersion:typeof STUDY_VERSION;softwareVersion:string;counts:CountSummary|null;qa:QASummary|null;checks:string[];}
export interface StudyReview {id:string;createdAt:string;planRevision:number;datasetId:string|null;runId:string|null;reviewer:string;decision:keyof typeof REVIEW_DECISIONS;comments:string;}
export interface Study {schemaVersion:1;id:string;createdAt:string;sequence:number;plans:PlanRevision[];datasets:StudyDataset[];runs:StudyRun[];reviews:StudyReview[];}
export const latestPlan = (study:Study) => study.plans[study.plans.length-1];
export const currentDataset = (study:Study) => study.datasets.filter(d=>d.planRevision===latestPlan(study).number).at(-1);
export const currentRun = (study:Study) => {const d=currentDataset(study);return d?study.runs.filter(r=>r.planRevision===latestPlan(study).number&&r.datasetId===d.id).at(-1):undefined;};
export function currentStudyReview(study:Study):StudyReview|undefined {
  const p=latestPlan(study),d=currentDataset(study),r=currentRun(study);
  return study.reviews.filter(review=>review.planRevision===p.number&&review.datasetId===(d?.id??null)&&review.runId===(r?.id??null)).at(-1);
}
export function defaultPlan(template:StudyPlan['template']='counting'):StudyPlan {
  return {template,title:template==='counting'?'Counting validation study':'Container-performance planning study',question:template==='counting'?'How close are method counts to independently checked reference counts?':'Can earlier container observations help identify a later failed QA outcome?',primaryOutcome:template==='counting'?'Absolute object-count error against an independently checked reference, in objects.':'Later failed versus satisfactory container QA outcome, assessed separately under a stated protocol.',hypothesis:'',expectedOrigin:template==='counting'?'bead_proxy':'synthetic_demo',unit:'container',plannedUnits:null,comparator:template==='counting'?'Independently checked reference count, with method and reviewer recorded.':'Simple, pre-specified inspection rule; evaluate an ML method later against the same held-out units.',samplingRationale:'',allocation:'',blinding:'',inclusion:'',exclusion:'',analysisPlan:template==='counting'?'Report observation-level MAE, signed bias, maximum error, unit-balanced MAE and missing/excluded pairs. These are descriptive statistics; no p-value or confidence interval is calculated.':'First check labelled outcomes, independent units, missing data and grouping. Specify held-out containers/dates and baseline metrics before training in step 4C.',missingDataPlan:'',repeatedMeasuresPlan:'Identify repeated observations by unit reference. Report observation and unit counts separately; do not treat repeated frames as independent containers.',references:STUDY_REFERENCES.map(r=>r.url).join('\n')};
}
function obj(value:unknown):Record<string,unknown> {if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid study object.');return value as Record<string,unknown>;}
function text(value:unknown,name:string,max=4000):string {if(typeof value!=='string'||value.length>max)throw new Error('Enter valid text for '+name+'.');return value.trim();}
function choice<T extends string>(value:unknown,options:Record<T,unknown>,name:string):T {if(typeof value!=='string'||!Object.hasOwn(options,value))throw new Error('Choose a valid '+name+'.');return value as T;}
function count(value:unknown):number|null {if(value===null)return null;if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>100000)throw new Error('Counts must be whole numbers from 0 to 100,000 or unknown.');return value;}
function at(value:unknown):string {if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('Invalid study timestamp.');return value;}
export function validatePlan(value:unknown):StudyPlan {
  const raw=obj(value),result={} as StudyPlan,out=result as unknown as Record<string,unknown>;
  result.template=choice(raw.template,TEMPLATES,'template');result.expectedOrigin=choice(raw.expectedOrigin,ORIGINS,'data origin');result.unit=choice(raw.unit,UNITS,'independent unit');
  result.plannedUnits=count(raw.plannedUnits);if(result.plannedUnits===0)throw new Error('Planned units must be positive or left undecided.');
  for(const key of ['title','question','primaryOutcome','hypothesis','comparator','samplingRationale','allocation','blinding','inclusion','exclusion','analysisPlan','missingDataPlan','repeatedMeasuresPlan','references'] as const)out[key]=text(raw[key],key,key==='title'?200:4000);
  if(!result.title)throw new Error('Give the study a title.');return result;
}
export function planChecks(plan:StudyPlan):string[] {
  const checks:string[]=[];
  for(const [key,label] of [['question','Research question'],['primaryOutcome','Primary outcome'],['comparator','Comparator'],['samplingRationale','Sampling/sample-size justification'],['allocation','Sampling or allocation procedure'],['blinding','Blinding/reference-independence procedure'],['inclusion','Inclusion criteria'],['exclusion','Exclusion criteria'],['analysisPlan','Analysis plan'],['missingDataPlan','Missing-data handling'],['repeatedMeasuresPlan','Repeated-observation handling'],['references','Method references']] as const)if(!plan[key])checks.push(label+' is not specified.');
  if(plan.plannedUnits===null)checks.push('Planned independent-unit count is undecided. Justify a pilot or calculate a design-specific sample size; there is no universal cutoff of 30.');
  if(!plan.hypothesis)checks.push('No formal hypothesis is declared. Treat findings as descriptive/exploratory.');
  return checks;
}
export function validatePair(value:unknown):CountPair {
  const r=obj(value);const pair:CountPair={id:text(r.id,'pair ID',100),observationRef:text(r.observationRef,'observation reference',200),unitRef:text(r.unitRef,'unit reference',200),observedOn:text(r.observedOn,'observation date',10),origin:choice(r.origin,ORIGINS,'pair origin'),estimate:count(r.estimate),reference:count(r.reference),method:text(r.method,'counting method',1000),referenceMethod:text(r.referenceMethod,'reference method',1000),referenceReviewer:text(r.referenceReviewer,'reference reviewer',200),referenceIndependent:r.referenceIndependent as boolean,blinding:choice(r.blinding,{yes:'',no:'',unknown:''},'reference blinding'),excluded:r.excluded as boolean,exclusionReason:text(r.exclusionReason,'exclusion reason',1000)};
  if(!pair.id||!pair.observationRef||!pair.unitRef||!isQADate(pair.observedOn))throw new Error('Each pair needs an ID, observation reference, independent-unit reference and valid date.');
  if(typeof pair.referenceIndependent!=='boolean'||typeof pair.excluded!=='boolean')throw new Error('Choose explicit independence and exclusion states.');
  if(pair.excluded&&!pair.exclusionReason)throw new Error('An excluded observation needs a reason.');return pair;
}
export function qaUnit(data:QAPayload,unit:StudyPlan['unit']):string {
  const norm=(s:string)=>s.trim().toLowerCase();
  return JSON.stringify(unit==='container'?[norm(data.container)]:unit==='container_batch'?[norm(data.container),norm(data.batch)]:[data.locationKind,norm(data.location)]);
}
export function validateDataset(value:unknown,revision:PlanRevision):StudyDataset {
  const raw=obj(value);
  if(raw.planRevision!==revision.number||revision.status!=='recorded')throw new Error('Record this plan version before capturing its dataset.');
  if(!Array.isArray(raw.pairs)||!Array.isArray(raw.qaRecords)||raw.pairs.length>500||raw.qaRecords.length>500)throw new Error('Use up to 500 observations per dataset snapshot.');
  const pairs=raw.pairs.map(validatePair),qaRecords=raw.qaRecords.map(validateQARecord);
  if(new Set(pairs.map(p=>p.id)).size!==pairs.length||new Set(qaRecords.map(r=>r.id)).size!==qaRecords.length)throw new Error('Duplicate record IDs are not allowed in a snapshot.');
  if(revision.data.template==='counting'?(!pairs.length||qaRecords.length):(!qaRecords.length||pairs.length))throw new Error('Choose the dataset type matching this study template.');
  const origins=[...pairs.map(p=>p.origin),...qaRecords.map(r=>currentQA(r).data.origin)];
  if(origins.some(origin=>origin!==revision.data.expectedOrigin))throw new Error('Every selected record must match the plan data origin. Synthetic, bead-proxy and field records cannot be pooled here.');
  const id=text(raw.id,'dataset ID',100);if(!id)throw new Error('A dataset ID is required.');
  return {id,planRevision:revision.number,capturedAt:at(raw.capturedAt),notes:text(raw.notes,'dataset notes'),pairs,qaRecords};
}
export function countSummary(pairs:CountPair[]):CountSummary {
  const active=pairs.filter(p=>!p.excluded),valid=active.filter(p=>p.estimate!==null&&p.reference!==null),groups=new Map<string,number[]>();
  const errors=valid.map(p=>{const error=p.estimate!-p.reference!,key=p.unitRef.trim().toLowerCase();groups.set(key,[...(groups.get(key)||[]),Math.abs(error)]);return error;});
  const mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  return {observations:pairs.length,excluded:pairs.length-active.length,missingPairs:active.length-valid.length,validPairs:valid.length,units:groups.size,mae:mean(errors.map(Math.abs)),bias:mean(errors),maximumError:errors.length?Math.max(...errors.map(Math.abs)):null,unitBalancedMae:mean([...groups.values()].map(values=>mean(values)!))};
}
export function qaSummary(records:QARecord[],unit:StudyPlan['unit']):QASummary {
  const data=records.map(r=>currentQA(r).data),failed=data.filter(d=>d.outcome==='failed').length,satisfactory=data.filter(d=>d.outcome==='satisfactory').length;
  return {observations:data.length,units:new Set(data.map(d=>qaUnit(d,unit))).size,labelled:failed+satisfactory,failed,satisfactory,unresolved:data.length-failed-satisfactory,missingSetup:data.filter(d=>d.setupOn===null).length,waterTemperature:data.filter(d=>d.temperatureBasis==='water').length};
}
export function runStudy(plan:PlanRevision,dataset:StudyDataset,id:string,createdAt:string):StudyRun {
  const checked=validateDataset(dataset,plan),checks=planChecks(plan.data);
  const counts=plan.data.template==='counting'?countSummary(checked.pairs):null,qa=plan.data.template==='prediction'?qaSummary(checked.qaRecords,plan.data.unit):null;
  const dates=counts?checked.pairs.map(p=>p.observedOn):checked.qaRecords.map(r=>currentQA(r).data.observedOn);
  if(dates.some(date=>date<=plan.savedAt.slice(0,10)))checks.push('Some observations are dated on/before plan recording. Prospective collection timing is not established. This is a local dated plan, not external preregistration.');
  if(counts){
    const active=checked.pairs.filter(p=>!p.excluded);
    if(!counts.validPairs)checks.push('No complete count pairs are available. Error metrics remain unknown.');
    if(counts.missingPairs)checks.push(counts.missingPairs+' included observations have an unknown method or reference count; they are reported separately, not replaced with zero.');
    if(active.some(p=>!p.referenceIndependent))checks.push('Reference independence is not confirmed for every included observation.');
    if(active.some(p=>!p.referenceMethod||!p.referenceReviewer||!p.method))checks.push('Some method/reference descriptions or reviewer labels are missing.');
    if(active.some(p=>p.blinding!=='yes'))checks.push('Reference-reviewer blinding is not confirmed for every included observation.');
    if(new Set(active.map(p=>p.unitRef.trim().toLowerCase())).size<active.length)checks.push('Repeated unit references detected. Observation-level errors may weight some units more heavily; unit-balanced MAE is also reported.');
    if(new Set(active.map(p=>p.observationRef.trim().toLowerCase())).size<active.length)checks.push('Duplicate observation references detected. Check whether the same image/visit was entered more than once before interpreting errors.');
  }
  if(qa){
    if(qa.units<qa.observations)checks.push('Repeated observations share the selected independent unit; do not randomly split those rows between training and evaluation.');
    if(qa.unresolved)checks.push(qa.unresolved+' QA outcomes are unassessed or need review; they are not treated as successful releases.');
    if(!qa.failed||!qa.satisfactory)checks.push('Both failed and satisfactory outcome classes are needed before evaluating a failure classifier.');
    if(qa.missingSetup)checks.push('Some setup dates are unknown; container age cannot be established for those observations.');
    if(qa.waterTemperature<qa.observations)checks.push('Water-temperature measurements are missing for some records. Air/weather values are not substituted.');
    checks.push('This run checks dataset readiness only. No prediction model, held-out performance or causal effect has been calculated.');
  }
  const units=counts?.units??qa?.units??0;
  if(plan.data.plannedUnits!==null&&units<plan.data.plannedUnits)checks.push('Observed complete-pair/selected QA units ('+units+') are below the planned independent-unit count ('+plan.data.plannedUnits+'). This is not a power calculation.');
  if(plan.data.expectedOrigin!=='field_observation')checks.push('Demonstration/proxy results cannot establish biological detection accuracy, field prediction or dengue impact.');
  checks.push('Descriptive/readiness output only. No p-value, confidence interval, automatic validity certificate or Wolbachia infection result is produced.');
  return {id,planRevision:plan.number,datasetId:dataset.id,createdAt,algorithmVersion:STUDY_VERSION,softwareVersion:STUDY_SOFTWARE,counts,qa,checks};
}
export function makeStudy(plan:StudyPlan,id:string,now:string):Study {return {schemaVersion:1,id,createdAt:now,sequence:1,plans:[{number:1,savedAt:now,status:'draft',reason:'Create study draft',data:validatePlan(plan)}],datasets:[],runs:[],reviews:[]};}
export function reviseStudyPlan(study:Study,input:StudyPlan,reason:string,now:string):Study {
  const data=validatePlan(input);if(data.template!==latestPlan(study).data.template)throw new Error('Create another study to change its template.');
  if(!reason.trim())throw new Error('Explain this plan amendment.');
  return {...study,sequence:study.sequence+1,plans:[...study.plans,{number:study.plans.length+1,savedAt:now,status:'draft',reason:text(reason,'amendment reason',1000),data}]};
}
export function recordStudyPlan(study:Study,now:string):Study {
  const p=latestPlan(study);if(p.status==='recorded')throw new Error('This plan version is already recorded.');
  if(!p.data.question||!p.data.primaryOutcome||!p.data.comparator||!p.data.samplingRationale||!p.data.analysisPlan)throw new Error('Specify the question, primary outcome, comparator, sampling justification and analysis plan before recording. Other open checks remain visible.');
  return {...study,sequence:study.sequence+1,plans:[...study.plans,{...p,number:study.plans.length+1,savedAt:now,status:'recorded',reason:'Record dated plan; open checks are retained'}]};
}
export function captureStudyDataset(study:Study,input:StudyDataset):Study {
  if(study.datasets.length>=20)throw new Error('This prototype retains up to 20 dataset snapshots per study.');
  const checked=validateDataset(input,latestPlan(study));if(study.datasets.some(d=>d.id===checked.id))throw new Error('This dataset snapshot already exists.');
  return {...study,sequence:study.sequence+1,datasets:[...study.datasets,checked]};
}
export function appendStudyRun(study:Study,id:string,now:string):Study {
  const p=latestPlan(study),d=currentDataset(study);if(p.status!=='recorded'||!d)throw new Error('Record the current plan and capture its dataset first.');
  if(study.runs.some(r=>r.id===id))throw new Error('This run already exists.');
  return {...study,sequence:study.sequence+1,runs:[...study.runs,runStudy(p,d,id,now)]};
}
export function appendStudyReview(study:Study,review:Pick<StudyReview,'id'|'createdAt'|'reviewer'|'decision'|'comments'>):Study {
  const p=latestPlan(study);if(p.status!=='recorded')throw new Error('Record the plan version before reviewing it.');
  const reviewer=text(review.reviewer,'reviewer label',200),comments=text(review.comments,'review comments');if(!reviewer||!comments)throw new Error('Add a reviewer label and substantive comments/limitations.');
  if(study.reviews.some(r=>r.id===review.id))throw new Error('This review already exists.');
  const full={...review,createdAt:at(review.createdAt),reviewer,comments,decision:choice(review.decision,REVIEW_DECISIONS,'review decision'),planRevision:p.number,datasetId:currentDataset(study)?.id??null,runId:currentRun(study)?.id??null};
  return {...study,sequence:study.sequence+1,reviews:[...study.reviews,full]};
}
export function validateStudy(value:unknown):Study {
  const r=obj(value);
  if(r.schemaVersion!==1||typeof r.id!=='string'||!r.id||!Array.isArray(r.plans)||!r.plans.length||!Array.isArray(r.datasets)||!Array.isArray(r.runs)||!Array.isArray(r.reviews))throw new Error('Unsupported saved study format.');
  if(r.sequence!==r.plans.length+r.datasets.length+r.runs.length+r.reviews.length)throw new Error('Invalid study event sequence.');
  at(r.createdAt);
  const plans=r.plans.map((v,i)=>{const p=obj(v);if(p.number!==i+1||(p.status!=='draft'&&p.status!=='recorded'))throw new Error('Invalid plan history.');return {number:i+1,savedAt:at(p.savedAt),status:p.status,reason:text(p.reason,'plan reason'),data:validatePlan(p.data)} as PlanRevision;});
  const datasets=r.datasets.map(v=>{const d=obj(v),p=plans.find(p=>p.number===d.planRevision);if(!p)throw new Error('Dataset plan is missing.');return validateDataset(d,p);});
  const uniqueIds=(items:unknown[])=>{const ids=items.map(item=>text(obj(item).id,'record ID',100));return ids.every(Boolean)&&new Set(ids).size===ids.length;};
  if(![datasets,r.runs,r.reviews].every(uniqueIds))throw new Error('History record IDs must be unique and nonempty.');
  for(const run of r.runs){
    const plan=plans.find(p=>p.status==='recorded'&&p.number===run.planRevision),dataset=datasets.find(d=>d.id===run.datasetId&&d.planRevision===run.planRevision);
    if(!plan||!dataset)throw new Error('Run provenance is invalid.');at(run.createdAt);
    if(run.algorithmVersion!==STUDY_VERSION||!text(run.softwareVersion,'software version',100)||!Array.isArray(run.checks)||!run.checks.every((c:unknown)=>typeof c==='string'))throw new Error('Unsupported saved calculation.');
    const expectedCounts=plan.data.template==='counting'?countSummary(dataset.pairs):null,expectedQA=plan.data.template==='prediction'?qaSummary(dataset.qaRecords,plan.data.unit):null;
    const matches=(actual:unknown,expected:CountSummary|QASummary|null)=>expected===null?actual===null:!!actual&&typeof actual==='object'&&Object.entries(expected).every(([key,value])=>(actual as Record<string,unknown>)[key]===value);
    if(!matches(run.counts,expectedCounts)||!matches(run.qa,expectedQA))throw new Error('Saved results do not match their pinned inputs.');
  }
  for(const review of r.reviews){if(!plans.some(p=>p.status==='recorded'&&p.number===review.planRevision)||!Object.hasOwn(REVIEW_DECISIONS,review.decision)||!review.reviewer?.trim()||!review.comments?.trim())throw new Error('Review provenance is invalid.');if(review.datasetId!==null&&!datasets.some(d=>d.id===review.datasetId&&d.planRevision===review.planRevision))throw new Error('Review dataset is missing.');if(review.runId!==null&&!r.runs.some(run=>run.id===review.runId&&run.datasetId===review.datasetId&&run.planRevision===review.planRevision))throw new Error('Review run is missing.');at(review.createdAt);}
  return {...r,createdAt:at(r.createdAt),plans,datasets} as unknown as Study;
}
export function studyDatasetStale(dataset:StudyDataset|undefined,records:QARecord[]):boolean {
  return !!dataset?.qaRecords.some(pinned=>{const current=records.find(r=>r.id===pinned.id);return !current||currentQA(current).number!==currentQA(pinned).number;});
}
export function examplePairs():CountPair[] {
  return [[9,10],[11,10],[21,18],[null,18],[0,0],[5,5]].map(([estimate,reference],i)=>({id:'fixture-'+i,observationRef:'Fixture image '+(i+1),unitRef:'Mock container '+(Math.floor(i/2)+1),observedOn:'2026-11-19',origin:'synthetic_demo',estimate,reference,method:'Predefined synthetic estimate; no AI request',referenceMethod:'Predefined fixture reference; not a biological measurement',referenceReviewer:'Synthetic reference reviewer',referenceIndependent:true,blinding:'yes',excluded:i===5,exclusionReason:i===5?'Illustrative duplicate exclusion':''}));
}
export function makeExampleStudy(id:string,now:string):Study {
  const p={...defaultPlan(),title:'Synthetic counting-method example',expectedOrigin:'synthetic_demo' as const,plannedUnits:3,samplingRationale:'A small fictional workflow example, not a powered biological study.',allocation:'Six predefined observations across three mock containers.',blinding:'The fixture declares blinded references to demonstrate the fields; no human trial occurred.',inclusion:'The six labelled synthetic observations.',exclusion:'The sixth observation represents a documented duplicate.',missingDataPlan:'One unknown estimate remains missing; report it separately.'};
  const recorded=recordStudyPlan(makeStudy(p,id,now),now);
  return captureStudyDataset(recorded,{id:id+'-data',planRevision:latestPlan(recorded).number,capturedAt:now,notes:'Explicit synthetic fixture. No model was called.',pairs:examplePairs(),qaRecords:[]});
}
function reportText(value:string):string {return value.replaceAll('<','&lt;').replaceAll('>','&gt;');}
export function studyReport(study:Study):string {
  const p=latestPlan(study),d=currentDataset(study),r=currentRun(study),review=currentStudyReview(study);
  const lines=['# '+reportText(p.data.title),'','Software version: '+STUDY_SOFTWARE+'; calculation: '+STUDY_VERSION+'.','Local study ID: '+study.id+'. Plan version: '+p.number+' ('+p.status+'), '+p.savedAt+'.','This is a locally dated plan and review record, not external preregistration or certification.','','## Study methods',''];
  for(const key of ['template','question','primaryOutcome','hypothesis','expectedOrigin','unit','plannedUnits','comparator','samplingRationale','allocation','blinding','inclusion','exclusion','analysisPlan','missingDataPlan','repeatedMeasuresPlan','references'] as const)lines.push('**'+key+'**: '+reportText(p.data[key]===null?'Undecided':String(p.data[key]||'Not specified')),'');
  lines.push('## Dataset snapshot','',d?'Snapshot '+d.id+', captured '+d.capturedAt+', tied to plan '+d.planRevision+'.':'No dataset captured for this plan version.','',d?reportText(d.notes):'','');
  if(d?.pairs.length){lines.push('### Count inputs','','The JSON audit contains the full input records and their declarations.');for(const pair of d.pairs)lines.push('- '+reportText(pair.observationRef)+'; unit '+reportText(pair.unitRef)+'; origin '+pair.origin+'; estimate '+(pair.estimate??'unknown')+'; reference '+(pair.reference??'unknown')+'; '+(pair.excluded?'excluded: '+reportText(pair.exclusionReason):'included')+'.');}
  if(d?.qaRecords.length){lines.push('### QA snapshot references','');for(const record of d.qaRecords){const q=currentQA(record);lines.push('- '+record.id+', QA revision '+q.number+', '+reportText(q.data.container)+', '+q.data.observedOn+', origin '+q.data.origin+', outcome '+q.data.outcome+'.');}}
  lines.push('','## Descriptive / readiness output','',r?'Run '+r.id+', '+r.createdAt+'; algorithm '+r.algorithmVersion+'; software '+r.softwareVersion+'.':'Not run for this plan/dataset version.','');
  if(r){const results=r.counts??r.qa;for(const [key,value] of Object.entries(results||{}))lines.push('- '+key+': '+(value===null?'unknown':value));lines.push('','### Checks and limitations','',...r.checks.map(c=>'- '+reportText(c)));}else lines.push(...planChecks(p.data).map(c=>'- '+reportText(c)));
  lines.push('','## Current review','',review?reportText(review.reviewer)+' — '+REVIEW_DECISIONS[review.decision]+' — '+review.createdAt:'No review for the current plan/dataset/run combination.','',review?reportText(review.comments):'','Reviewer labels are self-entered. Review does not authenticate the reviewer or establish field effectiveness.','','## History and reproducibility','','Plan versions: '+study.plans.length+'; dataset snapshots: '+study.datasets.length+'; runs: '+study.runs.length+'; reviews: '+study.reviews.length+'.','Export the JSON audit alongside this report to preserve all versions, inputs, exclusions, source QA snapshots, results and reviews. The audit contains no image bytes.','');
  return lines.join('\n');
}
export function studyAudit(study:Study):string {return JSON.stringify({schema:'study-audit-v1',exportedAt:new Date().toISOString(),softwareVersion:STUDY_SOFTWARE,algorithmVersion:STUDY_VERSION,methods:{countError:'estimate - reference',mae:'mean(abs(countError)) over complete non-excluded pairs',unitBalancedMae:'mean of each independent-unit-reference mean absolute error',uncertainty:'No confidence interval or p-value is calculated.',model:'No model is trained by step 4B.'},guidanceReferences:STUDY_REFERENCES,study},null,2);}
