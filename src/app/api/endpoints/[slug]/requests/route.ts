import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database";
import { endpoints, capturedRequests } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

async function fetchEndpoint(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
)
{
	const { slug } = await params;
	const [endpoint] = await db
		.select()
		.from(endpoints)
		.where(eq(endpoints.slug, slug))
		.limit(1);

	if (!endpoint) {
		return NextResponse.json(
			{ error: "Endpoint not found" },
			{ status: 404 }
		);
	}

	const requests = await db
		.select()
		.from(capturedRequests)
		.where(eq(capturedRequests.endpointId, endpoint.id))
		.orderBy(desc(capturedRequests.createdAt))
		.limit(50);

	return NextResponse.json(
		{ received: true, requests: requests },
		{ status: 200 }
	);
};

export const GET = fetchEndpoint;
