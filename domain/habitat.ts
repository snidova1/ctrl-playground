import {z} from 'zod';
import {layoutSchema, motionSchema, worldObjectSchema} from '@/features/habitat/types';
import type {WorldRecord, WorldState, WorldProfile} from '@/features/habitat/types';
import type {CharacterLoadout as CatalogLoadout} from '@/features/plaza/characters/catalog';

// Keep the existing flat transform wire format used by the courtyard renderer.
export {worldObjectSchema, layoutSchema, motionSchema};
export type {WorldObject} from '@/features/habitat/types';
export type World = WorldRecord;
export type WorldObjectTransform = Pick<z.infer<typeof worldObjectSchema>, 'x' | 'y' | 'z' | 'rotation' | 'scale'>;
export type WorldObjectBehavior = z.infer<typeof worldObjectSchema>['behavior'];
export type CharacterLoadout = CatalogLoadout;
export interface CharacterProfile extends WorldProfile {loadout: CharacterLoadout}
export interface WorldMember {worldId: string; profileId: string; role: 'editor' | 'visitor'}
export interface WorldPermissions {role: 'owner' | 'editor' | 'visitor'; canVisit: boolean; canEdit: boolean; canManage: boolean}
export interface PresenceSession {id: string; worldId: string; sequence: number; expiresAt: number}
export interface HabitatState extends WorldState {
  profile: CharacterProfile | null;
  players: (WorldState['players'][number] & {loadout: CharacterLoadout})[];
  permissions: WorldPermissions | null;
  presenceSession: PresenceSession | null;
}
export const worldIdSchema = z.string().uuid();
export const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1);
export const worldEditorSavePayloadSchema = z.object({worldId: worldIdSchema, revision: revisionSchema, objects: layoutSchema}).strict();
export type WorldEditorSavePayload = z.infer<typeof worldEditorSavePayloadSchema>;
export const characterProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(20).regex(/^[\p{L}\p{N} _-]+$/u),
  character: z.enum(['female', 'male']),
  variant: z.enum(['original', 'sage', 'clay', 'slate']).optional(),
  randomize: z.boolean().optional(),
}).strict();
export type CharacterProfileInput = z.infer<typeof characterProfileInputSchema>;
export const poseInputSchema = z.object({
  worldId: worldIdSchema,
  x: z.number().finite().min(-15).max(15), z: z.number().finite().min(-9).max(13),
  angle: z.number().finite().min(-100).max(100), motion: motionSchema,
  moving: z.boolean().optional(),
  sessionId: z.string().uuid().optional(), sequence: revisionSchema.optional(),
}).strict().refine(v => (v.sessionId === undefined) === (v.sequence === undefined), 'Session and sequence must be supplied together');
export const presenceInputSchema = poseInputSchema.refine(v => v.sessionId !== undefined, 'Join before sending presence');
export type PresenceInput = z.infer<typeof presenceInputSchema>;
export const objectCreateSchema = z.object({revision: revisionSchema, object: worldObjectSchema}).strict();
export const objectUpdateSchema = z.object({revision: revisionSchema, object: worldObjectSchema.omit({id: true}).partial()}).strict();
export const objectDeleteSchema = z.object({revision: revisionSchema}).strict();
export const worldSettingsSchema = z.object({name: z.string().trim().min(2).max(60), visibility: z.enum(['public', 'private']), revision: revisionSchema.optional()}).strict();
export const memberInputSchema = z.object({wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/), role: z.enum(['editor', 'visitor'])}).strict();
export const resolveAssetsSchema = z.object({ids: z.array(z.string().min(1).max(100)).min(1).max(120)}).strict();
