import type { TierName } from "@/config/policy";
export type Mode = "mock" | "development" | "production";
export type Stage = "OPEN" | "REVIEW" | "QUEUED" | "ACCEPTED" | "PLANNING" | "SEARCHING" | "READING" | "REASONING" | "BUILDING" | "VERIFYING" | "PUBLISHING" | "COMPLETE" | "FAILED";
export interface Mission {
  id: string; command: string; ownerId: string; creator: string; createdAt: string; startedAt: string | null; finishedAt: string | null;
  status: Stage; kind: "research" | "build" | "transform"; visibility: "public" | "private"; support: number; control: number; burn: number;
  budget: number; consumed: number; feasibility: "READY" | "REVIEW"; result: string | null; error: string | null; worldSlug: string | null;
  demo: boolean; input?: string;
}
export interface MissionEvent { id: string; missionId: string; type: string; stage: Stage; tool: string | null; message: string; at: string; cost: number | null; provider: string | null; }
export interface Artifact { id: string; missionId: string; type: "report" | "data" | "code" | "website" | "world"; title: string; storageKey: string; mime: string; createdAt: string; visibility: "public" | "private"; sha256: string; preview: string; }
export interface Receipt { version: string; missionId: string; command: string; wallet: string; submittedAt: string; startedAt: string | null; finishedAt: string; status: "COMPLETE" | "FAILED"; plan: string[]; events: MissionEvent[]; models: string[]; tools: string[]; compute: { currency: "USD"; consumed: number; budget: number; settled: boolean }; orbio: { mode: Mode; usageIds: string[] }; control: number; ctrlActions: { type: string; amount: number; transaction: string | null }[]; artifacts: Artifact[]; result: string; errors: string[]; demo: boolean; verification: { algorithm: "SHA-256"; hash: string; onchain: false }; }
export interface LockState { amount: number; days: number; unlocksAt: string | null; simulated: boolean; }
export interface Account { id: string; wallet: string | null; authenticated: boolean; demo: boolean; balance: number | null; heldDays: number; reputation: number; lock: LockState; tier: TierName; capacity: number; used: number; available: number; jobAllowance: number; jobsUsed: number; parallel: number; proposals: number; selected: number; successful: number; tokenConfigured: boolean; chainId: number; }
export interface WorldManifest { recipe?: import("./world").WorldRecipe; slug: string; index: string; title: string; subtitle: string; missionId: string; renderer: "dead-web" | "internet-weather" | "agent-orbit"; palette: string; dataSource: string; demo: boolean; assets: string[]; metadata: Record<string,string>; mobile: "catalog" | "canvas" | "map"; interactions: string[]; }
export interface SearchResult { title: string; url: string; snippet: string; }
export interface ProviderResult<T> { data: T; cost: number | null; usageId: string | null; settled: boolean; model?: string; }
export interface MachineState { mode: Mode; workers: { name: string; status: "active" | "idle" | "unavailable" | "waiting"; detail: string }[]; queued: number; running: number; completed: number; failed: number; balance: string | null; source: "orbio" | "demo" | "unavailable"; models: { id: string; name: string }[]; terms: OrbioTerms | null; termsStatus: string; providerReady: boolean; }
export interface OrbioTerms { live: boolean; chainId: number; vault: string; pairToken: string; launchFeeWei: string; economics: string; feeBps: number; conversionBps: number; creditBps: number; gatewayBps: number; maxCreatorTaxBps: number; cliffSeconds: number; paused: boolean; }
