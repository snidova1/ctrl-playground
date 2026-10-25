'use client';
import {useCallback, useEffect, useState} from 'react';
import {WagmiProvider, useConnection, useConnect, useConnectors, usePublicClient, useWriteContract, useSendTransaction} from 'wagmi';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {formatUnits, type Address, type Hex} from 'viem';
import {api, ApiError} from '@/lib/api-client';
import type {PublicNetwork} from '@/config/network';
import type {HabitatState} from '@/game/core/api-types';
import {walletConfig} from '@/features/wallet/reown-config';
import {chooseWalletConnector} from '@/features/wallet/wallet-actions';
import {erc20TradeAbi, worldKeysTradeAbi} from '@/game/core/keys-abi';
import './ui/game.css';

interface KeysRead {
  status: 'not-deployed' | 'ready'; worldId: string; keyWorldId: Hex; ownerWallet: Address; wallet: Address; isOwner: boolean;
  exists?: boolean; supply?: string; balance?: string; memberBalance?: string; reserve?: string; contractAddress?: Address; tokenAddress?: Address; chainId?: number;
}

/** friend.tech-style World Keys market. Every trade is signed in the visitor's own wallet. */
export function KeysPage() {
  const [network, setNetwork] = useState<PublicNetwork | null>(null);
  const [client] = useState(() => new QueryClient());
  useEffect(() => {api<PublicNetwork>('network').then(setNetwork).catch(() => undefined);}, []);
  if (!network) return <Shell><p>Loading the Keys market…</p></Shell>;
  return <WagmiProvider config={walletConfig(network)}><QueryClientProvider client={client}><Market network={network} /></QueryClientProvider></WagmiProvider>;
}

function Shell({children}: {children: React.ReactNode}) {
  return <main style={{minHeight: '100dvh', background: 'linear-gradient(#bfe3f7,#fdf6ea 50%)', padding: '24px 14px', fontFamily: 'Nunito, ui-rounded, system-ui, sans-serif', color: '#5b4636'}}>
    <section className="wc-panel" style={{margin: '0 auto', maxHeight: 'none'}}>
      <header className="wc-panel-head"><span style={{fontSize: 28}}>🔑</span><h2>World Keys</h2><a className="wc-btn" href="/public-world" style={{textDecoration: 'none'}}>← Back to town</a></header>
      <div className="wc-panel-body">{children}</div>
    </section>
  </main>;
}

function Market({network}: {network: PublicNetwork}) {
  const {address, chainId} = useConnection();
  const connect = useConnect(), connectors = useConnectors();
  const publicClient = usePublicClient({chainId: network.chainId});
  const write = useWriteContract(), send = useSendTransaction();
  const [worlds, setWorlds] = useState<HabitatState['worlds']>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [read, setRead] = useState<KeysRead | null>(null);
  const [amount, setAmount] = useState(1);
  const [quote, setQuote] = useState<{buy?: bigint; sell?: bigint; decimals: number}>({decimals: 18});
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const world = new URLSearchParams(location.search).get('world');
    api<HabitatState>('habitat/state').then(s => {setWorlds(s.worlds); setSelected(world ?? s.homeId ?? s.worlds[0]?.id ?? null);})
      .catch(e => setMessage(e instanceof ApiError && e.status === 401 ? 'Sign in with your wallet in Common Ground first.' : 'Keys are unavailable right now.'));
  }, []);
  const refresh = useCallback(async () => {
    if (!selected) return;
    try {setRead(await api<KeysRead>(`habitat/worlds/${selected}/keys`));} catch (e) {setMessage(e instanceof ApiError ? e.message : 'Could not read Keys.');}
  }, [selected]);
  useEffect(() => {setRead(null); void refresh();}, [refresh]);

  // Live quotes straight from the contract.
  useEffect(() => {
    if (!read || read.status !== 'ready' || !read.exists || !publicClient || !read.contractAddress) return;
    let alive = true;
    (async () => {
      const decimals = read.tokenAddress ? await publicClient.readContract({address: read.tokenAddress, abi: erc20TradeAbi, functionName: 'decimals'}).catch(() => 18) : 18;
      const [, , buyTotal] = await publicClient.readContract({address: read.contractAddress!, abi: worldKeysTradeAbi, functionName: 'quoteBuy', args: [read.keyWorldId, BigInt(amount)]});
      let sell: bigint | undefined;
      if (BigInt(read.supply ?? '1') > BigInt(amount)) {
        const [, , payout] = await publicClient.readContract({address: read.contractAddress!, abi: worldKeysTradeAbi, functionName: 'quoteSell', args: [read.keyWorldId, BigInt(amount)]});
        sell = payout;
      }
      if (alive) setQuote({buy: buyTotal, sell, decimals: Number(decimals)});
    })().catch(() => setQuote({decimals: 18}));
    return () => {alive = false;};
  }, [read, amount, publicClient]);

  const wrongWallet = address && read && address.toLowerCase() !== read.wallet.toLowerCase();
  const wrongChain = address && chainId !== network.chainId;
  const fmt = (v?: bigint) => (v === undefined ? '—' : Number(formatUnits(v, quote.decimals)).toLocaleString(undefined, {maximumFractionDigits: 4}));

  const trade = async (side: 'buy' | 'sell') => {
    if (!read?.contractAddress || !read.tokenAddress || !publicClient || !address) return;
    setBusy(side); setMessage('');
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      if (side === 'buy') {
        const [, , total] = await publicClient.readContract({address: read.contractAddress, abi: worldKeysTradeAbi, functionName: 'quoteBuy', args: [read.keyWorldId, BigInt(amount)]});
        const max = total + total / BigInt(50); // 2% slippage guard
        const allowance = await publicClient.readContract({address: read.tokenAddress, abi: erc20TradeAbi, functionName: 'allowance', args: [address, read.contractAddress]});
        if (allowance < max) {
          setMessage('Approve CTRL spending in your wallet…');
          const h = await write.mutateAsync({address: read.tokenAddress, abi: erc20TradeAbi, functionName: 'approve', args: [read.contractAddress, max], chainId: network.chainId});
          await publicClient.waitForTransactionReceipt({hash: h});
        }
        setMessage('Confirm the purchase in your wallet…');
        const hash = await write.mutateAsync({address: read.contractAddress, abi: worldKeysTradeAbi, functionName: 'buy', args: [read.keyWorldId, BigInt(amount), max, deadline], chainId: network.chainId});
        await publicClient.waitForTransactionReceipt({hash});
        setMessage(`Bought ${amount} Key${amount > 1 ? 's' : ''}!`);
      } else {
        const [, , payout] = await publicClient.readContract({address: read.contractAddress, abi: worldKeysTradeAbi, functionName: 'quoteSell', args: [read.keyWorldId, BigInt(amount)]});
        const min = payout - payout / BigInt(50);
        setMessage('Confirm the sale in your wallet…');
        const hash = await write.mutateAsync({address: read.contractAddress, abi: worldKeysTradeAbi, functionName: 'sell', args: [read.keyWorldId, BigInt(amount), min, deadline], chainId: network.chainId});
        await publicClient.waitForTransactionReceipt({hash});
        setMessage(`Sold ${amount} Key${amount > 1 ? 's' : ''}.`);
      }
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? ('shortMessage' in e && typeof e.shortMessage === 'string' ? e.shortMessage : e.message) : 'Transaction failed.');
    } finally {setBusy('');}
  };

  const claim = async () => {
    if (!selected || !publicClient) return;
    setBusy('claim'); setMessage('');
    try {
      const prepared = await api<{transaction: {to: Address; data: Hex; chainId: number}}>(`habitat/worlds/${selected}/keys/prepare`, {method: 'POST', body: {}});
      setMessage('Confirm the 0 CTRL owner key in your wallet (gas only)…');
      const hash = await send.mutateAsync({to: prepared.transaction.to, data: prepared.transaction.data, chainId: prepared.transaction.chainId});
      await publicClient.waitForTransactionReceipt({hash, confirmations: 2});
      await api(`habitat/worlds/${selected}/keys/verify`, {method: 'POST', body: {txHash: hash}});
      setMessage('Your owner key is claimed. Friends can now buy your Keys!');
      await refresh();
    } catch (e) {setMessage(e instanceof Error ? e.message : 'Claim failed.');} finally {setBusy('');}
  };

  return <Shell>
    <p style={{marginTop: 0, fontWeight: 700, color: '#8a7560'}}>Each Habitat has its own Keys on a bonding curve priced in CTRL: price rises with every Key bought and falls as they are sold, with a 3% fee on each trade. Keys are a social layer — owning someone&apos;s Keys never lets you edit their home.</p>
    <div className="wc-chips">{worlds.map(w => <button key={w.id} className={`wc-chip ${selected === w.id ? 'on' : ''}`} onClick={() => setSelected(w.id)}>{w.name} · {w.owner}</button>)}</div>
    {!read && !message && <div className="wc-empty">Reading the chain…</div>}
    {read?.status === 'not-deployed' && <div className="wc-detail"><div className="grow"><h3>Keys are not live on this network yet</h3><p>The CTRLWorldKeys contract has not been deployed here. Your home works fully without it; trading switches on when the contract launches.</p></div></div>}
    {read?.status === 'ready' && <>
      <div className="wc-row"><div className="grow"><h4>{read.exists ? `${read.supply} Keys in circulation` : 'Owner key not claimed yet'}</h4><p>Your balance: {read.memberBalance ?? '0'} member Key(s){read.isOwner ? ' + owner key' : ''} · Reserve {read.reserve}</p></div></div>
      {!address ? <button className="wc-btn primary" onClick={async () => {const c = await chooseWalletConnector(connectors); if (c) await connect.mutateAsync({connector: c});}}>Connect wallet to trade</button>
        : wrongWallet ? <div className="wc-empty">Connected wallet {address.slice(0, 6)}… differs from your signed-in wallet. Switch accounts in your wallet.</div>
        : wrongChain ? <div className="wc-empty">Switch your wallet to {network.name}.</div>
        : read.exists ? <div className="wc-detail">
          <div className="grow"><h3>Trade Keys</h3><p>Buy {amount}: {fmt(quote.buy)} CTRL (incl. fee) · Sell {amount}: {fmt(quote.sell)} CTRL (after fee)</p></div>
          <input className="wc-field" type="number" min={1} max={100} value={amount} onChange={e => setAmount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} style={{width: 90}} />
          <button className="wc-btn primary" disabled={!!busy} onClick={() => void trade('buy')}>{busy === 'buy' ? '…' : 'Buy'}</button>
          <button className="wc-btn warm" disabled={!!busy || quote.sell === undefined} onClick={() => void trade('sell')}>{busy === 'sell' ? '…' : 'Sell'}</button>
        </div>
        : read.isOwner ? <button className="wc-btn primary" disabled={!!busy} onClick={() => void claim()}>{busy === 'claim' ? 'Claiming…' : 'Claim my owner key (0 CTRL + gas)'}</button>
        : <div className="wc-empty">The owner has not opened their Keys yet.</div>}
    </>}
    {message && <p style={{fontWeight: 800}}>{message}</p>}
  </Shell>;
}
