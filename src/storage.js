const DB = 'html-study-v1';
export async function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('library');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
export function readLibrary(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('library').objectStore('library').get('documents');
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
export function writeLibrary(db, documents) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('library', 'readwrite');
    tx.objectStore('library').put(documents, 'documents');
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error('저장 트랜잭션이 취소되었습니다.'));
    tx.onerror = () => reject(tx.error);
  });
}
export const MAX_BYTES = 5 * 1024 * 1024;
export async function decodeFile(file) {
  if (!/\.html?$/i.test(file.name)) throw new Error('.html 또는 .htm 파일을 선택하세요.');
  if (!file.size) throw new Error('빈 파일은 가져올 수 없습니다.');
  if (file.size > MAX_BYTES) throw new Error('단일 HTML은 5MiB까지 지원합니다.');
  try { return new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer()); }
  catch { throw new Error('UTF-8 파일만 지원합니다. 원본 인코딩을 확인하세요.'); }
}
