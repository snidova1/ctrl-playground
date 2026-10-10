import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { exec, one, query } from "@/db";
import type { Account } from "@/domain/types";
import { handleApi } from "@/server/api";
import { hash } from "@/server/receipts/hash";

const origin = "http://localhost:3000";
type Wallet = ReturnType<typeof privateKeyToAccount>;
type Challenge = { nonce: string; message: string };
const wallets: Wallet[] = [];
const nonces: string[] = [];
let clientIp: string;

beforeEach(() => {
  clientIp = `wallet-auth-${crypto.randomUUID()}`;
});

afterEach(async () => {
  vi.restoreAllMocks();
  for (const wallet of wallets.splice(0)) {
    const id = `wallet-${wallet.address.toLowerCase()}`;
    await exec("DELETE FROM sessions WHERE user_id=?", id);
    await exec("DELETE FROM users WHERE id=?", id);
    await exec("DELETE FROM rate_limits WHERE id LIKE ?", `${await hash(`write:${id}`)}:%`);
  }
  for (const nonce of nonces.splice(0)) await exec("DELETE FROM nonces WHERE id=?", nonce);
  await exec("DELETE FROM rate_limits WHERE id LIKE ?", `${await hash(`write:${clientIp}`)}:%`);
});

function wallet() {
  const account = privateKeyToAccount(generatePrivateKey());
  wallets.push(account);
  return account;
}

function call(path: string, body?: unknown, cookie?: string, requestOrigin: string | null = origin) {
  return handleApi(new Request(`${origin}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "CF-Connecting-IP": clientIp,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(requestOrigin === null ? {} : { Origin: requestOrigin }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), path.split("/"));
}

async function challenge(address: string) {
  const response = await call("auth/nonce", { address });
  expect(response.status).toBe(200);
  const result = await response.json() as Challenge;
  nonces.push(result.nonce);
  return result;
}

async function signed(account: Wallet, address = account.address) {
  const issued = await challenge(address);
  return { address, nonce: issued.nonce, signature: await account.signMessage({ message: issued.message }) };
}

function cookie(response: Response) {
  expect(response.status).toBe(200);
  const header = response.headers.get("set-cookie");
  expect(header).toContain("HttpOnly; SameSite=Lax; Path=/; Max-Age=86400");
  return header!.split(";")[0];
}

async function account(session: string) {
  const response = await call("account", undefined, session);
  expect(response.status).toBe(200);
  return response.json() as Promise<Account>;
}

async function rejected(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(await response.json()).toMatchObject({ code });
  expect(response.headers.get("set-cookie")).toBeNull();
}

async function sessions(address: string) {
  return query<{ id: string; user_id: string; expires_at: number }>(
    "SELECT sessions.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE users.wallet=?",
    address.toLowerCase(),
  );
}

describe("wallet authentication through the API and SQLite", () => {
  it("keeps one wallet identity and its state across repeated, differently cased logins", async () => {
    const owner = wallet();
    const first = cookie(await call("auth/verify", await signed(owner)));
    const initial = await account(first);
    expect(initial).toMatchObject({
      id: `wallet-${owner.address.toLowerCase()}`, wallet: owner.address.toLowerCase(),
      authenticated: true, demo: false, balance: null,
    });
    await exec("UPDATE users SET reputation=37 WHERE id=?", initial.id);
    const second = cookie(await call("auth/verify", await signed(owner, owner.address.toLowerCase() as `0x${string}`)));
    expect(second).not.toBe(first);
    expect(await account(second)).toMatchObject({ id: initial.id, reputation: 37, demo: false });
    expect(await account(first)).toMatchObject({ id: initial.id, reputation: 37 });
    expect(await query("SELECT id FROM users WHERE wallet=?", owner.address.toLowerCase())).toEqual([{ id: initial.id }]);
    const stored = await sessions(owner.address);
    expect(stored).toHaveLength(2);
    expect(stored.map(row => row.id)).toContain(await hash(first.slice("ctrl_session=".length)));
    expect(stored.map(row => row.id)).not.toContain(first.slice("ctrl_session=".length));
  });

  it("rejects replay without creating a second session", async () => {
    const owner = wallet();
    const args = await signed(owner);
    cookie(await call("auth/verify", args));
    await rejected(await call("auth/verify", args), 401, "AUTH_CHALLENGE_EXPIRED");
    expect(await one("SELECT used FROM nonces WHERE id=?", args.nonce)).toEqual({ used: 1 });
    expect(await sessions(owner.address)).toHaveLength(1);
  });

  it("lets only one concurrent request consume the same signed nonce", async () => {
    const owner = wallet();
    const args = await signed(owner);
    const responses = await Promise.all(Array.from({ length: 4 }, () => call("auth/verify", args)));
    expect(responses.map(response => response.status).sort()).toEqual([200, 401, 401, 401]);
    const success = responses.find(response => response.status === 200)!;
    expect(await account(cookie(success))).toMatchObject({ wallet: owner.address.toLowerCase(), authenticated: true });
    for (const response of responses.filter(response => response !== success)) {
      await rejected(response, 401, "AUTH_CHALLENGE_EXPIRED");
    }
    expect(await sessions(owner.address)).toHaveLength(1);
  });

  it("shares one identity when separate fresh challenges are verified concurrently", async () => {
    const owner = wallet();
    const first = await signed(owner);
    const second = await signed(owner);
    const responses = await Promise.all([call("auth/verify", first), call("auth/verify", second)]);
    const accounts = await Promise.all(responses.map(response => account(cookie(response))));
    expect(accounts[0].id).toBe(accounts[1].id);
    expect(await query("SELECT id FROM users WHERE wallet=?", owner.address.toLowerCase())).toHaveLength(1);
    expect(await sessions(owner.address)).toHaveLength(2);
  });

  it.each([-1, 0])("rejects a nonce expiring at now %+i ms without consuming it", async offset => {
    const owner = wallet();
    const args = await signed(owner);
    const now = Date.now();
    await exec("UPDATE nonces SET expires_at=? WHERE id=?", now + offset, args.nonce);
    vi.spyOn(Date, "now").mockReturnValue(now);
    await rejected(await call("auth/verify", args), 401, "AUTH_CHALLENGE_EXPIRED");
    expect(await one("SELECT used FROM nonces WHERE id=?", args.nonce)).toEqual({ used: 0 });
    expect(await sessions(owner.address)).toHaveLength(0);
  });

  it("rejects an unknown nonce", async () => {
    const owner = wallet();
    const args = await signed(owner);
    await rejected(await call("auth/verify", { ...args, nonce: crypto.randomUUID() }), 401, "AUTH_CHALLENGE_EXPIRED");
    expect(await sessions(owner.address)).toHaveLength(0);
  });

  it("rejects another signer's real signature and leaves the challenge usable by its owner", async () => {
    const owner = wallet(), other = wallet();
    const issued = await challenge(owner.address);
    await rejected(await call("auth/verify", {
      address: owner.address, nonce: issued.nonce, signature: await other.signMessage({ message: issued.message }),
    }), 401, "WALLET_SIGNATURE_INVALID");
    expect(await one("SELECT used FROM nonces WHERE id=?", issued.nonce)).toEqual({ used: 0 });
    expect(await sessions(owner.address)).toHaveLength(0);
    cookie(await call("auth/verify", {
      address: owner.address, nonce: issued.nonce, signature: await owner.signMessage({ message: issued.message }),
    }));
  });

  it("binds a real signature to both its wallet and the exact issued message", async () => {
    const owner = wallet(), other = wallet();
    const args = await signed(owner);
    await rejected(await call("auth/verify", { ...args, address: other.address }), 401, "AUTH_CHALLENGE_EXPIRED");
    const another = await challenge(owner.address);
    await rejected(await call("auth/verify", { ...args, nonce: another.nonce }), 401, "WALLET_SIGNATURE_INVALID");
    expect(await sessions(owner.address)).toHaveLength(0);
    expect(await sessions(other.address)).toHaveLength(0);
    cookie(await call("auth/verify", args));
  });

  it.each(["0x12", `0x${"00".repeat(65)}`])("treats malformed signature %s as an authentication failure", async signature => {
    const owner = wallet();
    const args = await signed(owner);
    await rejected(await call("auth/verify", { ...args, signature }), 401, "WALLET_SIGNATURE_INVALID");
    expect(await one("SELECT used FROM nonces WHERE id=?", args.nonce)).toEqual({ used: 0 });
    expect(await sessions(owner.address)).toHaveLength(0);
    cookie(await call("auth/verify", args));
  });

  it.each(["not-a-wallet", "0x1234"])("rejects invalid wallet address %s at both auth endpoints", async address => {
    const owner = wallet();
    const args = await signed(owner);
    await rejected(await call("auth/nonce", { address }), 400, "INVALID_WALLET");
    await rejected(await call("auth/verify", { ...args, address }), 400, "INVALID_WALLET");
    expect(await one("SELECT used FROM nonces WHERE id=?", args.nonce)).toEqual({ used: 0 });
    expect(await sessions(owner.address)).toHaveLength(0);
  });

  it("expires a session exactly at its stored deadline", async () => {
    const owner = wallet();
    const session = cookie(await call("auth/verify", await signed(owner)));
    const [stored] = await sessions(owner.address);
    const clock = vi.spyOn(Date, "now").mockReturnValue(stored.expires_at - 1);
    expect((await account(session)).authenticated).toBe(true);
    expect((await call("jobs", undefined, session)).status).toBe(200);
    clock.mockReturnValue(stored.expires_at);
    expect(await account(session)).toMatchObject({ id: "observer", authenticated: false, wallet: null });
    await rejected(await call("jobs", undefined, session), 401, "OPERATOR_ACCESS_REQUIRED");
  });

  it("logs out only the presented session and rejects its cookie on replay", async () => {
    const owner = wallet();
    const first = cookie(await call("auth/verify", await signed(owner)));
    const second = cookie(await call("auth/verify", await signed(owner)));
    const response = await call("auth/logout", {}, first);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBe("ctrl_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    expect((await account(first)).authenticated).toBe(false);
    await rejected(await call("jobs", undefined, first), 401, "OPERATOR_ACCESS_REQUIRED");
    expect((await account(second)).authenticated).toBe(true);
    expect(await sessions(owner.address)).toHaveLength(1);
    expect((await call("auth/logout", {}, first)).status).toBe(200);
    expect((await call("auth/logout", {})).status).toBe(200);
  });

  it.each(["https://evil.example", null])("rejects writes with origin %s without consuming or revoking credentials", async requestOrigin => {
    const owner = wallet();
    const args = await signed(owner);
    await rejected(await call("auth/nonce", { address: owner.address }, undefined, requestOrigin), 403, "ORIGIN_NOT_ALLOWED");
    await rejected(await call("auth/verify", args, undefined, requestOrigin), 403, "ORIGIN_NOT_ALLOWED");
    expect(await one("SELECT used FROM nonces WHERE id=?", args.nonce)).toEqual({ used: 0 });
    expect(await sessions(owner.address)).toHaveLength(0);
    const session = cookie(await call("auth/verify", args));
    await rejected(await call("auth/logout", {}, session, requestOrigin), 403, "ORIGIN_NOT_ALLOWED");
    expect((await account(session)).authenticated).toBe(true);
    expect(await sessions(owner.address)).toHaveLength(1);
  });
});
