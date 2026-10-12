import {test,expect} from '@playwright/test';
const note = title => `<html><head><title>${title}</title></head><body><label>메모<input id="memo"></label><button id="save" onclick="localStorage.setItem('memo',document.querySelector('#memo').value)">저장</button><p id="saved"></p><script>document.querySelector('#saved').textContent=localStorage.getItem('memo')||'비어 있음';</script></body></html>`;
const file=(name,source)=>({name,mimeType:'text/html',buffer:Buffer.from(source)});

test('일반 HTML 여러 파일 열기, 제목 검색, 정렬과 독립 저장',async({page})=>{
  await page.goto('/');await page.locator('#file-input').setInputFiles([file('a.htm',note('첫 번째 문서')),file('b.HTML',note('두 번째 문서'))]);
  await expect(page.locator('.file-card')).toHaveCount(2);await expect(page.locator('#notice')).toContainText('2개 파일');
  const frame=page.frameLocator('iframe');await frame.locator('#memo').fill('B 데이터');await frame.locator('#save').click();await expect(page.locator('#save-status')).toHaveText('저장됨');
  await page.locator('#file-search').fill('첫 번째 문서');await expect(page.locator('.file-card')).toHaveCount(1);await page.locator('.file-card').click();await expect(frame.locator('#saved')).toHaveText('비어 있음');
  await frame.locator('#memo').fill('A 데이터');await frame.locator('#save').click();await expect(page.locator('#save-status')).toHaveText('저장됨');
  await page.locator('#file-search').fill('');await page.locator('#file-sort').selectOption('name');await expect(page.locator('.file-card').first()).toContainText('a.htm');
  await page.reload();await expect(frame.locator('#saved')).toHaveText('A 데이터');await page.locator('.file-card').filter({hasText:'b.HTML'}).click();await expect(frame.locator('#saved')).toHaveText('B 데이터');
  await page.locator('#file-search').fill('존재하지 않는 파일');await expect(page.locator('#file-list-empty')).toHaveText('일치하는 파일이 없습니다.');await expect(frame.locator('#saved')).toHaveText('B 데이터');
});

test('계산기와 저장 메모 예제는 실제 HTML의 입력과 JavaScript를 실행',async({page})=>{
  await page.goto('/');await page.locator('#examples summary').click();await page.getByRole('button',{name:'계산기 열기',exact:true}).click();
  const frame=page.frameLocator('iframe');await frame.locator('#a').fill('7');await frame.locator('#b').fill('4');await frame.getByRole('button',{name:'계산하기'}).click();await expect(frame.locator('#result')).toHaveText('결과: 11');
  await page.getByRole('button',{name:'저장 메모 열기',exact:true}).click();await frame.locator('#memo').fill('아이폰에서 읽을 <메모>');await frame.locator('#save').click();await expect(page.locator('#storage-usage')).toContainText(`${Buffer.byteLength(JSON.stringify({memo:'아이폰에서 읽을 <메모>'}))} B`);await expect(page.locator('#save-status')).toHaveText('저장됨');await page.reload();await expect(frame.locator('#memo')).toHaveValue('아이폰에서 읽을 <메모>');
});

test('원본 내보내기는 편집 초안과 구분하고 읽기 화면은 390px에서 종료 가능',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');const original=note('넓게 읽기 문서');await page.locator('#file-input').setInputFiles(file('document.htm',original));
  await page.getByRole('tab',{name:'소스'}).click();const editor=page.getByRole('textbox',{name:'HTML 소스 편집기'});await editor.click();await editor.press('ControlOrMeta+A');await page.keyboard.insertText(original+'<!-- 초안 변경 -->');await expect(page.locator('#save-status')).toHaveText('저장됨');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'원본 내보내기',exact:false}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('document.htm');const stream=await download.createReadStream();let text='';for await(const chunk of stream)text+=chunk.toString('utf8');expect(text).toBe(original);
  await page.getByRole('tab',{name:'실행',exact:true}).click();await page.getByRole('button',{name:'넓게 읽기',exact:true}).click();await expect(page.locator('body')).toHaveClass(/reading-mode/);await expect(page.locator('#exit-reading')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#exit-reading').click();await expect(page.locator('body')).not.toHaveClass(/reading-mode/);await expect(page.getByRole('tab',{name:'소스'})).toBeVisible();
});

test('리소스 의존 안내와 외부 이미지 요청의 CSP 차단',async({page})=>{
  const external=[],failed=[];page.on('request',r=>{if(r.url().startsWith('https://example.com'))external.push(r);});
  page.on('requestfailed',r=>{if(r.url().startsWith('https://example.com'))failed.push(r);});
  await page.goto('/');await page.locator('#file-input').setInputFiles(file('resources.html','<title>외부 파일 문서</title><link rel="stylesheet" href="theme.css"><script src="logic.js"></script><img src="https://example.com/picture.png"><p>본문</p>'));
  await expect(page.locator('#resource-notice')).toContainText('별도 리소스');await expect(page.locator('#resource-notice')).toContainText('theme.css');await expect(page.frameLocator('iframe').getByText('본문')).toBeVisible();
  await expect.poll(()=>external.length).toBe(1);await expect.poll(()=>failed.length).toBe(external.length);for(const request of failed)expect(request.failure().errorText).toMatch(/csp/i);
  await page.locator('#file-input').setInputFiles(file('inline.html','<title>내부 기능</title><style>body{color:green}</style><p>정상</p>'));await expect(page.locator('#resource-notice')).toBeHidden();
});

test('이전 버전의 문서와 저장 키를 그대로 읽음',async({page})=>{
  await page.goto('/');await page.evaluate(async html=>{
    await new Promise((resolve,reject)=>{const request=indexedDB.open('html-study-v1',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('library','readwrite');tx.objectStore('library').put([{id:'existing-id',name:'old.html',original:html,draft:html,applied:html,web:{memo:'기존 저장 데이터'},importedAt:1,openedAt:1}],'documents');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
  },note('이전 문서'));
  await page.reload();await expect(page.locator('.file-card')).toHaveCount(1);await expect(page.frameLocator('iframe').locator('#saved')).toHaveText('기존 저장 데이터');
});
