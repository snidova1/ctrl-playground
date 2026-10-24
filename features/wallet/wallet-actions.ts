import {mutate} from '@/lib/api-client';

// The primary route opens AppKit even when an extension is installed. Browser
// wallets remain an explicit fallback, including EIP-6963 announced providers.
export async function chooseWalletConnector<T extends {id: string; getProvider: () => Promise<unknown>}>(
  connectors: readonly T[], browserOnly = false,
): Promise<T | undefined> {
  if (!browserOnly) {
    const pairing = connectors.find(connector => connector.id === 'walletConnect');
    if (pairing) return pairing;
  }
  for (const connector of connectors.filter(connector => connector.id !== 'walletConnect')) {
    try {
      if (await connector.getProvider()) return connector;
    } catch {
      // One unavailable extension must not hide other installed wallets.
    }
  }
}

// Connecting (or reconnecting) never authenticates a server session. Only the
// existing nonce + signed challenge + successful server verification can do so.
export async function verifyWalletIdentity(
  address: `0x${string}`,
  signMessage: (message: string) => Promise<`0x${string}`>,
  onVerified: () => void,
) {
  const challenge = await mutate<{nonce: string; message: string}>('auth/nonce', {address});
  const signature = await signMessage(challenge.message);
  await mutate('auth/verify', {address, nonce: challenge.nonce, signature});
  onVerified();
}
