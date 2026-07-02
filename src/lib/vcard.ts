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
