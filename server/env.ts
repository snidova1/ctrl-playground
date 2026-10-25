import {deployment} from '@/config/deployment';
import {env as platform} from '@/lib/platform';

export type Mode = 'mock' | 'development' | 'production';
export function settings() {
  const mode = (platform.CTRL_MODE ?? process.env.CTRL_MODE ?? 'mock') as Mode;
  if (!['mock', 'development', 'production'].includes(mode)) throw new Error('INVALID_RUNTIME_MODE');
  const read = (key: keyof Cloudflare.Env): string => String(platform[key] ?? process.env[key] ?? '');
  const chainId = Number(read('CTRL_CHAIN_ID') || deployment.chainId);
  return {
    mode,
    walletConnectProjectId: read('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'),
    publicRelease: read('CTRL_PUBLIC_RELEASE') === 'true',
    token: read('CTRL_TOKEN_ADDRESS') || (chainId === deployment.chainId ? deployment.token ?? '' : ''),
    chainId,
    origin: read('APP_ORIGIN') || '',
    demoAuth: mode === 'mock' || (mode === 'development' && read('DEMO_AUTH_ENABLED') === 'true'),
  };
}
