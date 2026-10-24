# Reown wallet connection

## Existing-dependency integration

The installed `@walletconnect/ethereum-provider@2.25.0` depends on
`@reown/appkit@1.8.19`. Wagmi's `walletConnect` connector with `showQrModal: true`
loads `@reown/appkit/core`, creates the AppKit modal, and connects it to the
provider. CTRL uses that existing bridge: **Connect wallet opens AppKit first**,
with wallet selection/deep links on mobile and QR pairing on desktop. Explorer
wallets are not filtered out. Mobile fullscreen is enabled.

This is not a new standalone `@reown/appkit-adapter-wagmi` integration. That
adapter is not installed and current stable AppKit targets Wagmi 2, while this
project uses Wagmi 3.7.7. Do not import transitive packages via pnpm store paths,
or upgrade/add adapters without an explicit dependency migration. Reown marks
the older `showQrModal` API as deprecated; the installed provider still implements
it using AppKit. A future direct adapter migration needs compatible versions.

**Use browser wallet** remains available if Reown is unavailable, or for wallet
in-app browsers. EIP-6963 discovered extensions also get individual choices.
Connection and reconnection never call `onVerified`; the user must explicitly
sign the existing server nonce challenge, then `/api/auth/verify` must succeed.
No AppKit email/social authentication, extra SIWE flow, chain switch, or token
transaction is added to sign-in. Habitat/Public World purpose copy is preserved.
Only optional test-token tools require the configured testnet. The account page
uses a non-trapping wrapper dialog while AppKit supplies its own modal; outside
interaction/Escape cannot dismiss that wrapper while `w3m-modal.open` is active.

## Public project ID and build handoff

The user-supplied public project ID is:

```dotenv
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=e1703181bc42b7be7b2054f2348099ae
```

This is a public application identifier, **not** an API secret or signer. It is
also supplied in `.env.example`. The example file is documentation; it is not
automatically loaded for builds.

Resolution order: valid runtime `/api/network.walletConnectProjectId`, then valid
compiled `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Values must be 32
hex characters. Missing/invalid settings keep injected wallets usable rather
than initializing a broken WalletConnect provider. Network configuration remains
in `config/network.ts` (Robinhood mainnet 4663 / testnet 46630).

The build/deployment owner must supply the variable to the build process, e.g.:

```sh
export NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=e1703181bc42b7be7b2054f2348099ae
# Then use the project's normal build/deploy workflow.
```

The existing `vite.config.ts` already loads `NEXT_PUBLIC_WALLETCONNECT_` via
`loadEnv()` and defines exactly
`process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` using `JSON.stringify()`.
Retain this mapping for browser builds. No new define or alternate env name is
needed. Next handles the same literal `NEXT_PUBLIC_` expression. Runtime bindings
may additionally provide this value, but the browser build fallback means it
does not depend solely on operator runtime env. Do not serialize the whole env.

There was no project `.env.local` when this change was made, so none was created
and no operator Cloudflare env was accessed or modified. Configure the exact live
scheme/host/subdomain in the Reown dashboard origin allowlist. Metadata uses
`window.location.origin`, not a hardcoded development host.

## Verification boundaries

Focused offline unit tests cover config, runtime/build ID precedence, AppKit
options, connector routing, EIP-6963/browser fallback, and the signed server auth
sequence including rejection paths. These do not attest a real relay connection,
wallet app deep link, QR scan, approval, signature, or deployed origin allowlist.
No external wallet or main-account interaction is required by these tests.

Existing injected-only browser tests that click **Connect wallet** must instead
select **Use browser wallet** when a Reown project ID is configured; the primary
button deliberately opens AppKit now. Run desktop/mobile real-wallet QA only
with separately approved disposable wallets.

Sources:
- https://docs.reown.com/advanced/providers/ethereum
- https://docs.reown.com/appkit/react/core/installation
- https://docs.reown.com/appkit/react/core/options
