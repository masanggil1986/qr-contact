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
			organization: '루너리',
			title: '대표',
			mobile: '010-1234-5678',
			phone: '02-123-4567',
			email: 'hong@example.com',
			url: 'https://example.com',
			address: '서울시 강남구'
		});
		const lines = result.split('\r\n');
		expect(lines).toContain('ORG:루너리');
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
