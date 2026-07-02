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

	<footer class="mt-10 text-center text-[13px] text-slate-400">
		모든 처리는 브라우저 안에서만 이루어지며, 입력한 정보는 어디에도 전송되지 않습니다.
	</footer>
</main>
