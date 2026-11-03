import solc from 'solc';
import {readFile} from 'node:fs/promises';
import {encodePacked,keccak256} from 'viem';

export function worldIdForOwner(owner) {
  return keccak256(encodePacked(['string','address'],['CTRL_WORLD_V1',owner]));
}

export async function compileWorldKeys() {
  const source = await readFile(new URL('../../contracts/keys/CTRLWorldKeys.sol', import.meta.url), 'utf8');
  const result = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources: {'CTRLWorldKeys.sol': {content: source}},
    settings: {
      optimizer: {enabled: true, runs: 200},
      // Match the PR7 compiler configuration used by deployment/runtime verification.
      viaIR: true,
      evmVersion: 'paris',
      outputSelection: {'*': {'*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.deployedBytecode.immutableReferences']}}
    }
  })));
  const errors = (result.errors ?? []).filter((entry) => entry.severity === 'error');
  if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join('\n'));
  const contract = result.contracts['CTRLWorldKeys.sol'].CTRLWorldKeys;
  if (!contract.evm.bytecode.object || !contract.evm.deployedBytecode.object) throw new Error('EMPTY_KEYS_BYTECODE');
  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
    runtime: '0x' + contract.evm.deployedBytecode.object,
    immutableReferences: contract.evm.deployedBytecode.immutableReferences ?? {},
    compiler: solc.version()
  };
}

export function maskImmutables(bytecode, immutableReferences) {
  if (typeof bytecode !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(bytecode)) {
    throw new Error('INVALID_RUNTIME_BYTECODE');
  }
  const characters = bytecode.slice(2).toLowerCase().split('');
  for (const refs of Object.values(immutableReferences)) {
    for (const {start, length} of refs) {
      if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length < 1 || 2 * (start + length) > characters.length) {
        throw new Error('INVALID_IMMUTABLE_OFFSETS');
      }
      characters.fill('0', 2 * start, 2 * (start + length));
    }
  }
  return '0x' + characters.join('');
}

export function assertMatchingKeysRuntime(actual, artifact) {
  if (!actual || actual === '0x') throw new Error('NO_KEYS_CODE');
  if (maskImmutables(actual, artifact.immutableReferences) !== maskImmutables(artifact.runtime, artifact.immutableReferences)) {
    throw new Error('KEYS_BYTECODE_MISMATCH');
  }
}
