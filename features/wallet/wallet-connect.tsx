"use client";
import {useState} from "react";
import {WagmiProvider,createConfig,http,useConnect,useConnectors,useConnection,useSignMessage,useDisconnect,useSwitchChain} from "wagmi";
import {injected} from "wagmi/connectors/injected";
import {walletConnect} from "wagmi/connectors/walletConnect";
import {robinhood} from "viem/chains";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {mutate,ApiError} from "@/lib/api-client";
const projectId=process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID??"";
function config(){return createConfig({chains:[robinhood],connectors:[injected(),...(projectId?[walletConnect({projectId,showQrModal:true})]:[])],transports:{[robinhood.id]:http(robinhood.rpcUrls.default.http[0])},ssr:true});}
export default function WalletConnection({onVerified}:{onVerified:()=>void}){const [client]=useState(()=>new QueryClient()),[wagmi]=useState(config);return <WagmiProvider config={wagmi}><QueryClientProvider client={client}><Connection onVerified={onVerified}/></QueryClientProvider></WagmiProvider>;}
function Connection({onVerified}:{onVerified:()=>void}){const {address,chainId}=useConnection(),connect=useConnect(),connectors=useConnectors(),sign=useSignMessage(),disconnect=useDisconnect(),switchChain=useSwitchChain();const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
 async function verify(){if(!address)return;setBusy(true);setError(null);try{const challenge=await mutate<{nonce:string;message:string}>("auth/nonce",{address});const signature=await sign.mutateAsync({message:challenge.message});await mutate("auth/verify",{address,nonce:challenge.nonce,signature});onVerified();}catch(e){setError(e instanceof ApiError?e.message:e instanceof Error?e.message:"Wallet verification failed.");}finally{setBusy(false);}}
 if(address)return <div className="wallet-connected"><p>{address}</p>{chainId!==robinhood.id?<><div className="notice"><strong>WALLET ON WRONG NETWORK</strong>CTRL uses Robinhood Chain (4663).</div><button className="button button-dark" onClick={()=>switchChain.mutate({chainId:robinhood.id})}>SWITCH TO ROBINHOOD</button></>:<button className="button button-dark" disabled={busy} onClick={verify}>{busy?"WAITING FOR SIGNATURE":"SIGN SESSION CHALLENGE"}</button>}<button className="button" onClick={()=>disconnect.mutate()}>DISCONNECT</button>{error&&<p className="form-error" role="alert">{error}</p>}</div>;
 return <div className="wallet-options">{connectors.map(c=><button className="button button-dark" key={c.uid} disabled={connect.isPending} onClick={()=>{setError(null);connect.mutate({connector:c},{onError:e=>setError(e.message)});}}>{connect.isPending?"CONNECTING":c.name.toUpperCase()}</button>)}{!projectId&&<p className="dialog-desc">Browser wallets are available. WalletConnect mobile pairing opens when its project ID is configured.</p>}{error&&<p className="form-error" role="alert">{error}</p>}</div>;
}
