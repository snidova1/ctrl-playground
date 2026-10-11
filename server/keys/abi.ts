import {parseAbi} from 'viem';

export const worldKeysAbi = parseAbi([
  'function ctrl() view returns (address)',
  'function developmentTreasury() view returns (address)',
  'function FEE_BPS() view returns (uint256)',
  'function worlds(bytes32) view returns (address owner, uint256 supply, uint256 reserve)',
  'function ownerWorld(address) view returns (bytes32)',
  'function worldIdFor(address owner) pure returns (bytes32)',
  'function balanceOf(bytes32,address) view returns (uint256)',
  'function memberBalanceOf(bytes32,address) view returns (uint256)',
  'function createWorld(bytes32 id)',
  'event WorldCreated(bytes32 indexed worldId, address indexed owner)',
]);
