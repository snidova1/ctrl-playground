import {batch, exec, one, statement} from '@/db';
import {AppError} from '@/server/errors';
import {createLifeState, normalizeLife, type LifeState} from '@/game/core/life';
import {countPlaced, readStoredLayout} from '@/game/core/home';

export async function loadLife(profileId: string, now = Date.now()): Promise<LifeState> {
  const row = await one<{state: string; revision: number}>('SELECT state,revision FROM town_life WHERE profile_id=?', profileId);
  if (!row) {
    const fresh = createLifeState(now);
    await exec('INSERT OR IGNORE INTO town_life(profile_id,revision,state,updated_at) VALUES(?,0,?,?)', profileId, JSON.stringify(fresh), now);
    const again = await one<{state: string; revision: number}>('SELECT state,revision FROM town_life WHERE profile_id=?', profileId);
    if (!again) throw new AppError('LIFE_UNAVAILABLE', 503);
    return {...normalizeLife(JSON.parse(again.state), now), revision: again.revision};
  }
  return {...normalizeLife(JSON.parse(row.state), now), revision: row.revision};
}

/** Compare-and-swap write. Pair with `assertChanged()` inside the same batch. */
export function casLife(profileId: string, previous: LifeState, next: LifeState): D1PreparedStatement {
  return statement('UPDATE town_life SET state=?,revision=?,updated_at=? WHERE profile_id=? AND revision=?',
    JSON.stringify(next), next.revision, next.updatedAt, profileId, previous.revision);
}

/** D1 batches roll back on SQL errors only; this turns a lost CAS into one. */
export function assertChanged(): D1PreparedStatement {
  return statement('INSERT OR REPLACE INTO cozy_life_atomic_guard(id) VALUES(CASE WHEN changes()=1 THEN 1 ELSE 0 END)');
}

export async function atomic(statements: D1PreparedStatement[]) {
  try {return await batch(statements);} catch (error) {
    if (error instanceof Error && /cozy_life_cas_success|CHECK constraint/i.test(error.message)) throw new AppError('LIFE_EDIT_CONFLICT', 409, 'Something changed. Please try again.');
    throw error;
  }
}

export async function placedFurniture(profileId: string) {
  const home = await one<{layout: string}>('SELECT layout FROM habitat_worlds WHERE owner_id=?', profileId);
  return countPlaced(readStoredLayout(home?.layout));
}
