// Original WebGL adaptation of the normal/light-driven four-color ramp
// demonstrated in craftzdog/ghibli-style-shader/src/GhibliShader.js.
// No upstream shader source or unlicensed assets are copied.
export const GHIBLI_THRESHOLDS=[.22,.48,.75] as const;
export function ghibliBand(light:number){return GHIBLI_THRESHOLDS.filter(threshold=>light>=threshold).length;}
export const GHIBLI_RAMP_GLSL=`
vec3 habitGhibliRamp(float light){
 float a=smoothstep(${GHIBLI_THRESHOLDS[0]-.035},${GHIBLI_THRESHOLDS[0]+.035},light);
 float b=smoothstep(${GHIBLI_THRESHOLDS[1]-.035},${GHIBLI_THRESHOLDS[1]+.035},light);
 float c=smoothstep(${GHIBLI_THRESHOLDS[2]-.035},${GHIBLI_THRESHOLDS[2]+.035},light);
 vec3 shade=mix(vec3(.64,.78,.79),vec3(.80,.91,.79),a);
 shade=mix(shade,vec3(.98,1.02,.88),b);
 return mix(shade,vec3(1.12,1.08,.92),c);
}`;
