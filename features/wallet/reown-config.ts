import {createConfig, http} from 'wagmi';
import {injected} from 'wagmi/connectors/injected';
import {walletConnect} from 'wagmi/connectors/walletConnect';
import {networkFor, type PublicNetwork} from '@/config/network';

function validProjectId(value: string | null | undefined) {
  const id = value?.trim();
  return id && /^[a-f\d]{32}$/i.test(id) ? id : '';
}

// A runtime binding can override the public build setting. Neither is a secret.
// Keep this literal process.env access so Next/Vite can replace it at build time.
export function reownProjectId(network: PublicNetwork) {
  return validProjectId(network.walletConnectProjectId)
    || validProjectId(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);
}

const configs = new Map<string, ReturnType<typeof createConfig>>();
export function walletConfig(network: PublicNetwork) {
  const projectId = reownProjectId(network);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const key = `${network.chainId}:${projectId}:${origin}`;
  const cached = configs.get(key);
  if (cached) return cached;

  const chain = networkFor(network.chainId);
  const config = createConfig({
    chains: [chain],
    // Wagmi discovers EIP-6963 providers in addition to the legacy injected one.
    multiInjectedProviderDiscovery: true,
    connectors: [injected(), ...(projectId ? [walletConnect({
      projectId,
      // ethereum-provider 2.25.0 loads @reown/appkit/core 1.8.19 here.
      // Use its installed AppKit bridge, not an incompatible Wagmi 2 adapter.
      showQrModal: true,
      qrModalOptions: {
        enableExplorer: true,
        enableMobileFullScreen: true,
        themeVariables: {'--wcm-z-index': '10000'},
      },
      metadata: {
        name: 'CTRL',
        description: 'Create your avatar, explore Public World, and build your Habitat.',
        url: origin,
        icons: origin ? [`${origin}/favicon.svg`] : [],
      },
    })] : [])],
    transports: {
      46630: http(networkFor(46630).rpcUrls.default.http[0]),
      4663: http(networkFor(4663).rpcUrls.default.http[0]),
    },
    ssr: true,
  });
  configs.set(key, config);
  return config;
}
