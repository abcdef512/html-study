import {test,expect} from '@playwright/test';
const source=`<!doctype html><html lang="ko"><head><style>body{background:rgb(255,255,255)}</style></head><body><h1>한글 원본 제목</h1><button id="save" onclick="localStorage.setItem('answer','2');this.textContent='답안 저장'">답안 선택</button><p id="answer"></p><script>document.querySelector('#answer').textContent=localStorage.getItem('answer')||'없음';</script></body></html>`;
async function importHTML(page,name='lesson.html',html=source){await page.locator('#file-input').setInputFiles({name,mimeType:'text/html',buffer:Buffer.from(html)});await expect(page.frameLocator('iframe').locator('body')).toBeVisible();}
async function edit(page,text){await page.getByRole('tab',{name:'소스'}).click();const editor=page.getByRole('textbox',{name:'HTML 소스 편집기'});await editor.click();await editor.press('ControlOrMeta+A');await editor.press('Backspace');await page.keyboard.insertText(text);await expect(page.locator('#save-status')).toHaveText('저장됨');}
test('초안 자동저장·복원, 명시적 적용, 취소·다시 실행 및 UTF-8 수정본',async({page})=>{
  await page.goto('/');await importHTML(page);
  await page.frameLocator('iframe').locator('#save').click();await expect(page.locator('#save-status')).toHaveText('저장됨');
  const modified=source.replace('한글 원본 제목','수정한 한글 제목').replace('rgb(255,255,255)','rgb(225,240,230)');
  await edit(page,modified);await expect(page.locator('#unapplied')).toBeVisible();
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();await expect(page.locator('.cm-content')).not.toContainText('수정한 한글 제목');
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();await expect(page.locator('.cm-content')).toContainText('수정한 한글 제목');
  await page.getByRole('tab',{name:'실행',exact:true}).click();await expect(page.frameLocator('iframe').locator('h1')).toHaveText('한글 원본 제목');
  await expect(page.locator('#save-status')).toHaveText('저장됨');await page.reload();await page.getByRole('tab',{name:'소스'}).click();await expect(page.locator('.cm-content')).toContainText('수정한 한글 제목');
  await page.getByRole('button',{name:'적용하고 실행'}).click();await expect(page.frameLocator('iframe').locator('h1')).toHaveText('수정한 한글 제목');await expect(page.frameLocator('iframe').locator('body')).toHaveCSS('background-color','rgb(225, 240, 230)');await expect(page.frameLocator('iframe').locator('#answer')).toHaveText('2');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'수정본 내보내기'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('lesson_edited.html');const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(Buffer.concat(chunks).toString('utf8')).toBe(modified);
});
test('원본 복구는 기록 유지, 기록 초기화는 현재 파일에만 적용',async({page})=>{
  await page.goto('/');await importHTML(page);await page.frameLocator('iframe').locator('#save').click();await expect(page.locator('#save-status')).toHaveText('저장됨');
  await edit(page,source.replace('한글 원본 제목','수정'));page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'원본 복구',exact:true}).click();await expect(page.locator('.cm-content')).toContainText('한글 원본 제목');await page.getByRole('button',{name:'적용하고 실행'}).click();await expect(page.frameLocator('iframe').locator('#answer')).toHaveText('2');
  await page.getByText('파일 관리 및 저장 데이터',{exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'파일 저장 데이터 초기화',exact:true}).click();await expect(page.frameLocator('iframe').locator('#answer')).toHaveText('없음');
});
test('Storage 메서드·속성·특수 키, 부모 DOM 격리, 외부 fetch 차단 및 오류 로그',async({page})=>{
  await page.goto('/');await importHTML(page,'storage.html',`<body><p id="result"></p><script>
  localStorage.clear();localStorage.setItem('a',1);localStorage.setItem('b',2);localStorage.setItem('__proto__','safe');localStorage.custom='value';delete localStorage.custom;
  const result=[localStorage.getItem('a'),localStorage.key(1),localStorage.length,localStorage.getItem('__proto__')];localStorage.removeItem('a');result.push(localStorage.getItem('a'));try{parent.document.body;result.push('unsafe')}catch{result.push('isolated')};document.querySelector('#result').textContent=JSON.stringify(result);fetch('https://example.com/no-send').catch(()=>console.warn('fetch blocked'));setTimeout(()=>{throw new Error('테스트 오류')},100);
  </script></body>`);
  await expect(page.frameLocator('iframe').locator('#result')).toHaveText('["1","b",3,"safe",null,"isolated"]');await page.getByText('실행 로그',{exact:false}).click();await expect(page.locator('#logs')).toContainText('테스트 오류');await expect(page.locator('#logs')).toContainText('fetch blocked');
});
test('중복 가져오기 취소·새 사본·교체와 파일 삭제',async({page})=>{
  await page.goto('/');await importHTML(page);
  await page.locator('#file-input').setInputFiles({name:'lesson.html',mimeType:'text/html',buffer:Buffer.from(source)});await page.locator('#duplicate-dialog').getByRole('button',{name:'취소',exact:true}).click();await expect(page.locator('.file-card')).toHaveCount(1);
  await page.locator('#file-input').setInputFiles({name:'lesson.html',mimeType:'text/html',buffer:Buffer.from(source)});await page.locator('#duplicate-dialog').getByRole('button',{name:'새 사본',exact:true}).click();await expect(page.locator('.file-card')).toHaveCount(2);
  await page.locator('#file-input').setInputFiles({name:'lesson.html',mimeType:'text/html',buffer:Buffer.from(source.replace('한글 원본 제목','교체 제목'))});await page.locator('#duplicate-dialog').getByRole('button',{name:'교체',exact:true}).click();await expect(page.frameLocator('iframe').locator('h1')).toHaveText('교체 제목');await expect(page.locator('.file-card')).toHaveCount(2);
  await page.getByText('파일 관리 및 저장 데이터',{exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'파일 삭제',exact:true}).click();await expect(page.locator('.file-card')).toHaveCount(1);
});
test('빈 파일·잘못된 UTF-8·용량 초과 거부',async({page})=>{
  await page.goto('/');for(const [buffer,message] of [[Buffer.from(''),'빈 파일'],[Buffer.from([0xff,0xfe,0]),'UTF-8 파일만'],[Buffer.alloc(5*1024*1024+1),'5MiB까지']]){await page.locator('#file-input').setInputFiles({name:'invalid.html',mimeType:'text/html',buffer});await expect(page.locator('#notice')).toContainText(message);await expect(page.locator('.file-card')).toHaveCount(0);}
});
test('저장 실패를 표시하고 메모리 초안으로 재시도',async({page})=>{
  await page.addInitScript(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(window.failWrite)throw new DOMException('테스트 용량 부족','QuotaExceededError');return original.apply(this,args);};});
  await page.goto('/');await importHTML(page);await page.evaluate(()=>window.failWrite=true);await page.getByRole('tab',{name:'소스'}).click();const editor=page.getByRole('textbox',{name:'HTML 소스 편집기'});await editor.click();await editor.press('ControlOrMeta+End');await page.keyboard.insertText('<!-- 저장 실패에도 유지되는 한글 -->');await expect(page.locator('#save-status')).toHaveText('저장 실패');await expect(page.locator('#notice')).toContainText('메모리에 유지');
  await page.evaluate(()=>window.failWrite=false);await page.getByText('파일 관리 및 저장 데이터',{exact:true}).click();await page.getByRole('button',{name:'다시 저장',exact:true}).click();await expect(page.locator('#save-status')).toHaveText('저장됨');await page.reload();await page.getByRole('tab',{name:'소스'}).click();await expect(page.locator('.cm-content')).toContainText('저장 실패에도 유지되는 한글');
});
test('원본 reset의 iframe 재시작이 최신 답안 상태를 복원',async({page})=>{
  await page.goto('/');await page.locator('#examples').evaluate(el=>el.open=true);await page.getByRole('button',{name:'모의고사 추가'}).click();const f=page.frameLocator('iframe');await f.locator('input[name=q1][value="2"]').check();await expect(page.locator('#save-status')).toHaveText('저장됨');page.once('dialog',d=>d.accept());await f.locator('#reset').click();await expect(f.locator('#answered')).toHaveText('0 / 32');await expect(page.locator('#save-status')).toHaveText('저장됨');await page.reload();await expect(f.locator('#answered')).toHaveText('0 / 32');
});
test('390px 모바일 화면에서 실행·편집 접근 및 앱 가로 넘침 없음',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('#examples').evaluate(el=>el.open=true);await page.getByRole('button',{name:'모의고사 추가'}).click();await expect(page.frameLocator('iframe').locator('.question')).toHaveCount(32);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.getByRole('tab',{name:'소스'}).click();await expect(page.getByRole('textbox',{name:'HTML 소스 편집기'})).toBeVisible();await expect(page.getByRole('button',{name:'적용하고 실행'})).toBeVisible();await page.screenshot({path:'/tmp/html-reader-mobile.png',fullPage:true});
});
test('실행 영역 답안 저장 실패 알림·재시도와 alert',async({page})=>{
  await page.addInitScript(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(window.failWrite)throw new DOMException('답안 저장 장애','QuotaExceededError');return original.apply(this,args);};});
  await page.goto('/');await importHTML(page,'failure.html',source.replace('<h1>','<button id="alert" onclick="alert(\'알림 확인\')">알림</button><h1>'));
  const f=page.frameLocator('iframe');page.once('dialog',d=>{expect(d.type()).toBe('alert');expect(d.message()).toBe('알림 확인');return d.accept();});await f.locator('#alert').click();
  await page.evaluate(()=>window.failWrite=true);await f.locator('#save').click();await expect(page.locator('#save-status')).toHaveText('저장 실패');await expect(f.locator('#__storage_warning')).toContainText('문서 데이터 저장 실패');
  await page.evaluate(()=>window.failWrite=false);await page.getByText('파일 관리 및 저장 데이터',{exact:true}).click();await page.getByRole('button',{name:'다시 저장',exact:true}).click();await expect(f.locator('#__storage_warning')).toHaveCount(0);await page.reload();await expect(f.locator('#answer')).toHaveText('2');
});
