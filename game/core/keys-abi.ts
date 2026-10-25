import {parseAbi} from 'viem';

/** Client-side ABI for CTRLWorldKeys (contracts/keys/CTRLWorldKeys.sol). */
export const worldKeysTradeAbi = parseAbi([
  'function worlds(bytes32) view returns (address owner, uint256 supply, uint256 reserve)',
  'function balanceOf(bytes32,address) view returns (uint256)',
  'function memberBalanceOf(bytes32,address) view returns (uint256)',
  'function curveUnit() view returns (uint256)',
  'function quoteBuy(bytes32 id, uint256 amount) view returns (uint256 principal, uint256 fee, uint256 total)',
  'function quoteSell(bytes32 id, uint256 amount) view returns (uint256 principal, uint256 fee, uint256 payout)',
  'function buy(bytes32 id, uint256 amount, uint256 maxTotal, uint256 deadline)',
  'function sell(bytes32 id, uint256 amount, uint256 minPayout, uint256 deadline)',
  'event Trade(bytes32 indexed worldId, address indexed trader, bool buy, uint256 amount, uint256 principal, uint256 fee, uint256 supply)',
]);

export const erc20TradeAbi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

/** Same pricing as the contract: sum of squares × curveUnit for keys [start, start+amount). */
export function curvePrice(start: bigint, amount: bigint, unit: bigint) {
  const sumSquares = (n: bigint) => (n * (n + BigInt(1)) * (BigInt(2) * n + BigInt(1))) / BigInt(6);
  return (sumSquares(start + amount - BigInt(1)) - sumSquares(start - BigInt(1))) * unit;
}
export const FEE_BPS = BigInt(300);
export const withFee = (principal: bigint) => principal + (principal * FEE_BPS) / BigInt(10000);
