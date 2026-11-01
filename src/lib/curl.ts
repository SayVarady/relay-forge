export interface CurlRequest {
	method: string;
	headers?: Record<string, string> | null;
	bodyRaw?: string | null;
	bodyJson?: unknown;
}

export function generateCurl(req: CurlRequest, targetUrl?: string): string {
	const url = targetUrl || `${window.location.origin}/api/catch/demo`;
	let curl = `curl -X  ${req.method} "${url}"`;

	const ignoreHeaders = ['host', 'content-length', 'connection'];
	if (req.headers && typeof req.headers === 'object') {
		Object.entries(req.headers).forEach(([key, value]) => {
			if (!ignoreHeaders.includes(key.toLowerCase())) {
				curl += ` \\\n -H "${key}: ${value}"`;
			}
		});
	}

	const body = req.bodyRaw || (req.bodyJson ? JSON.stringify(req.bodyJson) : null);
	if (body && req.method !== 'GET') {
		const escapedBody = body.replace(/'/g, `'\\''`);
		curl += `\\\n --data-raw '${escapedBody}'`;
	}
	return curl;
}
