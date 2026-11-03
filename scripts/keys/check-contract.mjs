import { readFile } from 'node:fs/promises';
import ganache from 'ganache';
import solc from 'solc';
import { runChecks } from '../../tests/keys/contract-checks.mjs';

// In-process Ganache only: no RPC URL, private keys, or deployment artifacts leave this process.
const root = new URL('../../', import.meta.url);
const paths = ['contracts/keys/CTRLWorldKeys.sol', 'tests/keys/CTRLTokenFixture.sol'];
const sources = {};
for (const path of paths) sources[path] = { content: await readFile(new URL(path, root), 'utf8') };
const compiled = JSON.parse(solc.compile(JSON.stringify({
  language: 'Solidity', sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'shanghai',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
})));
for (const diagnostic of compiled.errors ?? []) {
  if (diagnostic.severity === 'error') throw new Error(diagnostic.formattedMessage);
  console.warn(diagnostic.formattedMessage);
}
const artifact = (path, name) => {
  const contract = compiled.contracts[path][name];
  return { abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` };
};
const provider = ganache.provider({
  chain: { chainId: 46630, hardfork: 'shanghai', time: new Date('2026-01-01T00:00:00Z') },
  wallet: { mnemonic: 'test test test test test test test test test test test junk', totalAccounts: 6 },
  miner: { timestampIncrement: 1 },
  logging: { quiet: true },
});
try {
  console.log(`Local checks: solc ${solc.version()}, Ganache 7.9.2, Shanghai, chain 46630`);
  await runChecks(provider, artifact(paths[0], 'CTRLWorldKeys'), artifact(paths[1], 'CTRLTokenFixture'));
} finally {
  await provider.disconnect();
}
