import { expect, test } from '@playwright/test';

test('이름 입력 시 QR 생성 및 다운로드 버튼 활성화', async ({ page }) => {
	await page.goto('/');

	const pngButton = page.getByRole('button', { name: 'PNG 다운로드' });
	const svgButton = page.getByRole('button', { name: 'SVG 다운로드' });

	await expect(pngButton).toBeDisabled();
	await expect(svgButton).toBeDisabled();

	await page.getByLabel('이름').fill('홍길동');

	await expect(page.getByAltText('연락처 QR 코드')).toBeVisible();
	await expect(pngButton).toBeEnabled();
	await expect(svgButton).toBeEnabled();
});

test('PNG 다운로드가 .png 파일을 내려받는다', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('이름').fill('홍길동');
	await expect(page.getByAltText('연락처 QR 코드')).toBeVisible();

	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'PNG 다운로드' }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe('홍길동.png');
});
