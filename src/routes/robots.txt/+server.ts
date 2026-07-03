import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = ({ url }) => {
	const body = `User-agent: *
Disallow:

Sitemap: ${url.origin}/sitemap.xml
`;
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
