# Robinhood Chain testnet integration

Network: Robinhood Chain Testnet, chain ID **46630**, gas currency ETH.
Official configuration: https://docs.robinhood.com/chain/connecting/
The official public endpoint returned HTTP 405 in this execution environment. The publicnode endpoint returned chain ID 46630 and the funded test wallet balance; it is the configured public fallback. Set CTRL_RPC_URL to use a different provider without exposing its credentials to the client.

## Deployed fixture

- Token: `0x6310796e59427b81845c5aa734e3f237504e9eb2`
- Name / symbol: CTRL Testnet / tCTRL
- Deployment: `0x8c41aa319c57c478aea02df223dc7796af2b6ee8e9abbe7a7a3573ba71b7adbc`
- Block: 129198978
- Deployer: `0xAceeFC1e4c5B8d43047Da4F3781a2793E69a5913`
- Compiler: Solidity 0.8.30, Paris target, optimizer 200 runs.

`deployments/robinhood-testnet.json` records the confirmed address, transaction, bytecode hash and gas. This is a disposable integration fixture, not an Orbio launch or production token. No APY, value or exchangeability is implied. The initial 64,000 tokens are minted to the deployer. Other wallets can claim 64,000 once each, bounded by a 1 billion total cap. This open faucet deliberately does not defend against multiple wallets.

## App behavior

`GET /api/network` exposes only public network information. Both the wallet dialog and signature challenge use the server-selected chain. Public RPC URLs are from the chain registry; private server RPC credentials are never sent to browsers. A wallet must switch networks before signing or claiming. Claim broadcasts from the user's connected wallet, shows the transaction link and waits for a successful receipt. Reverted and rejected transactions retain an explicit error state.

On `/account`, connect, claim tCTRL, then sign the session challenge. A live wallet reads the actual token balance and resolves holder tier/CONTROL. Demo credentials remain an explicitly separate path. At 64,000 tCTRL the configured tier is ARCHITECT. Snapshotting does not fabricate holding duration. CONTROL is still application participation capacity, not a second token. Compute mode remains independent: mock execution does not make wallet balances simulated.

Locking remains the existing simulated demo interface. Live lock and burn writes remain unavailable. Orbio compute is not supplied by faucet ETH or tCTRL.

## Reproduce checks

```sh
pnpm test
pnpm test:contracts
CTRL_TESTNET_WALLET_FILE=/absolute/private/wallet.json pnpm testnet:verify
# Test the actual API handlers with live chain reads and local database:
CTRL_TESTNET_WALLET_FILE=/absolute/private/wallet.json pnpm test:live
# Optionally target a separately running local server:
CTRL_TESTNET_WALLET_FILE=/absolute/private/wallet.json \
CTRL_TEST_APP_ORIGIN=http://localhost:4173 pnpm testnet:verify
```

The wallet JSON contains `address` and `privateKey`; it stays outside the repository and is never uploaded with the Site. The web app does not receive a deployer private key. The verification script prints public outcomes only. A separate local Ganache process tests ERC-20 transfers, allowances, supply, duplicate claims and refusal to deploy on mainnet. Ganache's native acceleration is optional and its JavaScript fallback is used in this environment.

To intentionally deploy a new fixture, use `pnpm testnet:deploy` with `CTRL_TESTNET_WALLET_FILE` and optionally `CTRL_TESTNET_RPC_URL`. The CLI checks chain 46630, balance and a 0.002 test ETH gas ceiling, writes the broadcast hash before waiting, and refuses a second deployment when a pending record already exists. Investigate an existing transaction before any retry. Never delete a pending record just to retry an uncertain broadcast. Update public deployment defaults only after receipt and bytecode verification.

To leave testnet, explicitly configure CTRL_CHAIN_ID, CTRL_RPC_URL and CTRL_TOKEN_ADDRESS together; testnet token defaults are not reused for another chain.
