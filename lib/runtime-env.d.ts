declare namespace Cloudflare { interface Env { DB: D1Database; BUCKET: R2Bucket; CTRL_MODE?: string; CTRL_PUBLIC_RELEASE?: string; CTRL_TOKEN_ADDRESS?: string; CTRL_CHAIN_ID?: string; APP_ORIGIN?: string; DEMO_AUTH_ENABLED?: string; } }
declare namespace Cloudflare { interface Env { CTRL_KEYS_ENABLED?: string; CTRL_KEYS_RPC_URL?: string; CTRL_KEYS_CHAIN_ID?: string; CTRL_KEYS_CONTRACT_ADDRESS?: string; CTRL_KEYS_TOKEN_ADDRESS?: string; CTRL_KEYS_TREASURY_ADDRESS?: string; CTRL_KEYS_CONFIRMATIONS?: string; } }

declare namespace Cloudflare { interface Env { NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string; } }
