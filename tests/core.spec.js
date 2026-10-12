import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const exam=readFileSync(new URL('../SSAFY_Front_32_Mock_Exam.html',import.meta.url),'utf8');
const key='ssafy-front-practice-20261009-v1';
async function start(page){await page.goto('/');await page.getByRole('button',{name:'모의고사 추가'}).click();await expect(page.frameLocator('iframe').locator('.question')).toHaveCount(32);}
async function stored(page){return page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('html-study-v1',1);r.onsuccess=()=>resolve(r.result);});return await new Promise(resolve=>{const r=db.transaction('library').objectStore('library').get('documents');r.onsuccess=()=>resolve(r.result);});});}
test('32문항 가져오기, confirm 취소·확인, 점수·해설과 답안·검토·타이머 복원',async({page})=>{
  await start(page);const f=page.frameLocator('iframe');
  await f.locator('input[name=q1][value="2"]').check();await f.locator('[data-mark="1"]').click();await f.locator('#start-timer').click();
  await expect(f.locator('#answered')).toHaveText('1 / 32');
  await expect.poll(async()=>JSON.parse((await stored(page))[0].web[key]).answers['1']).toBe(2);
  await page.reload();await expect(f.locator('input[name=q1][value="2"]')).toBeChecked();await expect(f.locator('[data-mark="1"]')).toHaveAttribute('aria-pressed','true');await expect(f.locator('#timer-label')).toHaveText('남은 시간');
  page.once('dialog',d=>d.dismiss());await f.locator('#grade-top').click();await expect(f.locator('#result')).toBeHidden();
  page.once('dialog',d=>d.accept());await f.locator('#grade-top').click();await expect(f.locator('#score')).toHaveText('3.125');await expect(f.locator('#explanation-1')).toBeVisible();
  await expect.poll(async()=>JSON.parse((await stored(page))[0].web[key]).graded).toBe(true);
  await page.reload();await expect(f.locator('#score')).toHaveText('3.125');await expect(f.locator('#result')).toBeVisible();
});
test('같은 저장 키를 쓰는 파일 간 답안 격리와 재시작 복원',async({page})=>{
  await start(page);await page.frameLocator('iframe').locator('input[name=q1][value="2"]').check();
  await expect.poll(async()=>JSON.parse((await stored(page))[0].web[key]).answers['1']).toBe(2);
  await page.locator('#file-input').setInputFiles({name:'B.html',mimeType:'text/html',buffer:Buffer.from(exam)});
  await expect(page.frameLocator('iframe').locator('#answered')).toHaveText('0 / 32');await page.frameLocator('iframe').locator('input[name=q1][value="3"]').check();
  await expect.poll(async()=>JSON.parse((await stored(page))[1].web[key]).answers['1']).toBe(3);
  await page.getByRole('button',{name:/SSAFY_Front_32_Mock_Exam.html.*KB/}).click();await expect(page.frameLocator('iframe').locator('input[name=q1][value="2"]')).toBeChecked();
  await page.reload();await expect(page.frameLocator('iframe').locator('input[name=q1][value="2"]')).toBeChecked();
  await page.getByRole('button',{name:/B.html.*KB/}).click();await expect(page.frameLocator('iframe').locator('input[name=q1][value="3"]')).toBeChecked();
});
test('전체 정답 원본 채점은 100점',async({page})=>{
  await start(page);const f=page.frameLocator('iframe');
  const answers=JSON.parse(exam.match(/const DATA = (\[.*?\]);/)[1]);
  for(const q of answers)await f.locator(`input[name=q${q.id}][value="${q.answer}"]`).check();
  await f.locator('#grade-top').click();await expect(f.locator('#score')).toHaveText('100');await expect(f.locator('#result-summary')).toContainText('정답 32문항');
});
test('만료된 타이머는 재시작 후 자동 채점',async({page})=>{
  await start(page);await page.frameLocator('iframe').locator('#start-timer').click();await expect.poll(async()=>JSON.parse((await stored(page))[0].web[key]).deadline).not.toBeNull();
  await page.evaluate(async key=>{const db=await new Promise(resolve=>{const r=indexedDB.open('html-study-v1');r.onsuccess=()=>resolve(r.result);});await new Promise(resolve=>{const tx=db.transaction('library','readwrite'),s=tx.objectStore('library'),r=s.get('documents');r.onsuccess=()=>{const docs=r.result,state=JSON.parse(docs[0].web[key]);state.deadline=Date.now()-1000;docs[0].web[key]=JSON.stringify(state);s.put(docs,'documents');};tx.oncomplete=resolve;});},key);
  await page.reload();await expect(page.frameLocator('iframe').locator('#result-note')).toContainText('제한 시간 종료로 자동 채점');
});
