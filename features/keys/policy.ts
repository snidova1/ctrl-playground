/** No deployment address until local implementation is reviewed and testnet is authorized. */
export const keyPolicy={settlement:'CTRL',feeBps:300,ownerPrice:0,ownerPaysGas:true,ownerKeyRedeemable:false,contractAddress:null,phase:'implementation'} as const;
export function quoteKeyTrade(principal:bigint,side:'buy'|'sell'){if(principal<BigInt(0))throw new Error('Negative principal');const fee=principal*BigInt(keyPolicy.feeBps)/BigInt(10000);return {principal,fee,total:side==='buy'?principal+fee:principal-fee};}
