// Public integration defaults. Never store wallet keys or provider secrets here.
// Confirmed fixture deployment: deployments/robinhood-testnet.json.
export const deployment = {
 chainId:46630,
 rpc:'https://robinhood-sepolia-rpc.publicnode.com',
 token:'0x6310796e59427b81845c5aa734e3f237504e9eb2' as `0x${string}`|null,
} as const;
