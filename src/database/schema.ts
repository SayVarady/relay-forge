import {
	pgTable,
	uuid,
	varchar,
	text,
	jsonb,
	timestamp,
	integer,
} from "drizzle-orm/pg-core";

export const endpoints = pgTable("endpoints", {
	id: uuid("id").defaultRandom().primaryKey(),
	slug: varchar("slug", { length: 64 }).notNull().unique(),
	name: varchar("name", { length: 255 })
		.notNull()
		.default("Default Endpoint"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const capturedRequests = pgTable("captured_requests", {
	id: uuid("id").defaultRandom().primaryKey(),
	endpointId: uuid("endpoint_id")
		.references(() => endpoints.id, { onDelete: "cascade" })
		.notNull(),
	method: varchar("method", { length: 10 }).notNull(),
	headers: jsonb("headers").notNull(),
	queryParams: jsonb("query_params"),
	bodyRaw: text("body_raw"),
	bodyJson: jsonb("body_json"),
	ipAddress: varchar("ip_address", { length: 45 }),
	contentType: varchar("content_type", { length: 120 }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const replayLogs = pgTable("replay_logs", {
	id: uuid("id").defaultRandom().primaryKey(),
	requestId: uuid("request_id")
		.references(() => capturedRequests.id, { onDelete: "cascade" })
		.notNull(),
	targetUrl: text("target_url").notNull(),
	statusCode: integer("status_code").notNull(),
	responseHeaders: jsonb("response_headers"),
	responseBody: text("response_body"),
	latencyMs: integer("latency_ms").notNull(),
	executedAt: timestamp("executed_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
