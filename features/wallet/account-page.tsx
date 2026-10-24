'use client';
import {lazy,Suspense,useState} from 'react';
import Link from '@/components/navigation';
import {useResource} from '@/lib/use-resource';
import {mutate} from '@/lib/api-client';
import type {Account} from '@/domain/types';
import {PageHead,ErrorState,DemoBand,MachineLoading} from '@/components/states';
import {DemoAccess} from './access';
import {protectReownModal} from './reown-modal';
import {plazaPolicy} from '@/config/plaza';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const WalletConnect=lazy(()=>import('./wallet-connect'));

export default function AccountPage(){
 const {data:account,error,loading,refresh}=useResource<Account>('account');
 const [walletOpen,setWalletOpen]=useState(false);
 const threshold=plazaPolicy.minimumLiveBuilderBalance;
 const eligible=!!account?.authenticated&&!account.demo&&(account.balance??0)>=threshold;
 async function disconnect(){await mutate('auth/logout',{});refresh();}
 return <div className='page account-page'>
  <PageHead index='COMMON GROUND / HOLDER ACCESS' title={<>A place for everyone.<br/>More tools for holders.</>} description='Enter the plaza freely. Hold CTRL to use the live object designer. Your tokens stay in your wallet.' aside={<button className='button button-dark' onClick={()=>setWalletOpen(true)}>CONNECT WALLET <span>+</span></button>}/>
  {error?<ErrorState error={error} retry={refresh}/>:loading?<MachineLoading title='READING YOUR CREDENTIAL'/>:account&&<div className='account-layout'>
   <div className='passport'>
    <div className='passport-header'><strong>CTRL</strong><span>COMMON GROUND<br/>HOLDER PASSPORT</span></div>
    <div className='passport-identity'><div className='credential-mark' aria-hidden='true'><span>{eligible?'+':'○'}</span></div><div><span className='eyebrow'>BUILDER ACCESS</span><h2>{eligible?'HOLDER':'VISITOR'}</h2><p className='mono'>{account.wallet?`${account.wallet.slice(0,8)}…${account.wallet.slice(-6)}`:account.demo?'SIMULATED CREDENTIAL':'PUBLIC ACCESS'}</p></div></div>
    <dl className='dl'>
     <div><dt>{account.chainId===46630?'tCTRL held (testnet)':'CTRL held'}</dt><dd>{account.balance===null?'—':account.balance.toLocaleString()}{account.demo?' (SIMULATED)':''}</dd></div>
     <div><dt>Live designer threshold</dt><dd>{threshold.toLocaleString()} CTRL</dd></div>
     <div><dt>Live designs per day</dt><dd>Up to {plazaPolicy.modelCallsPerHolderPerDay}</dd></div>
     <div><dt>Objects per visitor</dt><dd>{plazaPolicy.objectsPerVisitor}</dd></div>
     <div><dt>Network</dt><dd>{account.chainId===46630?'ROBINHOOD TESTNET / 46630':`CHAIN ${account.chainId}`}</dd></div>
    </dl>
    {account.demo?<DemoBand>Explicit demo credential. Simulated balances cannot unlock paid object generation.</DemoBand>:!account.tokenConfigured?<div className='notice'><strong>TOKEN NOT CONNECTED</strong>Holder access will resolve when a genuine token address and RPC are configured.</div>:account.chainId===46630?<div className='notice'><strong>TESTNET ACCESS</strong>This credential uses tCTRL on Robinhood Chain Testnet. It is not a mainnet launch token.</div>:null}
    {account.authenticated?<button className='text-button' onClick={()=>void disconnect()}>LEAVE SESSION</button>:<DemoAccess/>}
   </div>
   <div className='capability-doors'>
    <span className='eyebrow'>WHAT YOU CAN DO HERE</span>
    <div className='capability-door unlocked'><div className='door-seam'/><div><span className='mono'>01 / OPEN TO EVERYONE</span><h3>THE COURTYARD</h3><p>Walk around, meet connected visitors, use objects, and collect a little refreshment.</p></div><span className='door-mark'>+</span></div>
    <div className='capability-door unlocked'><div className='door-seam'/><div><span className='mono'>02 / FREE WORKSHOP</span><h3>MAKE & PLACE</h3><p>Assemble five working object types, change their color and size, test them, and leave them in the shared plaza.</p></div><span className='door-mark'>+</span></div>
    <div className={`capability-door ${eligible?'unlocked':'locked'}`}><div className='door-seam'/><div><span className='mono'>03 / {threshold.toLocaleString()} CTRL HELD</span><h3>LIVE DESIGNER</h3><p>Use the Orbio model to interpret an object request within the supported building kit. Requires a signed holder session and available model capacity.</p></div><span className='door-mark'>{eligible?'+':'—'}</span></div>
    <Link href='/' className='button button-dark lab-entry'>BACK TO COMMON GROUND <span>↗</span></Link>
    <p className='notice'>Access uses a balance threshold checked by the server. No token transfer, burn, lock, or allocation is needed. Daily model limits keep the shared service within its operating budget.</p>
   </div>
  </div>}
  {/* AppKit has its own body-level modal/focus management; don't trap it here. */}
  <Dialog modal={false} open={walletOpen} onOpenChange={setWalletOpen}><DialogContent className='ctrl-dialog' onInteractOutside={protectReownModal} onEscapeKeyDown={protectReownModal}><DialogTitle className='dialog-title'>WALLET ACCESS</DialogTitle><DialogDescription className='dialog-desc'>Connect a wallet and sign a session challenge. The signature does not authorize a token transfer.</DialogDescription><Suspense fallback={<MachineLoading title='PREPARING CONNECTORS'/>}><WalletConnect onVerified={()=>{setWalletOpen(false);refresh();}}/></Suspense></DialogContent></Dialog>
 </div>;
}
