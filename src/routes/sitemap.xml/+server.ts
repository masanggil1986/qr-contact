import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = ({ url }) => {
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<url>
		<loc>${url.origin}/</loc>
	</url>
</urlset>
`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
