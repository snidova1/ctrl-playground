import {AnimationClip,Quaternion} from 'three';

/** The authored SitDown standing endpoint predates our relaxed Idle. Blend its
 * opening into the actual Idle stance, so the reversed StandUp ends on exactly
 * the same hips/leg/foot pose. Otherwise their crossfade briefly buries soles.
 * Retain the seated endpoint, timing, source assets and shared tracks. */
export function alignSitDownStandingPose(clips:AnimationClip[]):AnimationClip[]{
 const idle=clips.find(c=>c.name==='Idle');if(!idle)return clips;
 return clips.map(clip=>{
  if(clip.name!=='SitDown')return clip;
  const span=Math.min(.24,clip.duration*.25);
  const tracks=clip.tracks.map(track=>{
   const neutral=idle.tracks.find(t=>t.name===track.name),size=track.getValueSize();
   if(!neutral||!['quaternion','vector'].includes(track.ValueTypeName)||neutral.getValueSize()!==size)return track.clone();
   const source=track.InterpolantFactoryMethodLinear(),standing=neutral.InterpolantFactoryMethodLinear().evaluate(0).slice();
   const times=Array.from(new Set([0,span*.25,span*.5,span*.75,span,...track.times])).sort((a,b)=>a-b),values:number[]=[];
   for(const time of times){
    const original=source.evaluate(time),t=Math.min(1,time/span),weight=t*t*(3-2*t);
    if(size===4&&track.ValueTypeName==='quaternion')new Quaternion().fromArray(standing).slerp(new Quaternion().fromArray(original),weight).toArray(values,values.length);
    else for(let i=0;i<size;i++)values.push(standing[i]+(original[i]-standing[i])*weight);
   }
   const result=track.clone();result.times=new Float32Array(times);result.values=new Float32Array(values);return result;
  });
  return new AnimationClip(clip.name,clip.duration,tracks);
 });
}
