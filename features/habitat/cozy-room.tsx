'use client';

import {useEffect,useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import {CanvasTexture,DoubleSide,RepeatWrapping,SRGBColorSpace} from 'three';

interface CozyRoomProps {
  wallColor: string;
}

function hashNoise(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function useCanvasTexture(kind: 'floor' | 'plaster' | 'sky', tint = '#ead8b8') {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = kind === 'floor' ? 1024 : 512;
    canvas.height = kind === 'floor' ? 1024 : 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (kind === 'floor') {
      ctx.fillStyle = '#b9824d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const plankW = 50;
      const plankH = 164;
      for (let y = 0; y < canvas.height + plankH; y += plankH) {
        const row = Math.floor(y / plankH);
        for (let x = -plankW; x < canvas.width + plankW; x += plankW) {
          const offset = row % 2 === 0 ? 0 : plankW / 2;
          const px = x + offset;
          const n = hashNoise(px, y, 4);
          const hue = 30 + n * 7;
          const light = 63 + n * 8;
          ctx.fillStyle = `hsl(${hue} 30% ${light}%)`;
          ctx.fillRect(px + 1, y + 1, plankW - 2, plankH - 2);
          ctx.strokeStyle = 'rgba(86,54,30,.32)';
          ctx.lineWidth = 1.3;
          ctx.strokeRect(px + .5, y + .5, plankW - 1, plankH - 1);
          for (let g = 0; g < 8; g += 1) {
            const gy = y + 16 + g * 18 + hashNoise(px, g, 11) * 7;
            ctx.strokeStyle = `rgba(92,58,31,${.08 + hashNoise(g, px, 5) * .1})`;
            ctx.beginPath();
            ctx.moveTo(px + 6, gy);
            ctx.bezierCurveTo(px + 16, gy - 5, px + 31, gy + 6, px + plankW - 7, gy - 1);
            ctx.stroke();
          }
        }
      }
    } else if (kind === 'plaster') {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 2600; i += 1) {
        const x = hashNoise(i, 3, 2) * canvas.width;
        const y = hashNoise(i, 9, 3) * canvas.height;
        const a = .025 + hashNoise(i, 4, 7) * .05;
        ctx.fillStyle = hashNoise(i, 1, 8) > .5 ? `rgba(255,248,230,${a})` : `rgba(108,77,46,${a})`;
        ctx.fillRect(x, y, 1.4, 1.4);
      }
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.fillRect(0, 0, canvas.width, canvas.height * .45);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#82cdfa');
      grad.addColorStop(.52, '#bfeaff');
      grad.addColorStop(1, '#fff6de');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      for (const cloud of [[90,170,54],[205,120,38],[350,188,66],[420,92,44]] as const) {
        const [x, y, r] = cloud;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.5, r * .45, 0, 0, Math.PI * 2);
        ctx.ellipse(x + r * .8, y - r * .16, r, r * .52, 0, 0, Math.PI * 2);
        ctx.ellipse(x - r * .8, y + r * .04, r * .85, r * .4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    next.wrapS = RepeatWrapping;
    next.wrapT = RepeatWrapping;
    next.anisotropy = 4;
    if (kind === 'floor') next.repeat.set(1, 1);
    if (kind === 'plaster') next.repeat.set(2, 1.4);
    next.needsUpdate = true;
    return next;
  }, [kind, tint]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function Trim({position, size, rotationY = 0, color = '#b8875b'}: {position: [number, number, number]; size: [number, number, number]; rotationY?: number; color?: string}) {
  return <RoundedBox args={size} radius={Math.min(size[0], size[1], size[2]) * .35} smoothness={3} position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow>
    <meshStandardMaterial color={color} roughness={.58}/>
  </RoundedBox>;
}

function BackWainscot() {
  const trim = '#caa179';
  const panel = '#f2dfbf';
  return <group>
    <Trim position={[0, .13, -3.82]} size={[9.85, .18, .08]} color='#af7a51'/>
    <Trim position={[0, .92, -3.82]} size={[9.7, .08, .07]} color={trim}/>
    {[-4, -2, 2, 4].map(x => <Trim key={`back-stile-${x}`} position={[x, .53, -3.81]} size={[.07, .67, .065]} color={trim}/>) }
    {[-3, -1, 1, 3].map(x => <RoundedBox key={`back-panel-${x}`} args={[1.54, .52, .026]} radius={.035} smoothness={3} position={[x, .51, -3.775]} receiveShadow>
      <meshStandardMaterial color={panel} roughness={.9}/>
    </RoundedBox>)}
  </group>;
}

function LeftWainscot() {
  const trim = '#caa179';
  const panel = '#f2dfbf';
  return <group>
    <Trim position={[-4.82, .13, 0]} size={[.08, .18, 7.85]} color='#af7a51'/>
    <Trim position={[-4.82, .92, 0]} size={[.07, .08, 7.7]} color={trim}/>
    {[-3, -1, 1, 3].map(z => <Trim key={`left-stile-${z}`} position={[-4.81, .53, z]} size={[.065, .67, .07]} color={trim}/>) }
    {[-2, 0, 2].map(z => <RoundedBox key={`left-panel-${z}`} args={[.026, .52, 1.54]} radius={.035} smoothness={3} position={[-4.775, .51, z]} receiveShadow>
      <meshStandardMaterial color={panel} roughness={.9}/>
    </RoundedBox>)}
  </group>;
}

function LargeWindow() {
  const sky = useCanvasTexture('sky');
  const wood = '#9b6b43';
  const curtain = '#b5c3a4';
  const sheer = '#f5eddc';
  return <group position={[0, 0, 0]}>
    <mesh position={[0, 2.05, -3.85]}>
      <planeGeometry args={[3.65, 1.55]}/>
      <meshBasicMaterial map={sky} color='#d6f3ff' side={DoubleSide}/>
    </mesh>
    <Trim position={[0, 2.05, -3.72]} size={[3.98, .13, .16]} color={wood}/>
    <Trim position={[0, 2.87, -3.72]} size={[4.1, .16, .18]} color={wood}/>
    <Trim position={[0, 1.23, -3.72]} size={[4.1, .16, .18]} color={wood}/>
    <Trim position={[-2.05, 2.05, -3.72]} size={[.16, 1.78, .18]} color={wood}/>
    <Trim position={[2.05, 2.05, -3.72]} size={[.16, 1.78, .18]} color={wood}/>
    <Trim position={[0, 2.05, -3.69]} size={[.09, 1.55, .12]} color={wood}/>
    <Trim position={[0, 2.05, -3.68]} size={[3.72, .08, .12]} color={wood}/>
    <Trim position={[-.93, 2.05, -3.675]} size={[.065, 1.46, .11]} color={wood}/>
    <Trim position={[.93, 2.05, -3.675]} size={[.065, 1.46, .11]} color={wood}/>
    <Trim position={[0, 3.03, -3.61]} size={[4.55, .11, .16]} color='#b98255'/>
    {[-2.34, 2.34].map(side => <group key={`curtain-${side}`} position={[side, 2.08, -3.55]}>
      {Array.from({length: 6}, (_, i) => {
        const x = (i - 2.5) * .105 * Math.sign(side);
        return <RoundedBox key={i} args={[.085, 1.72, .09]} radius={.04} smoothness={4} position={[x, 0, 0]} castShadow>
          <meshStandardMaterial color={i % 2 === 0 ? curtain : sheer} roughness={.94}/>
        </RoundedBox>;
      })}
    </group>)}
  </group>;
}

export default function CozyRoom({wallColor}: CozyRoomProps) {
  const floor = useCanvasTexture('floor');
  const plaster = useCanvasTexture('plaster', wallColor || '#ead8b8');
  return <group>
    <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
      <planeGeometry args={[10, 8]}/>
      <meshStandardMaterial map={floor} color='#ffffff' roughness={.82} metalness={0}/>
    </mesh>

    <group>
      <mesh receiveShadow position={[0, .475, -4.05]}><boxGeometry args={[10.1, .95, .12]}/><meshStandardMaterial map={plaster} color='#ffffff' roughness={.94}/></mesh>
      <mesh receiveShadow position={[0, 3.175, -4.05]}><boxGeometry args={[10.1, .65, .12]}/><meshStandardMaterial map={plaster} color='#ffffff' roughness={.94}/></mesh>
      <mesh receiveShadow position={[-3.5, 1.9, -4.05]}><boxGeometry args={[3.1, 1.9, .12]}/><meshStandardMaterial map={plaster} color='#ffffff' roughness={.94}/></mesh>
      <mesh receiveShadow position={[3.5, 1.9, -4.05]}><boxGeometry args={[3.1, 1.9, .12]}/><meshStandardMaterial map={plaster} color='#ffffff' roughness={.94}/></mesh>
      <mesh receiveShadow position={[-5.05, 1.75, 0]}><boxGeometry args={[.12, 3.5, 8.1]}/><meshStandardMaterial map={plaster} color='#ffffff' roughness={.94}/></mesh>
    </group>

    <BackWainscot/>
    <LeftWainscot/>
    <LargeWindow/>

    <Trim position={[0, 3.46, -3.93]} size={[10.05, .11, .18]} color='#dfbf97'/>
    <Trim position={[-4.93, 3.46, 0]} size={[.18, .11, 8.05]} color='#dfbf97'/>
    <Trim position={[-4.93, 1.75, -3.93]} size={[.18, 3.5, .18]} color='#c28d62'/>
    <pointLight position={[0, 2.4, -3.15]} intensity={.72} distance={5.5} color='#dff7ff'/>
  </group>;
}
