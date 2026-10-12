import {parse, serialize, defaultTreeAdapter as tree} from 'parse5';

// Runs before imported scripts. No same-origin permission: the document cannot read
// the host DOM or IndexedDB. A private MessagePort is bound to this document only.
function bootstrap(initial, runId) {
  let state = {studyStorage:1, local: initial, session: {}};
  try {
    const retained = JSON.parse(window.name);
    if (retained?.studyStorage === 1 && retained.local && retained.session) state = retained;
  } catch {}
  const channel = new MessageChannel();
  const port = channel.port1;
  let writable = true;
  const send = (message) => port.postMessage(message);
  channel.port1.onmessage = event => {
    if (event.data.type === 'saved') writable = true;
    if (event.data.type === 'failed') {
      writable = false;
      const banner = document.getElementById('__storage_warning') || document.createElement('div');
      banner.id = '__storage_warning'; banner.textContent = '문서 데이터 저장 실패: 현재 값은 메모리에만 있습니다. 리더의 다시 저장 버튼을 눌러 주세요.';
      banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;padding:14px;background:#9d2430;color:white;font:14px sans-serif';
      document.body?.append(banner);
    }
    if (event.data.type === 'saved') document.getElementById('__storage_warning')?.remove();
  };
  parent.postMessage({type:'study:boot', runId}, '*', [channel.port2]);
  const persist = () => {
    window.name = JSON.stringify(state);
    send({type:'storage', values:state.local});
  };
  function storage(kind) {
    const methods = {
      getItem(key) { key = String(key); return Object.hasOwn(state[kind], key) ? state[kind][key] : null; },
      setItem(key, value) {
        if (!writable && kind === 'local') throw new DOMException('지속 저장을 사용할 수 없습니다.', 'QuotaExceededError');
        const next = {...state[kind], [String(key)]:String(value)};
        if (new TextEncoder().encode(JSON.stringify(next)).length > 5 * 1024 * 1024) throw new DOMException('문서 저장 한도 5MiB 초과', 'QuotaExceededError');
        state[kind] = next; persist();
      },
      removeItem(key) { delete state[kind][String(key)]; persist(); },
      clear() { state[kind] = {}; persist(); },
      key(index) { return Object.keys(state[kind])[Number(index)] ?? null; },
      get length() { return Object.keys(state[kind]).length; }
    };
    return new Proxy(methods, {
      get(target, key) { return key in target ? Reflect.get(target, key) : methods.getItem(key) ?? undefined; },
      set(_, key, value) { methods.setItem(key, value); return true; },
      deleteProperty(_, key) { methods.removeItem(key); return true; },
      ownKeys() { return Object.keys(state[kind]); },
      getOwnPropertyDescriptor(_, key) { if (Object.hasOwn(state[kind], key)) return {configurable:true, enumerable:true, value:state[kind][key]}; }
    });
  }
  Object.defineProperty(window, 'localStorage', {value:storage('local'), configurable:false});
  Object.defineProperty(window, 'sessionStorage', {value:storage('session'), configurable:false});
  const log = (level, values) => {
    const message = values.map(value => {try {return typeof value === 'string' ? value : JSON.stringify(value);} catch {return String(value);}}).join(' ').slice(0,2000);
    send({type:'log', level, message});
  };
  for (const level of ['log','info','warn','error']) {
    const original = console[level].bind(console);
    console[level] = (...values) => {original(...values); log(level, values);};
  }
  addEventListener('error', event => log('error', [`${event.message || '리소스 로드 실패'} (${event.lineno || '?'}:${event.colno || '?'})`]));
  addEventListener('unhandledrejection', event => log('error', [String(event.reason)]));
  addEventListener('securitypolicyviolation', event => log('warn', [`외부 리소스 차단: ${event.blockedURI}`]));
  addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (link && !link.getAttribute('href').startsWith('#')) { event.preventDefault(); log('warn',['외부 링크는 실행 영역에서 열 수 없습니다.']); }
  }, true);
  addEventListener('submit', event => {event.preventDefault();log('warn',['외부 폼 전송 차단']);}, true);
  addEventListener('DOMContentLoaded', () => send({type:'ready'}));
}
export function createRunner(source, web, runId) {
  // A DOMParser document can request images before CSP is installed. Parse only
  // into a JS tree, so imported URLs cannot be fetched during preparation.
  const parsed = parse(source);
  function removeOverrides(node) {
    for (const child of [...(node.childNodes || [])]) {
      if (child.tagName === 'base' || (child.tagName === 'meta' && child.attrs.some(attr => attr.name === 'http-equiv'))) tree.detachNode(child);
      else {removeOverrides(child);if(child.content)removeOverrides(child.content);}
    }
  }
  removeOverrides(parsed);
  const html = parsed.childNodes.find(node => node.tagName === 'html');
  const head = html.childNodes.find(node => node.tagName === 'head');
  const namespace = 'http://www.w3.org/1999/xhtml';
  const policy = tree.createElement('meta',namespace,[
    {name:'http-equiv',value:'Content-Security-Policy'},
    {name:'content',value:"default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"}
  ]);
  const script = tree.createElement('script',namespace,[]);
  const json = JSON.stringify(web).replace(/</g, '\\u003c');
  tree.insertText(script,`(${bootstrap.toString()})(${json}, ${JSON.stringify(runId)});`);
  if(head.childNodes.length)tree.insertBefore(head,script,head.childNodes[0]);else tree.appendChild(head,script);
  tree.insertBefore(head,policy,script);
  const output=serialize(parsed);
  return parsed.childNodes.some(node=>node.nodeName==='#documentType') ? output : '<!doctype html>\n'+output;
}
