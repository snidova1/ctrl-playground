'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {memberInputSchema, type WorldMember} from '@/domain/habitat';
import {habitatApi, HabitatApiError} from './api';

type MemberList = {members: WorldMember[]};
function failure(error: unknown) {
  if (error instanceof HabitatApiError && error.code === 'MEMBER_PROFILE_REQUIRED') {
    return 'That wallet must verify and save a character before you can invite it.';
  }
  return error instanceof Error ? error.message : 'Member access could not be updated.';
}

// Render only for server-resolved canManage. The API independently verifies
// ownership for every read/write; editor/member keys never grant owner rights.
export default function WorldMembers({worldId}: {worldId: string}) {
  const [members, setMembers] = useState<WorldMember[]>([]);
  const [wallet, setWallet] = useState('');
  const [role, setRole] = useState<'editor' | 'visitor'>('visitor');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const path = `worlds/${worldId}/members`;

  useEffect(() => {
    let cancelled = false;
    habitatApi<MemberList>(path).then(result => {
      if (!cancelled) {setMembers(result.members); setError(''); setLoading(false);}
    }).catch(reason => {
      if (!cancelled) {setError(failure(reason)); setLoading(false);}
    });
    return () => {cancelled = true;};
  }, [path, refresh]);

  async function grant(event: FormEvent) {
    event.preventDefault();
    if (busy || loading) return;
    const parsed = memberInputSchema.safeParse({wallet: wallet.trim(), role});
    if (!parsed.success) {setError('Enter a valid 0x wallet address.'); return;}
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await habitatApi<MemberList>(path, parsed.data);
      setMembers(result.members); setWallet(''); setNotice(`Saved ${role} access.`);
    } catch (reason) {setError(failure(reason));}
    finally {setBusy(false);}
  }

  async function revoke(member: WorldMember) {
    if (busy || loading) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await habitatApi<MemberList>(`${path}/${encodeURIComponent(member.profileId)}`, {}, 'DELETE');
      setMembers(result.members); setNotice('Member access revoked.');
    } catch (reason) {setError(failure(reason));}
    finally {setBusy(false);}
  }

  return <section className="hb-members" aria-labelledby="world-members-title" aria-busy={busy || loading}>
    <h2 id="world-members-title">Member access</h2>
    <p className="hb-small">Visitors can enter private worlds. Editors can change objects, not ownership or settings. Public worlds remain visitable after revocation.</p>
    {loading && <p role="status">Loading members…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => {setLoading(true); setRefresh(value => value + 1);}}>Reload members</button></div>}
    {notice && <p role="status">{notice}</p>}
    {!loading && members.length === 0 && <p>No invited members yet.</p>}
    <ul className="hb-member-list">{members.map(member => {
      const address = member.profileId.replace(/^wallet-/, '');
      return <li key={member.profileId}>
        <span title={address}>{address.slice(0, 8)}…{address.slice(-6)} · {member.role}</span>
        <button type="button" aria-label={`Revoke access for ${address}`} disabled={busy || loading} onClick={() => void revoke(member)}>Revoke</button>
      </li>;
    })}</ul>
    <form onSubmit={event => void grant(event)}>
      <label>Member wallet<input value={wallet} onChange={event => setWallet(event.target.value)} placeholder="0x…" maxLength={42} autoComplete="off" spellCheck={false} disabled={busy || loading}/></label>
      <label>Member role<select value={role} onChange={event => setRole(event.target.value as 'editor' | 'visitor')} disabled={busy || loading}><option value="visitor">Visitor</option><option value="editor">Editor</option></select></label>
      <button type="submit" disabled={busy || loading || wallet.trim().length !== 42}>{busy ? 'Saving access…' : 'Save member access'}</button>
    </form>
  </section>;
}
