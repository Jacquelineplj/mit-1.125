const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, schools = [], selected = new Set(), sortKey = 'name', sortDirection = 1, activePoint = null;
const number = n => n === null ? 'Not reported' : n.toLocaleString('en-US', {maximumFractionDigits: 2});
const pct = (n,d) => d ? `${(100*n/d).toFixed(1)}%` : 'Not available';
const sourceLink = () => `<a href="${esc(data.meta.sourceUrl)}" target="_blank" rel="noreferrer">Official BPS spreadsheet ↗</a>`;
let pickerIndex = -1;
function closeSchoolPicker(){ $('school-options').hidden=true; $('search').setAttribute('aria-expanded','false'); $('school-toggle').setAttribute('aria-expanded','false'); $('search').removeAttribute('aria-activedescendant'); pickerIndex=-1; }
function openSchoolPicker(){
 const query=$('search').value.trim().toLowerCase();
 const matches=schools.filter(s=>s.name.toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));
 $('school-options').innerHTML=`<div id="school-option-all" role="option" aria-selected="false" data-school="">All schools</div>`+matches.map(s=>`<div id="school-option-${esc(s.id)}" role="option" aria-selected="false" data-school="${esc(s.id)}">${esc(s.name)}<small>${esc(s.neighborhood)} · Grades ${esc(s.grades)}</small></div>`).join('')+(!matches.length?'<p class="picker-empty">No school names match.</p>':'');
 $('school-options').hidden=false; $('search').setAttribute('aria-expanded','true'); $('school-toggle').setAttribute('aria-expanded','true'); pickerIndex=-1;
 $('search').removeAttribute('aria-activedescendant');
 document.querySelectorAll('[data-school]').forEach(option=>option.onpointerdown=e=>{e.preventDefault();chooseSchool(option);});
}
function chooseSchool(option){ const school=schools.find(s=>s.id===option.dataset.school); $('search').value=school?.name??''; render(); closeSchoolPicker(); $('search').focus(); closeSchoolPicker(); }
function setupSchoolPicker(){
 $('search').addEventListener('focus',openSchoolPicker);
 $('search').addEventListener('input',openSchoolPicker);
 $('school-toggle').onclick=()=>{if(!$('school-options').hidden){closeSchoolPicker();}else{$('search').focus();openSchoolPicker();}};
 $('search').addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSchoolPicker();return;}
  if(e.key==='Tab'){closeSchoolPicker();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();if($('school-options').hidden)openSchoolPicker();
   const options=[...document.querySelectorAll('[data-school]')];
   pickerIndex=Math.max(0,Math.min(options.length-1,pickerIndex+(e.key==='ArrowDown'?1:-1)));
   options.forEach((o,i)=>o.setAttribute('aria-selected',String(i===pickerIndex)));
   $('search').setAttribute('aria-activedescendant',options[pickerIndex].id);options[pickerIndex].scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'&&!$('school-options').hidden){e.preventDefault();const options=[...document.querySelectorAll('[data-school]')];chooseSchool(options[pickerIndex>=0?pickerIndex:options.length>1?1:0]);}
 });
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.school-field'))closeSchoolPicker();});
}
function subset() { return schools.filter(s => (!$('search').value || s.name.toLowerCase().includes($('search').value.toLowerCase().trim())) && (!$('neighborhood').value || s.neighborhood === $('neighborhood').value) && (!$('level').value || s.level === $('level').value) && (!$('score').value || ($('score').value === 'missing' ? s.score === null : $('score').value === 'low' ? s.score !== null && s.score <= 1 : s.score === Number($('score').value)))); }
function render() {
 const rows=subset(), valid=rows.filter(s=>s.score!==null), util=rows.filter(s=>s.utilization!==null), low=valid.filter(s=>s.score<=1), over=util.filter(s=>s.utilization>100);
 $('result-count').textContent=`${rows.length} of ${schools.length} school / campus records`;
 $('metrics').innerHTML=[['Records in selection',rows.length,'School / campus rows, not unique buildings'],['Valid building scores',valid.length,`${rows.length-valid.length} missing · Scale: 0–4`],['Lower building scores',low.length,`Score 0–1 · ${valid.length} valid records`],['Above 100% utilization',over.length,`5-year average · ${util.length} valid records`]].map(([label,n,note])=>`<article class="metric"><div class="metric-label">${label}</div><div class="metric-number">${n}</div><small>${note}</small></article>`).join('');
 const counts=[0,1,2,3,4].map(i=>valid.filter(s=>s.score===i).length), max=Math.max(1,...counts);
 $('distribution').innerHTML=rows.length?counts.map((n,i)=>`<div class="bar-row"><button type="button" data-score="${i}" aria-label="Filter to building score ${i}">Score ${i}</button><div class="bar-track"><div class="bar ${i<=1?'low':''}" style="width:${n/max*100}%"></div></div><span class="bar-value">${n} <small>(${valid.length?Math.round(n/valid.length*100):0}%)</small></span></div>`).join('')+'<div class="chart-legend"><span><i class="legend-key low"></i>Scores 0–1</span><span><i class="legend-key"></i>Scores 2–4</span></div>':'<div class="empty">No records match your filters.<br>Reset filters to explore the dataset.</div>';
 $('distribution-foot').textContent=`${valid.length} scored records; ${rows.length-valid.length} missing. Percentages use valid scores. Score assessment date is unspecified in this export.`;
 document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{$('score').value=b.dataset.score;render();});
 const visibleIds = new Set(rows.map(s=>s.id));
 selected = new Set([...selected].filter(id=>visibleIds.has(id)));
 if (!visibleIds.has(activePoint)) activePoint = null;
 renderScatter(rows); renderTable(rows); renderFindings(rows); updateSelection();
}
function renderScatter(rows) {
 const paired=rows.filter(s=>s.score!==null && s.utilization!==null);
 $('scatter-foot').textContent=`${paired.length} paired records; ${rows.length-paired.length} excluded for missing score or utilization. Points spread horizontally for visibility; scores remain integers. Historical averages do not establish current crowding.`;
 if (!paired.length) {$('scatter').innerHTML='<div class="empty">No complete score / utilization pairs in this selection.</div>';$('point-detail').textContent='Select another filter to explore school records.';return;}
 const width=590,height=260,left=53,right=24,top=19,bottom=47;
 const ymax=Math.max(150,Math.ceil(Math.max(...paired.map(s=>s.utilization))/50)*50);
 const x=v=>left+(v+.4)/4.8*(width-left-right), y=v=>top+(1-v/ymax)*(height-top-bottom);
 const step=ymax>300?100:50;
 const ticks=[];for(let v=0;v<=ymax;v+=step)ticks.push(v);
 const ticksHtml=ticks.map(v=>`<line class="gridline" x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end">${v}%</text>`).join('');
 $('scatter').innerHTML=`<svg class="scatter" viewBox="0 0 ${width} ${height}" role="group" aria-label="Building score versus five-year average utilization. Each point is a selectable school or campus. Exact values are also in the table."><text x="${left}" y="11">Utilization · 5-year average</text>${ticksHtml}<line class="threshold" x1="${left}" x2="${width-right}" y1="${y(100)}" y2="${y(100)}"/>${[0,1,2,3,4].map(v=>`<text x="${x(v)}" y="${height-26}" text-anchor="middle">${v}</text>`).join('')}<text x="${width/2}" y="${height-5}" text-anchor="middle">Building Experience Score (0–4)</text>${paired.map((s,i)=>{const jitter=((Number.parseInt(s.id,10)||i)%11-5)*3.4;return `<circle data-point="${esc(s.id)}" cx="${x(s.score)+jitter}" cy="${y(s.utilization)}" r="5.5" fill="${s.score<=1?'#a86335':'#295e7e'}" tabindex="0" role="button" aria-label="${esc(s.name)}: score ${s.score} of 4, utilization ${s.utilization} percent"><title>${esc(s.name)} · ${s.score}/4 · ${s.utilization}%</title></circle>`;}).join('')}</svg><div class="reference-legend"><span aria-hidden="true"></span>100% reference · reported capacity</div>`;
 const show=id=>{activePoint=id;const s=schools.find(s=>s.id===id);$('point-detail').innerHTML=`<strong>${esc(s.name)}</strong><br>Score ${s.score}/4 · Utilization ${number(s.utilization)}% (5-year avg) · ${esc(s.neighborhood)} · Source row ${s.sourceRow}`;};
 document.querySelectorAll('[data-point]').forEach(p=>{p.onclick=()=>show(p.dataset.point);p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(p.dataset.point);}};});
 if(activePoint)show(activePoint);else $('point-detail').textContent='Select a school point to see its reported values.';
}
function sorted(rows) {return [...rows].sort((a,b)=>{if(a[sortKey]===null && b[sortKey]===null)return a.name.localeCompare(b.name);if(a[sortKey]===null)return 1;if(b[sortKey]===null)return -1;return sortDirection*(typeof a[sortKey]==='number'?a[sortKey]-b[sortKey]:a[sortKey].localeCompare(b[sortKey]))||a.name.localeCompare(b.name);});}
function valueCell(s,key){if(s[key]===null)return s.status[key]==='qualified_value'?`<span class="missing">${esc(s.raw[key])}</span><small>Qualified; not compared</small>`:'<span class="missing">Not reported</span>';if(key==='score')return `<span class="score-pill ${s.score<=1?'low':''}">${s.score} / 4</span>`;if(key==='utilization')return `<span class="${s.utilization>100?'util-high':''}">${number(s.utilization)}%</span>`;return number(s[key]);}
function notes(s){const missing=['score','utilization','enrollment','capacity'].filter(k=>s[k]===null && s.status[k]!=='qualified_value');return [...(missing.length?[`Missing: ${missing.join(', ')}`]:[]),...s.notes];}
function renderTable(rows){
 $('school-rows').innerHTML=rows.length?sorted(rows).map(s=>`<tr><td><input type="checkbox" data-select="${esc(s.id)}" aria-label="Compare ${esc(s.name)}" ${selected.has(s.id)?'checked':''}></td><td>${esc(s.name)}<small>${esc(s.id)} · Grades ${esc(s.grades)}</small></td><td>${esc(s.neighborhood)}</td><td>${esc(s.level)}</td><td>${valueCell(s,'score')}</td><td>${valueCell(s,'utilization')}</td><td>${valueCell(s,'enrollment')}</td><td>${valueCell(s,'capacity')}</td><td>${notes(s).length?`<details class="row-notes"><summary>Review notes</summary>${notes(s).map(n=>`<p>${esc(n)}</p>`).join('')}</details>`:'<span class="notes-pill">Core values reported</span>'}</td></tr>`).join(''):'<tr><td colspan="9" class="empty">No matching school records. Reset filters to start again.</td></tr>';
 document.querySelectorAll('[data-select]').forEach(box=>box.onchange=()=>{if(box.checked){if(selected.size===4){box.checked=false;$('selection-note').textContent='You can compare up to four records. Deselect one to add another.';return;}selected.add(box.dataset.select);}else selected.delete(box.dataset.select);updateSelection();});
 document.querySelectorAll('[data-sort]').forEach(b=>{b.closest('th').setAttribute('aria-sort',b.dataset.sort===sortKey?(sortDirection===1?'ascending':'descending'):'none');b.onclick=()=>{if(sortKey===b.dataset.sort)sortDirection*=-1;else{sortKey=b.dataset.sort;sortDirection=1;}renderTable(subset());};});
}
function updateSelection(){
 $('compare-button').textContent=`Compare selected (${selected.size})`;$('compare-button').disabled=selected.size<2;
 $('selection-note').textContent=selected.size?`${selected.size} of 4 selected. Changing filters removes selections that are no longer visible.`:'Choose records with the checkboxes to compare their reported values.';
 if(!$('comparison').hidden){if(selected.size>=2)renderComparison();else $('comparison').hidden=true;}
}
function renderComparison(){
 const chosen=schools.filter(s=>selected.has(s.id));
 const fields=[['Neighborhood','neighborhood'],['Grades served','grades'],['Source address','address'],['Building score (0–4)','score'],['Utilization (5-year avg, %)','utilization'],['Enrollment (students)','enrollment'],['Capacity (places)','capacity']];
 $('comparison').innerHTML=`<div class="comparison-panel"><div class="section-heading"><h3>Selected school / campus records</h3><button class="reset" id="close-comparison">Close comparison</button></div><table><caption class="sr-only">Side-by-side comparison of selected records</caption><thead><tr><th scope="col">Reported measure</th>${chosen.map(s=>`<th scope="col">${esc(s.name)}<br><small>${esc(s.id)}</small></th>`).join('')}</tr></thead><tbody>${fields.map(([label,key])=>`<tr><th scope="row">${label}</th>${chosen.map(s=>`<td>${['score','utilization','enrollment','capacity'].includes(key)?valueCell(s,key):esc(s[key])}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Source and caveats</th>${chosen.map(s=>`<td><a href="${esc(data.meta.sourceUrl)}&range=A${s.sourceRow}:AY${s.sourceRow}" target="_blank" rel="noreferrer">Source row ${s.sourceRow} ↗</a><p>${notes(s).map(esc).join(' ')||'Core values reported; current operating status has not been verified.'}</p></td>`).join('')}</tr></tbody></table><p>These measures use mixed or unspecified periods. Shared campuses may refer to overlapping facilities. No capacity totals are calculated.</p></div>`;
 $('close-comparison').onclick=()=>{$('comparison').hidden=true;$('compare-button').focus();};
}
function renderFindings(rows){
 const valid=rows.filter(s=>s.score!==null), util=rows.filter(s=>s.utilization!==null), paired=rows.filter(s=>s.score!==null&&s.utilization!==null), low=valid.filter(s=>s.score<=1), over=util.filter(s=>s.utilization>100), combined=paired.filter(s=>s.score<=1&&s.utilization>100);
 $('findings-scope').textContent=`Current selection: ${rows.length} records · Source updated November 8, 2025 · Descriptive, unweighted record counts.`;
 if(!rows.length){$('finding-cards').innerHTML='<p class="empty">No findings for an empty selection.</p>';$('recommendations').innerHTML='<p class="empty">Select school records to see evidence-supported actions.</p>';return;}
 const findings=[
 [pct(low.length,valid.length),'Lower facilities scores',valid.length?`${low.length} of ${valid.length} scored records are at 0–1 out of 4. ${rows.length-valid.length} records have no score. The assessment date is unspecified in this export.`:'No valid building scores are available for this selection. Missing scores cannot be treated as zero.','distribution-panel'],
 [pct(over.length,util.length),'Historical space pressure',util.length?`${over.length} of ${util.length} records with utilization data exceed 100%. This is the reported five-year average; exact component years are unspecified.`:'No utilization data are available for this selection. Current crowding cannot be inferred.','scatter-panel'],
 [`${combined.length} / ${paired.length}`,'Two signals coincide',`${combined.length} of ${paired.length} complete pairs combine score 0–1 with utilization above 100%. These mixed-period signals can guide follow-up; they do not establish present conditions.`,'schools']];
 $('finding-cards').innerHTML=findings.map(([n,title,body,link])=>`<article class="finding"><div class="finding-number">${n}</div><h3>${title}</h3><p>${body}</p><a href="#${link}">Explore the evidence ↗</a></article>`).join('');
 const firstNames=list=>list.slice(0,3).map(s=>esc(s.name)).join('; ')+(list.length>3?'; and other matching records':'');
 const actions=[];
 if(low.length)actions.push(['FACILITIES STAFF + SCHOOL LEADERS','Assess the spaces behind lower scores',`Start with the ${low.length} records scoring 0–1 out of ${valid.length} scored records in this selection. Examples: ${firstNames(low)}.`,`Confirm current school and campus status, then review learning-space adequacy with staff and students. Check updated room layouts and assessment details before recommending changes.`]);
 else actions.push(['CAPITAL PLANNING STAFF','Verify the scope before setting priorities',`${valid.length} scored records in this selection have no scores of 0–1. ${rows.length-valid.length} records are unscored.`,`A lack of lower scores is not evidence that every facility need is met. Verify missing assessments and present-day conditions before creating a review list.`]);
 if(over.length)actions.push(['FACILITIES + ENROLLMENT PLANNERS','Check current space use',`${over.length} of ${util.length} records with utilization data exceed 100% on a five-year average. Examples: ${firstNames(over)}.`,`Confirm current enrollment, usable rooms, shared-space arrangements, and capacity definitions. Begin with the ${combined.length} records that also score 0–1 when both signals warrant review; do not assume historical pressure continues today.`]);
 else actions.push(['FACILITIES + ENROLLMENT PLANNERS','Resolve the capacity evidence gap',`${over.length} of ${util.length} valid utilization records exceed 100%; ${rows.length-util.length} records have no utilization value.`,`Check missing values and current room usage before ruling out crowding. Historical averages can conceal variation between years, programs, and rooms.`]);
 $('recommendations').innerHTML=actions.map(([owner,title,evidence,action])=>`<article class="recommendation"><p class="eyebrow">${owner}</p><h3>${title}</h3><p><strong>Evidence:</strong> ${evidence}</p><p><strong>Next step:</strong> ${action}</p><p>${sourceLink()} · <a href="#schools">Inspect records</a></p></article>`).join('');
}
function registerTools(){
 const context=document.modelContext;if(!context?.registerTool)return;
 const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const execute=input=>{if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('Expected filter object');const allowed=['search','neighborhood','level','score'];for(const [k,v]of Object.entries(input)){if(!allowed.includes(k)||typeof v!=='string')throw new Error('Invalid filter');if(k!=='search'&&![...$(k).options].some(o=>o.value===v))throw new Error(`Unknown ${k}`);}for(const k of allowed)$(k).value=input[k]??'';render();return {records:subset().length,filters:Object.fromEntries(allowed.map(k=>[k,$(k).value]))};};
 try{Promise.resolve(context.registerTool({name:'set_school_filters',description:'Replace the explorer filters and update charts, table, and findings. Omitted filters reset to all.',inputSchema:{type:'object',properties:Object.fromEntries(['search','neighborhood','level','score'].map(k=>[k,{type:'string'}])),additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute},{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
async function init(){try{const response=await fetch('data/schools.json');if(!response.ok)throw new Error('Dataset could not be loaded');data=await response.json();schools=data.schools;for(const field of ['neighborhood','level']){[...new Set(schools.map(s=>s[field]))].sort().forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;$(field).append(option);});}for(const field of ['search','neighborhood','level','score'])$(field).addEventListener('input',render);$('filters').onsubmit=e=>e.preventDefault();$('reset').onclick=()=>{HTMLFormElement.prototype.reset.call($('filters'));selected.clear();activePoint=null;closeSchoolPicker();render();};$('compare-button').onclick=()=>{$('comparison').hidden=false;renderComparison();$('comparison').scrollIntoView({behavior:'smooth',block:'center'});};setupSchoolPicker();render();registerTools();}catch(e){$('error').hidden=false;$('error').textContent='The dataset could not be loaded. Please reload this local preview or consult the original BPS source. '+e.message;$('result-count').textContent='Data unavailable';}}
init();
