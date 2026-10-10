import assert from 'node:assert/strict';
import {
  createPublicClient, createWalletClient, custom, defineChain, encodeFunctionData,
  decodeErrorResult, decodeEventLog, keccak256, toHex, zeroAddress, zeroHash, maxUint256,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const id = (name) => keccak256(toHex(name));
const deadline = 2_000_000_000n;
const funded = 10n ** 50n;
const feeOf = (principal) => principal * 3n / 100n;
// Deliberately independent of the contract's closed-form sum of squares.
function curve(start, amount, unit) {
  let total = 0n;
  for (let index = start; index < start + amount; index++) total += index * index * unit;
  return total;
}

export async function runChecks(provider, keysArtifact, tokenArtifact) {
  const chain = defineChain({
    id: 46630, name: 'Keys local fixture',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [] } },
  });
  const transport = custom(provider, { retryCount: 0 });
  const read = createPublicClient({ chain, transport, pollingInterval: 1, cacheTime: 0 });
  const accounts = Object.values(provider.getInitialAccounts()).map(({ secretKey }) => privateKeyToAccount(secretKey));
  const wallets = accounts.map((account) => createWalletClient({ account, chain, transport }));
  const addresses = accounts.map(({ address }) => address);
  let groups = 0;
  let successes = 0;
  let reversions = 0;

  async function receipt(hash, status = 'success') {
    const result = await read.waitForTransactionReceipt({ hash });
    assert.equal(result.status, status);
    if (status === 'success') successes++; else reversions++;
    return result;
  }
  async function deploy(artifact, args = []) {
    const result = await receipt(await wallets[0].deployContract({ ...artifact, args, gas: 5_000_000n }));
    assert.ok(result.contractAddress);
    return result.contractAddress;
  }
  function call(address, abi, functionName, args = []) {
    return read.readContract({ address, abi, functionName, args });
  }
  async function send(address, abi, functionName, args = [], actor = 0) {
    return receipt(await wallets[actor].writeContract({ address, abi, functionName, args, gas: 2_000_000n }));
  }
  async function rejects(address, abi, functionName, args, actor, reason) {
    await assert.rejects(
      () => read.simulateContract({ address, abi, functionName, args, account: accounts[actor] }),
      reason ? new RegExp(reason) : undefined,
    );
    const result = await receipt(await wallets[actor].writeContract({ address, abi, functionName, args, gas: 2_000_000n }), 'reverted');
    assert.equal(result.logs.length, 0);
  }
  async function check(name, action) {
    await action();
    groups++;
    console.log(`PASS ${groups}: ${name}`);
  }
  async function fixture(unit = 101n) {
    const token = await deploy(tokenArtifact);
    const keys = await deploy(keysArtifact, [token, addresses[4], unit]);
    const t = (name, args = []) => call(token, tokenArtifact.abi, name, args);
    const k = (name, args = []) => call(keys, keysArtifact.abi, name, args);
    const ts = (name, args = [], actor = 0) => send(token, tokenArtifact.abi, name, args, actor);
    const ks = (name, args = [], actor = 0) => send(keys, keysArtifact.abi, name, args, actor);
    for (let actor = 0; actor < 5; actor++) {
      await ts('mint', [addresses[actor], funded]);
      await ts('approve', [keys, maxUint256], actor);
    }
    const models = new Map();
    let treasuryFees = 0n;
    let donations = 0n;
    const expectedTokens = new Map(addresses.map((address, index) => [address, index < 5 ? funded : 0n]));
    async function create(world, actor) {
      const result = await ks('createWorld', [world], actor);
      const event = decodeEventLog({ abi: keysArtifact.abi, ...result.logs[0] });
      assert.equal(event.eventName, 'WorldCreated');
      assert.equal(event.args.worldId, world);
      assert.equal(event.args.owner.toLowerCase(), addresses[actor].toLowerCase());
      models.set(world, { owner: actor, supply: 1n, reserve: 0n, held: addresses.map((_, i) => i === actor ? 1n : 0n) });
    }
    async function invariant() {
      let reserves = 0n;
      for (const [world, model] of models) {
        const actual = await k('worlds', [world]);
        assert.equal(actual[0].toLowerCase(), addresses[model.owner].toLowerCase());
        assert.equal(actual[1], model.supply);
        assert.equal(actual[2], model.reserve);
        assert.equal(model.reserve, curve(1n, model.supply - 1n, unit));
        assert.equal(await k('ownerWorld', [addresses[model.owner]]), world);
        let sum = 0n;
        for (let actor = 0; actor < addresses.length; actor++) {
          const held = await k('balanceOf', [world, addresses[actor]]);
          assert.equal(held, model.held[actor]);
          assert.equal(await k('memberBalanceOf', [world, addresses[actor]]), held - (actor === model.owner ? 1n : 0n));
          assert.equal(await k('isWorldOwner', [world, addresses[actor]]), actor === model.owner);
          sum += held;
        }
        assert.equal(sum, model.supply);
        reserves += model.reserve;
      }
      assert.equal(await t('balanceOf', [keys]), reserves + donations);
      for (const address of addresses) assert.equal(await t('balanceOf', [address]), expectedTokens.get(address));
    }
    async function trade(world, actor, buy, amount, extra = {}) {
      const model = models.get(world);
      const principal = curve(buy ? model.supply : model.supply - amount, amount, unit);
      const fee = feeOf(principal);
      const net = buy ? principal + fee : principal - fee;
      assert.deepEqual(await k(buy ? 'quoteBuy' : 'quoteSell', [world, amount]), [principal, fee, net]);
      const result = await ks(buy ? 'buy' : 'sell', [world, amount, net, extra.deadline ?? deadline], actor);
      model.supply += buy ? amount : -amount;
      model.reserve += buy ? principal : -principal;
      model.held[actor] += buy ? amount : -amount;
      treasuryFees += fee;
      expectedTokens.set(addresses[actor], expectedTokens.get(addresses[actor]) + (buy ? -net : net));
      expectedTokens.set(addresses[4], expectedTokens.get(addresses[4]) + fee);
      const event = decodeEventLog({ abi: keysArtifact.abi, ...result.logs.at(-1) });
      assert.equal(event.eventName, 'Trade');
      assert.deepEqual(event.args, { worldId: world, trader: addresses[actor], buy, amount, principal, fee, supply: model.supply });
      return result;
    }
    async function snapshot() {
      const state = { worlds: [], owners: [], tokenBalances: [], allowances: [] };
      for (const world of models.keys()) {
        state.worlds.push(await k('worlds', [world]));
        for (const address of [...addresses, token]) state.worlds.push(await k('balanceOf', [world, address]));
      }
      for (const address of [...addresses, token]) {
        state.owners.push(await k('ownerWorld', [address]));
        state.tokenBalances.push(await t('balanceOf', [address]));
        state.allowances.push(await t('allowance', [address, keys]));
      }
      state.tokenBalances.push(await t('balanceOf', [keys]));
      return state;
    }
    async function fail(name, args, actor, reason) {
      const before = await snapshot();
      await rejects(keys, keysArtifact.abi, name, args, actor, reason);
      assert.deepEqual(await snapshot(), before, 'Reverted transaction must leave economic state unchanged');
    }
    async function donate(amount, actor = 0) {
      await ts('transfer', [keys, amount], actor);
      donations += amount;
      expectedTokens.set(addresses[actor], expectedTokens.get(addresses[actor]) - amount);
    }
    return { token, keys, t, k, ts, ks, create, invariant, trade, fail, snapshot, donate, fees: () => treasuryFees };
  }

  await check('constructor address and unit bounds; immutable 300 bps fee', async () => {
    const token = await deploy(tokenArtifact);
    for (const [args, reason] of [
      [[zeroAddress, addresses[4], 1n], 'INVALID_ADDRESS'],
      [[addresses[1], addresses[4], 1n], 'INVALID_ADDRESS'],
      [[token, zeroAddress, 1n], 'INVALID_ADDRESS'],
      [[token, addresses[4], 0n], 'INVALID_UNIT'],
      [[token, addresses[4], 10n ** 30n + 1n], 'INVALID_UNIT'],
    ]) {
      await assert.rejects(() => wallets[0].deployContract({ ...keysArtifact, args }), new RegExp(reason));
      await receipt(await wallets[0].deployContract({ ...keysArtifact, args, gas: 5_000_000n }), 'reverted');
    }
    const keys = await deploy(keysArtifact, [token, addresses[4], 1n]);
    assert.equal(await call(keys, keysArtifact.abi, 'FEE_BPS'), 300n);
    assert.equal((await call(keys, keysArtifact.abi, 'ctrl')).toLowerCase(), token.toLowerCase());
    assert.equal((await call(keys, keysArtifact.abi, 'developmentTreasury')).toLowerCase(), addresses[4].toLowerCase());
  });

  const f = await fixture();
  const a = id('alpha');
  const b = id('beta');
  await check('gas-only owner creation without CTRL or allowance; duplicate wallet/world/zero ID rejection', async () => {
    const before = await read.getBalance({ address: addresses[5] });
    await f.create(a, 5);
    assert.ok(await read.getBalance({ address: addresses[5] }) < before);
    assert.equal(await f.t('balanceOf', [addresses[5]]), 0n);
    assert.equal(await f.t('allowance', [addresses[5], f.keys]), 0n);
    await f.create(b, 0);
    await f.fail('createWorld', [id('duplicate-owner')], 5, 'OWNER_ALREADY_CREATED');
    await f.fail('createWorld', [a], 1, 'WORLD_EXISTS');
    await f.fail('createWorld', [zeroHash], 1, 'WORLD_EXISTS');
    assert.equal(await f.k('worlds', [id('duplicate-owner')]).then((world) => world[0]), zeroAddress);
    await f.invariant();
  });
  await check('owner authority stays separate from member keys; owner key cannot sell or transfer', async () => {
    await f.fail('sell', [a, 1n, 0n, deadline], 5, 'OWNER_KEY_RESERVED');
    await f.fail('sell', [a, 1n, 0n, deadline], 1, 'INSUFFICIENT_KEYS');
    await f.trade(b, 0, true, 3n);
    await f.trade(b, 1, true, 2n);
    await f.fail('sell', [b, 1n, 0n, deadline], 2, 'INSUFFICIENT_KEYS');
    await f.create(id('member-owned-world'), 1);
    assert.equal(await f.k('isWorldOwner', [b, addresses[1]]), false);
    await f.fail('sell', [b, 4n, 0n, deadline], 0, 'OWNER_KEY_RESERVED');
    await f.trade(b, 0, false, 3n);
    assert.equal(await f.k('isWorldOwner', [b, addresses[1]]), false);
    assert.equal(await f.k('isWorldOwner', [id('unknown'), zeroAddress]), false);
    assert.equal(await f.k('memberBalanceOf', [id('unknown'), zeroAddress]), 0n);
    for (const signature of [
      { name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }], args: [addresses[1], 1n] },
      { name: 'transferOwnership', inputs: [{ type: 'address' }], args: [addresses[1]] },
      { name: 'safeTransferFrom', inputs: [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }], args: [addresses[5], addresses[1], BigInt(a)] },
    ]) {
      const data = encodeFunctionData({ abi: [{ type: 'function', stateMutability: 'nonpayable', outputs: [], ...signature }], functionName: signature.name, args: signature.args });
      const before = await f.snapshot();
      await receipt(await wallets[5].sendTransaction({ to: f.keys, data, gas: 200_000n }), 'reverted');
      assert.deepEqual(await f.snapshot(), before);
    }
    await receipt(await wallets[1].sendTransaction({ to: f.keys, value: 1n, gas: 200_000n }), 'reverted');
    await f.invariant();
  });
  await check('exact buy/sell treasury fees and explicit floor rounding including zero-fee dust', async () => {
    await f.trade(a, 1, true, 2n);
    await f.trade(a, 2, true, 3n);
    await f.trade(a, 1, false, 2n);
    await f.trade(a, 2, false, 3n);
    await f.trade(b, 1, false, 2n);
    await f.invariant();
    const dust = await fixture(1n);
    await dust.create(a, 0);
    await dust.trade(a, 1, true, 1n);
    await dust.trade(a, 1, false, 1n);
    assert.equal(dust.fees(), 0n);
    await dust.trade(a, 1, true, 5n); // principal 55, fee 1, remainder 65/100 discarded.
    await dust.trade(a, 1, false, 5n);
    assert.equal(dust.fees(), 2n);
    // Splitting trades preserves principal, but each separate fee rounds down independently.
    for (let amount = 0; amount < 5; amount++) await dust.trade(a, 1, true, 1n);
    for (let amount = 0; amount < 5; amount++) await dust.trade(a, 1, false, 1n);
    assert.equal(dust.fees(), 2n);
    await dust.invariant();
  });
  await check('unknown worlds, invalid amounts, overflow inputs, expiry, allowance, and balance rejection', async () => {
    const unknown = id('unknown');
    for (const name of ['quoteBuy', 'quoteSell']) await assert.rejects(() => f.k(name, [unknown, 1n]), /UNKNOWN_WORLD/);
    await f.fail('buy', [unknown, 1n, maxUint256, deadline], 1, 'UNKNOWN_WORLD');
    await f.fail('sell', [unknown, 1n, 0n, deadline], 1, 'INSUFFICIENT_KEYS');
    for (const amount of [0n, 101n, maxUint256]) await f.fail('buy', [a, amount, maxUint256, deadline], 1, 'INVALID_AMOUNT');
    for (const args of [[0n, 1n], [maxUint256, 1n], [1n, maxUint256]]) await assert.rejects(() => f.k('curve', args), /INVALID_AMOUNT/);
    await f.fail('sell', [a, 0n, 0n, deadline], 1, 'INSUFFICIENT_KEYS');
    await f.fail('sell', [a, 1n, 0n, deadline], 1, 'INSUFFICIENT_KEYS');
    await f.fail('buy', [a, 1n, maxUint256, 0n], 1, 'EXPIRED');
    await f.fail('sell', [a, 1n, 0n, 0n], 1, 'EXPIRED');
    await f.ts('approve', [f.keys, 0n], 1);
    await f.fail('buy', [a, 1n, maxUint256, deadline], 1, 'ALLOWANCE');
    await f.ts('approve', [f.keys, maxUint256], 1);
    await f.ts('approve', [f.keys, maxUint256], 5);
    await f.fail('buy', [a, 1n, maxUint256, deadline], 5, 'TOKEN_BALANCE');
    await f.invariant();
  });
  await check('slippage rejects direct and stale quotes; exact limits and inclusive deadline succeed', async () => {
    const initial = await f.k('quoteBuy', [a, 1n]);
    await f.fail('buy', [a, 1n, initial[2] - 1n, deadline], 1, 'SLIPPAGE');
    await f.trade(a, 2, true, 1n);
    await f.fail('buy', [a, 1n, initial[2], deadline], 1, 'SLIPPAGE');
    await f.trade(a, 1, true, 1n);
    const sell = await f.k('quoteSell', [a, 1n]);
    await f.fail('sell', [a, 1n, sell[2] + 1n, deadline], 1, 'SLIPPAGE');
    await f.trade(a, 2, false, 1n);
    await f.fail('sell', [a, 1n, sell[2], deadline], 1, 'SLIPPAGE');
    await f.trade(a, 1, false, 1n);
    const block = await read.getBlock();
    await f.trade(a, 1, true, 1n, { deadline: block.timestamp + 1n });
    await f.trade(a, 1, false, 1n);
    await f.invariant();
  });
  await check('multi-world deterministic trading preserves modeled curve reserves and donated surplus', async () => {
    await f.donate(77n);
    let seed = 0x12345678;
    for (let iteration = 0; iteration < 24; iteration++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const world = seed % 2 ? a : b;
      const actor = 1 + ((seed >>> 8) % 3);
      const held = await f.k('memberBalanceOf', [world, addresses[actor]]);
      const buy = held === 0n || (seed >>> 16) % 2 === 0;
      const amount = buy ? BigInt(1 + (seed >>> 20) % 5) : held;
      await f.trade(world, actor, buy, amount);
      await f.invariant();
    }
    for (const world of [a, b]) {
      for (const actor of [1, 2, 3]) {
        const held = await f.k('memberBalanceOf', [world, addresses[actor]]);
        if (held) await f.trade(world, actor, false, held);
      }
    }
    await f.invariant();
    assert.equal(await f.t('balanceOf', [f.keys]), 77n);
  });
  await check('treasury may also trade without conflating fees, payouts, or reserves', async () => {
    await f.trade(a, 4, true, 3n);
    await f.trade(a, 4, false, 3n);
    await f.invariant();
  });
  await check('false, reverting, no-op, taxed, extra-debit and empty-return incoming CTRL roll back', async () => {
    for (const [mode, reason] of [[1, 'TRANSFER_FAILED'], [2, 'TOKEN_REVERT'], [3, 'UNSUPPORTED_TOKEN'], [4, 'UNSUPPORTED_TOKEN'], [5, 'UNSUPPORTED_TOKEN'], [8, undefined]]) {
      await f.ts('configure', [mode, 0, zeroAddress]);
      await f.fail('buy', [a, 2n, maxUint256, deadline], 1, reason);
    }
    await f.ts('configure', [0, 0, zeroAddress]);
    await f.invariant();
  });
  await check('invalid outgoing treasury fees and seller payouts roll back the entire trade', async () => {
    for (const [mode, reason] of [[1, 'FEE_FAILED'], [2, 'TOKEN_REVERT'], [3, 'UNSUPPORTED_TOKEN'], [4, 'UNSUPPORTED_TOKEN'], [5, 'UNSUPPORTED_TOKEN'], [8, undefined]]) {
      await f.ts('configure', [0, mode, addresses[4]]);
      await f.fail('buy', [a, 3n, maxUint256, deadline], 1, reason);
    }
    await f.ts('configure', [0, 0, zeroAddress]);
    await f.trade(a, 1, true, 3n);
    for (const recipient of [addresses[1], addresses[4]]) {
      for (const [mode, reason] of [[1, recipient === addresses[4] ? 'FEE_FAILED' : 'TRANSFER_FAILED'], [2, 'TOKEN_REVERT'], [3, 'UNSUPPORTED_TOKEN'], [4, 'UNSUPPORTED_TOKEN'], [5, 'UNSUPPORTED_TOKEN'], [8, undefined]]) {
        await f.ts('configure', [0, mode, recipient]);
        await f.fail('sell', [a, 3n, 0n, deadline], 1, reason);
      }
    }
    await f.ts('configure', [0, 0, zeroAddress]);
    await f.trade(a, 1, false, 3n);
    await f.invariant();
  });
  await check('buy/sell/createWorld reentrancy blocked during incoming, fee, and payout callbacks', async () => {
    for (const entry of ['buy', 'sell', 'createWorld']) {
      const callbackId = id(`callback-${entry}`);
      const args = entry === 'createWorld' ? [callbackId] : [a, 1n, entry === 'buy' ? maxUint256 : 0n, deadline];
      const data = encodeFunctionData({ abi: keysArtifact.abi, functionName: entry, args });
      for (const phase of ['incoming', 'fee', 'payout']) {
        if (phase === 'payout') await f.trade(a, 1, true, 2n);
        await f.ts('setCallback', [f.keys, data]);
        await f.ts('configure', [phase === 'incoming' ? 6 : 0, phase === 'incoming' ? 0 : 6, phase === 'fee' ? addresses[4] : addresses[1]]);
        await f.trade(a, 1, phase !== 'payout', 2n);
        assert.equal(await f.t('callbackAttempts'), 1n);
        assert.equal(await f.t('callbackSucceeded'), false);
        assert.equal(decodeErrorResult({ data: await f.t('callbackResult') }).args[0], 'REENTRANCY');
        assert.equal((await f.k('worlds', [callbackId]))[0], zeroAddress);
        await f.ts('configure', [0, 0, zeroAddress]);
        if (phase !== 'payout') await f.trade(a, 1, false, 2n);
        await f.invariant();
      }
    }
    const data = encodeFunctionData({ abi: keysArtifact.abi, functionName: 'createWorld', args: [id('bubble')] });
    await f.ts('setCallback', [f.keys, data]);
    await f.ts('configure', [7, 0, zeroAddress]);
    await f.fail('buy', [a, 2n, maxUint256, deadline], 1, 'REENTRANCY');
    await f.ts('configure', [0, 0, zeroAddress]);
    await f.trade(a, 1, true, 2n);
    await f.ts('configure', [0, 7, addresses[1]]);
    await f.fail('sell', [a, 2n, 0n, deadline], 1, 'REENTRANCY');
    await f.ts('configure', [0, 0, zeroAddress]);
    await f.trade(a, 1, false, 2n);
    await f.invariant();
  });
  await check('maximum supply and curve unit, 100-unit batch bound, full unwind to locked owner key', async () => {
    const cap = await fixture(10n ** 30n);
    await cap.create(a, 0);
    for (let batch = 0; batch < 99; batch++) await cap.trade(a, 1, true, 100n);
    await cap.trade(a, 1, true, 99n);
    await cap.invariant();
    assert.equal((await cap.k('worlds', [a]))[1], 10000n);
    await cap.fail('buy', [a, 1n, maxUint256, deadline], 1, 'INVALID_AMOUNT');
    await cap.fail('sell', [a, 101n, 0n, deadline], 1, 'INVALID_AMOUNT');
    await assert.rejects(() => cap.k('quoteSell', [a, 10000n]), /OWNER_KEY_RESERVED/);
    await assert.rejects(() => cap.k('quoteSell', [a, 0n]), /OWNER_KEY_RESERVED/);
    for (let batch = 0; batch < 99; batch++) await cap.trade(a, 1, false, 100n);
    await cap.trade(a, 1, false, 99n);
    await cap.invariant();
    assert.equal((await cap.k('worlds', [a]))[2], 0n);
    await cap.fail('sell', [a, 1n, 0n, deadline], 0, 'OWNER_KEY_RESERVED');
  });
  console.log(`PASS: ${groups} groups; ${successes} successful local transactions; ${reversions} mined reverts. No external deployment.`);
}
