"use client";
import {useState} from "react";
import {WagmiProvider,useConnect,useConnectors,useConnection,useSignMessage,useDisconnect,useSwitchChain,useWriteContract,usePublicClient,type Connector} from "wagmi";
import {reownProjectId,walletConfig} from './reown-config';
import {chooseWalletConnector,verifyWalletIdentity} from './wallet-actions';
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {type PublicNetwork} from "@/config/network";
import {useResource} from "@/lib/use-resource";
import {ApiError} from "@/lib/api-client";

const faucetAbi=[{type:"function",name:"claim",stateMutability:"nonpayable",inputs:[],outputs:[]}] as const;

function walletError(reason:unknown){return reason instanceof ApiError?reason.message:reason instanceof Error?(('shortMessage' in reason&&typeof reason.shortMessage==='string')?reason.shortMessage:reason.message):'Could not connect. Please try again.';}
type WalletPurpose = 'habitat' | 'public-world';
export default function WalletConnection({onVerified,purpose='habitat'}:{onVerified:()=>void;purpose?:WalletPurpose}){
 const {data,error,refresh}=useResource<PublicNetwork>("network");
 if(error)return <div role="alert">Wallet connection is unavailable. <button onClick={refresh}>Try again</button></div>;
 if(!data)return <p role="status">Preparing wallet connection…</p>;
 return <WalletSession key={`${data.chainId}:${reownProjectId(data)}`} network={data} onVerified={onVerified} purpose={purpose}/>;
}
function WalletSession({network,onVerified,purpose}:{network:PublicNetwork;onVerified:()=>void;purpose:WalletPurpose}){
 const [client]=useState(()=>new QueryClient()),[wagmi]=useState(()=>walletConfig(network));
 return <WagmiProvider config={wagmi}><QueryClientProvider client={client}><Connection network={network} onVerified={onVerified} purpose={purpose}/></QueryClientProvider></WagmiProvider>;
}
function Connection({network,onVerified,purpose}:{network:PublicNetwork;onVerified:()=>void;purpose:WalletPurpose}){
 const {address,chainId}=useConnection(),connect=useConnect(),connectors=useConnectors(),sign=useSignMessage(),disconnect=useDisconnect(),switchChain=useSwitchChain(),write=useWriteContract(),publicClient=usePublicClient();
 const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[needsWallet,setNeedsWallet]=useState(false);
 const [claimHash,setClaimHash]=useState<`0x${string}`|null>(null),[claimDone,setClaimDone]=useState(false);
 const pairing=connectors.find(c=>c.id==='walletConnect');
 async function connectWallet(preferred?:Connector,browserOnly=false){
  if(busy||connect.isPending)return;
  setBusy(true);setError(null);setNeedsWallet(false);
  try{
   const connector=preferred??await chooseWalletConnector(connectors,browserOnly);
   if(!connector){setNeedsWallet(true);return;}
   await connect.mutateAsync({connector});
  }catch(reason){setError(walletError(reason));}finally{setBusy(false);}
 }
 async function claim(){if(!network.faucetEnabled||!network.token||chainId!==46630||!publicClient)return;setBusy(true);setError(null);try{const hash=await write.mutateAsync({address:network.token,abi:faucetAbi,functionName:"claim",chainId:46630});setClaimHash(hash);const receipt=await publicClient.waitForTransactionReceipt({hash});if(receipt.status!=="success")throw new Error("Test claim reverted.");setClaimDone(true);}catch(reason){setError(walletError(reason));}finally{setBusy(false);}}
 async function verify(){if(!address||busy)return;setBusy(true);setError(null);try{await verifyWalletIdentity(address,message=>sign.mutateAsync({message}),onVerified);}catch(reason){setError(walletError(reason));}finally{setBusy(false);}}
 // Signing an identity challenge requires no chain switch or transaction.
 // Chain checks remain on the optional test-token operation below.
 if(address)return <div className="wallet-connected">
  <p className="wallet-address" title={address}>{address.slice(0,6)}…{address.slice(-4)}</p>
  <button className="button button-dark" disabled={busy} onClick={verify}>{busy?"Check your wallet…":purpose==='public-world'?"Sign in to CTRL":"Sign in to Habitat"}</button>
  <p className="dialog-desc">{purpose==='public-world'?"Sign to save your avatar and explore Public World. No gas or payment.":"Approve a signature to save your character and world. No gas or payment."}</p>
  {network.faucetEnabled&&<details className="wallet-testnet"><summary>Testnet tools</summary><p>Test tokens have no monetary value.</p>{chainId!==46630?<button className="button" disabled={busy} onClick={()=>switchChain.mutate({chainId:network.chainId},{onError:reason=>setError(walletError(reason))})}>Switch to {network.name}</button>:<button className="button" disabled={busy||claimDone} onClick={claim}>{claimDone?"Test tokens received":"Claim test tokens"}</button>}{claimHash&&<a href={`${network.explorer}/tx/${claimHash}`} target="_blank" rel="noreferrer">View claim transaction</a>}</details>}
  <button className="button" disabled={busy} onClick={()=>{disconnect.mutate();setError(null);}}>Use another wallet</button>
  {error&&<p className="form-error" role="alert">{error}</p>}
 </div>;
 return <div className="wallet-options">
  <button className="button button-dark" disabled={busy||connect.isPending} onClick={()=>void connectWallet()}>{busy||connect.isPending?"Connecting…":"Connect wallet"}</button>
  {pairing&&<p className="dialog-desc">Choose a wallet app on your phone, or scan the QR code with your wallet.</p>}
  {connectors.filter(c=>c.id!=='walletConnect'&&c.id!=='injected').map(connector=><button key={connector.uid} className="button" disabled={busy||connect.isPending} onClick={()=>void connectWallet(connector)}>Use {connector.name}</button>)}
  <button className="button" disabled={busy||connect.isPending} onClick={()=>void connectWallet(undefined,true)}>Use browser wallet</button>
  <p className="dialog-desc">Your wallet is your sign-in. No payment to enter.</p>
  {needsWallet&&<div className="wallet-help" role="status"><p>No browser wallet found. Open this site in your wallet app, or install a browser wallet.</p><a href={`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`} target="_blank" rel="noreferrer">Open in MetaMask</a><a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get a browser wallet</a></div>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </div>;
}
