import {erc20Abi,type Address} from "viem";
export {erc20Abi as ctrlTokenAbi};
export interface ChainAction {hash:`0x${string}`;status:"pending"|"confirmed"|"failed";}
export interface AllocationAdapter {read(wallet:Address):Promise<{amount:bigint}>;allocate(amount:bigint):Promise<ChainAction>;release(amount:bigint):Promise<ChainAction>;}
// Specification boundary only. No deployed contract, guessed ABI, or token custody.
export const allocationContractInterface={reads:["allocated amount"],writes:["allocate amount","release amount"],fixedDuration:false,deploymentRequired:true} as const;
