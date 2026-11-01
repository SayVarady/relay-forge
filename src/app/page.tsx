"use client";

import { useState } from "react";
import useSWR from "swr";
import { generateCurl } from "@/lib/curl";
import { Copy, Terminal, Radio, Play } from "lucide-react";
import ReplayModal from "@/components/ReplayModal";

interface CapturedRequest {
	id: string;
	endpointId: string;
	method: string;
	headers: Record<string, string>;
	queryParams?: Record<string, string> | null;
	bodyRaw?: string | null;
	bodyJson?: unknown;
	ipAddress?: string | null;
	contentType?: string | null;
	createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { data } = useSWR(
		"/api/endpoints/demo/requests",
		fetcher,
		{
			refreshInterval: 2000,
		},
	);

	const methodStyles: Record<string, string> = {
		GET: "text-blue-400 bg-blue-500/10 border-blue-500/20",
		POST: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
		PUT: "text-amber-400 bg-amber-500/10 border-amber-500/20",
		PATCH: "text-amber-400 bg-amber-500/10 border-amber-500/20",
		DELETE: "text-red-400 bg-red-500/10 border-red-500/20",
	};

	const [copiedCurl, setCopiedCurl] = useState(false);
	const handleCopyCurl = () => {
		if (!activeRequest) return;
		navigator.clipboard.writeText(generateCurl(activeRequest));
		setCopiedCurl(true);
		setTimeout(() => setCopiedCurl(false), 2000);
	};

	const requests: CapturedRequest[] = data?.requests || [];
	const activeRequest =
		requests.find((r) => r.id === selectedId) || requests[0];

	const [isReplayOpen, setIsReplayOpen] = useState(false);

	const webhookUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/api/catch/demo`
			: "http://localhost:3000/api/catch/demo";

	return (
		<div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
			{/* 1. TOP HEADER */}
			<header
				className="flex h-14 items-center justify-between border-b border-zinc-800 px-6
          bg-zinc-900/50"
			>
				<div className="flex items-center gap-3">
					<Terminal className="h-5 w-5 text-emerald-400" />
					<span className="font-bold tracking-tight text-white">
						RelayForge
					</span>
					<span
						className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5
              text-xs text-emerald-400 border border-emerald-500/20"
					>
						<Radio className="h-3 w-3 animate-pulse" /> Live
						Ingestion
					</span>
				</div>

				{/* Copyable Webhook URL */}
				<div
					className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md
            px-3 py-1.5"
				>
					<span className="text-xs text-zinc-400">Endpoint:</span>
					<code className="text-xs font-mono text-zinc-200">
						{webhookUrl}
					</code>
					<button
						onClick={() =>
							navigator.clipboard.writeText(webhookUrl)
						}
						className="text-zinc-400 hover:text-white transition-colors ml-1"
						title="Copy URL"
					>
						<Copy className="h-3.5 w-3.5" />
					</button>
				</div>
			</header>

			{/* 2. MAIN 2-COLUMN BODY */}
			<div className="flex flex-1 overflow-hidden">
				{/* LEFT COLUMN: Request Feed (w-96) */}
				<aside
					className="w-96 border-r border-zinc-800 overflow-y-auto flex flex-col
            bg-zinc-900/20"
				>
					<div
						className="p-3 border-b border-zinc-800/80 text-xs font-semibold text-zinc-400
              uppercase tracking-wider"
					>
						Captured Requests ({requests.length})
					</div>

					<div className="flex-1 divide-y divide-zinc-800/50">
						{requests.length === 0 ? (
							<div className="p-8 text-center text-sm text-zinc-500">
								Waiting for incoming webhooks... Send a POST
								request to the endpoint above.
							</div>
						) : (
							requests.map((req: CapturedRequest) => {
								const isSelected = activeRequest?.id === req.id;
								return (
									<button
										key={req.id}
										onClick={() => setSelectedId(req.id)}
										className={`w-full text-left p-3.5 transition-colors flex items-center
                        justify-between ${
							isSelected
								? "bg-zinc-800/80 border-l-2 border-emerald-500"
								: "hover:bg-zinc-800/30"
						}`}
									>
										<div className="flex items-center gap-2.5">
											<span
												className={`px-2 py-0.5 text-xs font-bold font-mono rounded
                          ${methodStyles[req?.method] || "bg-zinc-800 text-zinc-400 border-zinc-700"}}`}
											>
												{req.method}
											</span>
											<span className="text-xs font-mono text-zinc-300 truncate max-w-[140px]">
												{req.id.slice(0, 8)}...
											</span>
										</div>
										<span className="text-xs text-zinc-500">
											{new Date(
												req.createdAt,
											).toLocaleTimeString()}
										</span>
									</button>
								);
							})
						)}
					</div>
				</aside>

				{/* RIGHT COLUMN: Selected Request Inspector */}
				<main className="flex-1 overflow-y-auto p-6 bg-zinc-950">
					{activeRequest ? (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-white">
									Request Details
								</h2>
								<p className="text-xs text-zinc-400 font-mono mt-1">
									ID: {activeRequest.id}
								</p>
							</div>

							<div className="flex items-center gap-2">
								<button
									onClick={handleCopyCurl}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs
                    font-medium text-zinc-200 border border-zinc-700 transition-colors"
								>
									<Terminal className="h-3.5 w-3.5 text-emerald-400" />
									{copiedCurl ? "Copied cURL!" : "Copy cURL"}
								</button>
								<button
									onClick={() => setIsReplayOpen(true)}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium
      text-white transition-colors"
								>
									<Play className="h-3.5 w-3.5 fill-current" />
									Replay Request
								</button>
							</div>

							{/* Payload Section */}
							<div className="space-y-2">
								<span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
									JSON Body
								</span>
								<pre
									className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 font-mono
                    text-xs text-zinc-200 overflow-x-auto"
								>
									{JSON.stringify(
										activeRequest.bodyJson ||
											activeRequest.bodyRaw,
										null,
										2,
									)}
								</pre>
							</div>

							{/* Headers Section */}
							<div className="space-y-2">
								<span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
									Headers
								</span>
								<pre
									className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 font-mono
                    text-xs text-zinc-400 overflow-x-auto"
								>
									{JSON.stringify(
										activeRequest.headers,
										null,
										2,
									)}
								</pre>
							</div>
						</div>
					) : (
						<div className="flex h-full items-center justify-center text-zinc-500">
							Select a request from the sidebar to inspect its
							payload.
						</div>
					)}
				</main>
			</div>
			<ReplayModal key={activeRequest?.id} isOpen={isReplayOpen} onClose={() => setIsReplayOpen(false)} request={activeRequest} />
		</div>
	);
}
