/** Original short wood/latch synthesis, no downloaded samples and no background music. */
export function scheduleDoorSound(context:BaseAudioContext,active:boolean,when=context.currentTime+.005){
 const length=Math.ceil(context.sampleRate*.43),buffer=context.createBuffer(1,length,context.sampleRate),samples=buffer.getChannelData(0);let seed=572;
 for(let i=0;i<length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/4294967296*2-1);}
 const pulse=(time:number,duration:number,frequency:number,gain:number,q:number)=>{
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,time);filter.frequency.exponentialRampToValueAtTime(frequency*.72,time+duration);filter.Q.value=q;
  envelope.gain.setValueAtTime(.00001,time);envelope.gain.exponentialRampToValueAtTime(gain,time+.006);envelope.gain.exponentialRampToValueAtTime(.00001,time+duration);
  source.connect(filter).connect(envelope).connect(context.destination);source.start(time);source.stop(time+duration+.01);source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect();};
 };
 pulse(when,.045,1300,.06,.8); // small latch, never a UI notification chime
 pulse(when+.045,active?.25:.18,active?330:260,.022,3);
 if(!active){pulse(when+.29,.1,130,.14,.7);pulse(when+.32,.035,850,.035,.8);}
 return {start:when,end:when+(active?.31:.43)};
}
export function createDoorAudio(){
 if(typeof window==='undefined')return null;
 try{const Constructor=window.AudioContext??(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return Constructor?new Constructor({latencyHint:'interactive'}):null;}catch{return null;}
}
