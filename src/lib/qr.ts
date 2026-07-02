import QRCode from 'qrcode';

const COMMON = { errorCorrectionLevel: 'M', margin: 2, width: 320 } as const;

export function toPngDataUrl(text: string): Promise<string> {
	return QRCode.toDataURL(text, COMMON);
}

export function toSvgString(text: string): Promise<string> {
	return QRCode.toString(text, { ...COMMON, type: 'svg' });
}
