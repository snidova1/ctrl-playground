'use client';

import {useEffect,useMemo,type ReactNode} from 'react';
import {RoundedBox} from '@react-three/drei';
import {CanvasTexture,DoubleSide,RepeatWrapping,SRGBColorSpace} from 'three';
import {getBuildAsset} from '@/features/plaza/build-assets';

const SUPPORTED_COZY_FURNITURE = [
  'furniture-kit/chair',
  'furniture-kit/tableRound',
  'furniture-kit/bedDouble',
  'furniture-kit/bookcaseOpen',
  'furniture-kit/lampRoundFloor',
  'furniture-kit/pottedPlant',
  'furniture-kit/rugRectangle',
  'furniture-kit/benchCushionLow',
] as const;

export type CozyFurnitureAssetId = (typeof SUPPORTED_COZY_FURNITURE)[number];

type Bounds3 = [number, number, number];

interface CozyFurnitureProps {
  assetId: string;
  tint?: string;
}

const SUPPORTED_SET = new Set<string>(SUPPORTED_COZY_FURNITURE);

export function supportsCozyFurniture(assetId: string): assetId is CozyFurnitureAssetId {
  return SUPPORTED_SET.has(assetId);
}

function hashNoise(x: number, y: number, seed: number) {
  const n = Math.sin(x * 129.17 + y * 313.91 + seed * 37.61) * 43758.5453;
  return n - Math.floor(n);
}

function useFabricTexture(base: string, accent = '#ffffff', density = 900) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < density; i += 1) {
      const x = hashNoise(i, 4, 1) * 256;
      const y = hashNoise(i, 8, 2) * 256;
      const a = .035 + hashNoise(i, 2, 3) * .075;
      ctx.fillStyle = hashNoise(i, 6, 4) > .48 ? `rgba(255,255,255,${a})` : `rgba(56,43,31,${a})`;
      ctx.fillRect(x, y, 1.5, .7);
    }
    ctx.strokeStyle = `${accent}55`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 28, 256);
      ctx.stroke();
    }
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    next.wrapS = RepeatWrapping;
    next.wrapT = RepeatWrapping;
    next.repeat.set(2.4, 2.4);
    next.anisotropy = 4;
    next.needsUpdate = true;
    return next;
  }, [base, accent, density]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function useWoodTexture(base = '#7c4d2d') {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 1) {
      const wobble = Math.sin(y * .08) * 8 + Math.sin(y * .019) * 15;
      ctx.strokeStyle = `rgba(255,218,158,${.045 + hashNoise(y, 3, 2) * .035})`;
      ctx.beginPath();
      ctx.moveTo(0, y + wobble * .02);
      ctx.bezierCurveTo(70, y + wobble, 140, y - wobble * .5, 256, y + wobble * .08);
      ctx.stroke();
      if (y % 28 === 0) {
        ctx.strokeStyle = 'rgba(56,31,17,.25)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y + hashNoise(y, 0, 5) * 5);
        ctx.stroke();
      }
    }
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    next.wrapS = RepeatWrapping;
    next.wrapT = RepeatWrapping;
    next.repeat.set(1.4, 1.4);
    next.anisotropy = 4;
    next.needsUpdate = true;
    return next;
  }, [base]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function targetBounds(assetId: CozyFurnitureAssetId): Bounds3 {
  return getBuildAsset(assetId)?.bounds ?? [1, 1, 1];
}

function NormalizeToAsset({assetId, authored, children}: {assetId: CozyFurnitureAssetId; authored: Bounds3; children: ReactNode}) {
  const bounds = targetBounds(assetId);
  const scale: Bounds3 = [bounds[0] / authored[0], bounds[1] / authored[1], bounds[2] / authored[2]];
  return <group scale={scale}>{children}</group>;
}

function Sofa({tint}: {tint?: string}) {
  const fabricColor = tint || '#9fb594';
  const fabric = useFabricTexture(fabricColor, '#e6eedb');
  return <group>
    <RoundedBox args={[1.72, .26, .72]} radius={.13} smoothness={7} position={[0, .31, .02]} castShadow receiveShadow>
      <meshStandardMaterial map={fabric} color='#ffffff' roughness={.9}/>
    </RoundedBox>
    {[-.46, .46].map(x => <RoundedBox key={x} args={[.78, .22, .68]} radius={.11} smoothness={7} position={[x, .48, .02]} castShadow receiveShadow>
      <meshStandardMaterial map={fabric} color='#ffffff' roughness={.91}/>
    </RoundedBox>)}
    <RoundedBox args={[1.82, .48, .2]} radius={.12} smoothness={7} position={[0, .58, -.35]} castShadow receiveShadow>
      <meshStandardMaterial map={fabric} color='#ffffff' roughness={.93}/>
    </RoundedBox>
    {[-1.02, 1.02].map(x => <mesh key={x} position={[x, .42, .02]} rotation-x={Math.PI / 2} castShadow receiveShadow>
      <cylinderGeometry args={[.23, .23, .75, 24]}/>
      <meshStandardMaterial map={fabric} color='#ffffff' roughness={.9}/>
    </mesh>)}
    {[-.72, .72].map(x => <RoundedBox key={`leg-${x}`} args={[.14, .16, .14]} radius={.04} position={[x, .08, .26]} castShadow><meshStandardMaterial color='#755237' roughness={.65}/></RoundedBox>)}
  </group>;
}

function Chair({tint}: {tint?: string}) {
  const upholstery = tint || '#efe2cf';
  const fabric = useFabricTexture(upholstery, '#fff8ec', 680);
  const wood = useWoodTexture('#87603c');
  return <group>
    <RoundedBox args={[.58, .22, .58]} radius={.095} smoothness={6} position={[0, .43, .06]} castShadow receiveShadow>
      <meshStandardMaterial map={fabric} color='#ffffff' roughness={.88}/>
    </RoundedBox>
    <RoundedBox args={[.62, .58, .16]} radius={.095} smoothness={6} position={[0, .74, -.24]} castShadow receiveShadow>
      <meshStandardMaterial map={fabric} color='#ffffff' roughness={.9}/>
    </RoundedBox>
    {[-.34, .34].map(x => <RoundedBox key={`arm-${x}`} args={[.12, .38, .58]} radius={.055} smoothness={5} position={[x, .48, .05]} castShadow receiveShadow>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.62}/>
    </RoundedBox>)}
    {[-.24, .24].flatMap(x => [-.18, .28].map(z => <mesh key={`${x}-${z}`} position={[x, .18, z]} castShadow>
      <cylinderGeometry args={[.045, .055, .36, 14]}/>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.6}/>
    </mesh>))}
  </group>;
}

function RoundTable({tint}: {tint?: string}) {
  const woodColor = tint || '#7a4d2e';
  const wood = useWoodTexture(woodColor);
  return <group>
    <mesh position={[0, .68, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[.68, .72, .16, 48]}/>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.48}/>
    </mesh>
    <RoundedBox args={[.32, .58, .32]} radius={.09} smoothness={6} position={[0, .36, 0]} castShadow receiveShadow>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.55}/>
    </RoundedBox>
    <mesh position={[0, .08, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[.42, .34, .16, 40]}/>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.58}/>
    </mesh>
  </group>;
}

function Bed({tint}: {tint?: string}) {
  const quiltColor = tint || '#9dad8a';
  const quilt = useFabricTexture(quiltColor, '#f2ead8');
  const linen = useFabricTexture('#f6ead9', '#ffffff', 520);
  const wood = useWoodTexture('#8a5b36');
  return <group>
    <RoundedBox args={[2.02, .26, 2.16]} radius={.11} smoothness={6} position={[0, .19, .1]} castShadow receiveShadow>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.6}/>
    </RoundedBox>
    <RoundedBox args={[2.12, .62, .18]} radius={.08} smoothness={5} position={[0, .43, -.99]} castShadow receiveShadow>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.62}/>
    </RoundedBox>
    <RoundedBox args={[1.88, .2, 1.7]} radius={.12} smoothness={8} position={[0, .39, .25]} castShadow receiveShadow>
      <meshStandardMaterial map={quilt} color='#ffffff' roughness={.92}/>
    </RoundedBox>
    {[-.52, .52].map(x => <RoundedBox key={x} args={[.72, .16, .42]} radius={.09} smoothness={6} position={[x, .53, -.55]} rotation={[-.08, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial map={linen} color='#ffffff' roughness={.94}/>
    </RoundedBox>)}
  </group>;
}

function Bookcase({tint}: {tint?: string}) {
  const wood = useWoodTexture(tint || '#79502f');
  const bookColors = ['#c86f5a', '#e6b85c', '#6f9d86', '#6b8fbd', '#b873a2', '#efe2c2'];
  return <group>
    <RoundedBox args={[1.16, 2.3, .16]} radius={.055} smoothness={4} position={[0, 1.15, -.13]} castShadow receiveShadow>
      <meshStandardMaterial map={wood} color='#ffffff' roughness={.62}/>
    </RoundedBox>
    {[-.55, .55].map(x => <RoundedBox key={x} args={[.12, 2.3, .42]} radius={.055} smoothness={4} position={[x, 1.15, 0]} castShadow receiveShadow><meshStandardMaterial map={wood} color='#ffffff' roughness={.63}/></RoundedBox>)}
    {[.2, .82, 1.44, 2.06].map(y => <RoundedBox key={y} args={[1.12, .1, .42]} radius={.045} smoothness={4} position={[0, y, 0]} castShadow receiveShadow><meshStandardMaterial map={wood} color='#ffffff' roughness={.6}/></RoundedBox>)}
    {[.52, 1.14, 1.76].flatMap((y, row) => Array.from({length: 7}, (_, i) => {
      const x = -.38 + i * .125;
      const h = .22 + hashNoise(i, row, 2) * .18;
      return <RoundedBox key={`${row}-${i}`} args={[.07, h, .24]} radius={.018} smoothness={3} position={[x, y + h / 2 - .1, .08]} castShadow receiveShadow>
        <meshStandardMaterial color={bookColors[(i + row) % bookColors.length]} roughness={.82}/>
      </RoundedBox>;
    }))}
  </group>;
}

function FloorLamp({tint}: {tint?: string}) {
  const shadeColor = tint || '#f0dcc0';
  const fabric = useFabricTexture(shadeColor, '#fff7e7', 450);
  return <group>
    <mesh position={[0, .08, 0]} castShadow receiveShadow><cylinderGeometry args={[.2, .25, .16, 36]}/><meshStandardMaterial color='#75604b' metalness={.15} roughness={.42}/></mesh>
    <mesh position={[0, .76, 0]} castShadow><cylinderGeometry args={[.035, .045, 1.26, 20]}/><meshStandardMaterial color='#6d5843' metalness={.18} roughness={.38}/></mesh>
    <mesh position={[0, 1.42, 0]} castShadow receiveShadow><cylinderGeometry args={[.24, .34, .38, 36, 1, true]}/><meshStandardMaterial map={fabric} color='#ffffff' roughness={.86} side={DoubleSide} emissive='#ffdca7' emissiveIntensity={.16}/></mesh>
    <pointLight position={[0, 1.34, 0]} intensity={.38} distance={2.3} color='#ffdca8'/>
  </group>;
}

function PottedPlant({tint}: {tint?: string}) {
  const leafColor = tint || '#5f8f58';
  return <group>
    <mesh position={[0, .18, 0]} castShadow receiveShadow><cylinderGeometry args={[.22, .28, .36, 28]}/><meshStandardMaterial color='#d39b73' roughness={.74}/></mesh>
    <mesh position={[0, .38, 0]} receiveShadow><cylinderGeometry args={[.2, .2, .035, 24]}/><meshStandardMaterial color='#4b3324' roughness={.9}/></mesh>
    {[0, .7, 1.4, 2.1, 2.8, 3.5].map((a, i) => <group key={i} rotation-y={a} position={[0, .55 + i * .035, 0]}>
      <mesh position={[.18, .2, 0]} scale={[1.5, .38, .85]} rotation-z={-.72} rotation-y={.35} castShadow>
        <sphereGeometry args={[.18, 16, 10]}/>
        <meshStandardMaterial color={i % 2 ? '#77a96a' : leafColor} roughness={.82}/>
      </mesh>
      <mesh position={[.08, .08, 0]} rotation-z={-.38} castShadow><cylinderGeometry args={[.018, .024, .36, 8]}/><meshStandardMaterial color='#4f7a49' roughness={.8}/></mesh>
    </group>)}
  </group>;
}

function Rug({tint}: {tint?: string}) {
  const base = tint || '#b7a78d';
  const fabric = useFabricTexture(base, '#fff0ce', 1200);
  return <group>
    <RoundedBox args={[2.32, .035, 1.36]} radius={.09} smoothness={7} position={[0, .018, 0]} receiveShadow>
      <meshStandardMaterial map={fabric} color='#ffffff' roughness={.96}/>
    </RoundedBox>
    <RoundedBox args={[2.08, .022, .08]} radius={.025} position={[0, .045, .51]}><meshStandardMaterial color='#efe2c2' roughness={.95}/></RoundedBox>
    <RoundedBox args={[2.08, .022, .08]} radius={.025} position={[0, .045, -.51]}><meshStandardMaterial color='#efe2c2' roughness={.95}/></RoundedBox>
    {[-.64, 0, .64].map(x => <RoundedBox key={x} args={[.08, .024, 1.05]} radius={.025} position={[x, .05, 0]}><meshStandardMaterial color='#8ea98a' roughness={.96}/></RoundedBox>)}
  </group>;
}

export default function CozyFurniture({assetId, tint}: CozyFurnitureProps) {
  if (!supportsCozyFurniture(assetId)) return null;
  switch (assetId) {
    case 'furniture-kit/benchCushionLow':
      return <NormalizeToAsset assetId={assetId} authored={[2.5, .88, .92]}><Sofa tint={tint}/></NormalizeToAsset>;
    case 'furniture-kit/chair':
      return <NormalizeToAsset assetId={assetId} authored={[.86, 1.05, .82]}><Chair tint={tint}/></NormalizeToAsset>;
    case 'furniture-kit/tableRound':
      return <NormalizeToAsset assetId={assetId} authored={[1.42, .92, 1.42]}><RoundTable tint={tint}/></NormalizeToAsset>;
    case 'furniture-kit/bedDouble':
      return <NormalizeToAsset assetId={assetId} authored={[2.15, .72, 2.45]}><Bed tint={tint}/></NormalizeToAsset>;
    case 'furniture-kit/bookcaseOpen':
      return <NormalizeToAsset assetId={assetId} authored={[1.2, 2.35, .42]}><Bookcase tint={tint}/></NormalizeToAsset>;
    case 'furniture-kit/lampRoundFloor':
      return <NormalizeToAsset assetId={assetId} authored={[.68, 1.72, .68]}><FloorLamp tint={tint}/></NormalizeToAsset>;
    case 'furniture-kit/pottedPlant':
      return <NormalizeToAsset assetId={assetId} authored={[.72, 1.28, .72]}><PottedPlant tint={tint}/></NormalizeToAsset>;
    case 'furniture-kit/rugRectangle':
      return <NormalizeToAsset assetId={assetId} authored={[2.4, .06, 1.45]}><Rug tint={tint}/></NormalizeToAsset>;
  }
  return null;
}
