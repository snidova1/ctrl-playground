'use client';
import {Bloom, BrightnessContrast, EffectComposer, HueSaturation, ToneMapping, Vignette} from '@react-three/postprocessing';
import {ToneMappingMode} from 'postprocessing';

/** Soft glow, lifted saturation and a gentle vignette: the dreamy cozy-sim grade. */
export function Effects({quality}: {quality: 'high' | 'low'}) {
  if (quality === 'low') return null;
  return <EffectComposer multisampling={4}>
    <Bloom intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.25} mipmapBlur />
    <HueSaturation saturation={0.16} />
    <BrightnessContrast brightness={0.02} contrast={0.07} />
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    <Vignette offset={0.32} darkness={0.42} />
  </EffectComposer>;
}
