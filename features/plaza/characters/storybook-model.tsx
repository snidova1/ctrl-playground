'use client';

import {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {
  BufferGeometry, CapsuleGeometry, CatmullRomCurve3, Float32BufferAttribute, Group, LatheGeometry, Shape, ShapeGeometry,
  MathUtils, MeshStandardMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
} from 'three';
import type {CharacterAppearance} from './catalog';
import {storybookPalette, type StorybookPalette} from './storybook-palette';

type Action = 'idle' | 'walk' | 'run' | 'jump' | 'sit' | 'wave';
type XYZ = [number, number, number];
type Props = {appearance: CharacterAppearance; action: Action; quality: 'low' | 'high'};
type Materials = Record<keyof StorybookPalette, MeshStandardMaterial>;

// Rest height 1.753 m; feet at y=0, face +Z. No world transform or lights here.
// Face details follow the SAME jaw surface as the head, avoiding floating eye cards.
function faceZ(x: number, y: number) {
  const jaw = 1 + Math.min(0, y / .255) * .19;
  return .205 * Math.sqrt(Math.max(.001, 1 - (x / (.23 * jaw)) ** 2 - (y / .255) ** 2));
}

function surfaceGeometry(vertices: number[], indices: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A filled almond/oval, curved over the face, with a consistent +Z winding. */
function facePatch(cx: number, cy: number, width: number, height: number, lift: number, almond: boolean, segments: number) {
  const vertices = [0, 0, faceZ(cx, cy) + lift];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI * 2;
    const x = Math.cos(angle) * width;
    const y = Math.sin(angle) * height * (almond ? Math.pow(Math.abs(Math.sin(angle)), .3) : 1);
    vertices.push(x, y, faceZ(cx + x, cy + y) + lift);
    if (i < segments) indices.push(0, i + 1, i + 2);
  }
  return surfaceGeometry(vertices, indices);
}

/** Closed, tapered oval lock with a curved centerline, not a stack of hair spheres. */
function hairLock(points: XYZ[], width: number, depth: number, segments: number, sides: number) {
  const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)));
  const vertices: number[] = [];
  const indices: number[] = [];
  const normal = new Vector3();
  const binormal = new Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    normal.set(-tangent.y, tangent.x, 0).normalize();
    if (normal.lengthSq() < .1) normal.set(1, 0, 0);
    binormal.crossVectors(tangent, normal).normalize();
    const taper = Math.pow(Math.sin(Math.PI * t), .64) * (1 - .32 * t) + .008;
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;
      const vertex = point.clone().addScaledVector(normal, Math.cos(a) * width * taper)
        .addScaledVector(binormal, Math.sin(a) * depth * taper);
      vertices.push(vertex.x, vertex.y, vertex.z);
      if (i < segments && j < sides) {
        const k = i * (sides + 1) + j;
        indices.push(k, k + 1, k + sides + 1, k + 1, k + sides + 2, k + sides + 1);
      }
    }
  }
  return surfaceGeometry(vertices, indices);
}

function createGeometry(high: boolean) {
  const radial = high ? 28 : 18;
  const vertical = high ? 20 : 14;
  const sphere = new SphereGeometry(1, radial, vertical);
  const detail = new SphereGeometry(1, high ? 16 : 12, high ? 10 : 8);
  const limb = new CapsuleGeometry(1, 2, high ? 8 : 5, high ? 20 : 12);
  const bibShape=new Shape();
  bibShape.moveTo(-.075,.13);bibShape.lineTo(.075,.13);bibShape.quadraticCurveTo(.095,.13,.096,.105);
  bibShape.lineTo(.108,-.11);bibShape.quadraticCurveTo(.108,-.135,.083,-.135);
  bibShape.lineTo(-.083,-.135);bibShape.quadraticCurveTo(-.108,-.135,-.108,-.11);
  bibShape.lineTo(-.096,.105);bibShape.quadraticCurveTo(-.095,.13,-.075,.13);
  const bib=new ShapeGeometry(bibShape,high?12:8),bibPoints=bib.getAttribute('position');
  for(let i=0;i<bibPoints.count;i++){const x=bibPoints.getX(i);bibPoints.setZ(i,.119*Math.sqrt(Math.max(.1,1-(x/.18)**2))+.007);}
  bib.computeVertexNormals();
  const head = new SphereGeometry(1, radial + 8, vertical + 6);
  const positions = head.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const jaw = 1 + Math.min(0, y) * .19;
    positions.setXYZ(i, positions.getX(i) * .23 * jaw, y * .255, positions.getZ(i) * .205);
  }
  head.computeVertexNormals();
  // Scalp hem rises over the forehead, falls around the temples and back.
  const capVertices: number[] = [];
  const capIndices: number[] = [];
  for (let y = 0; y <= vertical; y++) {
    for (let x = 0; x <= radial; x++) {
      const phi = x / radial * Math.PI * 2;
      const front = Math.max(0, Math.cos(phi));
      const theta = y / vertical * (2.05 - .96 * front ** 3);
      capVertices.push(.243 * Math.sin(theta) * Math.sin(phi), .279 * Math.cos(theta) + .014, .222 * Math.sin(theta) * Math.cos(phi) - .008);
      if (y < vertical && x < radial) {
        const k = y * (radial + 1) + x;
        capIndices.push(k, k + radial + 1, k + 1, k + 1, k + radial + 1, k + radial + 2);
      }
    }
  }
  const cap = surfaceGeometry(capVertices, capIndices);
  const torso = new LatheGeometry([
    new Vector2(0, -.04), new Vector2(.125, -.035), new Vector2(.164, 0),
    new Vector2(.171, .14), new Vector2(.185, .29), new Vector2(.177, .365),
    new Vector2(.13, .425), new Vector2(.072, .45), new Vector2(0, .45),
  ], radial);
  const skirt = new LatheGeometry([
    new Vector2(0, -.186), new Vector2(.206, -.186), new Vector2(.226, -.172),
    new Vector2(.225, -.14), new Vector2(.199, -.025), new Vector2(.164, .12),
    new Vector2(.129, .205), new Vector2(0, .205),
  ], radial);
  const ring = new TorusGeometry(1, .034, high ? 8 : 6, radial);
  const collar = new TorusGeometry(.074, .018, 8, radial);
  const eyeSegments = high ? 40 : 28;
  const eye = [-1, 1].map(side => {
    const x = side * .089, y = .025;
    const line = (points: XYZ[], radius: number) => new TubeGeometry(
      new CatmullRomCurve3(points.map(([px, py, pz]) => new Vector3(px, py, faceZ(x + px, y + py) + pz))),
      high ? 20 : 12, radius, 5, false,
    );
    return {
      white: facePatch(x, y, .061, .034, .004, true, eyeSegments),
      irisRim: facePatch(x, y, .027, .031, .007, false, eyeSegments),
      iris: facePatch(x, y - .003, .023, .027, .009, false, eyeSegments),
      glow: facePatch(x, y - .015, .017, .011, .011, false, eyeSegments),
      pupil: facePatch(x, y + .004, .011, .019, .013, false, eyeSegments),
      upper: line([[-.061, 0, .008], [-.034, .027, .008], [.008, .035, .008], [.046, .021, .008], [.064, .007, .008]], .0045),
      lower: line([[-.054, -.008, .006], [0, -.032, .006], [.054, -.008, .006]], .002),
      brow: line([[-.052, .062, .005], [-.013, .072, .005], [.036, .062, .005]], .005),
      lash: line([[side * .05, .016, .009], [side * .071, .026, .009]], .003),
      blush: facePatch(side * .139, -.057, .031, .013, .003, false, eyeSegments),
    };
  });
  const faceLine = (points: XYZ[], radius: number) => new TubeGeometry(
    new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, faceZ(x, y) + z))),
    high ? 22 : 14, radius, 6, false,
  );
  const smile = faceLine([[-.034, -.095, .006], [0, -.105, .006], [.034, -.095, .006]], .0035);
  const lip = faceLine([[-.014, -.115, .003], [0, -.117, .003], [.014, -.115, .003]], .002);
  const seam = new TubeGeometry(new CatmullRomCurve3([
    new Vector3(0, .325, .116), new Vector3(0, .2, .113), new Vector3(0, .025, .108),
  ]), 12, .006, 5, false);
  const maleLocks = [
    [[-.16, .205, .125], [-.085, .205, .205], [.035, .125, .222], [.115, .067, .175]],
    [[-.09, .252, .082], [.025, .226, .183], [.13, .15, .196], [.19, .063, .115]],
    [[-.205, .155, .09], [-.17, .143, .188], [-.075, .09, .218], [-.015, .063, .202]],
    [[-.035, .268, .028], [.1, .231, .11], [.198, .128, .115], [.226, .023, .055]],
    [[-.23, .09, .025], [-.225, .024, .102], [-.203, -.065, .109], [-.196, -.11, .069]],
    [[.225, .103, .026], [.231, .025, .065], [.213, -.057, .087], [.202, -.095, .065]],
  ] as XYZ[][];
  const femaleLocks = [
    [[-.07, .251, .09], [.04, .224, .18], [.155, .139, .193], [.211, .015, .118]],
    [[-.048, .246, .112], [-.116, .191, .194], [-.18, .093, .17], [-.211, -.09, .109]],
    [[.015, .267, .04], [.148, .215, .108], [.223, .084, .092], [.237, -.096, .015]],
    [[-.202, .13, .027], [-.246, -.019, .056], [-.249, -.197, .092], [-.207, -.351, .078]],
    [[.211, .115, .019], [.248, -.047, .069], [.263, -.229, .071], [.206, -.365, .093]],
    [[-.16, .062, -.131], [-.225, -.102, -.103], [-.212, -.279, -.047], [-.161, -.344, .008]],
    [[.161, .063, -.13], [.222, -.124, -.12], [.214, -.281, -.052], [.165, -.347, -.004]],
    [[0, .098, -.208], [0, -.07, -.227], [.015, -.229, -.174], [0, -.33, -.086]],
  ] as XYZ[][];
  const locks = (points: XYZ[][], female: boolean) => points.map((p, i) => hairLock(p, female && i > 2 ? .064 : .056, female && i > 2 ? .038 : .027, high ? 18 : 12, high ? 10 : 7));
  return {sphere, detail, limb, bib, head, cap, torso, skirt, ring, collar, eye, smile, lip, seam,
    maleLocks: locks(maleLocks, false), femaleLocks: locks(femaleLocks, true)};
}

type Geometry = ReturnType<typeof createGeometry>;
function disposeGeometry(value: unknown) {
  if (value instanceof BufferGeometry) value.dispose();
  else if (Array.isArray(value)) value.forEach(disposeGeometry);
  else if (value && typeof value === 'object') Object.values(value).forEach(disposeGeometry);
}

function Piece({geometry, material, position, scale, rotation, shadow = true}: {
  geometry: BufferGeometry; material: MeshStandardMaterial;
  position?: XYZ; scale?: XYZ; rotation?: XYZ; shadow?: boolean;
}) {
  return <mesh geometry={geometry} material={material} position={position} scale={scale} rotation={rotation} castShadow={shadow} receiveShadow={shadow} dispose={null}/>;
}

function Eye({side, geometry, materials, eyeRef, female}: {
  side: number; geometry: Geometry; materials: Materials;
  eyeRef: React.RefObject<Group | null>; female: boolean;
}) {
  const x = side * .089;
  const eye = geometry.eye[side < 0 ? 0 : 1];
  return <>
    <group ref={eyeRef} position={[x, .025, 0]}>
      <Piece geometry={eye.white} material={materials.white} shadow={false}/>
      <Piece geometry={eye.irisRim} material={materials.irisDark} shadow={false}/>
      <Piece geometry={eye.iris} material={materials.iris} position={[0, -.003, 0]} shadow={false}/>
      <Piece geometry={eye.glow} material={materials.irisLight} position={[0, -.015, 0]} shadow={false}/>
      <Piece geometry={eye.pupil} material={materials.pupil} position={[0, .004, 0]} shadow={false}/>
      <Piece geometry={eye.upper} material={materials.eyeRim} shadow={false}/>
      <Piece geometry={eye.lower} material={materials.eyeRim} shadow={false}/>
      {female && <Piece geometry={eye.lash} material={materials.eyeRim} shadow={false}/>}
      <Piece geometry={geometry.detail} material={materials.white} position={[-.009, .014, faceZ(x - .009, .039) + .016]} scale={[.008, .009, .003]} shadow={false}/>
      <Piece geometry={geometry.detail} material={materials.white} position={[.011, -.012, faceZ(x + .011, .013) + .014]} scale={[.0035, .004, .002]} shadow={false}/>
    </group>
    <Piece geometry={eye.brow} material={materials.hairDark} position={[x, .025, 0]} shadow={false}/>
    <Piece geometry={eye.blush} material={materials.blush} position={[side * .139, -.057, 0]} shadow={false}/>
  </>;
}

/** Original procedural cottage residents: no downloaded meshes, textures, or VRM rig. */
export default function StorybookModel({appearance, action, quality}: Props) {
  const female = appearance.gender === 'female';
  const geometry = useMemo(() => createGeometry(quality === 'high'), [quality]);
  const palette = useMemo(() => storybookPalette(appearance), [appearance]);
  const materials = useMemo(() => Object.fromEntries(Object.entries(palette).map(([key, color]) => [key,
    new MeshStandardMaterial({color, roughness: key === 'iris' || key === 'pupil' ? .38 : .83, metalness: 0}),
  ])) as Materials, [palette]);
  useEffect(() => () => disposeGeometry(geometry), [geometry]);
  useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials]);
  const root = useRef<Group>(null);
  const chest = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftArm = useRef<Group>(null), rightArm = useRef<Group>(null);
  const leftElbow = useRef<Group>(null), rightElbow = useRef<Group>(null);
  const leftLeg = useRef<Group>(null), rightLeg = useRef<Group>(null);
  const leftKnee = useRef<Group>(null), rightKnee = useRef<Group>(null);
  const leftEye = useRef<Group>(null), rightEye = useRef<Group>(null);
  const pose = useRef({stride: 0, phase: 0, sit: 0, wave: 0, jump: 0, elapsed: 0});
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, .05);
    const p = pose.current;
    p.elapsed += dt;
    const frameAction:Action=root.current?.parent?.userData.characterAction??action;
    const moving = frameAction === 'walk' || frameAction === 'run';
    const running = frameAction === 'run';
    p.stride = MathUtils.damp(p.stride, moving ? (running ? .92 : .52) : 0, 10, dt);
    p.phase += dt * (running ? 12 : 7.4);
    p.sit = MathUtils.damp(p.sit, frameAction === 'sit' ? 1 : 0, 8, dt);
    p.wave = MathUtils.damp(p.wave, frameAction === 'wave' ? 1 : 0, 9, dt);
    p.jump = MathUtils.damp(p.jump, frameAction === 'jump' ? 1 : 0, 10, dt);
    const stride = Math.sin(p.phase) * p.stride * (1 - p.sit);
    const breath = Math.sin(p.elapsed * 2.1);
    if (root.current) {
      root.current.position.y = .72 - p.sit * .24 + Math.abs(Math.sin(p.phase)) * p.stride * .027;
      root.current.rotation.set(.025 * p.stride - .05 * p.sit, 0, Math.sin(p.elapsed * 1.35) * .012 * (1 - p.stride));
    }
    if (chest.current) {
      chest.current.scale.set(1 + breath * .004, 1 + breath * .007, 1 + breath * .009);
      chest.current.rotation.y = -stride * .07;
    }
    if (head.current) head.current.rotation.set(breath * .012 - p.sit * .04, Math.sin(p.elapsed * .73) * .037, Math.sin(p.elapsed * 1.1) * .018);
    if (leftLeg.current) leftLeg.current.rotation.x = -stride - p.sit * 1.4 - p.jump * .22;
    if (rightLeg.current) rightLeg.current.rotation.x = stride - p.sit * 1.4 - p.jump * .22;
    if (leftKnee.current) leftKnee.current.rotation.x = Math.max(0, stride) * .75 + p.sit * 1.5 + p.jump * .43;
    if (rightKnee.current) rightKnee.current.rotation.x = Math.max(0, -stride) * .75 + p.sit * 1.5 + p.jump * .43;
    if (leftArm.current) leftArm.current.rotation.set(stride * .72 - p.sit * .32 - p.jump * .35, 0, .12 + p.jump * .22);
    if (rightArm.current) rightArm.current.rotation.set(-stride * .72 - p.sit * .32, 0, -.12 - p.wave * 1.9 - p.jump * .22);
    if (leftElbow.current) leftElbow.current.rotation.x = -.08 - p.stride * .3 - p.sit * .28;
    if (rightElbow.current) rightElbow.current.rotation.set(-.08 - p.stride * .3 - p.wave * .18, 0, -p.wave * (.38 + Math.sin(p.elapsed * 9) * .27));
    // Short double blinks separated by a long open interval. No React state/frame allocations.
    const cycle = p.elapsed % 5.7;
    const blink = Math.max(0, 1 - Math.abs(cycle - 4.8) / .095, .82 * (1 - Math.abs(cycle - 5.05) / .075));
    const open = 1 - blink * .96;
    if (leftEye.current) leftEye.current.scale.y = open;
    if (rightEye.current) rightEye.current.scale.y = open;
  });
  const g = geometry, m = materials;
  const ball = (key: string, color: keyof Materials, position: XYZ, scale: XYZ, rotation?: XYZ) => <Piece key={key} geometry={Math.max(...scale) <= .052 ? g.detail : g.sphere} material={m[color]} position={position} scale={scale} rotation={rotation}/>;
  return <group ref={root} position={[0, .72, 0]} dispose={null}>
    {/* Independently articulated hips -> knees -> boots. */}
    {[-1, 1].map(side => <group key={`leg-${side}`} ref={side > 0 ? leftLeg : rightLeg} position={[side * .09, -.04, 0]}>
      <Piece geometry={g.limb} material={female?m.cream:m.trousers} position={[0,-.142,0]} scale={[female?.06:.075,.098,.07]}/>
      <group ref={side > 0 ? leftKnee : rightKnee} position={[0, -.29, 0]}>
        <Piece geometry={g.limb} material={female?m.cream:m.trousers} position={[0,-.108,0]} scale={[female?.052:.062,.083,.061]}/>
        {ball('knee',female?'cream':'trousers',[0,0,0],[female?.055:.065,.057,.062])}
        {female && <Piece geometry={g.ring} material={m.knit} position={[0, -.169, 0]} scale={[.062, .062, .062]} rotation={[Math.PI / 2, 0, 0]}/>}
        <group position={[0, -.26, 0]}>
          {ball('boot', 'boot', [0, -.042, .026], [.081, .078, .12])}
          {ball('sole', 'sole', [0, -.105, .034], [.085, .025, .123])}
          <Piece geometry={g.ring} material={m.knit} position={[0, .014, -.008]} scale={[.068, .068, .068]} rotation={[Math.PI / 2, 0, 0]}/>
          {ball('boot-seam', 'button', [0, -.045, .143], [.023, .004, .003])}
        </group>
      </group>
    </group>)}
    {female ? <>
      <Piece geometry={g.skirt} material={m.cloth} scale={[1, 1, .73]}/>
      <Piece geometry={g.ring} material={m.seam} position={[0, -.166, 0]} scale={[.222, .161, .16]} rotation={[Math.PI / 2, 0, 0]}/>
      {[-1, 1].map(side => ball(`pocket-${side}`, 'seam', [side * .122, -.002, .123], [.041, .046, .008], [0, side * .22, side * -.12]))}
    </> : ball('hips', 'trousers', [0, -.012, -.005], [.17, .12, .105])}
    <group ref={chest}>
      <Piece geometry={g.torso} material={female ? m.cream : m.cloth} scale={[female ? .9 : 1, 1, .65]}/>
      {female ? <>
        <Piece geometry={g.bib} material={m.cloth} position={[0,.175,0]}/>
        {[-1, 1].map(side => <group key={`strap-${side}`}>
          {ball('strap', 'cloth', [side * .098, .335, .097], [.024, .107, .018], [0, 0, side * .12])}
          {ball('strap-button', 'button', [side * .085, .276, .133], [.012, .013, .006])}
        </group>)}
        {ball('waistband', 'seam', [0, .055, .104], [.135, .015, .021])}
      </> : <>
        {ball('undershirt', 'cream', [0, .336, .105], [.09, .092, .016])}
        {[-1, 1].map(side => ball(`lapel-${side}`, 'seam', [side * .055, .322, .117], [.018, .096, .015], [0, 0, side * -.43]))}
        <Piece geometry={g.seam} material={m.seam}/>
        {[.245, .165, .085].map(y => ball(`button-${y}`, 'button', [.014, y, .124], [.01, .011, .006]))}
        {[-1, 1].map(side => ball(`pocket-${side}`, 'seam', [side * .109, .092, .093], [.037, .041, .011], [0, side * .3, 0]))}
      </>}
      <Piece geometry={g.collar} material={m.knit} position={[0, .432, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, .88, 1]}/>
      {ball('neck', 'skin', [0, .455, 0], [.061, .081, .061])}
      {[-1, 1].map(side => <group key={`arm-${side}`} ref={side > 0 ? leftArm : rightArm} position={[side * (female ? .18 : .203), .367, 0]} rotation={[0, 0, side * .12]}>
        <Piece geometry={g.limb} material={female?m.cream:m.cloth} position={[0,-.102,0]} scale={[female?.065:.07,.078,.069]}/>
        <group ref={side > 0 ? leftElbow : rightElbow} position={[0, -.213, 0]}>
          {ball('elbow',female?'cream':'cloth',[0,0,0],[.059,.059,.061])}
          <Piece geometry={g.limb} material={female?m.cream:m.cloth} position={[0,-.057,.002]} scale={[.057,.045,.058]}/>
          {ball('cuff', 'knit', [0, -.119, .002], [.065, .028, .065])}
          {ball('hand', 'skin', [0, -.177, .008], [.045, .061, .045])}
          {ball('thumb', 'skin', [-side * .034, -.16, .025], [.023, .031, .024], [0, 0, side * -.3])}
        </group>
      </group>)}
      <group ref={head} position={[0, .48, 0]}>
        <group position={[0, .26, 0]}>
          <Piece geometry={g.head} material={m.skin}/>
          {[-1, 1].map(side => <group key={`ear-${side}`} position={[side * .222, -.018, -.004]} rotation={[0, side * -.2, 0]}>
            {ball('ear', 'skin', [0, 0, 0], [.038, .052, .029])}
            {ball('inner-ear', 'ear', [side * .009, -.001, .024], [.017, .029, .006])}
          </group>)}
          <Eye side={-1} geometry={g} materials={m} eyeRef={leftEye} female={female}/>
          <Eye side={1} geometry={g} materials={m} eyeRef={rightEye} female={female}/>
          {ball('nose', 'skin', [0, -.04, .206], [.02, .027, .023])}
          <Piece geometry={g.smile} material={m.mouth} shadow={false}/>
          <Piece geometry={g.lip} material={m.blush} shadow={false}/>
          <Piece geometry={g.cap} material={m.hair}/>
          {(female ? g.femaleLocks : g.maleLocks).map((lock, index) => <Piece key={`lock-${index}`} geometry={lock} material={index === 0 || index === 3 ? m.hairLight : index > 5 ? m.hairDark : m.hair}/>)}
          {female && <group position={[-.225, -.075, .108]} rotation={[0, -.28, -.2]}>
            {ball('clip', 'button', [0, 0, 0], [.025, .008, .008])}
            {ball('clip-stud', 'cream', [0, 0, .007], [.006, .006, .004])}
          </group>}
        </group>
      </group>
    </group>
  </group>;
}
