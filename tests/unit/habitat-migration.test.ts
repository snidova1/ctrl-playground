import {afterEach, describe, expect, it} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const baseline = [
  '0000_fair_susan_delgado.sql', '0001_nifty_iron_fist.sql',
  '0002_legal_madame_masque.sql', '0003_personal_worlds.sql',
];
const upgrade = '0004_habitat_permissions.sql';
const appearanceUpgrade = '0005_character_appearance.sql';
const directories: string[] = [];
const sql = (name: string) => readFileSync(path.join(process.cwd(), 'drizzle', name), 'utf8');
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
function apply(db: DatabaseSync, name: string, failAfterDDL = false) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(sql(name));
    if (failAfterDDL) db.exec('INSERT INTO intentional_missing_table VALUES(1)');
    db.prepare('INSERT INTO ctrl_migrations(name) VALUES(?)').run(name);
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('FOREIGN_KEY_VALIDATION_FAILED');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
function open(filename: string) {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON');
  expect(db.prepare('PRAGMA foreign_keys').get()).toMatchObject({foreign_keys: 1});
  return db;
}
function columns(db: DatabaseSync, table: string) {
  return db.prepare(`PRAGMA table_info(${quote(table)})`).all() as unknown as {name: string; type: string; notnull: number; dflt_value: string | null; pk: number}[];
}
function snapshot(db: DatabaseSync) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as {name: string}[];
  return tables.map(({name}) => ({
    name, columns: columns(db, name).map(c => c.name),
    rows: db.prepare(`SELECT * FROM ${quote(name)} ORDER BY rowid`).all(),
  }));
}
function existingDatabase() {
  const directory = mkdtempSync(path.join(tmpdir(), 'ctrl-migration-rehearsal-'));
  directories.push(directory);
  const filename = path.join(directory, 'existing.sqlite');
  const db = open(filename);
  try {
    db.exec('CREATE TABLE ctrl_migrations(name TEXT PRIMARY KEY)');
    for (const name of baseline) apply(db, name);
    db.exec(`
      INSERT INTO users(id,wallet,demo,created_at,reputation,lock_amount,lock_days)
      VALUES('wallet-owner','0x1111111111111111111111111111111111111111',0,'2026-10-01T00:00:00Z',17,25,7),
            ('wallet-member','0x2222222222222222222222222222222222222222',0,'2026-10-02T00:00:00Z',4,0,0);
      INSERT INTO sessions(id,user_id,expires_at) VALUES('existing-session','wallet-owner',2000000000000);
      INSERT INTO missions(id,command,owner_id,creator,created_at,status,budget,demo)
      VALUES('existing-mission','Preserve this mission','wallet-owner','Owner','2026-10-01T00:00:00Z','COMPLETE',1,0);
      INSERT INTO worlds(slug,mission_id,manifest,data,created_at)
      VALUES('existing-mission-world','existing-mission','{"version":1}','{"keep":true}','2026-10-01T00:00:00Z');
      INSERT INTO compute_reservations(mission_id,period,budget,cost,state)
      VALUES('existing-mission','2026-10-01',1,0.1,'settled');
      INSERT INTO habitat_profiles(id,name,character,variant,created_at)
      VALUES('wallet-owner','Existing Owner','female','sage',1790812800000),
            ('wallet-member','Existing Member','male','slate',1790899200000);
      INSERT INTO habitat_worlds(id,owner_id,name,visibility,layout,revision,created_at,updated_at)
      VALUES('11111111-1111-4111-8111-111111111111','wallet-owner','Existing Private','private',
        '[{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","assetId":"ctrl-lamp","name":"Saved Lamp","x":2,"y":0,"z":6,"rotation":0,"scale":1,"behavior":"light","target":""}]',9,1790812800000,1790899200000),
        ('22222222-2222-4222-8222-222222222222','wallet-member','Existing Public','public','[]',3,1790899200000,1790899300000);
      INSERT INTO habitat_presence(profile_id,world_id,x,z,angle,motion,seen_at)
      VALUES('wallet-owner','11111111-1111-4111-8111-111111111111',2,6,0.5,'{"sitting":true}',1790899201234),
            ('wallet-member','22222222-2222-4222-8222-222222222222',-3,4,1.5,'{"running":true}',1790899205678);
      INSERT INTO habitat_object_state(world_id,object_id,active,used_at)
      VALUES('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,1790899201234);
      INSERT INTO plaza_visitors(id,token_hash,name,plot,drinks,created_at,expires_at)
      VALUES('guest-existing','existing-token-hash','Existing Guest',0,2,1790812800000,2000000000000);
      INSERT INTO plaza_players(id,x,z,angle,moving,seen_at)
      VALUES('guest-existing',1,6,0.5,0,1790899201234);
      INSERT INTO plaza_objects(id,owner_id,blueprint,x,z,rotation,active,used_at,created_at)
      VALUES('existing-planter','guest-existing','{"kind":"planter"}',2,3,0,1,1790899201234,1790812800000);
      INSERT INTO plaza_actions(id,visitor_id,object_id,kind,at)
      VALUES('existing-action','guest-existing','existing-planter','use',1790899201234);
    `);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  } finally {
    db.close();
  }
  return filename;
}

afterEach(() => {
  // Only these freshly-created test fixture directories are removed; never a user DB.
  for (const directory of directories.splice(0)) rmSync(directory, {recursive: true, force: true});
});

describe('Habitat 0004 existing-database SQLite migration rehearsal', () => {
  it('runs the real migration CLI against an existing fixture and safely resumes without reapplying', () => {
    const filename = existingDatabase();
    let db = open(filename);
    const before = snapshot(db);
    db.close();
    const options = {cwd: process.cwd(), env: {...process.env, CTRL_LOCAL_DB: filename}, encoding: 'utf8' as const};
    expect(execFileSync(process.execPath, ['scripts/migrate-local.mjs'], options)).toContain(`Applied ${upgrade}`);
    expect(execFileSync(process.execPath, ['scripts/migrate-local.mjs'], options)).toBe('');
    db = open(filename);
    try {
      for (const table of before) {
        if (table.name === 'ctrl_migrations') continue;
        expect(db.prepare(`SELECT ${table.columns.map(quote).join(',')} FROM ${quote(table.name)} ORDER BY rowid`).all(), table.name).toEqual(table.rows);
      }
      expect(db.prepare('SELECT COUNT(*) AS count FROM ctrl_migrations').get()).toEqual({count: 6});
      expect(columns(db,'habitat_profiles')).toEqual(expect.arrayContaining([expect.objectContaining({name:'appearance',type:'TEXT',notnull:1,dflt_value:"'{}'"})]));
      expect(db.prepare('SELECT id,appearance FROM habitat_profiles ORDER BY id').all()).toEqual([
        {id:'wallet-member',appearance:'{}'},{id:'wallet-owner',appearance:'{}'},
      ]);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {db.close();}
  });

  it('adds appearance after 0004 without changing existing worlds, profiles or presence',()=>{
    const db=open(existingDatabase());
    try{
      apply(db,upgrade);
      const before=snapshot(db);
      apply(db,appearanceUpgrade);
      for(const table of before){
        if(table.name==='ctrl_migrations'||table.name==='habitat_profiles')continue;
        expect(db.prepare(`SELECT ${table.columns.map(quote).join(',')} FROM ${quote(table.name)} ORDER BY rowid`).all(),table.name).toEqual(table.rows);
      }
      expect(db.prepare('SELECT id,name,character,variant,created_at FROM habitat_profiles ORDER BY rowid').all()).toEqual(
        before.find(table=>table.name==='habitat_profiles')!.rows,
      );
      expect(db.prepare('SELECT id,appearance FROM habitat_profiles ORDER BY id').all()).toEqual([
        {id:'wallet-member',appearance:'{}'},{id:'wallet-owner',appearance:'{}'},
      ]);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(db.prepare('PRAGMA integrity_check').all()).toEqual([{integrity_check:'ok'}]);
    }finally{db.close();}
  });
  it('applies actual 0000-0003, reopens seeded DB, and transactionally preserves every existing row through 0004', () => {
    const filename = existingDatabase();
    let db = open(filename);
    try {
      const before = snapshot(db);
      expect(before.find(t => t.name === 'habitat_worlds')?.rows).toHaveLength(2);
      expect(before.find(t => t.name === 'habitat_presence')?.rows).toHaveLength(2);
      expect(columns(db, 'habitat_presence').map(c => c.name)).not.toContain('session_id');
      apply(db, upgrade);
      db.close();
      db = open(filename); // Prove committed on-disk persistence, not a transient schema.
      for (const table of before) {
        if (table.name === 'ctrl_migrations') continue;
        const selected = table.columns.map(quote).join(',');
        expect(db.prepare(`SELECT ${selected} FROM ${quote(table.name)} ORDER BY rowid`).all(), table.name).toEqual(table.rows);
      }
      expect(db.prepare('SELECT name FROM ctrl_migrations ORDER BY name').all()).toEqual([...baseline, upgrade].map(name => ({name})));
      expect(columns(db, 'habitat_presence')).toEqual(expect.arrayContaining([
        expect.objectContaining({name: 'session_id', type: 'TEXT', notnull: 1, dflt_value: "''"}),
        expect.objectContaining({name: 'sequence', type: 'INTEGER', notnull: 1, dflt_value: '0'}),
      ]));
      expect(db.prepare('SELECT session_id,sequence FROM habitat_presence ORDER BY profile_id').all()).toEqual([
        {session_id: '', sequence: 0}, {session_id: '', sequence: 0},
      ]);
      expect(columns(db, 'habitat_members').map(c => c.name)).toEqual(['world_id', 'profile_id', 'role', 'created_at']);
      expect(columns(db, 'habitat_members').filter(c => c.pk).map(c => c.name)).toEqual(['world_id', 'profile_id']);
      expect(db.prepare('PRAGMA foreign_key_list(habitat_members)').all()).toEqual(expect.arrayContaining([
        expect.objectContaining({table: 'habitat_worlds', from: 'world_id', to: 'id', on_delete: 'CASCADE'}),
        expect.objectContaining({table: 'habitat_profiles', from: 'profile_id', to: 'id', on_delete: 'CASCADE'}),
      ]));
      expect(db.prepare('PRAGMA index_list(habitat_members)').all()).toEqual(expect.arrayContaining([
        expect.objectContaining({name: 'habitat_members_profile'}),
      ]));
      expect(db.prepare('SELECT * FROM habitat_members').all()).toEqual([]);
      const member = db.prepare('INSERT INTO habitat_members(world_id,profile_id,role,created_at) VALUES(?,?,?,?)');
      const worldId = '11111111-1111-4111-8111-111111111111';
      member.run(worldId, 'wallet-member', 'editor', 1790899400000);
      expect(() => member.run(worldId, 'wallet-member', 'visitor', 1)).toThrow(/UNIQUE constraint/);
      expect(() => member.run('missing-world', 'wallet-member', 'visitor', 1)).toThrow(/FOREIGN KEY/);
      expect(() => member.run(worldId, 'missing-profile', 'visitor', 1)).toThrow(/FOREIGN KEY/);
      expect(() => member.run(worldId, 'wallet-owner', 'owner', 1)).toThrow(/CHECK constraint/);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec("INSERT INTO habitat_profiles VALUES('cascade-profile','Cascade','female','original',1)");
        member.run(worldId, 'cascade-profile', 'visitor', 1);
        db.exec("DELETE FROM habitat_profiles WHERE id='cascade-profile'");
        expect(db.prepare("SELECT * FROM habitat_members WHERE profile_id='cascade-profile'").all()).toEqual([]);
        // The profile was deleted; the old world-owner FK must still reject it.
        expect(() => db.exec("INSERT INTO habitat_worlds(id,owner_id,name,created_at,updated_at) VALUES('cascade-world','cascade-profile','Cascade',1,1)")).toThrow(/FOREIGN KEY/);
      } finally {
        db.exec('ROLLBACK');
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec("INSERT INTO habitat_profiles VALUES('cascade-owner','Cascade','female','original',1)");
        db.exec("INSERT INTO habitat_worlds(id,owner_id,name,created_at,updated_at) VALUES('cascade-world','cascade-owner','Cascade',1,1)");
        member.run('cascade-world', 'wallet-member', 'visitor', 1);
        db.exec("DELETE FROM habitat_worlds WHERE id='cascade-world'");
        expect(db.prepare("SELECT * FROM habitat_members WHERE world_id='cascade-world'").all()).toEqual([]);
      } finally {
        db.exec('ROLLBACK');
      }
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(db.prepare('PRAGMA integrity_check').all()).toEqual([{integrity_check: 'ok'}]);
    } finally {
      db.close();
    }
  });

  it('rolls back both ALTERs, member schema and migration ledger on a late error, then retries cleanly', () => {
    const db = open(existingDatabase());
    try {
      const before = snapshot(db);
      expect(() => apply(db, upgrade, true)).toThrow(/intentional_missing_table/);
      expect(snapshot(db)).toEqual(before);
      expect(columns(db, 'habitat_presence').map(c => c.name)).not.toContain('session_id');
      expect(columns(db, 'habitat_members')).toEqual([]);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      apply(db, upgrade);
      expect(db.prepare('SELECT COUNT(*) AS count FROM habitat_presence').get()).toEqual({count: 2});
      expect(columns(db, 'habitat_presence').map(c => c.name)).toContain('sequence');
    } finally {
      db.close();
    }
  });

  it('detects a pre-existing orphan and prevents the validation-gated upgrade from committing', () => {
    const db = open(existingDatabase());
    try {
      // Simulate an older DB imported with enforcement disabled, not a valid live mutation.
      db.exec('PRAGMA foreign_keys=OFF');
      db.exec("INSERT INTO habitat_presence(profile_id,world_id,seen_at) VALUES('missing-profile','11111111-1111-4111-8111-111111111111',1)");
      db.exec('PRAGMA foreign_keys=ON');
      const violations = db.prepare('PRAGMA foreign_key_check').all();
      expect(violations).toEqual([expect.objectContaining({table: 'habitat_presence', parent: 'habitat_profiles'})]);
      const before = snapshot(db);
      expect(() => apply(db, upgrade)).toThrow('FOREIGN_KEY_VALIDATION_FAILED');
      expect(snapshot(db)).toEqual(before);
      expect(columns(db, 'habitat_members')).toEqual([]);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual(violations);
    } finally {
      db.close();
    }
  });
});
