<script lang="ts">
	import type { Contact } from '$lib/types';

	let { contact = $bindable() }: { contact: Contact } = $props();

	const fields = [
		{ key: 'name', label: '이름', type: 'text', required: true, placeholder: '홍길동', full: true },
		{
			key: 'organization',
			label: '회사',
			type: 'text',
			required: false,
			placeholder: '루너리',
			full: false
		},
		{
			key: 'title',
			label: '직함',
			type: 'text',
			required: false,
			placeholder: '대표',
			full: false
		},
		{
			key: 'mobile',
			label: '휴대전화',
			type: 'tel',
			required: false,
			placeholder: '010-1234-5678',
			full: false
		},
		{
			key: 'phone',
			label: '유선전화',
			type: 'tel',
			required: false,
			placeholder: '02-123-4567',
			full: false
		},
		{
			key: 'email',
			label: '이메일',
			type: 'email',
			required: false,
			placeholder: 'hong@example.com',
			full: true
		},
		{
			key: 'url',
			label: '웹사이트',
			type: 'url',
			required: false,
			placeholder: 'https://example.com',
			full: true
		},
		{
			key: 'address',
			label: '주소',
			type: 'text',
			required: false,
			placeholder: '서울시 강남구 …',
			full: true
		}
	] as const satisfies ReadonlyArray<{
		key: keyof Contact;
		label: string;
		type: string;
		required: boolean;
		placeholder: string;
		full: boolean;
	}>;
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	{#each fields as field (field.key)}
		<label class={field.full ? 'sm:col-span-2' : ''}>
			<span class="mb-1.5 block text-[13px] font-medium text-slate-600">
				{field.label}{#if field.required}<span class="text-blue-600"> *</span>{/if}
			</span>
			<input
				type={field.type}
				placeholder={field.placeholder}
				aria-required={field.required}
				value={contact[field.key]}
				oninput={(e) => (contact[field.key] = e.currentTarget.value)}
				class="h-10 w-full rounded-lg border-slate-200 bg-white px-3.5 text-[15px] text-slate-900 transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15"
			/>
		</label>
	{/each}
</div>
