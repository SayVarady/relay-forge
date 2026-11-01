import { db } from "@/database";
import { endpoints, capturedRequests } from "@/database/schema";
import { eq } from "drizzle-orm";

export interface IngestWebhookParams {
	slug: string;
	method: string;
	headers: Record<string, string>;
	queryParams?: Record<string, string>;
	rawBody: string | null;
	jsonBody: unknown;
	ipAddress?: string;
	contentType?: string | null;
}

export async function ingestWebhook(params: IngestWebhookParams) {
	let [endpoint] = await db
		.select()
		.from(endpoints)
		.where(eq(endpoints.slug, params.slug))
		.limit(1);

	if (!endpoint) {
		const [newEndPoint] = await db
			.insert(endpoints)
			.values({
				slug: params.slug,
				name: `${params.slug} Endpoint`,
			})
			.returning();
		endpoint = newEndPoint;
	}

	const [captured] = await db
		.insert(capturedRequests)
		.values({
			endpointId: endpoint.id,
			method: params.method,
			headers: params.headers,
			queryParams: params.queryParams,
			bodyRaw: params.rawBody,
			bodyJson: params.jsonBody,
			ipAddress: params.ipAddress,
			contentType: params.contentType
		})
		.returning();

	return captured;
}
