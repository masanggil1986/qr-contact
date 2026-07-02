# 명함 QR 코드 생성기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연락처 정보를 입력하면 실시간으로 vCard 3.0 QR 코드를 생성하고 PNG/SVG로 다운로드할 수 있는, 서버 없는 웹 앱을 만든다.

**Architecture:** 순수 클라이언트 사이드. SvelteKit 단일 페이지(`/`)를 prerender. 입력 상태(`$state`) → `buildVCard`로 vCard 문자열 파생(`$derived`) → `QrPreview`가 `$effect`로 QR(PNG dataURL + SVG 문자열) 생성. 서버·DB 없음.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, Tailwind CSS 4, `qrcode` 라이브러리, Vitest(단위), Playwright(e2e), bun.

**참고 문서:** [설계 문서](../specs/2026-07-02-qr-contact-generator-design.md)

---

## 파일 구조

```
src/
  lib/
    types.ts                  # Contact 타입 + emptyContact (신규)
    vcard.ts                  # buildVCard(contact): string (신규, 핵심 로직)
    vcard.spec.ts             # buildVCard 단위 테스트 (신규)
    qr.ts                     # toPngDataUrl / toSvgString (신규, qrcode 래퍼)
    components/
      ContactForm.svelte      # 입력 폼 (신규)
      QrPreview.svelte        # QR 렌더링 + 다운로드 (신규)
  routes/
    +layout.ts                # export const prerender = true (신규)
    +layout.svelte            # 기존 유지 (lang은 app.html에서)
    +page.svelte             # 전면 교체 (폼 + 미리보기 조립 + 디자인)
e2e/
  generate.e2e.ts             # 해피패스 e2e (신규)
```

제거: `src/routes/demo/` 전체, `src/lib/vitest-examples/` 전체 (SvelteKit 템플릿 데모).

---

## Task 1: 프로젝트 셋업 (의존성 · prerender · 데모 정리)

**Files:**

- Modify: `package.json` (의존성 추가 — bun이 처리)
- Create: `src/routes/+layout.ts`
- Modify: `src/app.html:2` (`lang="en"` → `lang="ko"`)
- Delete: `src/routes/demo/`, `src/lib/vitest-examples/`

- [ ] **Step 1: qrcode 라이브러리와 타입 설치**

Run:

```bash
bun add qrcode && bun add -d @types/qrcode
```

Expected: `qrcode@1.5.4`, `@types/qrcode@1.5.6`가 `package.json`에 추가됨.

- [ ] **Step 2: 앱 전체 prerender 설정 파일 생성**

Create `src/routes/+layout.ts`:

```ts
export const prerender = true;
```

- [ ] **Step 3: HTML 언어 속성을 한국어로 변경**

`src/app.html`에서 `<html lang="en">`을 `<html lang="ko">`로 수정한다.

- [ ] **Step 4: 템플릿 데모 파일 제거**

Run:

```bash
rm -rf src/routes/demo src/lib/vitest-examples
```

Expected: 두 디렉터리가 삭제됨. (기존 데모 e2e/컴포넌트 테스트 제거)

- [ ] **Step 5: 타입 체크로 깨진 import가 없는지 확인**

Run:

```bash
bun run check
```

Expected: 에러 0. (데모 삭제 후 남은 참조가 없어야 함)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: qrcode 설치, prerender 설정, 템플릿 데모 제거

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Contact 타입 정의

**Files:**

- Create: `src/lib/types.ts`

- [ ] **Step 1: 타입과 빈 값 상수 작성**

Create `src/lib/types.ts`:

```ts
export interface Contact {
	name: string;
	organization: string;
	title: string;
	mobile: string;
	phone: string;
	email: string;
	url: string;
	address: string;
}

export const emptyContact: Contact = {
	name: '',
	organization: '',
	title: '',
	mobile: '',
	phone: '',
	email: '',
	url: '',
	address: ''
};
```

- [ ] **Step 2: 타입 체크**

Run: `bun run check`
Expected: 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/types.ts
git commit -m "feat: Contact 타입 정의

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: buildVCard — vCard 3.0 문자열 생성 (TDD)

**Files:**

- Create: `src/lib/vcard.spec.ts` (test)
- Create: `src/lib/vcard.ts`

vCard 3.0 규칙: 줄 구분은 `\r\n`(CRLF). 텍스트 값의 특수문자는 이스케이프
(`\` → `\\`, 줄바꿈 → `\n`, `,` → `\,`, `;` → `\;`). `N`/`ADR`은 세미콜론으로
구획을 나누는 구조 필드라 구획 세미콜론은 이스케이프하지 않는다(각 구획 값만 이스케이프).
빈 필드는 출력에서 제외한다. 이름은 `FN`과 `N`(family 위치)에 함께 넣는다.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/vcard.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildVCard } from './vcard';
import { emptyContact } from './types';

describe('buildVCard', () => {
	it('이름만 있으면 최소 유효 vCard를 만든다', () => {
		const result = buildVCard({ ...emptyContact, name: '홍길동' });
		const lines = result.split('\r\n');
		expect(lines[0]).toBe('BEGIN:VCARD');
		expect(lines[1]).toBe('VERSION:3.0');
		expect(lines).toContain('FN:홍길동');
		expect(lines).toContain('N:홍길동;;;;');
		expect(lines.at(-1)).toBe('END:VCARD');
	});

	it('CRLF로 줄을 구분한다', () => {
		const result = buildVCard({ ...emptyContact, name: '홍길동' });
		expect(result).toContain('\r\n');
	});

	it('빈 필드는 출력하지 않는다', () => {
		const result = buildVCard({ ...emptyContact, name: '홍길동' });
		expect(result).not.toContain('ORG:');
		expect(result).not.toContain('TEL');
		expect(result).not.toContain('EMAIL');
	});

	it('채워진 필드를 올바른 vCard 속성으로 매핑한다', () => {
		const result = buildVCard({
			name: '홍길동',
			organization: '루나랩',
			title: '대표',
			mobile: '010-1234-5678',
			phone: '02-123-4567',
			email: 'hong@example.com',
			url: 'https://example.com',
			address: '서울시 강남구'
		});
		const lines = result.split('\r\n');
		expect(lines).toContain('ORG:루나랩');
		expect(lines).toContain('TITLE:대표');
		expect(lines).toContain('TEL;TYPE=CELL:010-1234-5678');
		expect(lines).toContain('TEL;TYPE=WORK,VOICE:02-123-4567');
		expect(lines).toContain('EMAIL;TYPE=WORK:hong@example.com');
		expect(lines).toContain('URL:https://example.com');
		expect(lines).toContain('ADR;TYPE=WORK:;;서울시 강남구;;;;');
	});

	it('특수문자(콤마·세미콜론·백슬래시·줄바꿈)를 이스케이프한다', () => {
		const result = buildVCard({
			...emptyContact,
			name: '홍길동',
			organization: 'A,B;C\\D\nE'
		});
		expect(result).toContain('ORG:A\\,B\\;C\\\\D\\nE');
	});

	it('구조 필드(ADR)의 값 내부 세미콜론만 이스케이프하고 구획은 유지한다', () => {
		const result = buildVCard({
			...emptyContact,
			name: '홍길동',
			address: '3층;301호'
		});
		expect(result).toContain('ADR;TYPE=WORK:;;3층\\;301호;;;;');
	});

	it('앞뒤 공백은 제거하고, 공백뿐인 필드는 제외한다', () => {
		const result = buildVCard({
			...emptyContact,
			name: '  홍길동  ',
			organization: '   '
		});
		expect(result).toContain('FN:홍길동');
		expect(result).not.toContain('ORG:');
	});
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `bunx vitest run src/lib/vcard.spec.ts`
Expected: FAIL — `buildVCard`를 `./vcard`에서 찾을 수 없음(모듈 없음).

- [ ] **Step 3: 최소 구현 작성**

Create `src/lib/vcard.ts`:

```ts
import type { Contact } from './types';

function escapeVCard(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/,/g, '\\,')
		.replace(/;/g, '\\;');
}

export function buildVCard(contact: Contact): string {
	const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

	const name = contact.name.trim();
	lines.push(`N:${escapeVCard(name)};;;;`);
	lines.push(`FN:${escapeVCard(name)}`);

	const org = contact.organization.trim();
	if (org) lines.push(`ORG:${escapeVCard(org)}`);

	const title = contact.title.trim();
	if (title) lines.push(`TITLE:${escapeVCard(title)}`);

	const mobile = contact.mobile.trim();
	if (mobile) lines.push(`TEL;TYPE=CELL:${escapeVCard(mobile)}`);

	const phone = contact.phone.trim();
	if (phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCard(phone)}`);

	const email = contact.email.trim();
	if (email) lines.push(`EMAIL;TYPE=WORK:${escapeVCard(email)}`);

	const url = contact.url.trim();
	if (url) lines.push(`URL:${escapeVCard(url)}`);

	const address = contact.address.trim();
	if (address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(address)};;;;`);

	lines.push('END:VCARD');
	return lines.join('\r\n');
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `bunx vitest run src/lib/vcard.spec.ts`
Expected: PASS — 7개 테스트 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/vcard.ts src/lib/vcard.spec.ts
git commit -m "feat: vCard 3.0 문자열 생성 (buildVCard)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: QR 생성 래퍼 (qr.ts)

`qrcode` 라이브러리의 얇은 래퍼. 패스스루라 단위 테스트는 두지 않는다(설계 결정).
검증은 타입 체크와 e2e로 한다.

**Files:**

- Create: `src/lib/qr.ts`

- [ ] **Step 1: 래퍼 작성**

Create `src/lib/qr.ts`:

```ts
import QRCode from 'qrcode';

const COMMON = { errorCorrectionLevel: 'M', margin: 2, width: 320 } as const;

export function toPngDataUrl(text: string): Promise<string> {
	return QRCode.toDataURL(text, COMMON);
}

export function toSvgString(text: string): Promise<string> {
	return QRCode.toString(text, { ...COMMON, type: 'svg' });
}
```

- [ ] **Step 2: 타입 체크**

Run: `bun run check`
Expected: 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/qr.ts
git commit -m "feat: qrcode 래퍼 (PNG/SVG 생성)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: ContactForm 컴포넌트

**디자인 스킬 사용:** 이 태스크는 `frontend-design` 스킬을 사용해 디자인 방향 A(깔끔한
프로페셔널: 라이트 배경, 뉴트럴 그레이 + 블루 액센트, 넓은 여백)로 마감한다.
아래 코드는 기능·구조·접근성(label 연결)의 기준선이며, 스킬로 시각 완성도를 높인다.

**Svelte MCP 필수:** 컴포넌트 작성 후 `svelte-autofixer`를 이슈가 없을 때까지 반복 호출한다.

**Files:**

- Create: `src/lib/components/ContactForm.svelte`

- [ ] **Step 1: 폼 컴포넌트 작성**

Create `src/lib/components/ContactForm.svelte`:

```svelte
<script lang="ts">
	import type { Contact } from '$lib/types';

	let { contact = $bindable() }: { contact: Contact } = $props();

	const fields = [
		{ key: 'name', label: '이름', type: 'text', required: true, placeholder: '홍길동' },
		{ key: 'organization', label: '회사', type: 'text', required: false, placeholder: '루나랩' },
		{ key: 'title', label: '직함', type: 'text', required: false, placeholder: '대표' },
		{
			key: 'mobile',
			label: '휴대전화',
			type: 'tel',
			required: false,
			placeholder: '010-1234-5678'
		},
		{ key: 'phone', label: '유선전화', type: 'tel', required: false, placeholder: '02-123-4567' },
		{
			key: 'email',
			label: '이메일',
			type: 'email',
			required: false,
			placeholder: 'hong@example.com'
		},
		{
			key: 'url',
			label: '웹사이트',
			type: 'url',
			required: false,
			placeholder: 'https://example.com'
		},
		{ key: 'address', label: '주소', type: 'text', required: false, placeholder: '서울시 강남구 …' }
	] as const satisfies ReadonlyArray<{
		key: keyof Contact;
		label: string;
		type: string;
		required: boolean;
		placeholder: string;
	}>;
</script>

<div class="flex flex-col gap-4">
	{#each fields as field (field.key)}
		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-medium text-slate-700">
				{field.label}{#if field.required}<span class="text-blue-600"> *</span>{/if}
			</span>
			<input
				id={field.key}
				type={field.type}
				placeholder={field.placeholder}
				required={field.required}
				value={contact[field.key]}
				oninput={(e) => (contact[field.key] = e.currentTarget.value)}
				class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			/>
		</label>
	{/each}
</div>
```

> 참고: 동적 키에는 `bind:value` 대신 `value` + `oninput`으로 프록시를 직접
> 갱신한다(동적 멤버 바인딩 이슈 회피). `contact`는 `$bindable` 프록시라 부모에 반영된다.

- [ ] **Step 2: svelte-autofixer 실행**

`svelte-autofixer`를 `ContactForm.svelte` 코드로 호출한다. 이슈/제안이 없을 때까지 반복한다.
Expected: 최종적으로 이슈 0.

- [ ] **Step 3: 타입 체크**

Run: `bun run check`
Expected: 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/components/ContactForm.svelte
git commit -m "feat: 연락처 입력 폼 컴포넌트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: QrPreview 컴포넌트

**디자인 스킬 사용:** `frontend-design` 스킬로 방향 A에 맞춰 마감. 아래는 기준선.

**Svelte MCP 필수:** 작성 후 `svelte-autofixer`를 이슈 0까지 반복.

**Files:**

- Create: `src/lib/components/QrPreview.svelte`

동작: `data`(vCard 문자열)가 비면 placeholder를 보이고 다운로드 버튼을 비활성화한다.
값이 있으면 `$effect`에서 PNG/SVG를 비동기 생성한다. 빠른 연속 입력 시 이전 요청 결과가
늦게 도착해 덮어쓰지 않도록 teardown에서 취소 플래그를 세운다.

- [ ] **Step 1: 컴포넌트 작성**

Create `src/lib/components/QrPreview.svelte`:

```svelte
<script lang="ts">
	import { toPngDataUrl, toSvgString } from '$lib/qr';

	let { data, filename = 'contact' }: { data: string; filename?: string } = $props();

	let pngUrl = $state('');
	let svgString = $state('');
	let error = $state('');

	$effect(() => {
		const text = data;
		if (!text) {
			pngUrl = '';
			svgString = '';
			error = '';
			return;
		}
		let cancelled = false;
		error = '';
		Promise.all([toPngDataUrl(text), toSvgString(text)])
			.then(([png, svg]) => {
				if (cancelled) return;
				pngUrl = png;
				svgString = svg;
			})
			.catch(() => {
				if (cancelled) return;
				pngUrl = '';
				svgString = '';
				error = 'QR 코드를 생성할 수 없습니다. 입력 내용을 확인해주세요.';
			});
		return () => {
			cancelled = true;
		};
	});

	function downloadPng() {
		if (!pngUrl) return;
		const a = document.createElement('a');
		a.href = pngUrl;
		a.download = `${filename}.png`;
		a.click();
	}

	function downloadSvg() {
		if (!svgString) return;
		const blob = new Blob([svgString], { type: 'image/svg+xml' });
		const objectUrl = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = objectUrl;
		a.download = `${filename}.svg`;
		a.click();
		URL.revokeObjectURL(objectUrl);
	}
</script>

<div class="flex flex-col items-center gap-4">
	<div
		class="flex aspect-square w-full max-w-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white p-4"
	>
		{#if error}
			<p class="text-center text-sm text-red-600">{error}</p>
		{:else if pngUrl}
			<img src={pngUrl} alt="연락처 QR 코드" class="h-full w-full object-contain" />
		{:else}
			<p class="text-center text-sm text-slate-400">이름을 입력하면<br />QR 코드가 생성됩니다</p>
		{/if}
	</div>

	<div class="flex w-full max-w-[320px] gap-2">
		<button
			type="button"
			onclick={downloadPng}
			disabled={!pngUrl}
			class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-300"
		>
			PNG 다운로드
		</button>
		<button
			type="button"
			onclick={downloadSvg}
			disabled={!svgString}
			class="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-300"
		>
			SVG 다운로드
		</button>
	</div>
</div>
```

- [ ] **Step 2: svelte-autofixer 실행**

`svelte-autofixer`를 `QrPreview.svelte` 코드로 호출, 이슈 0까지 반복.

- [ ] **Step 3: 타입 체크**

Run: `bun run check`
Expected: 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/components/QrPreview.svelte
git commit -m "feat: QR 미리보기 및 다운로드 컴포넌트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 페이지 조립 및 디자인

**디자인 스킬 사용:** 이 태스크는 `frontend-design` 스킬로 방향 A 전체 레이아웃을 마감한다
(헤더/설명, 2단 레이아웃, 모바일 세로 스택, 여백·타이포·색). 아래는 기능 기준선.

**Svelte MCP 필수:** 작성 후 `svelte-autofixer`를 이슈 0까지 반복.

**Files:**

- Modify (전면 교체): `src/routes/+page.svelte`

- [ ] **Step 1: 페이지 작성**

`src/routes/+page.svelte`의 내용을 아래로 전면 교체한다:

```svelte
<script lang="ts">
	import ContactForm from '$lib/components/ContactForm.svelte';
	import QrPreview from '$lib/components/QrPreview.svelte';
	import { buildVCard } from '$lib/vcard';
	import { emptyContact, type Contact } from '$lib/types';

	let contact = $state<Contact>({ ...emptyContact });
	let vcard = $derived(contact.name.trim() ? buildVCard(contact) : '');
	let filename = $derived(contact.name.trim() || 'contact');
</script>

<svelte:head>
	<title>명함 QR 코드 생성기</title>
	<meta
		name="description"
		content="연락처 정보를 입력하면 주소록에 추가되는 표준 QR 코드를 만들어 다운로드합니다."
	/>
</svelte:head>

<main class="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
	<div class="mx-auto max-w-4xl">
		<header class="mb-8 text-center">
			<h1 class="text-2xl font-semibold text-slate-900">명함 QR 코드 생성기</h1>
			<p class="mt-2 text-sm text-slate-500">
				정보를 입력하면 카메라로 스캔 시 주소록에 추가되는 QR 코드가 만들어집니다.
			</p>
		</header>

		<div class="grid gap-6 md:grid-cols-2">
			<section class="rounded-xl border border-slate-200 bg-white p-6">
				<ContactForm bind:contact />
			</section>
			<section
				class="flex items-start justify-center rounded-xl border border-slate-200 bg-white p-6"
			>
				<QrPreview data={vcard} {filename} />
			</section>
		</div>
	</div>
</main>
```

- [ ] **Step 2: svelte-autofixer 실행**

`svelte-autofixer`를 `+page.svelte` 코드로 호출, 이슈 0까지 반복.

- [ ] **Step 3: 타입 체크**

Run: `bun run check`
Expected: 에러 0.

- [ ] **Step 4: 개발 서버로 수동 확인**

Run: `bun run dev`
브라우저에서 `http://localhost:5173` 접속. 이름을 입력하면 QR이 나타나고, PNG/SVG 버튼이
활성화되는지 육안 확인. 확인 후 서버 종료.

- [ ] **Step 5: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat: 메인 페이지 조립 및 디자인

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 해피패스 e2e 테스트

**Files:**

- Create: `e2e/generate.e2e.ts`

Playwright 설정(`playwright.config.ts`)은 `**/*.e2e.{ts,js}`를 매칭하고
`build && preview`(포트 4173)로 앱을 띄운다. prerender가 정상 동작해야 빌드가 성공한다.

- [ ] **Step 1: e2e 테스트 작성**

Create `e2e/generate.e2e.ts`:

```ts
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
```

- [ ] **Step 2: e2e 실행**

Run: `bun run test:e2e`
Expected: 2개 테스트 PASS. (최초 실행 시 `playwright install`이 브라우저를 받을 수 있음)

- [ ] **Step 3: 커밋**

```bash
git add e2e/generate.e2e.ts
git commit -m "test: 명함 QR 생성 해피패스 e2e

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: 최종 검증

**Files:** 없음 (검증 및 정리)

- [ ] **Step 1: 전체 단위 테스트**

Run: `bun run test:unit -- --run`
Expected: `vcard.spec.ts` 전부 PASS, 실패 0.

- [ ] **Step 2: 타입 체크**

Run: `bun run check`
Expected: 에러 0, 경고 0.

- [ ] **Step 3: 포맷 및 린트**

Run: `bun run format && bun run lint`
Expected: 포맷 적용 후 lint 통과(에러 0).

- [ ] **Step 4: 프로덕션 빌드 확인 (prerender 성공 검증)**

Run: `bun run build`
Expected: 빌드 성공. `/`가 prerender되어 정적 파일로 출력됨. 에러 0.

- [ ] **Step 5: 포맷/린트 변경사항이 있으면 커밋**

```bash
git add -A
git commit -m "chore: 포맷 및 린트 정리

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" || echo "커밋할 변경 없음"
```

---

## Self-Review (계획 작성자 확인 완료)

**1. Spec 커버리지**

- vCard 3.0 생성 → Task 3 ✅
- 표준 명함 필드 8종 매핑 → Task 2(타입) + Task 3(매핑) + Task 5(입력) ✅
- PNG + SVG 다운로드 → Task 4 + Task 6 ✅
- 디자인 방향 A → Task 5/6/7 (frontend-design 스킬) ✅
- 순수 클라이언트 + prerender → Task 1 (+layout.ts) ✅
- 이름 필수/빈 필드 제외/이스케이프/CRLF → Task 3 테스트 ✅
- 에러 처리(생성 실패, 미입력 placeholder) → Task 6 ✅
- 실시간 미리보기 → Task 7($derived) + Task 6($effect) ✅
- 테스트: buildVCard 단위 + 해피패스 e2e → Task 3, Task 8 ✅
- 한국어 UI → 전 컴포넌트 + app.html lang=ko (Task 1) ✅

**2. 플레이스홀더 스캔:** 모든 코드/명령 구체화됨. TBD/TODO 없음.

**3. 타입 일관성:** `Contact`(8필드 string), `buildVCard(contact): string`,
`toPngDataUrl/toSvgString(text): Promise<string>`, `QrPreview` props `{ data, filename }`,
`ContactForm` prop `{ contact }`($bindable) — 전 태스크에서 일관.
