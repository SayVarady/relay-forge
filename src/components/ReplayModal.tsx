"use client";

import { useState, useEffect } from "react";
import {
	X,
	Play,
	Loader2,
	Zap,
	AlertTriangle,
	ArrowRight,
} from "lucide-react";

export interface ReplayLogResult {
	id: string;
	requestId: string;
	targetUrl: string;
	statusCode: number;
	responseHeaders?: Record<string, string> | null;
	responseBody?: string | null;
	latencyMs: number;
	executedAt: string;
}

interface ReplayModalProps {
	isOpen: boolean;
	onClose: () => void;
	request: {
		id: string;
		method: string;
		headers?: Record<string, string>;
		bodyRaw?: string | null;
		bodyJson?: unknown;
	} | null;
}

export default function ReplayModal({
	isOpen,
	onClose,
	request,
}: ReplayModalProps) {
	const [targetUrl, setTargetUrl] = useState("https://httpbin.org/post");
	const [isReplaying, setIsReplaying] = useState(false);
	const [result, setResult] = useState<ReplayLogResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Close on Escape key press
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (isOpen) {
			window.addEventListener("keydown", handleKeyDown);
		}
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen || !request) return null;

	const handleReplay = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsReplaying(true);
		setResult(null);
		setError(null);

		try {
			const res = await fetch(`/api/requests/${request.id}/replay`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ targetUrl }),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to replay request");
			}
			setResult(data.log);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "An unexpected error occurred";
			setError(message);
		} finally {
			setIsReplaying(false);
		}
	};

	// Helper to safely format response body
	const formatResponseBody = (body: string | null | undefined) => {
		if (!body) return "(Empty response body)";
		try {
			const parsed = JSON.parse(body);
			return JSON.stringify(parsed, null, 2);
		} catch {
			return body;
		}
	};

	const getStatusBadgeStyle = (code: number) => {
		if (code >= 200 && code < 300) {
			return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
		}
		if (code >= 400 && code < 500) {
			return "bg-amber-500/10 text-amber-400 border-amber-500/20";
		}
		return "bg-red-500/10 text-red-400 border-red-500/20";
	};

	return (
		<div
			onClick={onClose}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden my-8"
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/80">
					<div className="flex items-center gap-2.5">
						<span
							className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400
                border border-emerald-500/20"
						>
							<Play className="h-3.5 w-3.5 fill-current" />
						</span>
						<div>
							<h3 className="text-sm font-semibold text-white">
								Replay Webhook
							</h3>
							<p className="text-xs text-zinc-400 font-mono">
								Request ID: {request.id.slice(0, 8)}...
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Body Form */}
				<form onSubmit={handleReplay} className="p-6 space-y-5">
					<div className="space-y-2">
						<label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
							Target Destination URL
						</label>
						<div className="flex gap-2">
							<input
								type="url"
								required
								value={targetUrl}
								onChange={(e) => setTargetUrl(e.target.value)}
								placeholder="https://api.example.com/webhook"
								className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100
                    placeholder-zinc-500 font-mono focus:border-emerald-500 focus:outline-none focus:ring-1
                    focus:ring-emerald-500"
							/>
							<button
								type="submit"
								disabled={isReplaying}
								className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white
                    hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm cursor-pointer
                    disabled:cursor-not-allowed"
							>
								{isReplaying ? (
									<>
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
										Replaying...
									</>
								) : (
									<>
										<ArrowRight className="h-3.5 w-3.5" />
										Send Replay
									</>
								)}
							</button>
						</div>
						<p className="text-[11px] text-zinc-500">
							Defaults to{" "}
							<code className="text-zinc-400">
								https://httpbin.org/post
							</code>{" "}
							for safe sandbox testing.
						</p>
					</div>

					{/* Error Message */}
					{error && (
						<div
							className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs
                text-red-400"
						>
							<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					{/* Replay Result Panel */}
					{result && (
						<div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
							<div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
								<div className="flex items-center gap-2">
									<span
										className={`px-2.5 py-0.5 text-xs font-semibold font-mono rounded-full border ${getStatusBadgeStyle(
											result.statusCode,
										)}`}
									>
										{result.statusCode === 0
											? "Network Error"
											: `${result.statusCode}`}
									</span>
									<span className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
										<Zap className="h-3 w-3 text-amber-400" />
										{result.latencyMs} ms
									</span>
								</div>
								<span className="text-[11px] text-zinc-500 font-mono">
									{new Date(
										result.executedAt,
									).toLocaleTimeString()}
								</span>
							</div>

							<div>
								<span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
									Response Body
								</span>
								<pre
									className="max-h-48 overflow-y-auto rounded bg-zinc-900 p-3 text-xs font-mono text-zinc-300 border
                    border-zinc-800/60"
								>
									{formatResponseBody(result.responseBody)}
								</pre>
							</div>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}
