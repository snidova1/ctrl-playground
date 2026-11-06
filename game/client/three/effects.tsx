'use client';
import {Bloom, EffectComposer, ToneMapping, Vignette, wrapEffect} from '@react-three/postprocessing';
import {Effect, ToneMappingMode} from 'postprocessing';

/**
 * Cozy grade: a little more saturation, contrast and brightness. Written by hand because the stock
 * HueSaturation pushed deep blues below zero, which tone mapping turned into black water on some
 * GPUs (AMD). Every step here stays non-negative and finite.
 */
class GradeEffect extends Effect {
  constructor() {
    super('CozyGrade', `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  if (c.r != c.r || c.g != c.g || c.b != c.b) c = vec3(0.0);
  c = max(c, vec3(0.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(l), c, 1.16), vec3(0.0));
  c = max((c - 0.5) * 1.07 + 0.52, vec3(0.0));
  outputColor = vec4(c, inputColor.a);
}`);
  }
}
const Grade = wrapEffect(GradeEffect);

/** Soft glow, lifted saturation and a gentle vignette: the dreamy cozy-sim grade. */
export function Effects({quality}: {quality: 'high' | 'low'}) {
  if (quality === 'low') return null;
  return <EffectComposer multisampling={4}>
    <Bloom intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.25} mipmapBlur />
    <Grade />
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    <Vignette offset={0.32} darkness={0.42} />
  </EffectComposer>;
}
