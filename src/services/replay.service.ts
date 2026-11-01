import { db } from "@/database"
import { capturedRequests, replayLogs } from "@/database/schema";
import { eq } from "drizzle-orm";

export interface ReplayOptions {
	requestId: string;
	targetUrl: string;
	overrideHeaders?: Record<string, string>;
}

const HOP_BY_HOP_HEADERS = new Set([
	"host",
	"content-length",
	"connection",
	"keep-alive",
	"transfer-encoding",
	"te",
	"upgrade"
]);

export function isSafeUrl(urlString: string): { safe: boolean; reason?: string } {
	try {
		const url = new URL(urlString);

		// 1. Only allow http: and https: protocols
		if (!["http:", "https:"].includes(url.protocol)) {
			return {
				safe: false,
				reason: "Only HTTP and HTTPS protocols are allowed",
			};
		}

		const hostname = url.hostname.toLowerCase();

		// 2. Block AWS/Cloud Instance Metadata Service (IMDS)
		if (hostname === "169.254.169.254") {
			return {
				safe: false,
				reason: "Access to cloud metadata services is forbidden",
			};
		}

		// 3. In production, block localhost, loopback, and private IPv4 ranges (RFC 1918)
		const isProduction = process.env.NODE_ENV === "production";
		if (
			isProduction &&
			(hostname === "localhost" ||
				hostname === "127.0.0.1" ||
				hostname === "::1" ||
				hostname === "0.0.0.0")
		) {
			return {
				safe: false,
				reason: "Replaying to localhost is not permitted in production",
			};
		}

		const ipParts = hostname.split(".").map(Number);
		if (
			isProduction &&
			ipParts.length === 4 &&
			ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255)
		) {
			const [b0, b1] = ipParts;
			if (
				b0 === 10 || // 10.0.0.0/8
				(b0 === 172 && b1 >= 16 && b1 <= 31) || // 172.16.0.0/12
				(b0 === 192 && b1 === 168) // 192.168.0.0/16
			) {
				return {
					safe: false,
					reason: "Replaying to private network addresses is forbidden in production",
				};
			}
		}

		return { safe: true };
	} catch {
		return { safe: false, reason: "Malformed or invalid URL" };
	}
}

export async function replayWebhook(
	{
		requestId,
		targetUrl,
		overrideHeaders = {},
	}: ReplayOptions)
{
	const urlCheck = isSafeUrl(targetUrl);
	if (!urlCheck.safe) {
		throw new Error(urlCheck.reason || "Target URL is not permitted");
	}

	const [captured] = await db
		.select()
		.from(capturedRequests)
		.where(eq(capturedRequests.id, requestId))
		.limit(1);

	if (!captured) throw new Error(`Captured request not found for ID ${requestId}`);

	const originalHeaders = (captured.headers as Record<string, string>) || {};
	const sanitizeHeaders: Record<string, string> = {};
	for (const [key, value] of Object.entries(originalHeaders)) {
		if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
			sanitizeHeaders[key] = value;
		}
	}
	const mergedHeaders = {
		...sanitizeHeaders,
		...overrideHeaders
	};

	const method = captured.method.toUpperCase();
	const hasBody = !["GET", "HEAD"].includes(method) && captured.bodyRaw !== null;
	const requestOptions: RequestInit = {
		method,
		headers: mergedHeaders,
		body: hasBody ? captured.bodyRaw : undefined,
		signal: AbortSignal.timeout(10000)
	}

	const startTime = performance.now();
	let statusCode = 0;
	let responseHeaders: Record<string, string> = {};
	let responseBody = "";

	try {
		const response = await fetch(targetUrl, requestOptions);
		statusCode = response.status;
		responseHeaders = Object.fromEntries(response.headers.entries());
		responseBody = await response.text();

	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : "Unknown network error";
		statusCode = 0;
		responseBody = JSON.stringify({ error: errorMessage });
	}
	const latencyMs = Math.round(performance.now() - startTime);

	const [log] = await db
		.insert(replayLogs)
		.values({
			requestId: captured.id,
			targetUrl,
			statusCode,
			responseHeaders,
			responseBody,
			latencyMs
		})
		.returning();

	return log;
};
