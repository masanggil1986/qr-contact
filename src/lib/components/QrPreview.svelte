<script lang="ts">
	import { toPngDataUrl, toSvgString } from '$lib/qr';

	let { data, filename = 'contact' }: { data: string; filename?: string } = $props();

	const qrPromise = $derived(data ? Promise.all([toPngDataUrl(data), toSvgString(data)]) : null);

	function downloadPng(pngUrl: string) {
		const a = document.createElement('a');
		a.href = pngUrl;
		a.download = `${filename}.png`;
		a.click();
	}

	function downloadSvg(svgString: string) {
		const blob = new Blob([svgString], { type: 'image/svg+xml' });
		const objectUrl = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = objectUrl;
		a.download = `${filename}.svg`;
		a.click();
		URL.revokeObjectURL(objectUrl);
	}
</script>

{#snippet placeholder()}
	<div class="flex flex-col items-center gap-3">
		<svg
			viewBox="0 0 48 48"
			class="h-10 w-10 text-slate-300"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			aria-hidden="true"
		>
			<rect x="4" y="4" width="14" height="14" rx="2" />
			<rect x="30" y="4" width="14" height="14" rx="2" />
			<rect x="4" y="30" width="14" height="14" rx="2" />
		</svg>
		<p class="text-center text-sm text-slate-400">
			이름을 입력하면<br />QR 코드가 생성됩니다
		</p>
	</div>
{/snippet}

{#snippet actions(pngUrl: string | null, svgString: string | null)}
	<div class="flex w-full max-w-[320px] gap-3">
		<button
			type="button"
			onclick={() => pngUrl !== null && downloadPng(pngUrl)}
			disabled={pngUrl === null}
			class="h-10 flex-1 rounded-lg bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-[3px] focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
		>
			PNG 다운로드
		</button>
		<button
			type="button"
			onclick={() => svgString !== null && downloadSvg(svgString)}
			disabled={svgString === null}
			class="h-10 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-[3px] focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:text-slate-300"
		>
			SVG 다운로드
		</button>
	</div>
{/snippet}

<div class="flex w-full flex-col items-center gap-4">
	<div
		class="flex aspect-square w-full max-w-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white p-4"
	>
		{#if qrPromise}
			{#await qrPromise}
				{@render placeholder()}
			{:then [pngUrl]}
				<img src={pngUrl} alt="연락처 QR 코드" class="qr-fade-in h-full w-full object-contain" />
			{:catch}
				<p class="text-center text-sm text-red-600">
					QR 코드를 생성할 수 없습니다. 입력 내용을 확인해주세요.
				</p>
			{/await}
		{:else}
			{@render placeholder()}
		{/if}
	</div>

	{#if qrPromise}
		{#await qrPromise}
			{@render actions(null, null)}
		{:then [pngUrl, svgString]}
			{@render actions(pngUrl, svgString)}
		{:catch}
			{@render actions(null, null)}
		{/await}
	{:else}
		{@render actions(null, null)}
	{/if}
</div>

<style>
	.qr-fade-in {
		animation: qr-fade-in 0.3s ease-out;
	}

	@keyframes qr-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.qr-fade-in {
			animation: none;
		}
	}
</style>
