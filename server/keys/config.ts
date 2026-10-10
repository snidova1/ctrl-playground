import {env} from '@/lib/platform';
import {AppError} from '@/server/errors';
import {isAddress, zeroAddress} from 'viem';
import type {KeysConfig} from './service';

/** Read-only RPC configuration. No signer or automatic deployment lives here. */
export function keysConfig(): KeysConfig | null {
  const read = (key: keyof Cloudflare.Env) => String(env[key] ?? process.env[key] ?? '');
  if (read('CTRL_KEYS_ENABLED') !== 'true') return null;
  const config = {
    rpcUrl: read('CTRL_KEYS_RPC_URL'), chainId: Number(read('CTRL_KEYS_CHAIN_ID')),
    contractAddress: read('CTRL_KEYS_CONTRACT_ADDRESS'), tokenAddress: read('CTRL_KEYS_TOKEN_ADDRESS'),
    treasuryAddress: read('CTRL_KEYS_TREASURY_ADDRESS'), confirmations: Number(read('CTRL_KEYS_CONFIRMATIONS') || '2'),
  };
  let validUrl = false;
  try {validUrl = ['http:', 'https:'].includes(new URL(config.rpcUrl).protocol);} catch {/* Fail closed below. */}
  if (!validUrl || !Number.isSafeInteger(config.chainId) || config.chainId < 1 ||
      !Number.isSafeInteger(config.confirmations) || config.confirmations < 1 ||
      [config.contractAddress, config.tokenAddress, config.treasuryAddress].some(value => !isAddress(value) || value.toLowerCase() === zeroAddress)) {
    throw new AppError('KEYS_INVALID_CONFIG', 503);
  }
  return config;
}
