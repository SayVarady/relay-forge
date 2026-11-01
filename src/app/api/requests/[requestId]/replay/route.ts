import { NextRequest, NextResponse } from "next/server";
import { replayWebhook } from "@/services/replay.service";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ requestId: string }> },
) {
	try {
		const { requestId } = await params;

		let body: {
			targetUrl?: string;
			overrideHeaders?: Record<string, string>;
		} | null = null;

		try {
			body = await request.json();
		} catch {
			return NextResponse.json(
				{ error: "Invalid JSON request body" },
				{ status: 400 },
			);
		}

		const { targetUrl, overrideHeaders } = body || {};
		if (!targetUrl || typeof targetUrl !== "string") {
			return NextResponse.json(
				{ error: "Missing or invalid 'targetUrl' in request body" },
				{ status: 400 },
			);
		}
		try {
			new URL(targetUrl);
		} catch {
			return NextResponse.json(
				{ error: "Invalid URL format for 'targetUrl'" },
				{ status: 400 },
			);
		}

		const log = await replayWebhook({
			requestId,
			targetUrl,
			overrideHeaders: overrideHeaders || {},
		});
		return NextResponse.json({ success: true, log }, { status: 200 });
	} catch (error: unknown) {
		let errorMessage = "Internal server error during replay";
		let statusCode = 500;

		const message = error instanceof Error ? error.message : "";
		if (message.includes("Captured request not found")) {
			errorMessage = message;
			statusCode = 404; // Resource not found
		} else if (
			message.includes("forbidden") ||
			message.includes("not permitted") ||
			message.includes("allowed") ||
			message.includes("Malformed")
		) {
			errorMessage = message;
			statusCode = 400; // Bad Request / SSRF Blocked
		} else {
			console.error("Replay execution failed:", error);
		}

		return NextResponse.json(
			{ error: errorMessage },
			{ status: statusCode },
		);
	}
}
