import './style.css';
import {openLibrary, readLibrary, writeLibrary, decodeFile, MAX_BYTES} from './storage.js';
import {createRunner} from './runner.js';
import {inspectHTML} from './document-info.js';

const $ = selector => document.querySelector(selector);
$('#app').innerHTML = `
<header class="topbar"><a class="brand" href="#" aria-label="HTML Reader 홈"><span class="brand-icon">&lt;/&gt;</span> HTML <b>Reader</b></a><span class="top-note">파일을 열고, 기능까지 그대로</span><span class="local-badge"><i></i> 기기에 보관</span></header>
<div id="reading-tools" hidden><strong id="reading-name"></strong><button id="exit-reading">넓게 읽기 종료</button></div>
<main class="layout"><aside class="library">
<div class="section-title"><span>MY LIBRARY</span><span id="file-count">00</span></div>
<h1>내 HTML 파일을<br>기능까지 그대로<span>.</span></h1><p class="intro">문서, 계산기, 실습 페이지까지.<br>저장된 HTML을 열어 사용하세요.</p>
<button class="primary import-button" id="import">＋ HTML 열기</button><input hidden id="file-input" type="file" accept=".html,.htm,text/html" multiple>
<div class="library-label">보관한 파일 <span id="filtered-count"></span></div>
<label class="search-label" for="file-search">파일 찾기</label><input id="file-search" type="search" placeholder="파일 이름 또는 문서 제목" autocomplete="off">
<label class="search-label" for="file-sort">정렬</label><select id="file-sort"><option value="recent">최근 열람순</option><option value="name">이름순</option><option value="imported">최근 가져온 순</option></select><div id="files"></div><p id="file-list-empty"></p>
<details id="examples" class="examples"><summary>예제 파일로 확인</summary><p>리더 동작을 확인하는 예제입니다.</p><button data-example="calculator">계산기 열기</button><button data-example="notes">저장 메모 열기</button><button id="demo">모의고사 추가 ↗</button></details>
<div class="privacy-note"><span>◈</span><p>내 파일은 내 브라우저에만.<br><small>가져온 파일은 서버로 업로드하지 않아요.<br>브라우저 데이터 삭제 시 함께 지워집니다.</small></p></div>
</aside><section class="workspace">
<div class="workspace-heading"><div><span class="eyebrow">HTML FILE READER</span><h2 id="document-name">HTML 파일을 열어보세요.</h2><p id="document-meta">화면 표시와 파일에 포함된 JavaScript 기능을 지원합니다.</p></div><span class="web-badge">WEB READER</span></div>
<div id="notice" role="status" aria-live="polite"></div>
<div class="empty" id="empty"><div class="empty-art"><span>&lt;</span><div class="paper"><i></i><i></i><i></i><b>HTML</b></div><span>/&gt;</span></div><h3>저장된 HTML을 여기서 열어보세요.</h3><p>파일을 선택하거나 이 화면에 끌어다 놓으세요.<br>버튼, 입력, 계산 등 문서에 포함된 기능을 사용할 수 있어요.</p><button class="primary" id="empty-import">HTML 열기 ↗</button><p class="empty-foot">UTF-8 · HTML / HTM · 파일당 최대 5MiB</p></div>
<div id="document" hidden>
<div class="tabs-row"><div class="tabs" role="tablist" aria-label="문서 화면"><button id="run-tab" role="tab" aria-label="실행" aria-selected="true" aria-controls="run-panel">▷ 읽기 및 실행</button><button id="source-tab" role="tab" aria-label="소스" aria-selected="false" aria-controls="source-panel">&lt;/&gt; 소스 편집</button></div><span id="save-status" role="status" aria-live="polite">저장됨</span></div>
<div class="toolbar"><div class="run-tools"><button id="reading-mode" aria-pressed="false">넓게 읽기</button><button id="rerun">↻ 재실행</button><button id="stop">□ 실행 종료</button></div><div class="export-tools"><button id="export-original">↓ 원본 내보내기</button><button id="export">↓ 수정본 내보내기</button></div></div>
<p id="resource-notice" class="resource-notice" role="status" hidden></p>
<div class="unapplied" id="unapplied" hidden>미적용 변경이 있습니다. 소스 화면에서 적용하고 실행하세요.</div>
<section id="run-panel" role="tabpanel" aria-labelledby="run-tab"><div id="frame-host"></div><div class="execution-caption"><span id="execution-status">실행 준비 중</span><span>외부 리소스 차단 · 파일별 저장 격리</span></div><p class="execution-limit">웹 시연판은 HTML의 자체 페이지 이동과 무한 반복을 완전히 차단하지 못합니다. 신뢰하는 파일로 확인해 주세요.</p></section>
<section id="source-panel" role="tabpanel" aria-labelledby="source-tab" hidden><div id="editor"></div><div class="editor-actions"><button id="restore">원본 복구</button><button id="discard">미적용 변경 취소</button><button id="apply" class="primary">적용하고 실행 →</button></div></section>
<details class="file-settings"><summary>파일 관리 및 저장 데이터</summary><div><button id="rename">이름 변경</button><button id="copy">새 사본</button><button id="clear-data">파일 저장 데이터 초기화</button><button id="delete" class="danger">파일 삭제</button><button id="retry">다시 저장</button></div><p id="storage-usage"></p></details>
<details class="log-panel"><summary>실행 로그 <span id="log-count">0</span></summary><button id="clear-log" class="text-button">로그 지우기</button><ol id="logs"></ol></details>
</div>
<footer><span>HTML · CSS · JavaScript <span id="offline-status"></span></span><span>웹 리더입니다. iOS 설치형 앱의 파일 연결은 별도 개발이 필요합니다.</span></footer>
</section></main>
<dialog id="duplicate-dialog"><h2>같은 이름의 파일이 있어요</h2><p>교체하면 원본과 소스가 바뀝니다. 파일 저장 데이터는 유지됩니다.<br>새 사본은 저장 데이터 없이 별도로 보관합니다.</p><div><button data-choice="cancel">취소</button><button data-choice="copy">새 사본</button><button data-choice="replace" class="primary">교체</button></div></dialog>`;

let db, documents = [], currentId, frame, editor, changeTimer, saveQueue = Promise.resolve(), revision = 0, logs = [], editorLoading = false;
const ports = new Map();
const infoCache = new WeakMap();
let importing = false;
const active = () => documents.find(doc => doc.id === currentId);
const infoFor = doc => {
  let entry = infoCache.get(doc);
  if (!entry || entry.source !== doc.applied) {entry = {source:doc.applied, info:inspectHTML(doc.applied)}; infoCache.set(doc,entry);}
  return entry.info;
};
const bytes = value => new TextEncoder().encode(value).length;
const formatBytes = count => count < 1024 ? `${count} B` : `${(count/1024).toFixed(1)} KB`;
function notify(message, error = false) { $('#notice').textContent = message; $('#notice').classList.toggle('error', error); }
async function persist() {
  clearTimeout(changeTimer);
  const version = ++revision;
  $('#save-status').textContent = '저장 중';
  // Snapshot on enqueue; IndexedDB transactions commit in order.
  const snapshot = structuredClone(documents);
  const operation = saveQueue.catch(() => {}).then(async () => {
    if (!db) db = await openLibrary();
    await writeLibrary(db, snapshot);
  });
  saveQueue = operation;
  try {await operation; if (version === revision) $('#save-status').textContent = '저장됨';}
  catch (error) {$('#save-status').textContent = '저장 실패'; notify(`저장 실패: ${error.message} 현재 내용은 메모리에 유지됩니다. 다시 저장하거나 내보내세요.`, true); throw error;}
}
function saveSoon() { $('#save-status').textContent = '변경 있음'; clearTimeout(changeTimer); changeTimer = setTimeout(() => {void persist().catch(() => {});}, 500); }
function updateUnapplied() {$('#unapplied').hidden = !active() || active().draft === active().applied;}
function addLog(level, message) {
  logs.push({level, message:message.slice(0,2000)}); logs = logs.slice(-100);
  $('#log-count').textContent = logs.length;
  $('#logs').replaceChildren(...logs.map(entry => {const li = document.createElement('li');li.className=entry.level;li.textContent=`${entry.level.toUpperCase()} · ${entry.message}`;return li;}));
}
function renderFiles() {
  $('#file-count').textContent = String(documents.length).padStart(2,'0');
  const query = $('#file-search').value.trim().toLocaleLowerCase();
  const visible = documents.filter(doc => `${doc.name} ${infoFor(doc).title}`.toLocaleLowerCase().includes(query));
  const sort = $('#file-sort').value;
  visible.sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name,'ko-KR') : sort === 'imported' ? b.importedAt-a.importedAt : b.openedAt-a.openedAt);
  $('#filtered-count').textContent = query ? `${visible.length} / ${documents.length}` : '';
  $('#file-list-empty').textContent = visible.length ? '' : documents.length ? '일치하는 파일이 없습니다.' : '아직 보관한 파일이 없습니다.';
  $('#files').replaceChildren(...visible.map(doc => {
    const button = document.createElement('button');button.className = `file-card ${doc.id === currentId ? 'selected' : ''}`;
    const icon = document.createElement('span');icon.className='file-icon';icon.textContent='</>';
    const text = document.createElement('span');const name=document.createElement('strong');name.textContent=doc.name;
    const detail=document.createElement('small');detail.textContent=`${formatBytes(bytes(doc.original))} · ${infoFor(doc).title || new Date(doc.openedAt).toLocaleDateString('ko-KR')}`;
    text.append(name,detail);button.append(icon,text);button.onclick=()=>void openDocument(doc.id);return button;
  }));
}
function renderDocument() {
  const doc=active();$('#empty').hidden=!!doc;$('#document').hidden=!doc;
  const info=doc && infoFor(doc);
  $('#document-name').textContent=doc?.name || 'HTML 파일을 열어보세요.';
  $('#document-meta').textContent=doc ? `${info.title ? `${info.title} · ` : ''}UTF-8 · ${formatBytes(bytes(doc.original))} · 이 브라우저에 보관` : '화면 표시와 파일에 포함된 JavaScript 기능을 지원합니다.';
  $('#reading-name').textContent=doc?.name || '';
  $('#storage-usage').textContent=doc ? `이 파일의 저장 데이터: ${formatBytes(bytes(JSON.stringify(doc.web)))} / 5MiB` : '';
  const hasResources=info && (info.resources.length || info.hasSrcset);
  $('#resource-notice').hidden=!hasResources;
  $('#resource-notice').textContent=hasResources ? `이 파일에는 별도 리소스 연결이 있습니다${info.resources.length ? ` (${info.resources.slice(0,3).join(', ')})` : ''}. 현재 버전은 HTML 내부에 포함된 CSS·JavaScript·이미지를 지원합니다. 별도 파일과 외부 서버 연결은 지원하지 않아 일부 화면이나 기능이 동작하지 않을 수 있습니다.` : '';
  updateUnapplied();renderFiles();
}
function run() {
  const doc=active();if (!doc) return;
  for(const port of ports.keys()) port.close();ports.clear();
  frame?.remove();frame=document.createElement('iframe');
  frame.title='HTML 실행 영역';frame.setAttribute('sandbox','allow-scripts allow-modals allow-forms');
  frame.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'");
  const runId=crypto.randomUUID();frame.dataset.runId=runId;
  frame.srcdoc=createRunner(doc.applied,doc.web,runId);
  $('#frame-host').replaceChildren(frame);$('#execution-status').textContent='실행 준비 중';
  frame.addEventListener('load',()=> {$('#execution-status').textContent='HTML 실행 중';});
}
addEventListener('message', event => {
  if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'study:boot' || event.data.runId !== frame.dataset.runId || !event.ports[0]) return;
  const port=event.ports[0], doc=active();if (!doc) return;ports.set(port,doc.id);
  port.onmessage=async ({data}) => {
    if (!documents.includes(doc)) return;
    if (data?.type==='ready') {$('#execution-status').textContent='HTML 실행 중';return;}
    if (data?.type==='log' && typeof data.message === 'string') {addLog(['warn','error'].includes(data.level)?data.level:'info', data.message);return;}
    if (data?.type!=='storage' || !data.values || Array.isArray(data.values) || typeof data.values!=='object') return;
    const entries=Object.entries(data.values);
    if (entries.some(([key,value])=>key.length>MAX_BYTES || typeof value!=='string') || bytes(JSON.stringify(data.values))>MAX_BYTES) {port.postMessage({type:'failed'});return;}
    doc.web=Object.fromEntries(entries);renderDocument();
    try {await persist();port.postMessage({type:'saved'});} catch {port.postMessage({type:'failed'});}
  };port.start();
});
async function openDocument(id) {
  if (active() && $('#save-status').textContent==='변경 있음') await persist().catch(()=>{});
  setReadingMode(false);currentId=id;const doc=active();doc.openedAt=Date.now();logs=[];$('#logs').replaceChildren();$('#log-count').textContent='0';renderDocument();
  if (editor) {editorLoading=true;editor.setSource(doc.draft);editorLoading=false;}
  showTab('run');run();void persist().catch(()=>{});
}
async function duplicateChoice() {
  const dialog=$('#duplicate-dialog');dialog.showModal();
  return new Promise(resolve=>{
    const done = choice => {dialog.close();dialog.oncancel=null;dialog.querySelectorAll('button').forEach(b=>b.onclick=null);resolve(choice);};
    dialog.oncancel=event=>{event.preventDefault();done('cancel');};
    dialog.querySelectorAll('button').forEach(b=>b.onclick=()=>done(b.dataset.choice));
  });
}
async function importFile(file) {
  try {
    const source=await decodeFile(file);const existing=documents.find(d=>d.name===file.name);
    let doc;
    if (existing) {
      const choice=await duplicateChoice();if(choice==='cancel')return {ok:false};
      if(choice==='replace') {doc=existing;doc.original=source;doc.draft=source;doc.applied=source;}
    }
    if(!doc) {doc={id:crypto.randomUUID(),name:file.name,original:source,draft:source,applied:source,web:{},importedAt:Date.now(),openedAt:Date.now()};documents.push(doc);}
    await persist().catch(()=>{});await openDocument(doc.id);notify('HTML을 열었습니다. 문서에 포함된 기능을 사용할 수 있습니다. 저장 기능이 없는 문서의 입력값은 자동 복원되지 않습니다.');return {ok:true};
  }catch(error){notify(error.message,true);return {ok:false,error:error.message};}
}
async function importFiles(files) {
  if(importing)return;
  importing=true;$('#import').disabled=$('#empty-import').disabled=true;
  try {
    let opened=0;const errors=[];
    for(const file of files){const result=await importFile(file);if(result.ok)opened++;if(result.error)errors.push(`${file.name}: ${result.error}`);}
    if(files.length>1)notify(`${opened}개 파일을 가져왔습니다.${errors.length ? ` ${errors.join(' / ')}` : ''}`,!!errors.length);
  } finally {importing=false;$('#import').disabled=$('#empty-import').disabled=false;}
}
function setReadingMode(enabled) {
  enabled=!!enabled && !!active();document.body.classList.toggle('reading-mode',enabled);
  $('#reading-tools').hidden=!enabled;$('#reading-mode').setAttribute('aria-pressed',String(enabled));
  if(enabled)void showTab('run');
}
async function showTab(tab) {
  const source=tab==='source';$('#run-tab').setAttribute('aria-selected',String(!source));$('#source-tab').setAttribute('aria-selected',String(source));
  $('#run-panel').hidden=source;$('#source-panel').hidden=!source;
  if(source && !editor) {
    const {createEditor}=await import('./editor.js');
    editor=createEditor($('#editor'),active().draft,value=>{if(editorLoading||!active())return;active().draft=value;updateUnapplied();saveSoon();});
  }
  if(source)editor?.focus();
}
$('#import').onclick=$('#empty-import').onclick=()=>$('#file-input').click();
$('#file-input').onchange=event=>{const files=[...event.target.files];event.target.value='';if(files.length)void importFiles(files);};
$('#file-search').oninput=$('#file-sort').onchange=renderFiles;
$('#reading-mode').onclick=()=>setReadingMode(true);$('#exit-reading').onclick=()=>{setReadingMode(false);$('#reading-mode').focus();};
addEventListener('keydown',event=>{if(event.key==='Escape')setReadingMode(false);});
addEventListener('dragover',event=>{if([...event.dataTransfer.types].includes('Files')){event.preventDefault();document.body.classList.add('dragging-files');}});
addEventListener('dragleave',event=>{if(!event.relatedTarget)document.body.classList.remove('dragging-files');});
addEventListener('drop',event=>{if(!event.dataTransfer.files.length)return;event.preventDefault();document.body.classList.remove('dragging-files');void importFiles([...event.dataTransfer.files]);});
document.querySelectorAll('[data-example]').forEach(button=>button.onclick=async()=>{
  try {const name=button.dataset.example;const response=await fetch(`${import.meta.env.BASE_URL}examples/${name}.html`);if(!response.ok)throw new Error('예제 파일을 불러오지 못했습니다.');await importFiles([new File([await response.text()],`${name}.html`,{type:'text/html'})]);}
  catch(error){notify(error.message,true);}
});
$('#demo').onclick=async()=>{try{const response=await fetch(`${import.meta.env.BASE_URL}demo-exam.html`);if(!response.ok)throw new Error('모의고사 파일을 불러오지 못했습니다.');await importFiles([new File([await response.text()],'SSAFY_Front_32_Mock_Exam.html',{type:'text/html'})]);}catch(error){notify(error.message,true);}};
$('#run-tab').onclick=()=>void showTab('run');$('#source-tab').onclick=()=>void showTab('source');
for (const [id, other, tab] of [['run-tab','source-tab','source'], ['source-tab','run-tab','run']]) {
  $('#'+id).onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();$('#'+other).focus();void showTab(tab);}};
}
$('#rerun').onclick=()=>{if(confirm('파일 저장 데이터는 유지됩니다. 페이지 메모리와 타이머는 다시 시작될 수 있습니다. 재실행할까요?'))run();};
$('#stop').onclick=()=>{setReadingMode(false);for(const port of ports.keys())port.close();ports.clear();frame?.remove();frame=null;$('#execution-status').textContent='실행 종료 · 저장된 소스와 문서 데이터는 유지됩니다.';void showTab('source');};
$('#apply').onclick=async()=>{
  const doc=active();if(bytes(doc.draft)>MAX_BYTES){notify('실행 소스는 5MiB까지 지원합니다.',true);return;}
  doc.applied=doc.draft;await persist().catch(()=>{});renderDocument();await showTab('run');run();
};
function setDraft(value) {active().draft=value;if(editor){editorLoading=true;editor.setSource(value);editorLoading=false;}updateUnapplied();saveSoon();}
$('#restore').onclick=()=>{if(confirm('소스를 가져온 원본으로 복구할까요? 파일 저장 데이터는 유지됩니다. 적용 버튼을 눌러야 실행본이 바뀝니다.'))setDraft(active().original);};
$('#discard').onclick=()=>{if(confirm('미적용 변경을 취소하고 마지막 실행본으로 되돌릴까요?'))setDraft(active().applied);};
function exportHTML(original=false) {
  const doc=active(),url=URL.createObjectURL(new Blob([original?doc.original:doc.draft],{type:'text/html;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=original?doc.name:doc.name.replace(/\.html?$/i,'')+'_edited.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  notify(`${original?'가져온 원본 소스':'현재 초안'}를 UTF-8 HTML로 내보냈습니다. 앱의 문서 저장 데이터는 포함하지 않습니다.`);
}
$('#export').onclick=()=>exportHTML();$('#export-original').onclick=()=>exportHTML(true);
$('#rename').onclick=()=>{const name=prompt('새 파일 이름',active().name);if(!name?.trim())return;if(!/\.html?$/i.test(name.trim())){notify('이름 끝에 .html 또는 .htm을 붙여 주세요.',true);return;}active().name=name.trim();renderDocument();void persist().catch(()=>{});};
$('#copy').onclick=async()=>{const doc=active(),copy={...structuredClone(doc),id:crypto.randomUUID(),name:doc.name.replace(/\.html?$/i,'')+'_copy.html',web:{},importedAt:Date.now(),openedAt:Date.now()};documents.push(copy);await persist().catch(()=>{});await openDocument(copy.id);};
$('#clear-data').onclick=async()=>{if(!confirm('이 파일의 저장 데이터를 초기화할까요? 소스와 다른 파일의 데이터는 유지됩니다.'))return;active().web={};await persist().catch(()=>{});renderDocument();run();};
$('#delete').onclick=async()=>{if(!confirm('이 파일의 원본, 초안, 실행본과 저장 데이터를 모두 삭제할까요?'))return;setReadingMode(false);for(const port of ports.keys())port.close();ports.clear();documents=documents.filter(d=>d.id!==currentId);currentId=null;frame?.remove();frame=null;editor?.destroy();editor=null;$('#editor').replaceChildren();renderDocument();await persist().catch(()=>{});if(documents.length)await openDocument(documents[0].id);};
$('#retry').onclick=async()=>{try{await persist();ports.forEach((_,port)=>port.postMessage({type:'saved'}));notify('다시 저장했습니다.');}catch{}};
$('#clear-log').onclick=()=>{logs=[];$('#logs').replaceChildren();$('#log-count').textContent='0';};
addEventListener('pagehide',()=>{if($('#save-status').textContent==='변경 있음')void persist().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(document.hidden && $('#save-status').textContent==='변경 있음')void persist().catch(()=>{});});
try {db=await openLibrary();documents=await readLibrary(db);renderFiles();if(documents.length)await openDocument([...documents].sort((a,b)=>b.openedAt-a.openedAt)[0].id);}
catch(error){notify(`브라우저 저장소를 사용할 수 없습니다: ${error.message} 가져온 파일은 메모리에만 유지됩니다.`,true);}
if(import.meta.env.PROD && 'serviceWorker' in navigator) {
  $('#offline-status').textContent='오프라인 준비 중';
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    .then(()=>navigator.serviceWorker.ready)
    .then(()=>{$('#offline-status').textContent='· 오프라인 준비 완료';})
    .catch(error=>{$('#offline-status').textContent='· 오프라인 미지원';notify(`오프라인 준비 실패: ${error.message}`,true);});
}
