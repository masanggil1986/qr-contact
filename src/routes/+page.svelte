<script lang="ts">
	import { page } from '$app/state';
	import ContactForm from '$lib/components/ContactForm.svelte';
	import LunaryPromo from '$lib/components/LunaryPromo.svelte';
	import QrPreview from '$lib/components/QrPreview.svelte';
	import { buildVCard } from '$lib/vcard';
	import { emptyContact, type Contact } from '$lib/types';

	let contact = $state<Contact>({ ...emptyContact });
	let vcard = $derived(contact.name.trim() ? buildVCard(contact) : '');
	let filename = $derived(contact.name.trim() || 'contact');

	const title = '명함 QR 코드 생성기 — 연락처 vCard QR 무료 만들기';
	const description =
		'이름·전화번호·이메일을 입력하면 스캔 시 주소록에 바로 저장되는 vCard QR 코드를 무료로 만듭니다. 회원가입 없이 브라우저에서만 처리되어 개인정보가 전송되지 않으며, PNG·SVG로 다운로드할 수 있습니다.';
	const canonical = `${page.url.origin}/`;
	const ogImage = `${page.url.origin}/og.png`;
	// script 닫는 태그를 문자열에 그대로 쓰면 Svelte 파서가 블록 종료로 해석하므로 태그를 분리해 조립한다.
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: '명함 QR 코드 생성기',
		description,
		url: canonical,
		applicationCategory: 'UtilityApplication',
		operatingSystem: 'Web',
		inLanguage: 'ko',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
		creator: { '@type': 'Organization', name: '루나랩', url: 'https://www.lunary.ai.kr' }
	});
	const jsonLdScript = `<script type="application/ld+json">${jsonLd}</scr` + `ipt>`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="명함 QR 코드 생성기" />
	<meta property="og:locale" content="ko_KR" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScript}
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-12 md:py-16">
	<header class="mb-10">
		<span
			class="inline-block rounded-md bg-blue-50 px-2 py-1 font-mono text-[11px] tracking-widest text-blue-600"
		>
			vCard 3.0
		</span>
		<h1 class="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
			명함 QR 코드 생성기
		</h1>
		<p class="mt-2 text-[15px] text-slate-500">
			정보를 입력하면 카메라로 스캔 시 주소록에 추가되는 QR 코드가 만들어집니다.
		</p>
	</header>

	<div class="grid gap-6 md:grid-cols-[1fr_360px]">
		<section class="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
			<h2 class="mb-5 text-sm font-semibold text-slate-900">명함 정보</h2>
			<ContactForm bind:contact />
		</section>

		<section
			class="self-start rounded-2xl border border-slate-200 bg-white p-6 md:sticky md:top-8 md:p-8"
		>
			<h2 class="mb-5 text-sm font-semibold text-slate-900">QR 코드</h2>
			<QrPreview data={vcard} {filename} />
		</section>
	</div>

	<div class="mt-6">
		<LunaryPromo />
	</div>

	<footer class="mt-10 text-center text-[13px] text-slate-400">
		모든 처리는 브라우저 안에서만 이루어지며, 입력한 정보는 어디에도 전송되지 않습니다.
	</footer>
</main>
