import { erc20Abi, type Address } from "viem";
export {erc20Abi as ctrlTokenAbi};
export interface ChainAction { hash:`0x${string}`; status:"pending"|"confirmed"|"failed"; }
export interface LockAdapter { read(wallet:Address):Promise<{amount:bigint;unlocksAt:bigint}>; lock(amount:bigint,days:number):Promise<ChainAction>; }
export interface BurnAdapter { burn(amount:bigint):Promise<ChainAction>; }
// CTRL locking has no deployed or specified contract. No guessed ABI or address.
export const lockContractInterface={reads:["locked amount","unlock timestamp"],writes:["lock amount and duration"],deploymentRequired:true} as const;
