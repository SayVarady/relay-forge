import { NextRequest, NextResponse } from "next/server";
import { ingestWebhook } from "@/services/webhook.service";

async function handleWebhook(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string}>}
) {
	const { slug } = await params;
	const httpMethod = request.method;
	const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
	const header = Object.fromEntries(request.headers.entries());
	const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? '127.0.0.1';
	const rawBody = httpMethod.toLowerCase() == 'get' ? null : await request.text();
	let jsonBody = null;

	if (rawBody && rawBody.length > 0) {
		try {
			jsonBody = JSON.parse(rawBody);
		} catch {
			// Leave it as null
		}
	}

	const captured = await ingestWebhook({
		slug: slug,
		method: httpMethod,
		queryParams: queryParams,
		headers: header,
		ipAddress: ipAddress,
		jsonBody: jsonBody,
    	rawBody: rawBody
	});

	return NextResponse.json(
		{ received: true, requestId: captured.id },
		{ status: 200 }
	);

}

export const GET = handleWebhook;
export const POST = handleWebhook;
export const PUT = handleWebhook;
export const PATCH = handleWebhook;
export const DELETE = handleWebhook;
