/**
 * AUDITED, LOCALLY INSTALLED models only. Initially empty.
 * scripts/ingest-character-vrm.mjs appends licensed VRM files here after
 * self-contained VRM validation and provenance collection.
 */
export interface InstalledCharacterAsset {
  id:string;
  name:string;
  gender:'female'|'male';
  height:number;
  sourceUrl:string;
  license:string;
  creator:string;
  modelUrl:string;
  sha256:string;
}
export const INSTALLED_CHARACTER_ASSETS: ReadonlyArray<InstalledCharacterAsset> = [];
