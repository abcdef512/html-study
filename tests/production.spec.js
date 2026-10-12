import {test,expect} from '@playwright/test';
test('프로덕션 서비스워커 캐시로 오프라인 재실행·풀이·편집·저장·채점',async({page,context})=>{
  await page.goto('/');await expect(page.locator('#offline-status')).toContainText('오프라인 준비 완료');await page.getByRole('button',{name:'모의고사 추가'}).click();const f=page.frameLocator('iframe');await f.locator('input[name=q1][value="2"]').check();await expect(page.locator('#save-status')).toHaveText('저장됨');
  await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();await expect(f.locator('input[name=q1][value="2"]')).toBeChecked();
  await f.locator('input[name=q2][value="3"]').check();await expect(page.locator('#save-status')).toHaveText('저장됨');
  await page.getByRole('tab',{name:'소스'}).click();const editor=page.getByRole('textbox',{name:'HTML 소스 편집기'});await expect(editor).toBeVisible();await editor.click();await editor.press('ControlOrMeta+Home');await page.keyboard.insertText('<!-- 오프라인 편집 -->\n');await expect(page.locator('#save-status')).toHaveText('저장됨');await page.getByRole('button',{name:'적용하고 실행'}).click();
  page.once('dialog',d=>d.accept());await f.locator('#grade-top').click();await expect(f.locator('#score')).toHaveText('6.25');await expect(page.locator('#save-status')).toHaveText('저장됨');await page.reload();await expect(f.locator('#score')).toHaveText('6.25');
});
test('빈 화면과 실제 모의고사 실행 화면 촬영',async({page})=>{await page.goto('/');await expect(page.getByText('첫 학습 파일을 열어볼까요?')).toBeVisible();await page.screenshot({path:'/tmp/html-study-desktop-empty.png',fullPage:true});await page.getByRole('button',{name:'모의고사 추가'}).click();await expect(page.frameLocator('iframe').locator('.question')).toHaveCount(32);await page.screenshot({path:'/tmp/html-study-desktop.png',fullPage:true});});
