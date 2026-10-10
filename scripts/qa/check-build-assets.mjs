/** Read-only CTRL build-kit integrity / file-budget gate. No app imports or paid services. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_BUDGETS = Object.freeze({
  maxModelBytes: 256 * 1024,
  maxThumbnailBytes: 16 * 1024,
  maxCombinedKitBytes: 20 * 1024 * 1024,
  maxMobileVrmBytes: 8 * 1024 * 1024,
  maxDesktopVrmBytes: 12 * 1024 * 1024,
  maxThumbnailEdge: 160,
});

function walk(directory) {
  if (!existsSync(directory)) return [];
  const result = [];
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...walk(target));
    else if (item.isFile()) result.push(target);
    else result.push(target); // Symlinks are disallowed as catalog members.
  }
  return result;
}

function readCatalog(source) {
  const found = source.match(/export const BUILD_ASSETS\s*:\s*readonly BuildAsset\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!found) throw new Error('Cannot locate the BUILD_ASSETS JSON record array');
  const categoryLine = source.match(/export const BUILD_ASSET_CATEGORIES\s*=\s*\[([^\]]+)\]/);
  if (!categoryLine) throw new Error('Cannot locate BUILD_ASSET_CATEGORIES');
  const categories = [...categoryLine[1].matchAll(/'([a-z-]+)'/g)].map(match => match[1]);
  if (!categories.length) throw new Error('No accepted catalog categories');
  return { entries: JSON.parse('[' + found[1] + ']'), categories };
}

function checkGlb(file) {
  const bytes = readFileSync(file);
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('missing glTF magic');
  if (bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('invalid GLB version or declared length');
  let offset = 12;
  let document = null;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error('truncated GLB chunk header');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (length % 4 !== 0 || length > bytes.length - offset) throw new Error('invalid GLB chunk bounds');
    if (document === null) {
      if (type !== 0x4e4f534a) throw new Error('first GLB chunk is not JSON');
      document = JSON.parse(bytes.toString('utf8', offset, offset + length).replace(/\0+$/g, '').trimEnd());
    }
    offset += length;
  }
  if (!document || document.asset?.version !== '2.0') throw new Error('missing glTF 2.0 metadata');
  return (document.animations ?? []).map(animation => animation.name ?? '');
}

function checkWebp(file, maxEdge) {
  const bytes = readFileSync(file);
  if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('invalid WebP RIFF header');
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('invalid WebP RIFF length');
  const kind = bytes.toString('ascii', 12, 16);
  const size = bytes.readUInt32LE(16);
  if (size > bytes.length - 20) throw new Error('invalid WebP chunk length');
  let width, height;
  if (kind === 'VP8X' && size >= 10) {
    width = 1 + bytes.readUIntLE(24, 3);
    height = 1 + bytes.readUIntLE(27, 3);
  } else if (kind === 'VP8L' && size >= 5 && bytes[20] === 0x2f) {
    width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
    height = 1 + ((bytes[22] >> 6) & 0x03) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10);
  } else if (kind === 'VP8 ' && size >= 10 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    width = bytes.readUInt16LE(26) & 0x3fff;
    height = bytes.readUInt16LE(28) & 0x3fff;
  } else throw new Error('unsupported or malformed WebP image chunk');
  if (!width || !height || width > maxEdge || height > maxEdge) throw new Error('WebP exceeds thumbnail dimensions (' + width + 'x' + height + ')');
  return { width, height };
}

export function auditBuildAssets(root = process.cwd(), budgets = DEFAULT_BUDGETS) {
  const report = { ok: true, assets: 0, models: 0, thumbnails: 0, modelBytes: 0, thumbnailBytes: 0, combinedKitBytes: 0, vrm: [], packs: {}, errors: [], warnings: [] };
  const fail = message => report.errors.push(message);
  const note = message => report.warnings.push(message);
  const absolute = relative => path.join(root, relative);
  const kitRelative = 'public/plaza/build-kit';
  const kit = absolute(kitRelative);
  let entries, categories, provenance;
  try {
    ({ entries, categories } = readCatalog(readFileSync(absolute('features/plaza/build-assets.ts'), 'utf8')));
    provenance = JSON.parse(readFileSync(path.join(kit, 'provenance.json'), 'utf8'));
  } catch (error) {
    fail('Cannot parse source catalog or provenance: ' + error.message);
    report.ok = false;
    return report;
  }
  if (!Array.isArray(entries) || !Array.isArray(provenance.packs)) {
    fail('Catalog entries and provenance packs must be arrays');
    report.ok = false;
    return report;
  }
  report.assets = entries.length;
  const seenIds = new Set(), expectedFiles = new Set();
  const registeredPacks = new Map();
  for (const pack of provenance.packs) {
    if (!pack || !/^[a-z0-9-]+$/.test(pack.pack ?? '') || registeredPacks.has(pack.pack)) { fail('Invalid or duplicate provenance pack: ' + String(pack?.pack)); continue; }
    registeredPacks.set(pack.pack, pack);
    report.packs[pack.pack] = { category: pack.category, count: 0, modelBytes: 0, thumbnailBytes: 0 };
    const license = path.join(kit, pack.pack, 'License.txt');
    if (!existsSync(license) || !statSync(license).isFile() || !readFileSync(license, 'utf8').trim()) fail('Missing/empty pack license: ' + pack.pack);
    if (!/^[a-f\d]{64}$/i.test(pack.archiveSha256 ?? '') || !/^https:\/\/kenney\.nl\/assets\//.test(pack.source ?? '')) fail('Invalid provenance source/digest: ' + pack.pack);
  }
  if (provenance.license !== 'CC0-1.0') fail('Unexpected catalog license marker');
  if (provenance.assetCount !== entries.length) fail('Catalog/provenance asset count mismatch');

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') { fail('Invalid catalog record'); continue; }
    const id = entry.id;
    if (typeof id !== 'string' || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) { fail('Invalid ID: ' + String(id)); continue; }
    if (seenIds.has(id)) fail('Duplicate asset ID: ' + id);
    seenIds.add(id);
    const [pack, name] = id.split('/');
    const group = report.packs[pack];
    if (!group || entry.sourcePack !== pack || !categories.includes(entry.category) || group.category !== entry.category) { fail('Invalid pack/category: ' + id); continue; }
    group.count += 1;
    const modelUrl = '/plaza/build-kit/' + pack + '/' + name + '.glb';
    const thumbUrl = '/plaza/build-kit/' + pack + '/thumbs/' + name + '.webp';
    if (entry.url !== modelUrl || entry.thumbnailUrl !== thumbUrl) { fail('Invalid local asset paths: ' + id); continue; }
    const modelRelative = 'public' + modelUrl, thumbRelative = 'public' + thumbUrl;
    expectedFiles.add(modelRelative); expectedFiles.add(thumbRelative);
    if (typeof entry.name !== 'string' || !entry.name.trim()) fail('Missing asset display name: ' + id);
    if (!Array.isArray(entry.bounds) || entry.bounds.length !== 3 || entry.bounds.some(n => !Number.isFinite(n) || n < 0)) fail('Invalid bounds: ' + id);
    if (!Array.isArray(entry.center) || entry.center.length !== 3 || entry.center.some(n => !Number.isFinite(n)) || !Number.isFinite(entry.groundOffset)) fail('Invalid object placement metadata: ' + id);
    if (!['solid', 'none'].includes(entry.collision)) fail('Invalid collision hint: ' + id);
    if (!Array.isArray(entry.animationClips) || entry.animationClips.some(n => typeof n !== 'string')) fail('Invalid animation clip names: ' + id);
    for (const [kind, relative, limit] of [['model', modelRelative, budgets.maxModelBytes], ['thumbnail', thumbRelative, budgets.maxThumbnailBytes]]) {
      const file = absolute(relative);
      if (!existsSync(file) || !statSync(file).isFile()) { fail('Missing ' + kind + ': ' + id); continue; }
      const bytes = statSync(file).size;
      if (bytes > limit) fail('Oversized ' + kind + ' (' + bytes + ' > ' + limit + '): ' + id);
      if (kind === 'model') {
        report.models += 1; report.modelBytes += bytes; group.modelBytes += bytes;
        if (bytes !== entry.bytes) fail('Catalog GLB byte mismatch (' + entry.bytes + ' != ' + bytes + '): ' + id);
        try { const actualClips = checkGlb(file); if (JSON.stringify(actualClips) !== JSON.stringify(entry.animationClips)) fail('Animation clip metadata mismatch: ' + id); }
        catch (error) { fail('Invalid GLB ' + id + ': ' + error.message); }
      } else {
        report.thumbnails += 1; report.thumbnailBytes += bytes; group.thumbnailBytes += bytes;
        try { checkWebp(file, budgets.maxThumbnailEdge); }
        catch (error) { fail('Invalid thumbnail ' + id + ': ' + error.message); }
      }
    }
  }
  for (const [pack, record] of registeredPacks) if (report.packs[pack].count !== record.count) fail('Pack count mismatch for ' + pack + ': ' + report.packs[pack].count + ' != ' + record.count);
  for (const file of walk(kit)) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (/\.(glb|webp)$/i.test(relative) && !expectedFiles.has(relative)) fail('Unlisted model/thumbnail: ' + relative);
  }
  const palettes = walk(kit).filter(file => /\/Textures\/.+\.png$/i.test(file.split(path.sep).join('/')));
  const palettesBytes = palettes.reduce((total, file) => total + statSync(file).size, 0);
  report.combinedKitBytes = report.modelBytes + report.thumbnailBytes + palettesBytes;
  if (report.combinedKitBytes > budgets.maxCombinedKitBytes) fail('Combined kit exceeds budget: ' + report.combinedKitBytes + ' > ' + budgets.maxCombinedKitBytes);
  for (const file of walk(absolute('public/plaza/characters'))) {
    if (!file.endsWith('.vrm')) continue;
    const bytes = statSync(file).size, mobile = /-mobile\.vrm$/i.test(file);
    const limit = mobile ? budgets.maxMobileVrmBytes : budgets.maxDesktopVrmBytes;
    const relative = path.relative(root, file).split(path.sep).join('/');
    report.vrm.push({ path: relative, bytes, profile: mobile ? 'mobile' : 'desktop' });
    if (bytes > limit) fail('Oversized VRM (' + bytes + ' > ' + limit + '): ' + relative);
    try { checkGlb(file); } catch (error) { fail('Invalid VRM ' + relative + ': ' + error.message); }
  }
  if (report.vrm.length === 0) note('No VRM avatars found; VRM size checks skipped');
  report.ok = report.errors.length === 0;
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const json = process.argv.includes('--json');
  const rootArg = process.argv.indexOf('--root');
  if (rootArg >= 0 && !process.argv[rootArg + 1]) { console.error('Missing --root path'); process.exitCode = 2; }
  else {
    const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : process.cwd();
    const report = auditBuildAssets(root);
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log((report.ok ? 'PASS' : 'FAIL') + ' CTRL asset integrity | catalog=' + report.assets + ' GLB=' + report.models + ' WebP=' + report.thumbnails + ' kit=' + (report.combinedKitBytes / 1048576).toFixed(2) + ' MiB');
      for (const issue of report.errors) console.error('ERROR ' + issue);
      for (const issue of report.warnings) console.warn('WARN ' + issue);
    }
    if (!report.ok) process.exitCode = 1;
  }
}
