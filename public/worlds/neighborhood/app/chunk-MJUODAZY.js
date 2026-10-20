import{$a as qt,Aa as Xt,Ca as L,Da as Z,Ea as M,Fa as _,Ga as D,Lb as Jt,Oa as C,Pa as ge,Ra as J,Sa as B,Ta as Qt,Ua as ke,Va as I,Xa as U,Ya as We,Zb as je,_a as Yt,a as _e,ac as Kt,cb as F,cc as se,eb as ze,fb as Ge,ga as jt,gb as $t,i as Gt,j as Fe,jb as re,nb as Y,ob as Zt,pb as oe}from"./chunk-K2U4MBUW.js";var Ae=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),A=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),en=class extends J{constructor(e){super(),this.weight=0,this.isBinary=!1,this.overrideBlink="none",this.overrideLookAt="none",this.overrideMouth="none",this._binds=[],this.name=`VRMExpression_${e}`,this.expressionName=e,this.type="VRMExpression",this.visible=!1}get binds(){return this._binds}get overrideBlinkAmount(){return this.overrideBlink==="block"?0<this.outputWeight?1:0:this.overrideBlink==="blend"?this.outputWeight:0}get overrideLookAtAmount(){return this.overrideLookAt==="block"?0<this.outputWeight?1:0:this.overrideLookAt==="blend"?this.outputWeight:0}get overrideMouthAmount(){return this.overrideMouth==="block"?0<this.outputWeight?1:0:this.overrideMouth==="blend"?this.outputWeight:0}get outputWeight(){return this.isBinary?this.weight>.5?1:0:this.weight}addBind(e){this._binds.push(e)}deleteBind(e){let t=this._binds.indexOf(e);t>=0&&this._binds.splice(t,1)}applyWeight(e){var t;let n=this.outputWeight;n*=(t=e?.multiplier)!=null?t:1,this.isBinary&&n<1&&(n=0),this._binds.forEach(i=>i.applyWeight(n))}clearAppliedWeight(){this._binds.forEach(e=>e.clearAppliedWeight())}};function Nn(e,t,n){var i,r;let o=e.parser.json,a=(i=o.nodes)==null?void 0:i[t];if(a==null)return console.warn(`extractPrimitivesInternal: Attempt to use nodes[${t}] of glTF but the node doesn't exist`),null;let l=a.mesh;if(l==null)return null;let s=(r=o.meshes)==null?void 0:r[l];if(s==null)return console.warn(`extractPrimitivesInternal: Attempt to use meshes[${l}] of glTF but the mesh doesn't exist`),null;let u=s.primitives.length,d=[];return n.traverse(h=>{d.length<u&&h.isMesh&&d.push(h)}),d}function tn(e,t){return A(this,null,function*(){let n=yield e.parser.getDependency("node",t);return Nn(e,t,n)})}function nn(e){return A(this,null,function*(){let t=yield e.parser.getDependencies("node"),n=new Map;return t.forEach((i,r)=>{let o=Nn(e,r,i);o!=null&&n.set(r,o)}),n})}var rt={Aa:"aa",Ih:"ih",Ou:"ou",Ee:"ee",Oh:"oh",Blink:"blink",Happy:"happy",Angry:"angry",Sad:"sad",Relaxed:"relaxed",LookUp:"lookUp",Surprised:"surprised",LookDown:"lookDown",LookLeft:"lookLeft",LookRight:"lookRight",BlinkLeft:"blinkLeft",BlinkRight:"blinkRight",Neutral:"neutral"};function Bn(e){return Math.max(Math.min(e,1),0)}var rn=class Dn{constructor(){this.blinkExpressionNames=["blink","blinkLeft","blinkRight"],this.lookAtExpressionNames=["lookLeft","lookRight","lookUp","lookDown"],this.mouthExpressionNames=["aa","ee","ih","oh","ou"],this._expressions=[],this._expressionMap={}}get expressions(){return this._expressions.concat()}get expressionMap(){return Object.assign({},this._expressionMap)}get presetExpressionMap(){let t={},n=new Set(Object.values(rt));return Object.entries(this._expressionMap).forEach(([i,r])=>{n.has(i)&&(t[i]=r)}),t}get customExpressionMap(){let t={},n=new Set(Object.values(rt));return Object.entries(this._expressionMap).forEach(([i,r])=>{n.has(i)||(t[i]=r)}),t}copy(t){return this._expressions.concat().forEach(i=>{this.unregisterExpression(i)}),t._expressions.forEach(i=>{this.registerExpression(i)}),this.blinkExpressionNames=t.blinkExpressionNames.concat(),this.lookAtExpressionNames=t.lookAtExpressionNames.concat(),this.mouthExpressionNames=t.mouthExpressionNames.concat(),this}clone(){return new Dn().copy(this)}getExpression(t){var n;return(n=this._expressionMap[t])!=null?n:null}registerExpression(t){this._expressions.push(t),this._expressionMap[t.expressionName]=t}unregisterExpression(t){let n=this._expressions.indexOf(t);n===-1&&console.warn("VRMExpressionManager: The specified expressions is not registered"),this._expressions.splice(n,1),delete this._expressionMap[t.expressionName]}getValue(t){var n;let i=this.getExpression(t);return(n=i?.weight)!=null?n:null}setValue(t,n){let i=this.getExpression(t);i&&(i.weight=Bn(n))}resetValues(){this._expressions.forEach(t=>{t.weight=0})}getExpressionTrackName(t){let n=this.getExpression(t);return n?`${n.name}.weight`:null}update(){let t=this._calculateWeightMultipliers();this._expressions.forEach(n=>{n.clearAppliedWeight()}),this._expressions.forEach(n=>{let i=1,r=n.expressionName;this.blinkExpressionNames.indexOf(r)!==-1&&(i*=t.blink),this.lookAtExpressionNames.indexOf(r)!==-1&&(i*=t.lookAt),this.mouthExpressionNames.indexOf(r)!==-1&&(i*=t.mouth),n.applyWeight({multiplier:i})})}_calculateWeightMultipliers(){let t=1,n=1,i=1;return this._expressions.forEach(r=>{t-=r.overrideBlinkAmount,n-=r.overrideLookAtAmount,i-=r.overrideMouthAmount}),t=Math.max(0,t),n=Math.max(0,n),i=Math.max(0,i),{blink:t,lookAt:n,mouth:i}}},ve={Color:"color",EmissionColor:"emissionColor",ShadeColor:"shadeColor",MatcapColor:"matcapColor",RimColor:"rimColor",OutlineColor:"outlineColor"},Oi={_Color:ve.Color,_EmissionColor:ve.EmissionColor,_ShadeColor:ve.ShadeColor,_RimColor:ve.RimColor,_OutlineColor:ve.OutlineColor},Ci=new B,Fn=class kn{constructor({material:t,type:n,targetValue:i,targetAlpha:r}){this.material=t,this.type=n,this.targetValue=i,this.targetAlpha=r??1;let o=this._initColorBindState(),a=this._initAlphaBindState();this._state={color:o,alpha:a}}applyWeight(t){let{color:n,alpha:i}=this._state;if(n!=null){let{propertyName:r,deltaValue:o}=n,a=this.material[r];a?.add(Ci.copy(o).multiplyScalar(t))}if(i!=null){let{propertyName:r,deltaValue:o}=i;this.material[r]!=null&&(this.material[r]+=o*t)}}clearAppliedWeight(){let{color:t,alpha:n}=this._state;if(t!=null){let{propertyName:i,initialValue:r}=t,o=this.material[i];o?.copy(r)}if(n!=null){let{propertyName:i,initialValue:r}=n;this.material[i]!=null&&(this.material[i]=r)}}_initColorBindState(){var t,n,i;let{material:r,type:o,targetValue:a}=this,l=this._getPropertyNameMap(),s=(n=(t=l?.[o])==null?void 0:t[0])!=null?n:null;if(s==null)return console.warn(`Tried to add a material color bind to the material ${(i=r.name)!=null?i:"(no name)"}, the type ${o} but the material or the type is not supported.`),null;let d=r[s].clone(),h=new B(a.r-d.r,a.g-d.g,a.b-d.b);return{propertyName:s,initialValue:d,deltaValue:h}}_initAlphaBindState(){var t,n,i;let{material:r,type:o,targetAlpha:a}=this,l=this._getPropertyNameMap(),s=(n=(t=l?.[o])==null?void 0:t[1])!=null?n:null;if(s==null&&a!==1)return console.warn(`Tried to add a material alpha bind to the material ${(i=r.name)!=null?i:"(no name)"}, the type ${o} but the material or the type does not support alpha.`),null;if(s==null)return null;let u=r[s],d=a-u;return{propertyName:s,initialValue:u,deltaValue:d}}_getPropertyNameMap(){var t,n;return(n=(t=Object.entries(kn._propertyNameMapMap).find(([i])=>this.material[i]===!0))==null?void 0:t[1])!=null?n:null}};Fn._propertyNameMapMap={isMeshStandardMaterial:{color:["color","opacity"],emissionColor:["emissive",null]},isMeshBasicMaterial:{color:["color","opacity"]},isMToonMaterial:{color:["color","opacity"],emissionColor:["emissive",null],outlineColor:["outlineColorFactor",null],matcapColor:["matcapFactor",null],rimColor:["parametricRimColorFactor",null],shadeColor:["shadeColorFactor",null]}};var on=Fn,Ue=class{constructor({primitives:e,index:t,weight:n}){this.primitives=e,this.index=t,this.weight=n}applyWeight(e){this.primitives.forEach(t=>{var n;((n=t.morphTargetInfluences)==null?void 0:n[this.index])!=null&&(t.morphTargetInfluences[this.index]+=this.weight*e)})}clearAppliedWeight(){this.primitives.forEach(e=>{var t;((t=e.morphTargetInfluences)==null?void 0:t[this.index])!=null&&(e.morphTargetInfluences[this.index]=0)})}},sn=new Z,Wn=class zn{constructor({material:t,scale:n,offset:i}){var r,o;this.material=t,this.scale=n,this.offset=i;let a=(r=Object.entries(zn._propertyNamesMap).find(([l])=>t[l]===!0))==null?void 0:r[1];a==null?(console.warn(`Tried to add a texture transform bind to the material ${(o=t.name)!=null?o:"(no name)"} but the material is not supported.`),this._properties=[]):(this._properties=[],a.forEach(l=>{var s;let u=(s=t[l])==null?void 0:s.clone();if(!u)return null;t[l]=u;let d=u.offset.clone(),h=u.repeat.clone(),c=i.clone().sub(d),p=n.clone().sub(h);this._properties.push({name:l,initialOffset:d,deltaOffset:c,initialScale:h,deltaScale:p})}))}applyWeight(t){this._properties.forEach(n=>{let i=this.material[n.name];i!==void 0&&(i.offset.add(sn.copy(n.deltaOffset).multiplyScalar(t)),i.repeat.add(sn.copy(n.deltaScale).multiplyScalar(t)))})}clearAppliedWeight(){this._properties.forEach(t=>{let n=this.material[t.name];n!==void 0&&(n.offset.copy(t.initialOffset),n.repeat.copy(t.initialScale))})}};Wn._propertyNamesMap={isMeshStandardMaterial:["map","emissiveMap","bumpMap","normalMap","displacementMap","roughnessMap","metalnessMap","alphaMap"],isMeshBasicMaterial:["map","specularMap","alphaMap"],isMToonMaterial:["map","normalMap","emissiveMap","shadeMultiplyTexture","rimMultiplyTexture","outlineWidthMultiplyTexture","uvAnimationMaskTexture"]};var an=Wn,Ni=new Set(["1.0","1.0-beta"]),Gn=class jn{get name(){return"VRMExpressionLoaderPlugin"}constructor(t){this.parser=t}afterRoot(t){return A(this,null,function*(){t.userData.vrmExpressionManager=yield this._import(t)})}_import(t){return A(this,null,function*(){let n=yield this._v1Import(t);if(n)return n;let i=yield this._v0Import(t);return i||null})}_v1Import(t){return A(this,null,function*(){var n,i;let r=this.parser.json;if(!(((n=r.extensionsUsed)==null?void 0:n.indexOf("VRMC_vrm"))!==-1))return null;let a=(i=r.extensions)==null?void 0:i.VRMC_vrm;if(!a)return null;let l=a.specVersion;if(!Ni.has(l))return console.warn(`VRMExpressionLoaderPlugin: Unknown VRMC_vrm specVersion "${l}"`),null;let s=a.expressions;if(!s)return null;let u=new Set(Object.values(rt)),d=new Map;s.preset!=null&&Object.entries(s.preset).forEach(([c,p])=>{if(p!=null){if(!u.has(c)){console.warn(`VRMExpressionLoaderPlugin: Unknown preset name "${c}" detected. Ignoring the expression`);return}d.set(c,p)}}),s.custom!=null&&Object.entries(s.custom).forEach(([c,p])=>{if(u.has(c)){console.warn(`VRMExpressionLoaderPlugin: Custom expression cannot have preset name "${c}". Ignoring the expression`);return}d.set(c,p)});let h=new rn;return yield Promise.all(Array.from(d.entries()).map(c=>A(this,[c],function*([p,m]){var f,g,v,x,w,y,R;let T=new en(p);if(t.scene.add(T),T.isBinary=(f=m.isBinary)!=null?f:!1,T.overrideBlink=(g=m.overrideBlink)!=null?g:"none",T.overrideLookAt=(v=m.overrideLookAt)!=null?v:"none",T.overrideMouth=(x=m.overrideMouth)!=null?x:"none",(w=m.morphTargetBinds)==null||w.forEach(S=>A(this,null,function*(){var P;if(S.node===void 0||S.index===void 0)return;let V=yield tn(t,S.node),b=S.index;if(!V.every(H=>Array.isArray(H.morphTargetInfluences)&&b<H.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${m.name} attempts to index morph #${b} but not found.`);return}T.addBind(new Ue({primitives:V,index:b,weight:(P=S.weight)!=null?P:1}))})),m.materialColorBinds||m.textureTransformBinds){let S=[];t.scene.traverse(P=>{let V=P.material;V&&(Array.isArray(V)?S.push(...V):S.push(V))}),(y=m.materialColorBinds)==null||y.forEach(P=>A(this,null,function*(){S.filter(b=>{var H;let O=(H=this.parser.associations.get(b))==null?void 0:H.materials;return P.material===O}).forEach(b=>{T.addBind(new on({material:b,type:P.type,targetValue:new B().fromArray(P.targetValue),targetAlpha:P.targetValue[3]}))})})),(R=m.textureTransformBinds)==null||R.forEach(P=>A(this,null,function*(){S.filter(b=>{var H;let O=(H=this.parser.associations.get(b))==null?void 0:H.materials;return P.material===O}).forEach(b=>{var H,O;T.addBind(new an({material:b,offset:new Z().fromArray((H=P.offset)!=null?H:[0,0]),scale:new Z().fromArray((O=P.scale)!=null?O:[1,1])}))})}))}h.registerExpression(T)}))),h})}_v0Import(t){return A(this,null,function*(){var n;let i=this.parser.json,r=(n=i.extensions)==null?void 0:n.VRM;if(!r)return null;let o=r.blendShapeMaster;if(!o)return null;let a=new rn,l=o.blendShapeGroups;if(!l)return a;let s=new Set;return yield Promise.all(l.map(u=>A(this,null,function*(){var d;let h=u.presetName,c=h!=null&&jn.v0v1PresetNameMap[h]||null,p=c??u.name;if(p==null){console.warn("VRMExpressionLoaderPlugin: One of custom expressions has no name. Ignoring the expression");return}if(s.has(p)){console.warn(`VRMExpressionLoaderPlugin: An expression preset ${h} has duplicated entries. Ignoring the expression`);return}s.add(p);let m=new en(p);t.scene.add(m),m.isBinary=(d=u.isBinary)!=null?d:!1,u.binds&&u.binds.forEach(g=>A(this,null,function*(){var v;if(g.mesh===void 0||g.index===void 0)return;let x=[];if((v=i.nodes)==null||v.forEach((y,R)=>{y.mesh===g.mesh&&x.push(R)}),x.length===0){console.warn(`VRMExpressionLoaderPlugin: ${u.name} attempts to bind a morph target to the mesh #${g.mesh} but the mesh is not found or not used in the scene. Ignoring the bind.`);return}let w=g.index;yield Promise.all(x.map(y=>A(this,null,function*(){var R;let T=yield tn(t,y);if(!T.every(S=>Array.isArray(S.morphTargetInfluences)&&w<S.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${u.name} attempts to index ${w}th morph but not found.`);return}m.addBind(new Ue({primitives:T,index:w,weight:.01*((R=g.weight)!=null?R:100)}))})))}));let f=u.materialValues;f&&f.length!==0&&f.forEach(g=>{if(g.materialName===void 0||g.propertyName===void 0||g.targetValue===void 0)return;let v=[];t.scene.traverse(w=>{if(w.material){let y=w.material;Array.isArray(y)?v.push(...y.filter(R=>(R.name===g.materialName||R.name===g.materialName+" (Outline)")&&v.indexOf(R)===-1)):y.name===g.materialName&&v.indexOf(y)===-1&&v.push(y)}});let x=g.propertyName;v.forEach(w=>{if(x==="_MainTex_ST"){let R=new Z(g.targetValue[0],g.targetValue[1]),T=new Z(g.targetValue[2],g.targetValue[3]);T.y=1-T.y-R.y,m.addBind(new an({material:w,scale:R,offset:T}));return}let y=Oi[x];if(y){m.addBind(new on({material:w,type:y,targetValue:new B().fromArray(g.targetValue),targetAlpha:g.targetValue[3]}));return}console.warn(x+" is not supported")})}),a.registerExpression(m)}))),a})}};Gn.v0v1PresetNameMap={a:"aa",e:"ee",i:"ih",o:"oh",u:"ou",blink:"blink",joy:"happy",angry:"angry",sorrow:"sad",fun:"relaxed",lookup:"lookUp",lookdown:"lookDown",lookleft:"lookLeft",lookright:"lookRight",blink_l:"blinkLeft",blink_r:"blinkRight",neutral:"neutral"};var Bi=Gn;var dt=class de{constructor(t,n){this._firstPersonOnlyLayer=de.DEFAULT_FIRSTPERSON_ONLY_LAYER,this._thirdPersonOnlyLayer=de.DEFAULT_THIRDPERSON_ONLY_LAYER,this._initializedLayers=!1,this.humanoid=t,this.meshAnnotations=n}copy(t){if(this.humanoid!==t.humanoid)throw new Error("VRMFirstPerson: humanoid must be same in order to copy");return this.meshAnnotations=t.meshAnnotations.map(n=>({meshes:n.meshes.concat(),type:n.type})),this}clone(){return new de(this.humanoid,this.meshAnnotations).copy(this)}get firstPersonOnlyLayer(){return this._firstPersonOnlyLayer}get thirdPersonOnlyLayer(){return this._thirdPersonOnlyLayer}setup({firstPersonOnlyLayer:t=de.DEFAULT_FIRSTPERSON_ONLY_LAYER,thirdPersonOnlyLayer:n=de.DEFAULT_THIRDPERSON_ONLY_LAYER}={}){this._initializedLayers||(this._firstPersonOnlyLayer=t,this._thirdPersonOnlyLayer=n,this.meshAnnotations.forEach(i=>{i.meshes.forEach(r=>{i.type==="firstPersonOnly"?(r.layers.set(this._firstPersonOnlyLayer),r.traverse(o=>o.layers.set(this._firstPersonOnlyLayer))):i.type==="thirdPersonOnly"?(r.layers.set(this._thirdPersonOnlyLayer),r.traverse(o=>o.layers.set(this._thirdPersonOnlyLayer))):i.type==="auto"&&this._createHeadlessModel(r)})}),this._initializedLayers=!0)}_excludeTriangles(t,n,i,r){let o=0;if(n!=null&&n.length>0)for(let a=0;a<t.length;a+=3){let l=t[a],s=t[a+1],u=t[a+2],d=n[l],h=i[l];if(d[0]>0&&r.includes(h[0])||d[1]>0&&r.includes(h[1])||d[2]>0&&r.includes(h[2])||d[3]>0&&r.includes(h[3]))continue;let c=n[s],p=i[s];if(c[0]>0&&r.includes(p[0])||c[1]>0&&r.includes(p[1])||c[2]>0&&r.includes(p[2])||c[3]>0&&r.includes(p[3]))continue;let m=n[u],f=i[u];m[0]>0&&r.includes(f[0])||m[1]>0&&r.includes(f[1])||m[2]>0&&r.includes(f[2])||m[3]>0&&r.includes(f[3])||(t[o++]=l,t[o++]=s,t[o++]=u)}return o}_createErasedMesh(t,n){let i=new $t(t.geometry.clone(),t.material);i.name=`${t.name}(erase)`,i.frustumCulled=t.frustumCulled,i.layers.set(this._firstPersonOnlyLayer);let r=i.geometry,o=r.getAttribute("skinIndex"),a=o instanceof je?[]:o.array,l=[];for(let f=0;f<a.length;f+=4)l.push([a[f],a[f+1],a[f+2],a[f+3]]);let s=r.getAttribute("skinWeight"),u=s instanceof je?[]:s.array,d=[];for(let f=0;f<u.length;f+=4)d.push([u[f],u[f+1],u[f+2],u[f+3]]);let h=r.getIndex();if(!h)throw new Error("The geometry doesn't have an index buffer");let c=Array.from(h.array),p=this._excludeTriangles(c,d,l,n),m=[];for(let f=0;f<p;f++)m[f]=c[f];return r.setIndex(m),t.onBeforeRender&&(i.onBeforeRender=t.onBeforeRender),i.bind(new re(t.skeleton.bones,t.skeleton.boneInverses),new C),i}_createHeadlessModelForSkinnedMesh(t,n){let i=[];if(n.skeleton.bones.forEach((o,a)=>{this._isEraseTarget(o)&&i.push(a)}),!i.length){n.layers.enable(this._thirdPersonOnlyLayer),n.layers.enable(this._firstPersonOnlyLayer);return}n.layers.set(this._thirdPersonOnlyLayer);let r=this._createErasedMesh(n,i);t.add(r)}_createHeadlessModel(t){if(t.type==="Group")if(t.layers.set(this._thirdPersonOnlyLayer),this._isEraseTarget(t))t.traverse(n=>n.layers.set(this._thirdPersonOnlyLayer));else{let n=new F;n.name=`_headless_${t.name}`,n.layers.set(this._firstPersonOnlyLayer),t.parent.add(n),t.children.filter(i=>i.type==="SkinnedMesh").forEach(i=>{let r=i;this._createHeadlessModelForSkinnedMesh(n,r)})}else if(t.type==="SkinnedMesh"){let n=t;this._createHeadlessModelForSkinnedMesh(t.parent,n)}else this._isEraseTarget(t)&&(t.layers.set(this._thirdPersonOnlyLayer),t.traverse(n=>n.layers.set(this._thirdPersonOnlyLayer)))}_isEraseTarget(t){return t===this.humanoid.getRawBoneNode("head")?!0:t.parent?this._isEraseTarget(t.parent):!1}};dt.DEFAULT_FIRSTPERSON_ONLY_LAYER=9;dt.DEFAULT_THIRDPERSON_ONLY_LAYER=10;var ln=dt,Di=new Set(["1.0","1.0-beta"]),Fi=class{get name(){return"VRMFirstPersonLoaderPlugin"}constructor(e){this.parser=e}afterRoot(e){return A(this,null,function*(){let t=e.userData.vrmHumanoid;if(t!==null){if(t===void 0)throw new Error("VRMFirstPersonLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");e.userData.vrmFirstPerson=yield this._import(e,t)}})}_import(e,t){return A(this,null,function*(){if(t==null)return null;let n=yield this._v1Import(e,t);if(n)return n;let i=yield this._v0Import(e,t);return i||null})}_v1Import(e,t){return A(this,null,function*(){var n,i;let r=this.parser.json;if(!(((n=r.extensionsUsed)==null?void 0:n.indexOf("VRMC_vrm"))!==-1))return null;let a=(i=r.extensions)==null?void 0:i.VRMC_vrm;if(!a)return null;let l=a.specVersion;if(!Di.has(l))return console.warn(`VRMFirstPersonLoaderPlugin: Unknown VRMC_vrm specVersion "${l}"`),null;let s=a.firstPerson,u=[],d=yield nn(e);return Array.from(d.entries()).forEach(([h,c])=>{var p,m;let f=(p=s?.meshAnnotations)==null?void 0:p.find(g=>g.node===h);u.push({meshes:c,type:(m=f?.type)!=null?m:"auto"})}),new ln(t,u)})}_v0Import(e,t){return A(this,null,function*(){var n;let i=this.parser.json,r=(n=i.extensions)==null?void 0:n.VRM;if(!r)return null;let o=r.firstPerson;if(!o)return null;let a=[],l=yield nn(e);return Array.from(l.entries()).forEach(([s,u])=>{let d=i.nodes[s],h=o.meshAnnotations?o.meshAnnotations.find(c=>c.mesh===d.mesh):void 0;a.push({meshes:u,type:this._convertV0FlagToV1Type(h?.firstPersonFlag)})}),new ln(t,a)})}_convertV0FlagToV1Type(e){return e==="FirstPersonOnly"?"firstPersonOnly":e==="ThirdPersonOnly"?"thirdPersonOnly":e==="Both"?"both":"auto"}};var un=new _,dn=new _,ki=new M,hn=class extends F{constructor(e){super(),this.vrmHumanoid=e,this._boneAxesMap=new Map,Object.values(e.humanBones).forEach(t=>{let n=new Kt(1);n.matrixAutoUpdate=!1,n.material.depthTest=!1,n.material.depthWrite=!1,this.add(n),this._boneAxesMap.set(t,n)})}dispose(){Array.from(this._boneAxesMap.values()).forEach(e=>{e.geometry.dispose(),e.material.dispose()})}updateMatrixWorld(e){Array.from(this._boneAxesMap.entries()).forEach(([t,n])=>{t.node.updateWorldMatrix(!0,!1),t.node.matrixWorld.decompose(un,ki,dn);let i=un.set(.1,.1,.1).divide(dn);n.matrix.copy(t.node.matrixWorld).scale(i)}),super.updateMatrixWorld(e)}},Xe=["hips","spine","chest","upperChest","neck","head","leftEye","rightEye","jaw","leftUpperLeg","leftLowerLeg","leftFoot","leftToes","rightUpperLeg","rightLowerLeg","rightFoot","rightToes","leftShoulder","leftUpperArm","leftLowerArm","leftHand","rightShoulder","rightUpperArm","rightLowerArm","rightHand","leftThumbMetacarpal","leftThumbProximal","leftThumbDistal","leftIndexProximal","leftIndexIntermediate","leftIndexDistal","leftMiddleProximal","leftMiddleIntermediate","leftMiddleDistal","leftRingProximal","leftRingIntermediate","leftRingDistal","leftLittleProximal","leftLittleIntermediate","leftLittleDistal","rightThumbMetacarpal","rightThumbProximal","rightThumbDistal","rightIndexProximal","rightIndexIntermediate","rightIndexDistal","rightMiddleProximal","rightMiddleIntermediate","rightMiddleDistal","rightRingProximal","rightRingIntermediate","rightRingDistal","rightLittleProximal","rightLittleIntermediate","rightLittleDistal"];var Wi={hips:null,spine:"hips",chest:"spine",upperChest:"chest",neck:"upperChest",head:"neck",leftEye:"head",rightEye:"head",jaw:"head",leftUpperLeg:"hips",leftLowerLeg:"leftUpperLeg",leftFoot:"leftLowerLeg",leftToes:"leftFoot",rightUpperLeg:"hips",rightLowerLeg:"rightUpperLeg",rightFoot:"rightLowerLeg",rightToes:"rightFoot",leftShoulder:"upperChest",leftUpperArm:"leftShoulder",leftLowerArm:"leftUpperArm",leftHand:"leftLowerArm",rightShoulder:"upperChest",rightUpperArm:"rightShoulder",rightLowerArm:"rightUpperArm",rightHand:"rightLowerArm",leftThumbMetacarpal:"leftHand",leftThumbProximal:"leftThumbMetacarpal",leftThumbDistal:"leftThumbProximal",leftIndexProximal:"leftHand",leftIndexIntermediate:"leftIndexProximal",leftIndexDistal:"leftIndexIntermediate",leftMiddleProximal:"leftHand",leftMiddleIntermediate:"leftMiddleProximal",leftMiddleDistal:"leftMiddleIntermediate",leftRingProximal:"leftHand",leftRingIntermediate:"leftRingProximal",leftRingDistal:"leftRingIntermediate",leftLittleProximal:"leftHand",leftLittleIntermediate:"leftLittleProximal",leftLittleDistal:"leftLittleIntermediate",rightThumbMetacarpal:"rightHand",rightThumbProximal:"rightThumbMetacarpal",rightThumbDistal:"rightThumbProximal",rightIndexProximal:"rightHand",rightIndexIntermediate:"rightIndexProximal",rightIndexDistal:"rightIndexIntermediate",rightMiddleProximal:"rightHand",rightMiddleIntermediate:"rightMiddleProximal",rightMiddleDistal:"rightMiddleIntermediate",rightRingProximal:"rightHand",rightRingIntermediate:"rightRingProximal",rightRingDistal:"rightRingIntermediate",rightLittleProximal:"rightHand",rightLittleIntermediate:"rightLittleProximal",rightLittleDistal:"rightLittleIntermediate"};function Xn(e){return e.invert?e.invert():e.inverse(),e}var K=new _,ee=new M,ot=class{constructor(e){this.humanBones=e,this.restPose=this.getAbsolutePose()}getAbsolutePose(){let e={};return Object.keys(this.humanBones).forEach(t=>{let n=t,i=this.getBoneNode(n);i&&(K.copy(i.position),ee.copy(i.quaternion),e[n]={position:K.toArray(),rotation:ee.toArray()})}),e}getPose(){let e={};return Object.keys(this.humanBones).forEach(t=>{let n=t,i=this.getBoneNode(n);if(!i)return;K.set(0,0,0),ee.identity();let r=this.restPose[n];r?.position&&K.fromArray(r.position).negate(),r?.rotation&&Xn(ee.fromArray(r.rotation)),K.add(i.position),ee.premultiply(i.quaternion),e[n]={position:K.toArray(),rotation:ee.toArray()}}),e}setPose(e){Object.entries(e).forEach(([t,n])=>{let i=t,r=this.getBoneNode(i);if(!r)return;let o=this.restPose[i];o&&(n?.position&&(r.position.fromArray(n.position),o.position&&r.position.add(K.fromArray(o.position))),n?.rotation&&(r.quaternion.fromArray(n.rotation),o.rotation&&r.quaternion.multiply(ee.fromArray(o.rotation))))})}resetPose(){Object.entries(this.restPose).forEach(([e,t])=>{let n=this.getBoneNode(e);n&&(t?.position&&n.position.fromArray(t.position),t?.rotation&&n.quaternion.fromArray(t.rotation))})}getBone(e){var t;return(t=this.humanBones[e])!=null?t:void 0}getBoneNode(e){var t,n;return(n=(t=this.humanBones[e])==null?void 0:t.node)!=null?n:null}},Qe=new _,zi=new M,Gi=new _,cn=class Qn extends ot{static _setupTransforms(t){let n=new J;n.name="VRMHumanoidRig";let i={},r={},o={},a={};Xe.forEach(s=>{var u;let d=t.getBoneNode(s);if(d){let h=new _,c=new M;d.updateWorldMatrix(!0,!1),d.matrixWorld.decompose(h,c,Qe),i[s]=h,r[s]=c,o[s]=d.quaternion.clone();let p=new M;(u=d.parent)==null||u.matrixWorld.decompose(Qe,p,Qe),a[s]=p}});let l={};return Xe.forEach(s=>{var u;let d=t.getBoneNode(s);if(d){let h=i[s],c=s,p;for(;p==null&&(c=Wi[c],c!=null);)p=i[c];let m=new J;m.name="Normalized_"+d.name,(c?(u=l[c])==null?void 0:u.node:n).add(m),m.position.copy(h),p&&m.position.sub(p),l[s]={node:m}}}),{rigBones:l,root:n,parentWorldRotations:a,boneRotations:o}}constructor(t){let{rigBones:n,root:i,parentWorldRotations:r,boneRotations:o}=Qn._setupTransforms(t);super(n),this.original=t,this.root=i,this._parentWorldRotations=r,this._boneRotations=o}update(){Xe.forEach(t=>{let n=this.original.getBoneNode(t);if(n!=null){let i=this.getBoneNode(t),r=this._parentWorldRotations[t],o=zi.copy(r).invert(),a=this._boneRotations[t];if(n.quaternion.copy(i.quaternion).multiply(r).premultiply(o).multiply(a),t==="hips"){let l=i.getWorldPosition(Gi);n.parent.updateWorldMatrix(!0,!1);let s=n.parent.matrixWorld,u=l.applyMatrix4(s.invert());n.position.copy(u)}}})}},pn=class Yn{get restPose(){return console.warn("VRMHumanoid: restPose is deprecated. Use either rawRestPose or normalizedRestPose instead."),this.rawRestPose}get rawRestPose(){return this._rawHumanBones.restPose}get normalizedRestPose(){return this._normalizedHumanBones.restPose}get humanBones(){return this._rawHumanBones.humanBones}get rawHumanBones(){return this._rawHumanBones.humanBones}get normalizedHumanBones(){return this._normalizedHumanBones.humanBones}get normalizedHumanBonesRoot(){return this._normalizedHumanBones.root}constructor(t,n){var i;this.autoUpdateHumanBones=(i=n?.autoUpdateHumanBones)!=null?i:!0,this._rawHumanBones=new ot(t),this._normalizedHumanBones=new cn(this._rawHumanBones)}copy(t){return this.autoUpdateHumanBones=t.autoUpdateHumanBones,this._rawHumanBones=new ot(t.humanBones),this._normalizedHumanBones=new cn(this._rawHumanBones),this}clone(){return new Yn(this.humanBones,{autoUpdateHumanBones:this.autoUpdateHumanBones}).copy(this)}getAbsolutePose(){return console.warn("VRMHumanoid: getAbsolutePose() is deprecated. Use either getRawAbsolutePose() or getNormalizedAbsolutePose() instead."),this.getRawAbsolutePose()}getRawAbsolutePose(){return this._rawHumanBones.getAbsolutePose()}getNormalizedAbsolutePose(){return this._normalizedHumanBones.getAbsolutePose()}getPose(){return console.warn("VRMHumanoid: getPose() is deprecated. Use either getRawPose() or getNormalizedPose() instead."),this.getRawPose()}getRawPose(){return this._rawHumanBones.getPose()}getNormalizedPose(){return this._normalizedHumanBones.getPose()}setPose(t){return console.warn("VRMHumanoid: setPose() is deprecated. Use either setRawPose() or setNormalizedPose() instead."),this.setRawPose(t)}setRawPose(t){return this._rawHumanBones.setPose(t)}setNormalizedPose(t){return this._normalizedHumanBones.setPose(t)}resetPose(){return console.warn("VRMHumanoid: resetPose() is deprecated. Use either resetRawPose() or resetNormalizedPose() instead."),this.resetRawPose()}resetRawPose(){return this._rawHumanBones.resetPose()}resetNormalizedPose(){return this._normalizedHumanBones.resetPose()}getBone(t){return console.warn("VRMHumanoid: getBone() is deprecated. Use either getRawBone() or getNormalizedBone() instead."),this.getRawBone(t)}getRawBone(t){return this._rawHumanBones.getBone(t)}getNormalizedBone(t){return this._normalizedHumanBones.getBone(t)}getBoneNode(t){return console.warn("VRMHumanoid: getBoneNode() is deprecated. Use either getRawBoneNode() or getNormalizedBoneNode() instead."),this.getRawBoneNode(t)}getRawBoneNode(t){return this._rawHumanBones.getBoneNode(t)}getNormalizedBoneNode(t){return this._normalizedHumanBones.getBoneNode(t)}update(){this.autoUpdateHumanBones&&this._normalizedHumanBones.update()}},ji={Hips:"hips",Spine:"spine",Head:"head",LeftUpperLeg:"leftUpperLeg",LeftLowerLeg:"leftLowerLeg",LeftFoot:"leftFoot",RightUpperLeg:"rightUpperLeg",RightLowerLeg:"rightLowerLeg",RightFoot:"rightFoot",LeftUpperArm:"leftUpperArm",LeftLowerArm:"leftLowerArm",LeftHand:"leftHand",RightUpperArm:"rightUpperArm",RightLowerArm:"rightLowerArm",RightHand:"rightHand"},Xi=new Set(["1.0","1.0-beta"]),fn={leftThumbProximal:"leftThumbMetacarpal",leftThumbIntermediate:"leftThumbProximal",rightThumbProximal:"rightThumbMetacarpal",rightThumbIntermediate:"rightThumbProximal"},Qi=class{get name(){return"VRMHumanoidLoaderPlugin"}constructor(e,t){this.parser=e,this.helperRoot=t?.helperRoot,this.autoUpdateHumanBones=t?.autoUpdateHumanBones}afterRoot(e){return A(this,null,function*(){e.userData.vrmHumanoid=yield this._import(e)})}_import(e){return A(this,null,function*(){let t=yield this._v1Import(e);if(t)return t;let n=yield this._v0Import(e);return n||null})}_v1Import(e){return A(this,null,function*(){var t,n;let i=this.parser.json;if(!(((t=i.extensionsUsed)==null?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;let o=(n=i.extensions)==null?void 0:n.VRMC_vrm;if(!o)return null;let a=o.specVersion;if(!Xi.has(a))return console.warn(`VRMHumanoidLoaderPlugin: Unknown VRMC_vrm specVersion "${a}"`),null;let l=o.humanoid;if(!l)return null;let s=l.humanBones.leftThumbIntermediate!=null||l.humanBones.rightThumbIntermediate!=null,u={};l.humanBones!=null&&(yield Promise.all(Object.entries(l.humanBones).map(h=>A(this,[h],function*([c,p]){let m=c,f=p.node;if(s){let v=fn[m];v!=null&&(m=v)}let g=yield this.parser.getDependency("node",f);if(g==null){console.warn(`A glTF node bound to the humanoid bone ${m} (index = ${f}) does not exist`);return}u[m]={node:g}}))));let d=new pn(this._ensureRequiredBonesExist(u),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(e.scene.add(d.normalizedHumanBonesRoot),this.helperRoot){let h=new hn(d);this.helperRoot.add(h),h.renderOrder=this.helperRoot.renderOrder}return d})}_v0Import(e){return A(this,null,function*(){var t;let i=(t=this.parser.json.extensions)==null?void 0:t.VRM;if(!i)return null;let r=i.humanoid;if(!r)return null;let o={};r.humanBones!=null&&(yield Promise.all(r.humanBones.map(l=>A(this,null,function*(){let s=l.bone,u=l.node;if(s==null||u==null)return;if(u<0){console.warn(`A glTF node index for the humanoid bone ${s} is negative (${u}), ignoring this bone.`);return}let d=yield this.parser.getDependency("node",u);if(d==null){console.warn(`A glTF node bound to the humanoid bone ${s} (index = ${u}) does not exist`);return}let h=fn[s],c=h??s;if(o[c]!=null){console.warn(`Multiple bone entries for ${c} detected (index = ${u}), ignoring duplicated entries.`);return}o[c]={node:d}}))));let a=new pn(this._ensureRequiredBonesExist(o),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(e.scene.add(a.normalizedHumanBonesRoot),this.helperRoot){let l=new hn(a);this.helperRoot.add(l),l.renderOrder=this.helperRoot.renderOrder}return a})}_ensureRequiredBonesExist(e){let t=Object.values(ji).filter(n=>e[n]==null);if(t.length>0)throw new Error(`VRMHumanoidLoaderPlugin: These humanoid bones are required but not exist: ${t.join(", ")}`);return e}},mn=class extends U{constructor(){super(),this._currentTheta=0,this._currentRadius=0,this.theta=0,this.radius=0,this._currentTheta=0,this._currentRadius=0,this._attrPos=new I(new Float32Array(195),3),this.setAttribute("position",this._attrPos),this._attrIndex=new I(new Uint16Array(189),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentTheta!==this.theta&&(this._currentTheta=this.theta,e=!0),this._currentRadius!==this.radius&&(this._currentRadius=this.radius,e=!0),e&&this._buildPosition()}_buildPosition(){this._attrPos.setXYZ(0,0,0,0);for(let e=0;e<64;e++){let t=e/63*this._currentTheta;this._attrPos.setXYZ(e+1,this._currentRadius*Math.sin(t),0,this._currentRadius*Math.cos(t))}this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<63;e++)this._attrIndex.setXYZ(e*3,0,e+1,e+2);this._attrIndex.needsUpdate=!0}},Yi=class extends U{constructor(){super(),this.radius=0,this._currentRadius=0,this.tail=new _,this._currentTail=new _,this._attrPos=new I(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new I(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentRadius!==this.radius&&(this._currentRadius=this.radius,e=!0),this._currentTail.equals(this.tail)||(this._currentTail.copy(this.tail),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){let t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){let t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}},Pe=new M,_n=new M,Ee=new _,gn=new _,vn=Math.sqrt(2)/2,qi=new M(0,0,-vn,vn),$i=new _(0,1,0),Zi=class extends F{constructor(e){super(),this.matrixAutoUpdate=!1,this.vrmLookAt=e;{let t=new mn;t.radius=.5;let n=new ke({color:65280,transparent:!0,opacity:.5,side:Fe,depthTest:!1,depthWrite:!1});this._meshPitch=new We(t,n),this.add(this._meshPitch)}{let t=new mn;t.radius=.5;let n=new ke({color:16711680,transparent:!0,opacity:.5,side:Fe,depthTest:!1,depthWrite:!1});this._meshYaw=new We(t,n),this.add(this._meshYaw)}{let t=new Yi;t.radius=.1;let n=new Y({color:16777215,depthTest:!1,depthWrite:!1});this._lineTarget=new oe(t,n),this._lineTarget.frustumCulled=!1,this.add(this._lineTarget)}}dispose(){this._meshYaw.geometry.dispose(),this._meshYaw.material.dispose(),this._meshPitch.geometry.dispose(),this._meshPitch.material.dispose(),this._lineTarget.geometry.dispose(),this._lineTarget.material.dispose()}updateMatrixWorld(e){let t=L.DEG2RAD*this.vrmLookAt.yaw;this._meshYaw.geometry.theta=t,this._meshYaw.geometry.update();let n=L.DEG2RAD*this.vrmLookAt.pitch;this._meshPitch.geometry.theta=n,this._meshPitch.geometry.update(),this.vrmLookAt.getLookAtWorldPosition(Ee),this.vrmLookAt.getLookAtWorldQuaternion(Pe),Pe.multiply(this.vrmLookAt.getFaceFrontQuaternion(_n)),this._meshYaw.position.copy(Ee),this._meshYaw.quaternion.copy(Pe),this._meshPitch.position.copy(Ee),this._meshPitch.quaternion.copy(Pe),this._meshPitch.quaternion.multiply(_n.setFromAxisAngle($i,t)),this._meshPitch.quaternion.multiply(qi);let{target:i,autoUpdate:r}=this.vrmLookAt;i!=null&&r&&(i.getWorldPosition(gn).sub(Ee),this._lineTarget.geometry.tail.copy(gn),this._lineTarget.geometry.update(),this._lineTarget.position.copy(Ee)),super.updateMatrixWorld(e)}},Ji=new _,Ki=new _;function st(e,t){return e.matrixWorld.decompose(Ji,t,Ki),t}function Ie(e){return[Math.atan2(-e.z,e.x),Math.atan2(e.y,Math.sqrt(e.x*e.x+e.z*e.z))]}function En(e){let t=Math.round(e/2/Math.PI);return e-2*Math.PI*t}var Mn=new _(0,0,1),er=new _,tr=new _,nr=new _,ir=new M,Ye=new M,Rn=new M,rr=new M,qe=new ge,qn=class $n{constructor(t,n){this.offsetFromHeadBone=new _,this.autoUpdate=!0,this.faceFront=new _(0,0,1),this.humanoid=t,this.applier=n,this._yaw=0,this._pitch=0,this._needsUpdate=!0,this._restHeadWorldQuaternion=this.getLookAtWorldQuaternion(new M)}get yaw(){return this._yaw}set yaw(t){this._yaw=t,this._needsUpdate=!0}get pitch(){return this._pitch}set pitch(t){this._pitch=t,this._needsUpdate=!0}get euler(){return console.warn("VRMLookAt: euler is deprecated. use getEuler() instead."),this.getEuler(new ge)}getEuler(t){return t.set(L.DEG2RAD*this._pitch,L.DEG2RAD*this._yaw,0,"YXZ")}copy(t){if(this.humanoid!==t.humanoid)throw new Error("VRMLookAt: humanoid must be same in order to copy");return this.offsetFromHeadBone.copy(t.offsetFromHeadBone),this.applier=t.applier,this.autoUpdate=t.autoUpdate,this.target=t.target,this.faceFront.copy(t.faceFront),this}clone(){return new $n(this.humanoid,this.applier).copy(this)}reset(){this._yaw=0,this._pitch=0,this._needsUpdate=!0}getLookAtWorldPosition(t){let n=this.humanoid.getRawBoneNode("head");return t.copy(this.offsetFromHeadBone).applyMatrix4(n.matrixWorld)}getLookAtWorldQuaternion(t){let n=this.humanoid.getRawBoneNode("head");return st(n,t)}getFaceFrontQuaternion(t){if(this.faceFront.distanceToSquared(Mn)<.01)return t.copy(this._restHeadWorldQuaternion).invert();let[n,i]=Ie(this.faceFront);return qe.set(0,.5*Math.PI+n,i,"YZX"),t.setFromEuler(qe).premultiply(rr.copy(this._restHeadWorldQuaternion).invert())}getLookAtWorldDirection(t){return this.getLookAtWorldQuaternion(Ye),this.getFaceFrontQuaternion(Rn),t.copy(Mn).applyQuaternion(Ye).applyQuaternion(Rn).applyEuler(this.getEuler(qe))}lookAt(t){let n=ir.copy(this._restHeadWorldQuaternion).multiply(Xn(this.getLookAtWorldQuaternion(Ye))),i=this.getLookAtWorldPosition(tr),r=nr.copy(t).sub(i).applyQuaternion(n).normalize(),[o,a]=Ie(this.faceFront),[l,s]=Ie(r),u=En(l-o),d=En(a-s);this._yaw=L.RAD2DEG*u,this._pitch=L.RAD2DEG*d,this._needsUpdate=!0}update(t){this.target!=null&&this.autoUpdate&&this.lookAt(this.target.getWorldPosition(er)),this._needsUpdate&&(this._needsUpdate=!1,this.applier.applyYawPitch(this._yaw,this._pitch))}};qn.EULER_ORDER="YXZ";var or=qn,sr=new _(0,0,1),z=new M,ae=new M,k=new ge(0,0,0,"YXZ"),He=class{constructor(e,t,n,i,r){this.humanoid=e,this.rangeMapHorizontalInner=t,this.rangeMapHorizontalOuter=n,this.rangeMapVerticalDown=i,this.rangeMapVerticalUp=r,this.faceFront=new _(0,0,1),this._restQuatLeftEye=new M,this._restQuatRightEye=new M,this._restLeftEyeParentWorldQuat=new M,this._restRightEyeParentWorldQuat=new M;let o=this.humanoid.getRawBoneNode("leftEye"),a=this.humanoid.getRawBoneNode("rightEye");o&&(this._restQuatLeftEye.copy(o.quaternion),st(o.parent,this._restLeftEyeParentWorldQuat)),a&&(this._restQuatRightEye.copy(a.quaternion),st(a.parent,this._restRightEyeParentWorldQuat))}applyYawPitch(e,t){let n=this.humanoid.getRawBoneNode("leftEye"),i=this.humanoid.getRawBoneNode("rightEye"),r=this.humanoid.getNormalizedBoneNode("leftEye"),o=this.humanoid.getNormalizedBoneNode("rightEye");n&&(t<0?k.x=-L.DEG2RAD*this.rangeMapVerticalDown.map(-t):k.x=L.DEG2RAD*this.rangeMapVerticalUp.map(t),e<0?k.y=-L.DEG2RAD*this.rangeMapHorizontalInner.map(-e):k.y=L.DEG2RAD*this.rangeMapHorizontalOuter.map(e),z.setFromEuler(k),this._getWorldFaceFrontQuat(ae),r.quaternion.copy(ae).multiply(z).multiply(ae.invert()),z.copy(this._restLeftEyeParentWorldQuat),n.quaternion.copy(r.quaternion).multiply(z).premultiply(z.invert()).multiply(this._restQuatLeftEye)),i&&(t<0?k.x=-L.DEG2RAD*this.rangeMapVerticalDown.map(-t):k.x=L.DEG2RAD*this.rangeMapVerticalUp.map(t),e<0?k.y=-L.DEG2RAD*this.rangeMapHorizontalOuter.map(-e):k.y=L.DEG2RAD*this.rangeMapHorizontalInner.map(e),z.setFromEuler(k),this._getWorldFaceFrontQuat(ae),o.quaternion.copy(ae).multiply(z).multiply(ae.invert()),z.copy(this._restRightEyeParentWorldQuat),i.quaternion.copy(o.quaternion).multiply(z).premultiply(z.invert()).multiply(this._restQuatRightEye))}lookAt(e){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");let t=L.RAD2DEG*e.y,n=L.RAD2DEG*e.x;this.applyYawPitch(t,n)}_getWorldFaceFrontQuat(e){if(this.faceFront.distanceToSquared(sr)<.01)return e.identity();let[t,n]=Ie(this.faceFront);return k.set(0,.5*Math.PI+t,n,"YZX"),e.setFromEuler(k)}};He.type="bone";var at=class{constructor(e,t,n,i,r){this.expressions=e,this.rangeMapHorizontalInner=t,this.rangeMapHorizontalOuter=n,this.rangeMapVerticalDown=i,this.rangeMapVerticalUp=r}applyYawPitch(e,t){t<0?(this.expressions.setValue("lookDown",0),this.expressions.setValue("lookUp",this.rangeMapVerticalUp.map(-t))):(this.expressions.setValue("lookUp",0),this.expressions.setValue("lookDown",this.rangeMapVerticalDown.map(t))),e<0?(this.expressions.setValue("lookLeft",0),this.expressions.setValue("lookRight",this.rangeMapHorizontalOuter.map(-e))):(this.expressions.setValue("lookRight",0),this.expressions.setValue("lookLeft",this.rangeMapHorizontalOuter.map(e)))}lookAt(e){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");let t=L.RAD2DEG*e.y,n=L.RAD2DEG*e.x;this.applyYawPitch(t,n)}};at.type="expression";var Tn=class{constructor(e,t){this.inputMaxValue=e,this.outputScale=t}map(e){return this.outputScale*Bn(e/this.inputMaxValue)}},ar=new Set(["1.0","1.0-beta"]),Le=.01,lr=class{get name(){return"VRMLookAtLoaderPlugin"}constructor(e,t){this.parser=e,this.helperRoot=t?.helperRoot}afterRoot(e){return A(this,null,function*(){let t=e.userData.vrmHumanoid;if(t===null)return;if(t===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");let n=e.userData.vrmExpressionManager;if(n!==null){if(n===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmExpressionManager is undefined. VRMExpressionLoaderPlugin have to be used first");e.userData.vrmLookAt=yield this._import(e,t,n)}})}_import(e,t,n){return A(this,null,function*(){if(t==null||n==null)return null;let i=yield this._v1Import(e,t,n);if(i)return i;let r=yield this._v0Import(e,t,n);return r||null})}_v1Import(e,t,n){return A(this,null,function*(){var i,r,o;let a=this.parser.json;if(!(((i=a.extensionsUsed)==null?void 0:i.indexOf("VRMC_vrm"))!==-1))return null;let s=(r=a.extensions)==null?void 0:r.VRMC_vrm;if(!s)return null;let u=s.specVersion;if(!ar.has(u))return console.warn(`VRMLookAtLoaderPlugin: Unknown VRMC_vrm specVersion "${u}"`),null;let d=s.lookAt;if(!d)return null;let h=d.type==="expression"?1:10,c=this._v1ImportRangeMap(d.rangeMapHorizontalInner,h),p=this._v1ImportRangeMap(d.rangeMapHorizontalOuter,h),m=this._v1ImportRangeMap(d.rangeMapVerticalDown,h),f=this._v1ImportRangeMap(d.rangeMapVerticalUp,h),g;d.type==="expression"?g=new at(n,c,p,m,f):g=new He(t,c,p,m,f);let v=this._importLookAt(t,g);return v.offsetFromHeadBone.fromArray((o=d.offsetFromHeadBone)!=null?o:[0,.06,0]),v})}_v1ImportRangeMap(e,t){var n,i;let r=(n=e?.inputMaxValue)!=null?n:90,o=(i=e?.outputScale)!=null?i:t;return r<Le&&(console.warn("VRMLookAtLoaderPlugin: inputMaxValue of a range map is too small. Consider reviewing the range map!"),r=Le),new Tn(r,o)}_v0Import(e,t,n){return A(this,null,function*(){var i,r,o,a;let s=(i=this.parser.json.extensions)==null?void 0:i.VRM;if(!s)return null;let u=s.firstPerson;if(!u)return null;let d=u.lookAtTypeName==="BlendShape"?1:10,h=this._v0ImportDegreeMap(u.lookAtHorizontalInner,d),c=this._v0ImportDegreeMap(u.lookAtHorizontalOuter,d),p=this._v0ImportDegreeMap(u.lookAtVerticalDown,d),m=this._v0ImportDegreeMap(u.lookAtVerticalUp,d),f;u.lookAtTypeName==="BlendShape"?f=new at(n,h,c,p,m):f=new He(t,h,c,p,m);let g=this._importLookAt(t,f);return u.firstPersonBoneOffset?g.offsetFromHeadBone.set((r=u.firstPersonBoneOffset.x)!=null?r:0,(o=u.firstPersonBoneOffset.y)!=null?o:.06,-((a=u.firstPersonBoneOffset.z)!=null?a:0)):g.offsetFromHeadBone.set(0,.06,0),g.faceFront.set(0,0,-1),f instanceof He&&f.faceFront.set(0,0,-1),g})}_v0ImportDegreeMap(e,t){var n,i;let r=e?.curve;JSON.stringify(r)!=="[0,0,0,1,1,1,1,0]"&&console.warn("Curves of LookAtDegreeMap defined in VRM 0.0 are not supported");let o=(n=e?.xRange)!=null?n:90,a=(i=e?.yRange)!=null?i:t;return o<Le&&(console.warn("VRMLookAtLoaderPlugin: xRange of a degree map is too small. Consider reviewing the degree map!"),o=Le),new Tn(o,a)}_importLookAt(e,t){let n=new or(e,t);if(this.helperRoot){let i=new Zi(n);this.helperRoot.add(i),i.renderOrder=this.helperRoot.renderOrder}return n}};function ur(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}var dr=new Set(["1.0","1.0-beta"]),hr=class{get name(){return"VRMMetaLoaderPlugin"}constructor(e,t){var n,i,r;this.parser=e,this.needThumbnailImage=(n=t?.needThumbnailImage)!=null?n:!1,this.acceptLicenseUrls=(i=t?.acceptLicenseUrls)!=null?i:["https://vrm.dev/licenses/1.0/"],this.acceptV0Meta=(r=t?.acceptV0Meta)!=null?r:!0}afterRoot(e){return A(this,null,function*(){e.userData.vrmMeta=yield this._import(e)})}_import(e){return A(this,null,function*(){let t=yield this._v1Import(e);if(t!=null)return t;let n=yield this._v0Import(e);return n??null})}_v1Import(e){return A(this,null,function*(){var t,n,i;let r=this.parser.json;if(!(((t=r.extensionsUsed)==null?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;let a=(n=r.extensions)==null?void 0:n.VRMC_vrm;if(a==null)return null;let l=a.specVersion;if(!dr.has(l))return console.warn(`VRMMetaLoaderPlugin: Unknown VRMC_vrm specVersion "${l}"`),null;let s=a.meta;if(!s)return null;let u=s.licenseUrl;if(!new Set(this.acceptLicenseUrls).has(u))throw new Error(`VRMMetaLoaderPlugin: The license url "${u}" is not accepted`);let h;return this.needThumbnailImage&&s.thumbnailImage!=null&&(h=(i=yield this._extractGLTFImage(s.thumbnailImage))!=null?i:void 0),{metaVersion:"1",name:s.name,version:s.version,authors:s.authors,copyrightInformation:s.copyrightInformation,contactInformation:s.contactInformation,references:s.references,thirdPartyLicenses:s.thirdPartyLicenses,thumbnailImage:h,licenseUrl:s.licenseUrl,avatarPermission:s.avatarPermission,allowExcessivelyViolentUsage:s.allowExcessivelyViolentUsage,allowExcessivelySexualUsage:s.allowExcessivelySexualUsage,commercialUsage:s.commercialUsage,allowPoliticalOrReligiousUsage:s.allowPoliticalOrReligiousUsage,allowAntisocialOrHateUsage:s.allowAntisocialOrHateUsage,creditNotation:s.creditNotation,allowRedistribution:s.allowRedistribution,modification:s.modification,otherLicenseUrl:s.otherLicenseUrl}})}_v0Import(e){return A(this,null,function*(){var t;let i=(t=this.parser.json.extensions)==null?void 0:t.VRM;if(!i)return null;let r=i.meta;if(!r)return null;if(!this.acceptV0Meta)throw new Error("VRMMetaLoaderPlugin: Attempted to load VRM0.0 meta but acceptV0Meta is false");let o;return this.needThumbnailImage&&r.texture!=null&&r.texture!==-1&&(o=yield this.parser.getDependency("texture",r.texture)),{metaVersion:"0",allowedUserName:r.allowedUserName,author:r.author,commercialUssageName:r.commercialUssageName,contactInformation:r.contactInformation,licenseName:r.licenseName,otherLicenseUrl:r.otherLicenseUrl,otherPermissionUrl:r.otherPermissionUrl,reference:r.reference,sexualUssageName:r.sexualUssageName,texture:o??void 0,title:r.title,version:r.version,violentUssageName:r.violentUssageName}})}_extractGLTFImage(e){return A(this,null,function*(){var t;let i=(t=this.parser.json.images)==null?void 0:t[e];if(i==null)return console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${e}] of glTF as a thumbnail but the image doesn't exist`),null;let r=i.uri;if(i.bufferView!=null){let a=yield this.parser.getDependency("bufferView",i.bufferView),l=new Blob([a],{type:i.mimeType});r=URL.createObjectURL(l)}return r==null?(console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${e}] of glTF as a thumbnail but the image couldn't load properly`),null):yield new Jt().loadAsync(ur(r,this.parser.options.path)).catch(a=>(console.error(a),console.warn("VRMMetaLoaderPlugin: Failed to load a thumbnail image"),null))})}},cr=class{constructor(e){this.scene=e.scene,this.meta=e.meta,this.humanoid=e.humanoid,this.expressionManager=e.expressionManager,this.firstPerson=e.firstPerson,this.lookAt=e.lookAt}update(e){this.humanoid.update(),this.lookAt&&this.lookAt.update(e),this.expressionManager&&this.expressionManager.update()}};var pr=class extends cr{constructor(e){super(e),this.materials=e.materials,this.springBoneManager=e.springBoneManager,this.nodeConstraintManager=e.nodeConstraintManager}update(e){super.update(e),this.nodeConstraintManager&&this.nodeConstraintManager.update(),this.springBoneManager&&this.springBoneManager.update(e),this.materials&&this.materials.forEach(t=>{t.update&&t.update(e)})}},fr=Object.defineProperty,xn=Object.getOwnPropertySymbols,mr=Object.prototype.hasOwnProperty,_r=Object.prototype.propertyIsEnumerable,yn=(e,t,n)=>t in e?fr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,wn=(e,t)=>{for(var n in t||(t={}))mr.call(t,n)&&yn(e,n,t[n]);if(xn)for(var n of xn(t))_r.call(t,n)&&yn(e,n,t[n]);return e},ne=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),gr={"":3e3,srgb:3001};function vr(e,t){parseInt("180",10)>=152?e.colorSpace=t:e.encoding=gr[t]}var Er=class{get pending(){return Promise.all(this._pendings)}constructor(e,t){this._parser=e,this._materialParams=t,this._pendings=[]}assignPrimitive(e,t){t!=null&&(this._materialParams[e]=t)}assignColor(e,t,n){if(t!=null){let i=new B().fromArray(t);n&&i.convertSRGBToLinear(),this._materialParams[e]=i}}assignTexture(e,t,n){return ne(this,null,function*(){let i=ne(this,null,function*(){if(t!=null){let r=yield this._parser.assignTexture(this._materialParams,e,t);if(r==null){console.warn("GLTFMToonMaterialParamsAssignHelper: Failed to load texture. The rendering result may be wrong");return}n&&vr(r,"srgb")}});return this._pendings.push(i),i})}assignTextureByIndex(e,t,n){return ne(this,null,function*(){return this.assignTexture(e,t!=null?{index:t}:void 0,n)})}},Mr=`// #define PHONG

varying vec3 vViewPosition;

#ifndef FLAT_SHADED
  varying vec3 vNormal;
#endif

#include <common>

// #include <uv_pars_vertex>
#ifdef MTOON_USE_UV
  varying vec2 vUv;

  // COMPAT: pre-r151 uses a common uvTransform
  #if THREE_VRM_THREE_REVISION < 151
    uniform mat3 uvTransform;
  #endif
#endif

// #include <uv2_pars_vertex>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    attribute vec2 uv2;
    varying vec2 vUv2;
    uniform mat3 uv2Transform;
  #endif
#endif

// #include <displacementmap_pars_vertex>
// #include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
  uniform sampler2D outlineWidthMultiplyTexture;
  uniform mat3 outlineWidthMultiplyTextureUvTransform;
#endif

uniform float outlineWidthFactor;

void main() {

  // #include <uv_vertex>
  #ifdef MTOON_USE_UV
    // COMPAT: pre-r151 uses a common uvTransform
    #if THREE_VRM_THREE_REVISION >= 151
      vUv = uv;
    #else
      vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    #endif
  #endif

  // #include <uv2_vertex>
  // COMAPT: pre-r151 uses uv2 for lightMap and aoMap
  #if THREE_VRM_THREE_REVISION < 151
    #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
      vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
    #endif
  #endif

  #include <color_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>

  // we need this to compute the outline properly
  objectNormal = normalize( objectNormal );

  #include <defaultnormal_vertex>

  #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
    vNormal = normalize( transformedNormal );
  #endif

  #include <begin_vertex>

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  // #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>

  vViewPosition = - mvPosition.xyz;

  #ifdef OUTLINE
    float worldNormalLength = length( transformedNormal );
    vec3 outlineOffset = outlineWidthFactor * worldNormalLength * objectNormal;

    #ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
      vec2 outlineWidthMultiplyTextureUv = ( outlineWidthMultiplyTextureUvTransform * vec3( vUv, 1 ) ).xy;
      float outlineTex = texture2D( outlineWidthMultiplyTexture, outlineWidthMultiplyTextureUv ).g;
      outlineOffset *= outlineTex;
    #endif

    #ifdef OUTLINE_WIDTH_SCREEN
      outlineOffset *= vViewPosition.z / projectionMatrix[ 1 ].y;
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * vec4( outlineOffset + transformed, 1.0 );

    gl_Position.z += 1E-6 * gl_Position.w; // anti-artifact magic
  #endif

  #include <worldpos_vertex>
  // #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

}`,Rr=`// #define PHONG

uniform vec3 litFactor;

uniform float opacity;

uniform vec3 shadeColorFactor;
#ifdef USE_SHADEMULTIPLYTEXTURE
  uniform sampler2D shadeMultiplyTexture;
  uniform mat3 shadeMultiplyTextureUvTransform;
#endif

uniform float shadingShiftFactor;
uniform float shadingToonyFactor;

#ifdef USE_SHADINGSHIFTTEXTURE
  uniform sampler2D shadingShiftTexture;
  uniform mat3 shadingShiftTextureUvTransform;
  uniform float shadingShiftTextureScale;
#endif

uniform float giEqualizationFactor;

uniform vec3 parametricRimColorFactor;
#ifdef USE_RIMMULTIPLYTEXTURE
  uniform sampler2D rimMultiplyTexture;
  uniform mat3 rimMultiplyTextureUvTransform;
#endif
uniform float rimLightingMixFactor;
uniform float parametricRimFresnelPowerFactor;
uniform float parametricRimLiftFactor;

#ifdef USE_MATCAPTEXTURE
  uniform vec3 matcapFactor;
  uniform sampler2D matcapTexture;
  uniform mat3 matcapTextureUvTransform;
#endif

uniform vec3 emissive;
uniform float emissiveIntensity;

uniform vec3 outlineColorFactor;
uniform float outlineLightingMixFactor;

#ifdef USE_UVANIMATIONMASKTEXTURE
  uniform sampler2D uvAnimationMaskTexture;
  uniform mat3 uvAnimationMaskTextureUvTransform;
#endif

uniform float uvAnimationScrollXOffset;
uniform float uvAnimationScrollYOffset;
uniform float uvAnimationRotationPhase;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>

// #include <uv_pars_fragment>
#if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
  varying vec2 vUv;
#endif

// #include <uv2_pars_fragment>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    varying vec2 vUv2;
  #endif
#endif

#include <map_pars_fragment>

#ifdef USE_MAP
  uniform mat3 mapUvTransform;
#endif

// #include <alphamap_pars_fragment>

#include <alphatest_pars_fragment>

#include <aomap_pars_fragment>
// #include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>

#ifdef USE_EMISSIVEMAP
  uniform mat3 emissiveMapUvTransform;
#endif

// #include <envmap_common_pars_fragment>
// #include <envmap_pars_fragment>
// #include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>

// #include <bsdfs>
// COMPAT: pre-r151 doesn't have BRDF_Lambert in <common>
#if THREE_VRM_THREE_REVISION < 151
  vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
    return RECIPROCAL_PI * diffuseColor;
  }
#endif

#include <lights_pars_begin>

#include <normal_pars_fragment>

// #include <lights_phong_pars_fragment>
varying vec3 vViewPosition;

struct MToonMaterial {
  vec3 diffuseColor;
  vec3 shadeColor;
  float shadingShift;
};

float linearstep( float a, float b, float t ) {
  return clamp( ( t - a ) / ( b - a ), 0.0, 1.0 );
}

/**
 * Convert NdotL into toon shading factor using shadingShift and shadingToony
 */
float getShading(
  const in float dotNL,
  const in float shadow,
  const in float shadingShift
) {
  float shading = dotNL;
  shading = shading + shadingShift;
  shading = linearstep( -1.0 + shadingToonyFactor, 1.0 - shadingToonyFactor, shading );
  shading *= shadow;
  return shading;
}

/**
 * Mix diffuseColor and shadeColor using shading factor and light color
 */
vec3 getDiffuse(
  const in MToonMaterial material,
  const in float shading,
  in vec3 lightColor
) {
  #ifdef DEBUG_LITSHADERATE
    return vec3( BRDF_Lambert( shading * lightColor ) );
  #endif

  vec3 col = lightColor * BRDF_Lambert( mix( material.shadeColor, material.diffuseColor, shading ) );

  // The "comment out if you want to PBR absolutely" line
  #ifdef V0_COMPAT_SHADE
    col = min( col, material.diffuseColor );
  #endif

  return col;
}

// COMPAT: pre-r156 uses a struct GeometricContext
#if THREE_VRM_THREE_REVISION >= 157
  void RE_Direct_MToon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometryNormal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#else
  void RE_Direct_MToon( const in IncidentLight directLight, const in GeometricContext geometry, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometry.normal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in GeometricContext geometry, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#endif

#define RE_Direct RE_Direct_MToon
#define RE_IndirectDiffuse RE_IndirectDiffuse_MToon
#define Material_LightProbeLOD( material ) (0)

#include <shadowmap_pars_fragment>
// #include <bumpmap_pars_fragment>

// #include <normalmap_pars_fragment>
#ifdef USE_NORMALMAP

  uniform sampler2D normalMap;
  uniform mat3 normalMapUvTransform;
  uniform vec2 normalScale;

#endif

// COMPAT: pre-r151
// USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
#if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

  uniform mat3 normalMatrix;

#endif

// COMPAT: pre-r151
// USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( TANGENTSPACE_NORMALMAP ) )

  // Per-Pixel Tangent Space Normal Mapping
  // http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html

  // three-vrm specific change: it requires \`uv\` as an input in order to support uv scrolls

  // Temporary compat against shader change @ Three.js r126, r151
  #if THREE_VRM_THREE_REVISION >= 151

    mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {

      vec3 q0 = dFdx( eye_pos.xyz );
      vec3 q1 = dFdy( eye_pos.xyz );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = surf_norm;

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );

      return mat3( T * scale, B * scale, N );

    }

  #else

    vec3 perturbNormal2Arb( vec2 uv, vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {

      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = normalize( surf_norm );

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      // three-vrm specific change: Workaround for the issue that happens when delta of uv = 0.0
      // TODO: Is this still required? Or shall I make a PR about it?
      if ( length( T ) == 0.0 || length( B ) == 0.0 ) {
        return surf_norm;
      }

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );

      return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );

    }

  #endif

#endif

// #include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

// == post correction ==========================================================
void postCorrection() {
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}

// == main procedure ===========================================================
void main() {
  #include <clipping_planes_fragment>

  vec2 uv = vec2(0.5, 0.5);

  #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
    uv = vUv;

    float uvAnimMask = 1.0;
    #ifdef USE_UVANIMATIONMASKTEXTURE
      vec2 uvAnimationMaskTextureUv = ( uvAnimationMaskTextureUvTransform * vec3( uv, 1 ) ).xy;
      uvAnimMask = texture2D( uvAnimationMaskTexture, uvAnimationMaskTextureUv ).b;
    #endif

    float uvRotCos = cos( uvAnimationRotationPhase * uvAnimMask );
    float uvRotSin = sin( uvAnimationRotationPhase * uvAnimMask );
    uv = mat2( uvRotCos, -uvRotSin, uvRotSin, uvRotCos ) * ( uv - 0.5 ) + 0.5;
    uv = uv + vec2( uvAnimationScrollXOffset, uvAnimationScrollYOffset ) * uvAnimMask;
  #endif

  #ifdef DEBUG_UV
    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
    #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
      gl_FragColor = vec4( uv, 0.0, 1.0 );
    #endif
    return;
  #endif

  vec4 diffuseColor = vec4( litFactor, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive * emissiveIntensity;

  #include <logdepthbuf_fragment>

  // #include <map_fragment>
  #ifdef USE_MAP
    vec2 mapUv = ( mapUvTransform * vec3( uv, 1 ) ).xy;
    vec4 sampledDiffuseColor = texture2D( map, mapUv );
    #ifdef DECODE_VIDEO_TEXTURE
      sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
    #endif
    diffuseColor *= sampledDiffuseColor;
  #endif

  // #include <color_fragment>
  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    diffuseColor.rgb *= vColor;
  #endif

  // #include <alphamap_fragment>

  #include <alphatest_fragment>

  // #include <specularmap_fragment>

  // #include <normal_fragment_begin>
  float faceDirection = gl_FrontFacing ? 1.0 : -1.0;

  #ifdef FLAT_SHADED

    vec3 fdx = dFdx( vViewPosition );
    vec3 fdy = dFdy( vViewPosition );
    vec3 normal = normalize( cross( fdx, fdy ) );

  #else

    vec3 normal = normalize( vNormal );

    #ifdef DOUBLE_SIDED

      normal *= faceDirection;

    #endif

  #endif

  #ifdef USE_NORMALMAP

    vec2 normalMapUv = ( normalMapUvTransform * vec3( uv, 1 ) ).xy;

  #endif

  #ifdef USE_NORMALMAP_TANGENTSPACE

    #ifdef USE_TANGENT

      mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn = getTangentFrame( - vViewPosition, normal, normalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn[0] *= faceDirection;
      tbn[1] *= faceDirection;

    #endif

  #endif

  #ifdef USE_CLEARCOAT_NORMALMAP

    #ifdef USE_TANGENT

      mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn2[0] *= faceDirection;
      tbn2[1] *= faceDirection;

    #endif

  #endif

  // non perturbed normal for clearcoat among others

  vec3 nonPerturbedNormal = normal;

  #ifdef OUTLINE
    normal *= -1.0;
  #endif

  // #include <normal_fragment_maps>

  // COMPAT: pre-r151
  // USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
  #if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

    normal = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0; // overrides both flatShading and attribute normals

    #ifdef FLIP_SIDED

      normal = - normal;

    #endif

    #ifdef DOUBLE_SIDED

      normal = normal * faceDirection;

    #endif

    normal = normalize( normalMatrix * normal );

  // COMPAT: pre-r151
  // USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
  #elif defined( USE_NORMALMAP_TANGENTSPACE ) || defined( TANGENTSPACE_NORMALMAP )

    vec3 mapN = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;

    // COMPAT: pre-r151
    #if THREE_VRM_THREE_REVISION >= 151 || defined( USE_TANGENT )

      normal = normalize( tbn * mapN );

    #else

      normal = perturbNormal2Arb( uv, -vViewPosition, normal, mapN, faceDirection );

    #endif

  #endif

  // #include <emissivemap_fragment>
  #ifdef USE_EMISSIVEMAP
    vec2 emissiveMapUv = ( emissiveMapUvTransform * vec3( uv, 1 ) ).xy;
    totalEmissiveRadiance *= texture2D( emissiveMap, emissiveMapUv ).rgb;
  #endif

  #ifdef DEBUG_NORMAL
    gl_FragColor = vec4( 0.5 + 0.5 * normal, 1.0 );
    return;
  #endif

  // -- MToon: lighting --------------------------------------------------------
  // accumulation
  // #include <lights_phong_fragment>
  MToonMaterial material;

  material.diffuseColor = diffuseColor.rgb;

  material.shadeColor = shadeColorFactor;
  #ifdef USE_SHADEMULTIPLYTEXTURE
    vec2 shadeMultiplyTextureUv = ( shadeMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadeColor *= texture2D( shadeMultiplyTexture, shadeMultiplyTextureUv ).rgb;
  #endif

  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    material.shadeColor.rgb *= vColor;
  #endif

  material.shadingShift = shadingShiftFactor;
  #ifdef USE_SHADINGSHIFTTEXTURE
    vec2 shadingShiftTextureUv = ( shadingShiftTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadingShift += texture2D( shadingShiftTexture, shadingShiftTextureUv ).r * shadingShiftTextureScale;
  #endif

  // #include <lights_fragment_begin>

  // MToon Specific changes:
  // Since we want to take shadows into account of shading instead of irradiance,
  // we had to modify the codes that multiplies the results of shadowmap into color of direct lights.

  // COMPAT: pre-r156 uses a struct GeometricContext
  #if THREE_VRM_THREE_REVISION >= 157
    vec3 geometryPosition = - vViewPosition;
    vec3 geometryNormal = normal;
    vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    vec3 geometryClearcoatNormal;

    #ifdef USE_CLEARCOAT

      geometryClearcoatNormal = clearcoatNormal;

    #endif
  #else
    GeometricContext geometry;

    geometry.position = - vViewPosition;
    geometry.normal = normal;
    geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    #ifdef USE_CLEARCOAT

      geometry.clearcoatNormal = clearcoatNormal;

    #endif
  #endif

  IncidentLight directLight;

  // since these variables will be used in unrolled loop, we have to define in prior
  float shadow;

  #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

    PointLight pointLight;
    #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
    PointLightShadow pointLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

      pointLight = pointLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getPointLightInfo( pointLight, geometryPosition, directLight );
      #else
        getPointLightInfo( pointLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
      pointLightShadow = pointLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

    SpotLight spotLight;
    // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS, r144+ uses NUM_SPOT_LIGHT_COORDS
    #if THREE_VRM_THREE_REVISION >= 144
      #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_COORDS > 0
      SpotLightShadow spotLightShadow;
      #endif
    #elif defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
    SpotLightShadow spotLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

      spotLight = spotLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getSpotLightInfo( spotLight, geometryPosition, directLight );
      #else
        getSpotLightInfo( spotLight, geometry, directLight );
      #endif

      shadow = 1.0;
      // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS and vSpotShadowCoord, r144+ uses NUM_SPOT_LIGHT_COORDS and vSpotLightCoord
      // COMPAT: pre-r166 does not have shadowIntensity, r166+ has shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )
        spotLightShadow = spotLightShadows[ i ];
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
        #endif
      #elif THREE_VRM_THREE_REVISION >= 144
        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )
        spotLightShadow = spotLightShadows[ i ];
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
        #endif
      #elif defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
      spotLightShadow = spotLightShadows[ i ];
      shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

    DirectionalLight directionalLight;
    #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow directionalLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

      directionalLight = directionalLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getDirectionalLightInfo( directionalLight, directLight );
      #else
        getDirectionalLightInfo( directionalLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
      directionalLightShadow = directionalLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  // #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

  //   RectAreaLight rectAreaLight;

  //   #pragma unroll_loop_start
  //   for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

  //     rectAreaLight = rectAreaLights[ i ];
  //     RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );

  //   }
  //   #pragma unroll_loop_end

  // #endif

  #if defined( RE_IndirectDiffuse )

    vec3 iblIrradiance = vec3( 0.0 );

    vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

    // COMPAT: pre-r156 uses a struct GeometricContext
    // COMPAT: pre-r156 doesn't have a define USE_LIGHT_PROBES
    #if THREE_VRM_THREE_REVISION >= 157
      #if defined( USE_LIGHT_PROBES )
        irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
      #endif
    #else
      irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );
    #endif

    #if ( NUM_HEMI_LIGHTS > 0 )

      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

        // COMPAT: pre-r156 uses a struct GeometricContext
        #if THREE_VRM_THREE_REVISION >= 157
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
        #else
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
        #endif

      }
      #pragma unroll_loop_end

    #endif

  #endif

  // #if defined( RE_IndirectSpecular )

  //   vec3 radiance = vec3( 0.0 );
  //   vec3 clearcoatRadiance = vec3( 0.0 );

  // #endif

  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 col = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;

  #ifdef DEBUG_LITSHADERATE
    gl_FragColor = vec4( col, diffuseColor.a );
    postCorrection();
    return;
  #endif

  // -- MToon: rim lighting -----------------------------------------
  vec3 viewDir = normalize( vViewPosition );

  #ifndef PHYSICALLY_CORRECT_LIGHTS
    reflectedLight.directSpecular /= PI;
  #endif
  vec3 rimMix = mix( vec3( 1.0 ), reflectedLight.directSpecular, rimLightingMixFactor );

  vec3 rim = parametricRimColorFactor * pow( saturate( 1.0 - dot( viewDir, normal ) + parametricRimLiftFactor ), parametricRimFresnelPowerFactor );

  #ifdef USE_MATCAPTEXTURE
    {
      vec3 x = normalize( vec3( viewDir.z, 0.0, -viewDir.x ) );
      vec3 y = cross( viewDir, x ); // guaranteed to be normalized
      vec2 sphereUv = 0.5 + 0.5 * vec2( dot( x, normal ), -dot( y, normal ) );
      sphereUv = ( matcapTextureUvTransform * vec3( sphereUv, 1 ) ).xy;
      vec3 matcap = texture2D( matcapTexture, sphereUv ).rgb;
      rim += matcapFactor * matcap;
    }
  #endif

  #ifdef USE_RIMMULTIPLYTEXTURE
    vec2 rimMultiplyTextureUv = ( rimMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    rim *= texture2D( rimMultiplyTexture, rimMultiplyTextureUv ).rgb;
  #endif

  col += rimMix * rim;

  // -- MToon: Emission --------------------------------------------------------
  col += totalEmissiveRadiance;

  // #include <envmap_fragment>

  // -- Almost done! -----------------------------------------------------------
  #if defined( OUTLINE )
    col = outlineColorFactor.rgb * mix( vec3( 1.0 ), col, outlineLightingMixFactor );
  #endif

  #ifdef OPAQUE
    diffuseColor.a = 1.0;
  #endif

  gl_FragColor = vec4( col, diffuseColor.a );
  postCorrection();
}
`,Tr={None:"none",Normal:"normal",LitShadeRate:"litShadeRate",UV:"uv"},Sn={None:"none",WorldCoordinates:"worldCoordinates",ScreenCoordinates:"screenCoordinates"},xr={3e3:"",3001:"srgb"};function $e(e){return parseInt("180",10)>=152?e.colorSpace:xr[e.encoding]}var yr=class extends qt{constructor(e={}){var t;super({vertexShader:Mr,fragmentShader:Rr}),this.uvAnimationScrollXSpeedFactor=0,this.uvAnimationScrollYSpeedFactor=0,this.uvAnimationRotationSpeedFactor=0,this.fog=!0,this.normalMapType=jt,this._ignoreVertexColor=!0,this._v0CompatShade=!1,this._debugMode=Tr.None,this._outlineWidthMode=Sn.None,this._isOutline=!1,e.transparentWithZWrite&&(e.depthWrite=!0),delete e.transparentWithZWrite,e.fog=!0,e.lights=!0,e.clipping=!0,this.uniforms=Yt.merge([se.common,se.normalmap,se.emissivemap,se.fog,se.lights,{litFactor:{value:new B(1,1,1)},mapUvTransform:{value:new D},colorAlpha:{value:1},normalMapUvTransform:{value:new D},shadeColorFactor:{value:new B(0,0,0)},shadeMultiplyTexture:{value:null},shadeMultiplyTextureUvTransform:{value:new D},shadingShiftFactor:{value:0},shadingShiftTexture:{value:null},shadingShiftTextureUvTransform:{value:new D},shadingShiftTextureScale:{value:1},shadingToonyFactor:{value:.9},giEqualizationFactor:{value:.9},matcapFactor:{value:new B(1,1,1)},matcapTexture:{value:null},matcapTextureUvTransform:{value:new D},parametricRimColorFactor:{value:new B(0,0,0)},rimMultiplyTexture:{value:null},rimMultiplyTextureUvTransform:{value:new D},rimLightingMixFactor:{value:1},parametricRimFresnelPowerFactor:{value:5},parametricRimLiftFactor:{value:0},emissive:{value:new B(0,0,0)},emissiveIntensity:{value:1},emissiveMapUvTransform:{value:new D},outlineWidthMultiplyTexture:{value:null},outlineWidthMultiplyTextureUvTransform:{value:new D},outlineWidthFactor:{value:0},outlineColorFactor:{value:new B(0,0,0)},outlineLightingMixFactor:{value:1},uvAnimationMaskTexture:{value:null},uvAnimationMaskTextureUvTransform:{value:new D},uvAnimationScrollXOffset:{value:0},uvAnimationScrollYOffset:{value:0},uvAnimationRotationPhase:{value:0}},(t=e.uniforms)!=null?t:{}]),this.setValues(e),this._uploadUniformsWorkaround(),this.customProgramCacheKey=()=>[...Object.entries(this._generateDefines()).map(([n,i])=>`${n}:${i}`),this.matcapTexture?`matcapTextureColorSpace:${$e(this.matcapTexture)}`:"",this.shadeMultiplyTexture?`shadeMultiplyTextureColorSpace:${$e(this.shadeMultiplyTexture)}`:"",this.rimMultiplyTexture?`rimMultiplyTextureColorSpace:${$e(this.rimMultiplyTexture)}`:""].join(","),this.onBeforeCompile=n=>{let i=parseInt("180",10),r=Object.entries(wn(wn({},this._generateDefines()),this.defines)).filter(([o,a])=>!!a).map(([o,a])=>`#define ${o} ${a}`).join(`
`)+`
`;n.vertexShader=r+n.vertexShader,n.fragmentShader=r+n.fragmentShader,i<154&&(n.fragmentShader=n.fragmentShader.replace("#include <colorspace_fragment>","#include <encodings_fragment>"))}}get color(){return this.uniforms.litFactor.value}set color(e){this.uniforms.litFactor.value=e}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}get normalMap(){return this.uniforms.normalMap.value}set normalMap(e){this.uniforms.normalMap.value=e}get normalScale(){return this.uniforms.normalScale.value}set normalScale(e){this.uniforms.normalScale.value=e}get emissive(){return this.uniforms.emissive.value}set emissive(e){this.uniforms.emissive.value=e}get emissiveIntensity(){return this.uniforms.emissiveIntensity.value}set emissiveIntensity(e){this.uniforms.emissiveIntensity.value=e}get emissiveMap(){return this.uniforms.emissiveMap.value}set emissiveMap(e){this.uniforms.emissiveMap.value=e}get shadeColorFactor(){return this.uniforms.shadeColorFactor.value}set shadeColorFactor(e){this.uniforms.shadeColorFactor.value=e}get shadeMultiplyTexture(){return this.uniforms.shadeMultiplyTexture.value}set shadeMultiplyTexture(e){this.uniforms.shadeMultiplyTexture.value=e}get shadingShiftFactor(){return this.uniforms.shadingShiftFactor.value}set shadingShiftFactor(e){this.uniforms.shadingShiftFactor.value=e}get shadingShiftTexture(){return this.uniforms.shadingShiftTexture.value}set shadingShiftTexture(e){this.uniforms.shadingShiftTexture.value=e}get shadingShiftTextureScale(){return this.uniforms.shadingShiftTextureScale.value}set shadingShiftTextureScale(e){this.uniforms.shadingShiftTextureScale.value=e}get shadingToonyFactor(){return this.uniforms.shadingToonyFactor.value}set shadingToonyFactor(e){this.uniforms.shadingToonyFactor.value=e}get giEqualizationFactor(){return this.uniforms.giEqualizationFactor.value}set giEqualizationFactor(e){this.uniforms.giEqualizationFactor.value=e}get matcapFactor(){return this.uniforms.matcapFactor.value}set matcapFactor(e){this.uniforms.matcapFactor.value=e}get matcapTexture(){return this.uniforms.matcapTexture.value}set matcapTexture(e){this.uniforms.matcapTexture.value=e}get parametricRimColorFactor(){return this.uniforms.parametricRimColorFactor.value}set parametricRimColorFactor(e){this.uniforms.parametricRimColorFactor.value=e}get rimMultiplyTexture(){return this.uniforms.rimMultiplyTexture.value}set rimMultiplyTexture(e){this.uniforms.rimMultiplyTexture.value=e}get rimLightingMixFactor(){return this.uniforms.rimLightingMixFactor.value}set rimLightingMixFactor(e){this.uniforms.rimLightingMixFactor.value=e}get parametricRimFresnelPowerFactor(){return this.uniforms.parametricRimFresnelPowerFactor.value}set parametricRimFresnelPowerFactor(e){this.uniforms.parametricRimFresnelPowerFactor.value=e}get parametricRimLiftFactor(){return this.uniforms.parametricRimLiftFactor.value}set parametricRimLiftFactor(e){this.uniforms.parametricRimLiftFactor.value=e}get outlineWidthMultiplyTexture(){return this.uniforms.outlineWidthMultiplyTexture.value}set outlineWidthMultiplyTexture(e){this.uniforms.outlineWidthMultiplyTexture.value=e}get outlineWidthFactor(){return this.uniforms.outlineWidthFactor.value}set outlineWidthFactor(e){this.uniforms.outlineWidthFactor.value=e}get outlineColorFactor(){return this.uniforms.outlineColorFactor.value}set outlineColorFactor(e){this.uniforms.outlineColorFactor.value=e}get outlineLightingMixFactor(){return this.uniforms.outlineLightingMixFactor.value}set outlineLightingMixFactor(e){this.uniforms.outlineLightingMixFactor.value=e}get uvAnimationMaskTexture(){return this.uniforms.uvAnimationMaskTexture.value}set uvAnimationMaskTexture(e){this.uniforms.uvAnimationMaskTexture.value=e}get uvAnimationScrollXOffset(){return this.uniforms.uvAnimationScrollXOffset.value}set uvAnimationScrollXOffset(e){this.uniforms.uvAnimationScrollXOffset.value=e}get uvAnimationScrollYOffset(){return this.uniforms.uvAnimationScrollYOffset.value}set uvAnimationScrollYOffset(e){this.uniforms.uvAnimationScrollYOffset.value=e}get uvAnimationRotationPhase(){return this.uniforms.uvAnimationRotationPhase.value}set uvAnimationRotationPhase(e){this.uniforms.uvAnimationRotationPhase.value=e}get ignoreVertexColor(){return this._ignoreVertexColor}set ignoreVertexColor(e){this._ignoreVertexColor=e,this.needsUpdate=!0}get v0CompatShade(){return this._v0CompatShade}set v0CompatShade(e){this._v0CompatShade=e,this.needsUpdate=!0}get debugMode(){return this._debugMode}set debugMode(e){this._debugMode=e,this.needsUpdate=!0}get outlineWidthMode(){return this._outlineWidthMode}set outlineWidthMode(e){this._outlineWidthMode=e,this.needsUpdate=!0}get isOutline(){return this._isOutline}set isOutline(e){this._isOutline=e,this.needsUpdate=!0}get isMToonMaterial(){return!0}update(e){this._uploadUniformsWorkaround(),this._updateUVAnimation(e)}copy(e){return super.copy(e),this.map=e.map,this.normalMap=e.normalMap,this.emissiveMap=e.emissiveMap,this.shadeMultiplyTexture=e.shadeMultiplyTexture,this.shadingShiftTexture=e.shadingShiftTexture,this.matcapTexture=e.matcapTexture,this.rimMultiplyTexture=e.rimMultiplyTexture,this.outlineWidthMultiplyTexture=e.outlineWidthMultiplyTexture,this.uvAnimationMaskTexture=e.uvAnimationMaskTexture,this.normalMapType=e.normalMapType,this.uvAnimationScrollXSpeedFactor=e.uvAnimationScrollXSpeedFactor,this.uvAnimationScrollYSpeedFactor=e.uvAnimationScrollYSpeedFactor,this.uvAnimationRotationSpeedFactor=e.uvAnimationRotationSpeedFactor,this.ignoreVertexColor=e.ignoreVertexColor,this.v0CompatShade=e.v0CompatShade,this.debugMode=e.debugMode,this.outlineWidthMode=e.outlineWidthMode,this.isOutline=e.isOutline,this.needsUpdate=!0,this}_updateUVAnimation(e){this.uniforms.uvAnimationScrollXOffset.value+=e*this.uvAnimationScrollXSpeedFactor,this.uniforms.uvAnimationScrollYOffset.value+=e*this.uvAnimationScrollYSpeedFactor,this.uniforms.uvAnimationRotationPhase.value+=e*this.uvAnimationRotationSpeedFactor,this.uniforms.alphaTest.value=this.alphaTest,this.uniformsNeedUpdate=!0}_uploadUniformsWorkaround(){this.uniforms.opacity.value=this.opacity,this._updateTextureMatrix(this.uniforms.map,this.uniforms.mapUvTransform),this._updateTextureMatrix(this.uniforms.normalMap,this.uniforms.normalMapUvTransform),this._updateTextureMatrix(this.uniforms.emissiveMap,this.uniforms.emissiveMapUvTransform),this._updateTextureMatrix(this.uniforms.shadeMultiplyTexture,this.uniforms.shadeMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.shadingShiftTexture,this.uniforms.shadingShiftTextureUvTransform),this._updateTextureMatrix(this.uniforms.matcapTexture,this.uniforms.matcapTextureUvTransform),this._updateTextureMatrix(this.uniforms.rimMultiplyTexture,this.uniforms.rimMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.outlineWidthMultiplyTexture,this.uniforms.outlineWidthMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.uvAnimationMaskTexture,this.uniforms.uvAnimationMaskTextureUvTransform),this.uniformsNeedUpdate=!0}_generateDefines(){let e=parseInt("180",10),t=this.outlineWidthMultiplyTexture!==null,n=this.map!==null||this.normalMap!==null||this.emissiveMap!==null||this.shadeMultiplyTexture!==null||this.shadingShiftTexture!==null||this.rimMultiplyTexture!==null||this.uvAnimationMaskTexture!==null;return{THREE_VRM_THREE_REVISION:e,OUTLINE:this._isOutline,MTOON_USE_UV:t||n,MTOON_UVS_VERTEX_ONLY:t&&!n,V0_COMPAT_SHADE:this._v0CompatShade,USE_SHADEMULTIPLYTEXTURE:this.shadeMultiplyTexture!==null,USE_SHADINGSHIFTTEXTURE:this.shadingShiftTexture!==null,USE_MATCAPTEXTURE:this.matcapTexture!==null,USE_RIMMULTIPLYTEXTURE:this.rimMultiplyTexture!==null,USE_OUTLINEWIDTHMULTIPLYTEXTURE:this._isOutline&&this.outlineWidthMultiplyTexture!==null,USE_UVANIMATIONMASKTEXTURE:this.uvAnimationMaskTexture!==null,IGNORE_VERTEX_COLOR:this._ignoreVertexColor===!0,DEBUG_NORMAL:this._debugMode==="normal",DEBUG_LITSHADERATE:this._debugMode==="litShadeRate",DEBUG_UV:this._debugMode==="uv",OUTLINE_WIDTH_SCREEN:this._isOutline&&this._outlineWidthMode===Sn.ScreenCoordinates}}_updateTextureMatrix(e,t){e.value&&(e.value.matrixAutoUpdate&&e.value.updateMatrix(),t.value.copy(e.value.matrix))}},wr=new Set(["1.0","1.0-beta"]),Zn=class Ve{get name(){return Ve.EXTENSION_NAME}constructor(t,n={}){var i,r,o,a;this.parser=t,this.materialType=(i=n.materialType)!=null?i:yr,this.renderOrderOffset=(r=n.renderOrderOffset)!=null?r:0,this.v0CompatShade=(o=n.v0CompatShade)!=null?o:!1,this.debugMode=(a=n.debugMode)!=null?a:"none",this._mToonMaterialSet=new Set}beforeRoot(){return ne(this,null,function*(){this._removeUnlitExtensionIfMToonExists()})}afterRoot(t){return ne(this,null,function*(){t.userData.vrmMToonMaterials=Array.from(this._mToonMaterialSet)})}getMaterialType(t){return this._getMToonExtension(t)?this.materialType:null}extendMaterialParams(t,n){let i=this._getMToonExtension(t);return i?this._extendMaterialParams(i,n):null}loadMesh(t){return ne(this,null,function*(){var n;let i=this.parser,o=(n=i.json.meshes)==null?void 0:n[t];if(o==null)throw new Error(`MToonMaterialLoaderPlugin: Attempt to use meshes[${t}] of glTF but the mesh doesn't exist`);let a=o.primitives,l=yield i.loadMesh(t);if(a.length===1){let s=l,u=a[0].material;u!=null&&this._setupPrimitive(s,u)}else{let s=l;for(let u=0;u<a.length;u++){let d=s.children[u],h=a[u].material;h!=null&&this._setupPrimitive(d,h)}}return l})}_removeUnlitExtensionIfMToonExists(){let i=this.parser.json.materials;i?.map((r,o)=>{var a;this._getMToonExtension(o)&&((a=r.extensions)!=null&&a.KHR_materials_unlit)&&delete r.extensions.KHR_materials_unlit})}_getMToonExtension(t){var n,i;let a=(n=this.parser.json.materials)==null?void 0:n[t];if(a==null){console.warn(`MToonMaterialLoaderPlugin: Attempt to use materials[${t}] of glTF but the material doesn't exist`);return}let l=(i=a.extensions)==null?void 0:i[Ve.EXTENSION_NAME];if(l==null)return;let s=l.specVersion;if(!wr.has(s)){console.warn(`MToonMaterialLoaderPlugin: Unknown ${Ve.EXTENSION_NAME} specVersion "${s}"`);return}return l}_extendMaterialParams(t,n){return ne(this,null,function*(){var i;delete n.metalness,delete n.roughness;let r=new Er(this.parser,n);r.assignPrimitive("transparentWithZWrite",t.transparentWithZWrite),r.assignColor("shadeColorFactor",t.shadeColorFactor),r.assignTexture("shadeMultiplyTexture",t.shadeMultiplyTexture,!0),r.assignPrimitive("shadingShiftFactor",t.shadingShiftFactor),r.assignTexture("shadingShiftTexture",t.shadingShiftTexture,!0),r.assignPrimitive("shadingShiftTextureScale",(i=t.shadingShiftTexture)==null?void 0:i.scale),r.assignPrimitive("shadingToonyFactor",t.shadingToonyFactor),r.assignPrimitive("giEqualizationFactor",t.giEqualizationFactor),r.assignColor("matcapFactor",t.matcapFactor),r.assignTexture("matcapTexture",t.matcapTexture,!0),r.assignColor("parametricRimColorFactor",t.parametricRimColorFactor),r.assignTexture("rimMultiplyTexture",t.rimMultiplyTexture,!0),r.assignPrimitive("rimLightingMixFactor",t.rimLightingMixFactor),r.assignPrimitive("parametricRimFresnelPowerFactor",t.parametricRimFresnelPowerFactor),r.assignPrimitive("parametricRimLiftFactor",t.parametricRimLiftFactor),r.assignPrimitive("outlineWidthMode",t.outlineWidthMode),r.assignPrimitive("outlineWidthFactor",t.outlineWidthFactor),r.assignTexture("outlineWidthMultiplyTexture",t.outlineWidthMultiplyTexture,!1),r.assignColor("outlineColorFactor",t.outlineColorFactor),r.assignPrimitive("outlineLightingMixFactor",t.outlineLightingMixFactor),r.assignTexture("uvAnimationMaskTexture",t.uvAnimationMaskTexture,!1),r.assignPrimitive("uvAnimationScrollXSpeedFactor",t.uvAnimationScrollXSpeedFactor),r.assignPrimitive("uvAnimationScrollYSpeedFactor",t.uvAnimationScrollYSpeedFactor),r.assignPrimitive("uvAnimationRotationSpeedFactor",t.uvAnimationRotationSpeedFactor),r.assignPrimitive("v0CompatShade",this.v0CompatShade),r.assignPrimitive("debugMode",this.debugMode),yield r.pending})}_setupPrimitive(t,n){let i=this._getMToonExtension(n);if(i){let r=this._parseRenderOrder(i);t.renderOrder=r+this.renderOrderOffset,this._generateOutline(t),this._addToMaterialSet(t);return}}_shouldGenerateOutline(t){return typeof t.outlineWidthMode=="string"&&t.outlineWidthMode!=="none"&&typeof t.outlineWidthFactor=="number"&&t.outlineWidthFactor>0}_generateOutline(t){let n=t.material;if(!(n instanceof Qt)||!this._shouldGenerateOutline(n))return;t.material=[n];let i=n.clone();i.name+=" (Outline)",i.isOutline=!0,i.side=Gt,t.material.push(i);let r=t.geometry,o=r.index?r.index.count:r.attributes.position.count/3;r.addGroup(0,o,0),r.addGroup(0,o,1)}_addToMaterialSet(t){let n=t.material,i=new Set;Array.isArray(n)?n.forEach(r=>i.add(r)):i.add(n);for(let r of i)this._mToonMaterialSet.add(r)}_parseRenderOrder(t){var n;return(t.transparentWithZWrite?0:19)+((n=t.renderQueueOffsetNumber)!=null?n:0)}};Zn.EXTENSION_NAME="VRMC_materials_mtoon";var Sr=Zn,Ar=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),Jn=class lt{get name(){return lt.EXTENSION_NAME}constructor(t){this.parser=t}extendMaterialParams(t,n){return Ar(this,null,function*(){let i=this._getHDREmissiveMultiplierExtension(t);if(i==null)return;console.warn("VRMMaterialsHDREmissiveMultiplierLoaderPlugin: `VRMC_materials_hdr_emissiveMultiplier` is archived. Use `KHR_materials_emissive_strength` instead.");let r=i.emissiveMultiplier;n.emissiveIntensity=r})}_getHDREmissiveMultiplierExtension(t){var n,i;let a=(n=this.parser.json.materials)==null?void 0:n[t];if(a==null){console.warn(`VRMMaterialsHDREmissiveMultiplierLoaderPlugin: Attempt to use materials[${t}] of glTF but the material doesn't exist`);return}let l=(i=a.extensions)==null?void 0:i[lt.EXTENSION_NAME];if(l!=null)return l}};Jn.EXTENSION_NAME="VRMC_materials_hdr_emissiveMultiplier";var Pr=Jn,Lr=Object.defineProperty,br=Object.defineProperties,Ir=Object.getOwnPropertyDescriptors,An=Object.getOwnPropertySymbols,Hr=Object.prototype.hasOwnProperty,Vr=Object.prototype.propertyIsEnumerable,Pn=(e,t,n)=>t in e?Lr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,G=(e,t)=>{for(var n in t||(t={}))Hr.call(t,n)&&Pn(e,n,t[n]);if(An)for(var n of An(t))Vr.call(t,n)&&Pn(e,n,t[n]);return e},Ln=(e,t)=>br(e,Ir(t)),Ur=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())});function le(e){return Math.pow(e,2.2)}var Or=class{get name(){return"VRMMaterialsV0CompatPlugin"}constructor(e){var t;this.parser=e,this._renderQueueMapTransparent=new Map,this._renderQueueMapTransparentZWrite=new Map;let n=this.parser.json;n.extensionsUsed=(t=n.extensionsUsed)!=null?t:[],n.extensionsUsed.indexOf("KHR_texture_transform")===-1&&n.extensionsUsed.push("KHR_texture_transform")}beforeRoot(){return Ur(this,null,function*(){var e;let t=this.parser.json,n=(e=t.extensions)==null?void 0:e.VRM,i=n?.materialProperties;i&&(this._populateRenderQueueMap(i),i.forEach((r,o)=>{var a,l;let s=(a=t.materials)==null?void 0:a[o];if(s==null){console.warn(`VRMMaterialsV0CompatPlugin: Attempt to use materials[${o}] of glTF but the material doesn't exist`);return}if(r.shader==="VRM/MToon"){let u=this._parseV0MToonProperties(r,s);t.materials[o]=u}else if((l=r.shader)!=null&&l.startsWith("VRM/Unlit")){let u=this._parseV0UnlitProperties(r,s);t.materials[o]=u}else r.shader==="VRM_USE_GLTFSHADER"||console.warn(`VRMMaterialsV0CompatPlugin: Unknown shader: ${r.shader}`)}))})}_parseV0MToonProperties(e,t){var n,i,r,o,a,l,s,u,d,h,c,p,m,f,g,v,x,w,y,R,T,S,P,V,b,H,O,Q,pe,fe,X,W,ie,me,N,pt,ft,mt,_t,gt,vt,Et,Mt,Rt,Tt,xt,yt,wt,St,At,Pt,Lt,bt,It,Ht;let Vt=(i=(n=e.keywordMap)==null?void 0:n._ALPHABLEND_ON)!=null?i:!1,oi=((r=e.floatProperties)==null?void 0:r._ZWrite)===1&&Vt,si=this._v0ParseRenderQueue(e),Ut=(a=(o=e.keywordMap)==null?void 0:o._ALPHATEST_ON)!=null?a:!1,ai=Vt?"BLEND":Ut?"MASK":"OPAQUE",li=Ut?(s=(l=e.floatProperties)==null?void 0:l._Cutoff)!=null?s:.5:void 0,ui=((d=(u=e.floatProperties)==null?void 0:u._CullMode)!=null?d:2)===0,$=this._portTextureTransform(e),di=((c=(h=e.vectorProperties)==null?void 0:h._Color)!=null?c:[1,1,1,1]).map((zt,Ui)=>Ui===3?zt:le(zt)),Ot=(p=e.textureProperties)==null?void 0:p._MainTex,hi=Ot!=null?{index:Ot,extensions:G({},$)}:void 0,ci=(f=(m=e.floatProperties)==null?void 0:m._BumpScale)!=null?f:1,Ct=(g=e.textureProperties)==null?void 0:g._BumpMap,pi=Ct!=null?{index:Ct,scale:ci,extensions:G({},$)}:void 0,fi=((x=(v=e.vectorProperties)==null?void 0:v._EmissionColor)!=null?x:[0,0,0,1]).map(le),Nt=(w=e.textureProperties)==null?void 0:w._EmissionMap,mi=Nt!=null?{index:Nt,extensions:G({},$)}:void 0,_i=((R=(y=e.vectorProperties)==null?void 0:y._ShadeColor)!=null?R:[.97,.81,.86,1]).map(le),Bt=(T=e.textureProperties)==null?void 0:T._ShadeTexture,gi=Bt!=null?{index:Bt,extensions:G({},$)}:void 0,ye=(P=(S=e.floatProperties)==null?void 0:S._ShadeShift)!=null?P:0,we=(b=(V=e.floatProperties)==null?void 0:V._ShadeToony)!=null?b:.9;we=L.lerp(we,1,.5+.5*ye),ye=-ye-(1-we);let Dt=(O=(H=e.floatProperties)==null?void 0:H._IndirectLightIntensity)!=null?O:.1,vi=Dt?1-Dt:void 0,Be=(Q=e.textureProperties)==null?void 0:Q._SphereAdd,Ei=Be!=null?[1,1,1]:void 0,Mi=Be!=null?{index:Be}:void 0,Ri=(fe=(pe=e.floatProperties)==null?void 0:pe._RimLightingMix)!=null?fe:0,Ft=(X=e.textureProperties)==null?void 0:X._RimTexture,Ti=Ft!=null?{index:Ft,extensions:G({},$)}:void 0,xi=((ie=(W=e.vectorProperties)==null?void 0:W._RimColor)!=null?ie:[0,0,0,1]).map(le),yi=(N=(me=e.floatProperties)==null?void 0:me._RimFresnelPower)!=null?N:1,wi=(ft=(pt=e.floatProperties)==null?void 0:pt._RimLift)!=null?ft:0,Si=["none","worldCoordinates","screenCoordinates"][(_t=(mt=e.floatProperties)==null?void 0:mt._OutlineWidthMode)!=null?_t:0],De=(vt=(gt=e.floatProperties)==null?void 0:gt._OutlineWidth)!=null?vt:0;De=.01*De;let kt=(Et=e.textureProperties)==null?void 0:Et._OutlineWidthTexture,Ai=kt!=null?{index:kt,extensions:G({},$)}:void 0,Pi=((Rt=(Mt=e.vectorProperties)==null?void 0:Mt._OutlineColor)!=null?Rt:[0,0,0]).map(le),Li=((xt=(Tt=e.floatProperties)==null?void 0:Tt._OutlineColorMode)!=null?xt:0)===1?(wt=(yt=e.floatProperties)==null?void 0:yt._OutlineLightingMix)!=null?wt:1:0,Wt=(St=e.textureProperties)==null?void 0:St._UvAnimMaskTexture,bi=Wt!=null?{index:Wt,extensions:G({},$)}:void 0,Ii=(Pt=(At=e.floatProperties)==null?void 0:At._UvAnimScrollX)!=null?Pt:0,Se=(bt=(Lt=e.floatProperties)==null?void 0:Lt._UvAnimScrollY)!=null?bt:0;Se!=null&&(Se=-Se);let Hi=(Ht=(It=e.floatProperties)==null?void 0:It._UvAnimRotation)!=null?Ht:0,Vi={specVersion:"1.0",transparentWithZWrite:oi,renderQueueOffsetNumber:si,shadeColorFactor:_i,shadeMultiplyTexture:gi,shadingShiftFactor:ye,shadingToonyFactor:we,giEqualizationFactor:vi,matcapFactor:Ei,matcapTexture:Mi,rimLightingMixFactor:Ri,rimMultiplyTexture:Ti,parametricRimColorFactor:xi,parametricRimFresnelPowerFactor:yi,parametricRimLiftFactor:wi,outlineWidthMode:Si,outlineWidthFactor:De,outlineWidthMultiplyTexture:Ai,outlineColorFactor:Pi,outlineLightingMixFactor:Li,uvAnimationMaskTexture:bi,uvAnimationScrollXSpeedFactor:Ii,uvAnimationScrollYSpeedFactor:Se,uvAnimationRotationSpeedFactor:Hi};return Ln(G({},t),{pbrMetallicRoughness:{baseColorFactor:di,baseColorTexture:hi},normalTexture:pi,emissiveTexture:mi,emissiveFactor:fi,alphaMode:ai,alphaCutoff:li,doubleSided:ui,extensions:{VRMC_materials_mtoon:Vi}})}_parseV0UnlitProperties(e,t){var n,i,r,o,a;let l=e.shader==="VRM/UnlitTransparentZWrite",s=e.shader==="VRM/UnlitTransparent"||l,u=this._v0ParseRenderQueue(e),d=e.shader==="VRM/UnlitCutout",h=s?"BLEND":d?"MASK":"OPAQUE",c=d?(i=(n=e.floatProperties)==null?void 0:n._Cutoff)!=null?i:.5:void 0,p=this._portTextureTransform(e),m=((o=(r=e.vectorProperties)==null?void 0:r._Color)!=null?o:[1,1,1,1]).map(le),f=(a=e.textureProperties)==null?void 0:a._MainTex,g=f!=null?{index:f,extensions:G({},p)}:void 0,v={specVersion:"1.0",transparentWithZWrite:l,renderQueueOffsetNumber:u,shadeColorFactor:m,shadeMultiplyTexture:g};return Ln(G({},t),{pbrMetallicRoughness:{baseColorFactor:m,baseColorTexture:g},alphaMode:h,alphaCutoff:c,extensions:{VRMC_materials_mtoon:v}})}_portTextureTransform(e){var t,n,i,r,o;let a=(t=e.vectorProperties)==null?void 0:t._MainTex;if(a==null)return{};let l=[(n=a?.[0])!=null?n:0,(i=a?.[1])!=null?i:0],s=[(r=a?.[2])!=null?r:1,(o=a?.[3])!=null?o:1];return l[1]=1-s[1]-l[1],{KHR_texture_transform:{offset:l,scale:s}}}_v0ParseRenderQueue(e){var t,n;let i=e.shader==="VRM/UnlitTransparentZWrite",r=((t=e.keywordMap)==null?void 0:t._ALPHABLEND_ON)!=null||e.shader==="VRM/UnlitTransparent"||i,o=((n=e.floatProperties)==null?void 0:n._ZWrite)===1||i,a=0;if(r){let l=e.renderQueue;l!=null&&(o?a=this._renderQueueMapTransparentZWrite.get(l):a=this._renderQueueMapTransparent.get(l))}return a}_populateRenderQueueMap(e){let t=new Set,n=new Set;e.forEach(i=>{var r,o;let a=i.shader==="VRM/UnlitTransparentZWrite",l=((r=i.keywordMap)==null?void 0:r._ALPHABLEND_ON)!=null||i.shader==="VRM/UnlitTransparent"||a,s=((o=i.floatProperties)==null?void 0:o._ZWrite)===1||a;if(l){let u=i.renderQueue;u!=null&&(s?n.add(u):t.add(u))}}),t.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${t.size} render queues for Transparent materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),n.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${n.size} render queues for TransparentZWrite materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),Array.from(t).sort().forEach((i,r)=>{let o=Math.min(Math.max(r-t.size+1,-9),0);this._renderQueueMapTransparent.set(i,o)}),Array.from(n).sort().forEach((i,r)=>{let o=Math.min(Math.max(r,0),9);this._renderQueueMapTransparentZWrite.set(i,o)})}},bn=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),q=new _,Ze=class extends F{constructor(e){super(),this._attrPosition=new I(new Float32Array([0,0,0,0,0,0]),3),this._attrPosition.setUsage(Xt);let t=new U;t.setAttribute("position",this._attrPosition);let n=new Y({color:16711935,depthTest:!1,depthWrite:!1});this._line=new Zt(t,n),this.add(this._line),this.constraint=e}updateMatrixWorld(e){q.setFromMatrixPosition(this.constraint.destination.matrixWorld),this._attrPosition.setXYZ(0,q.x,q.y,q.z),this.constraint.source&&q.setFromMatrixPosition(this.constraint.source.matrixWorld),this._attrPosition.setXYZ(1,q.x,q.y,q.z),this._attrPosition.needsUpdate=!0,super.updateMatrixWorld(e)}};function In(e,t){return t.set(e.elements[12],e.elements[13],e.elements[14])}var Cr=new _,Nr=new _;function Br(e,t){return e.decompose(Cr,t,Nr),t}function Oe(e){return e.invert?e.invert():e.inverse(),e}var ht=class{constructor(e,t){this.destination=e,this.source=t,this.weight=1}},Dr=new _,Fr=new _,kr=new _,Wr=new M,zr=new M,Gr=new M,jr=class extends ht{get aimAxis(){return this._aimAxis}set aimAxis(e){this._aimAxis=e,this._v3AimAxis.set(e==="PositiveX"?1:e==="NegativeX"?-1:0,e==="PositiveY"?1:e==="NegativeY"?-1:0,e==="PositiveZ"?1:e==="NegativeZ"?-1:0)}get dependencies(){let e=new Set([this.source]);return this.destination.parent&&e.add(this.destination.parent),e}constructor(e,t){super(e,t),this._aimAxis="PositiveX",this._v3AimAxis=new _(1,0,0),this._dstRestQuat=new M}setInitState(){this._dstRestQuat.copy(this.destination.quaternion)}update(){this.destination.updateWorldMatrix(!0,!1),this.source.updateWorldMatrix(!0,!1);let e=Wr.identity(),t=zr.identity();this.destination.parent&&(Br(this.destination.parent.matrixWorld,e),Oe(t.copy(e)));let n=Dr.copy(this._v3AimAxis).applyQuaternion(this._dstRestQuat).applyQuaternion(e),i=In(this.source.matrixWorld,Fr).sub(In(this.destination.matrixWorld,kr)).normalize(),r=Gr.setFromUnitVectors(n,i).premultiply(t).multiply(e).multiply(this._dstRestQuat);this.destination.quaternion.copy(this._dstRestQuat).slerp(r,this.weight)}};function Xr(e,t){let n=[e],i=e.parent;for(;i!==null;)n.unshift(i),i=i.parent;n.forEach(r=>{t(r)})}var Qr=class{constructor(){this._constraints=new Set,this._objectConstraintsMap=new Map}get constraints(){return this._constraints}addConstraint(e){this._constraints.add(e);let t=this._objectConstraintsMap.get(e.destination);t==null&&(t=new Set,this._objectConstraintsMap.set(e.destination,t)),t.add(e)}deleteConstraint(e){this._constraints.delete(e),this._objectConstraintsMap.get(e.destination).delete(e)}setInitState(){let e=new Set,t=new Set;for(let n of this._constraints)this._processConstraint(n,e,t,i=>i.setInitState())}update(){let e=new Set,t=new Set;for(let n of this._constraints)this._processConstraint(n,e,t,i=>i.update())}_processConstraint(e,t,n,i){if(n.has(e))return;if(t.has(e))throw new Error("VRMNodeConstraintManager: Circular dependency detected while updating constraints");t.add(e);let r=e.dependencies;for(let o of r)Xr(o,a=>{let l=this._objectConstraintsMap.get(a);if(l)for(let s of l)this._processConstraint(s,t,n,i)});i(e),n.add(e)}},Yr=new M,qr=new M,$r=class extends ht{get dependencies(){return new Set([this.source])}constructor(e,t){super(e,t),this._dstRestQuat=new M,this._invSrcRestQuat=new M}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Oe(this._invSrcRestQuat.copy(this.source.quaternion))}update(){let e=Yr.copy(this._invSrcRestQuat).multiply(this.source.quaternion),t=qr.copy(this._dstRestQuat).multiply(e);this.destination.quaternion.copy(this._dstRestQuat).slerp(t,this.weight)}},Zr=new _,Jr=new M,Kr=new M,eo=class extends ht{get rollAxis(){return this._rollAxis}set rollAxis(e){this._rollAxis=e,this._v3RollAxis.set(e==="X"?1:0,e==="Y"?1:0,e==="Z"?1:0)}get dependencies(){return new Set([this.source])}constructor(e,t){super(e,t),this._rollAxis="X",this._v3RollAxis=new _(1,0,0),this._dstRestQuat=new M,this._invDstRestQuat=new M,this._invSrcRestQuatMulDstRestQuat=new M}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Oe(this._invDstRestQuat.copy(this._dstRestQuat)),Oe(this._invSrcRestQuatMulDstRestQuat.copy(this.source.quaternion)).multiply(this._dstRestQuat)}update(){let e=Jr.copy(this._invDstRestQuat).multiply(this.source.quaternion).multiply(this._invSrcRestQuatMulDstRestQuat),t=Zr.copy(this._v3RollAxis).applyQuaternion(e),i=Kr.setFromUnitVectors(t,this._v3RollAxis).premultiply(this._dstRestQuat).multiply(e);this.destination.quaternion.copy(this._dstRestQuat).slerp(i,this.weight)}},to=new Set(["1.0","1.0-beta"]),Kn=class xe{get name(){return xe.EXTENSION_NAME}constructor(t,n){this.parser=t,this.helperRoot=n?.helperRoot}afterRoot(t){return bn(this,null,function*(){t.userData.vrmNodeConstraintManager=yield this._import(t)})}_import(t){return bn(this,null,function*(){var n;let i=this.parser.json;if(!(((n=i.extensionsUsed)==null?void 0:n.indexOf(xe.EXTENSION_NAME))!==-1))return null;let o=new Qr,a=yield this.parser.getDependencies("node");return a.forEach((l,s)=>{var u;let d=i.nodes[s],h=(u=d?.extensions)==null?void 0:u[xe.EXTENSION_NAME];if(h==null)return;let c=h.specVersion;if(!to.has(c)){console.warn(`VRMNodeConstraintLoaderPlugin: Unknown ${xe.EXTENSION_NAME} specVersion "${c}"`);return}let p=h.constraint;if(p.roll!=null){let m=this._importRollConstraint(l,a,p.roll);o.addConstraint(m)}else if(p.aim!=null){let m=this._importAimConstraint(l,a,p.aim);o.addConstraint(m)}else if(p.rotation!=null){let m=this._importRotationConstraint(l,a,p.rotation);o.addConstraint(m)}}),t.scene.updateMatrixWorld(),o.setInitState(),o})}_importRollConstraint(t,n,i){let{source:r,rollAxis:o,weight:a}=i,l=n[r],s=new eo(t,l);if(o!=null&&(s.rollAxis=o),a!=null&&(s.weight=a),this.helperRoot){let u=new Ze(s);this.helperRoot.add(u)}return s}_importAimConstraint(t,n,i){let{source:r,aimAxis:o,weight:a}=i,l=n[r],s=new jr(t,l);if(o!=null&&(s.aimAxis=o),a!=null&&(s.weight=a),this.helperRoot){let u=new Ze(s);this.helperRoot.add(u)}return s}_importRotationConstraint(t,n,i){let{source:r,weight:o}=i,a=n[r],l=new $r(t,a);if(o!=null&&(l.weight=o),this.helperRoot){let s=new Ze(l);this.helperRoot.add(s)}return l}};Kn.EXTENSION_NAME="VRMC_node_constraint";var no=Kn,be=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),ct=class{},Je=new _,te=new _,ei=class extends ct{get type(){return"capsule"}constructor(e){var t,n,i,r;super(),this.offset=(t=e?.offset)!=null?t:new _(0,0,0),this.tail=(n=e?.tail)!=null?n:new _(0,0,0),this.radius=(i=e?.radius)!=null?i:0,this.inside=(r=e?.inside)!=null?r:!1}calculateCollision(e,t,n,i){Je.setFromMatrixPosition(e),te.subVectors(this.tail,this.offset).applyMatrix4(e),te.sub(Je);let r=te.lengthSq();i.copy(t).sub(Je);let o=te.dot(i);o<=0||(r<=o||te.multiplyScalar(o/r),i.sub(te));let a=i.length(),l=this.inside?this.radius-n-a:a-n-this.radius;return l<0&&(i.multiplyScalar(1/a),this.inside&&i.negate()),l}},Ke=new _,Hn=new D,ti=class extends ct{get type(){return"plane"}constructor(e){var t,n;super(),this.offset=(t=e?.offset)!=null?t:new _(0,0,0),this.normal=(n=e?.normal)!=null?n:new _(0,0,1)}calculateCollision(e,t,n,i){i.setFromMatrixPosition(e),i.negate().add(t),Hn.getNormalMatrix(e),Ke.copy(this.normal).applyNormalMatrix(Hn).normalize();let r=i.dot(Ke)-n;return i.copy(Ke),r}},io=new _,ni=class extends ct{get type(){return"sphere"}constructor(e){var t,n,i;super(),this.offset=(t=e?.offset)!=null?t:new _(0,0,0),this.radius=(n=e?.radius)!=null?n:0,this.inside=(i=e?.inside)!=null?i:!1}calculateCollision(e,t,n,i){i.subVectors(t,io.setFromMatrixPosition(e));let r=i.length(),o=this.inside?this.radius-n-r:r-n-this.radius;return o<0&&(i.multiplyScalar(1/r),this.inside&&i.negate()),o}},j=new _,ro=class extends U{constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new _,this._currentTail=new _,this._shape=e,this._attrPos=new I(new Float32Array(396),3),this.setAttribute("position",this._attrPos),this._attrIndex=new I(new Uint16Array(264),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1,t=this._shape.radius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0);let n=j.copy(this._shape.tail).divideScalar(this.worldScale);this._currentTail.distanceToSquared(n)>1e-10&&(this._currentTail.copy(n),e=!0),e&&this._buildPosition()}_buildPosition(){j.copy(this._currentTail).sub(this._currentOffset);let e=j.length()/this._currentRadius;for(let i=0;i<=16;i++){let r=i/16*Math.PI;this._attrPos.setXYZ(i,-Math.sin(r),-Math.cos(r),0),this._attrPos.setXYZ(17+i,e+Math.sin(r),Math.cos(r),0),this._attrPos.setXYZ(34+i,-Math.sin(r),0,-Math.cos(r)),this._attrPos.setXYZ(51+i,e+Math.sin(r),0,Math.cos(r))}for(let i=0;i<32;i++){let r=i/16*Math.PI;this._attrPos.setXYZ(68+i,0,Math.sin(r),Math.cos(r)),this._attrPos.setXYZ(100+i,e,Math.sin(r),Math.cos(r))}let t=Math.atan2(j.y,Math.sqrt(j.x*j.x+j.z*j.z)),n=-Math.atan2(j.z,j.x);this.rotateZ(t),this.rotateY(n),this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<34;e++){let t=(e+1)%34;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(68+e*2,34+e,34+t)}for(let e=0;e<32;e++){let t=(e+1)%32;this._attrIndex.setXY(136+e*2,68+e,68+t),this._attrIndex.setXY(200+e*2,100+e,100+t)}this._attrIndex.needsUpdate=!0}},oo=class extends U{constructor(e){super(),this.worldScale=1,this._currentOffset=new _,this._currentNormal=new _,this._shape=e,this._attrPos=new I(new Float32Array(18),3),this.setAttribute("position",this._attrPos),this._attrIndex=new I(new Uint16Array(10),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0),this._currentNormal.equals(this._shape.normal)||(this._currentNormal.copy(this._shape.normal),e=!0),e&&this._buildPosition()}_buildPosition(){this._attrPos.setXYZ(0,-.5,-.5,0),this._attrPos.setXYZ(1,.5,-.5,0),this._attrPos.setXYZ(2,.5,.5,0),this._attrPos.setXYZ(3,-.5,.5,0),this._attrPos.setXYZ(4,0,0,0),this._attrPos.setXYZ(5,0,0,.25),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this.lookAt(this._currentNormal),this._attrPos.needsUpdate=!0}_buildIndex(){this._attrIndex.setXY(0,0,1),this._attrIndex.setXY(2,1,2),this._attrIndex.setXY(4,2,3),this._attrIndex.setXY(6,3,0),this._attrIndex.setXY(8,4,5),this._attrIndex.needsUpdate=!0}},so=class extends U{constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new _,this._shape=e,this._attrPos=new I(new Float32Array(288),3),this.setAttribute("position",this._attrPos),this._attrIndex=new I(new Uint16Array(192),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1,t=this._shape.radius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){let t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){let t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.needsUpdate=!0}},ao=new _,et=class extends F{constructor(e){if(super(),this.matrixAutoUpdate=!1,this.collider=e,this.collider.shape instanceof ni)this._geometry=new so(this.collider.shape);else if(this.collider.shape instanceof ei)this._geometry=new ro(this.collider.shape);else if(this.collider.shape instanceof ti)this._geometry=new oo(this.collider.shape);else throw new Error("VRMSpringBoneColliderHelper: Unknown collider shape type detected");let t=new Y({color:16711935,depthTest:!1,depthWrite:!1});this._line=new oe(this._geometry,t),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(e){this.collider.updateWorldMatrix(!0,!1),this.matrix.copy(this.collider.matrixWorld);let t=this.matrix.elements;this._geometry.worldScale=ao.set(t[0],t[1],t[2]).length(),this._geometry.update(),super.updateMatrixWorld(e)}},lo=class extends U{constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentTail=new _,this._springBone=e,this._attrPos=new I(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new I(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1,t=this._springBone.settings.hitRadius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentTail.equals(this._springBone.initialLocalChildPosition)||(this._currentTail.copy(this._springBone.initialLocalChildPosition),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){let t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){let t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}},uo=new _,ho=class extends F{constructor(e){super(),this.matrixAutoUpdate=!1,this.springBone=e,this._geometry=new lo(this.springBone);let t=new Y({color:16776960,depthTest:!1,depthWrite:!1});this._line=new oe(this._geometry,t),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(e){this.springBone.bone.updateWorldMatrix(!0,!1),this.matrix.copy(this.springBone.bone.matrixWorld);let t=this.matrix.elements;this._geometry.worldScale=uo.set(t[0],t[1],t[2]).length(),this._geometry.update(),super.updateMatrixWorld(e)}},tt=class extends J{constructor(e){super(),this.colliderMatrix=new C,this.shape=e}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),co(this.colliderMatrix,this.matrixWorld,this.shape.offset)}};function co(e,t,n){let i=t.elements;e.copy(t),n&&(e.elements[12]=i[0]*n.x+i[4]*n.y+i[8]*n.z+i[12],e.elements[13]=i[1]*n.x+i[5]*n.y+i[9]*n.z+i[13],e.elements[14]=i[2]*n.x+i[6]*n.y+i[10]*n.z+i[14])}var po=new C;function fo(e){return e.invert?e.invert():e.getInverse(po.copy(e)),e}var mo=class{constructor(e){this._inverseCache=new C,this._shouldUpdateInverse=!0,this.matrix=e;let t={set:(n,i,r)=>(this._shouldUpdateInverse=!0,n[i]=r,!0)};this._originalElements=e.elements,e.elements=new Proxy(e.elements,t)}get inverse(){return this._shouldUpdateInverse&&(fo(this._inverseCache.copy(this.matrix)),this._shouldUpdateInverse=!1),this._inverseCache}revert(){this.matrix.elements=this._originalElements}},nt=new C,ue=new _,Me=new _,Re=new _,Te=new _,_o=new C,go=class{constructor(e,t,n={},i=[]){this._currentTail=new _,this._prevTail=new _,this._boneAxis=new _,this._worldSpaceBoneLength=0,this._center=null,this._initialLocalMatrix=new C,this._initialLocalRotation=new M,this._initialLocalChildPosition=new _;var r,o,a,l,s,u;this.bone=e,this.bone.matrixAutoUpdate=!1,this.child=t,this.settings={hitRadius:(r=n.hitRadius)!=null?r:0,stiffness:(o=n.stiffness)!=null?o:1,gravityPower:(a=n.gravityPower)!=null?a:0,gravityDir:(s=(l=n.gravityDir)==null?void 0:l.clone())!=null?s:new _(0,-1,0),dragForce:(u=n.dragForce)!=null?u:.4},this.colliderGroups=i}get dependencies(){let e=new Set,t=this.bone.parent;t&&e.add(t);for(let n=0;n<this.colliderGroups.length;n++)for(let i=0;i<this.colliderGroups[n].colliders.length;i++)e.add(this.colliderGroups[n].colliders[i]);return e}get center(){return this._center}set center(e){var t;(t=this._center)!=null&&t.userData.inverseCacheProxy&&(this._center.userData.inverseCacheProxy.revert(),delete this._center.userData.inverseCacheProxy),this._center=e,this._center&&(this._center.userData.inverseCacheProxy||(this._center.userData.inverseCacheProxy=new mo(this._center.matrixWorld)))}get initialLocalChildPosition(){return this._initialLocalChildPosition}get _parentMatrixWorld(){return this.bone.parent?this.bone.parent.matrixWorld:nt}setInitState(){this._initialLocalMatrix.copy(this.bone.matrix),this._initialLocalRotation.copy(this.bone.quaternion),this.child?this._initialLocalChildPosition.copy(this.child.position):this._initialLocalChildPosition.copy(this.bone.position).normalize().multiplyScalar(.07);let e=this._getMatrixWorldToCenter();this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(e),this._prevTail.copy(this._currentTail),this._boneAxis.copy(this._initialLocalChildPosition).normalize()}reset(){this.bone.quaternion.copy(this._initialLocalRotation),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix);let e=this._getMatrixWorldToCenter();this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(e),this._prevTail.copy(this._currentTail)}update(e){if(e<=0)return;this._calcWorldSpaceBoneLength();let t=Me.copy(this._boneAxis).transformDirection(this._initialLocalMatrix).transformDirection(this._parentMatrixWorld);Te.copy(this._currentTail).add(ue.subVectors(this._currentTail,this._prevTail).multiplyScalar(1-this.settings.dragForce)).applyMatrix4(this._getMatrixCenterToWorld()).addScaledVector(t,this.settings.stiffness*e).addScaledVector(this.settings.gravityDir,this.settings.gravityPower*e),Re.setFromMatrixPosition(this.bone.matrixWorld),Te.sub(Re).normalize().multiplyScalar(this._worldSpaceBoneLength).add(Re),this._collision(Te),this._prevTail.copy(this._currentTail),this._currentTail.copy(Te).applyMatrix4(this._getMatrixWorldToCenter());let n=_o.multiplyMatrices(this._parentMatrixWorld,this._initialLocalMatrix).invert();this.bone.quaternion.setFromUnitVectors(this._boneAxis,ue.copy(Te).applyMatrix4(n).normalize()).premultiply(this._initialLocalRotation),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix)}_collision(e){for(let t=0;t<this.colliderGroups.length;t++)for(let n=0;n<this.colliderGroups[t].colliders.length;n++){let i=this.colliderGroups[t].colliders[n],r=i.shape.calculateCollision(i.colliderMatrix,e,this.settings.hitRadius,ue);if(r<0){e.addScaledVector(ue,-r),e.sub(Re);let o=e.length();e.multiplyScalar(this._worldSpaceBoneLength/o).add(Re)}}}_calcWorldSpaceBoneLength(){ue.setFromMatrixPosition(this.bone.matrixWorld),this.child?Me.setFromMatrixPosition(this.child.matrixWorld):(Me.copy(this._initialLocalChildPosition),Me.applyMatrix4(this.bone.matrixWorld)),this._worldSpaceBoneLength=ue.sub(Me).length()}_getMatrixCenterToWorld(){return this._center?this._center.matrixWorld:nt}_getMatrixWorldToCenter(){return this._center?this._center.userData.inverseCacheProxy.inverse:nt}};function vo(e,t){let n=[],i=e;for(;i!==null;)n.unshift(i),i=i.parent;n.forEach(r=>{t(r)})}function ut(e,t){e.children.forEach(n=>{t(n)||ut(n,t)})}function Eo(e){var t;let n=new Map;for(let i of e){let r=i;do{let o=((t=n.get(r))!=null?t:0)+1;if(o===e.size)return r;n.set(r,o),r=r.parent}while(r!==null)}return null}var Vn=class{constructor(){this._joints=new Set,this._sortedJoints=[],this._hasWarnedCircularDependency=!1,this._ancestors=[],this._objectSpringBonesMap=new Map,this._isSortedJointsDirty=!1,this._relevantChildrenUpdated=this._relevantChildrenUpdated.bind(this)}get joints(){return this._joints}get springBones(){return console.warn("VRMSpringBoneManager: springBones is deprecated. use joints instead."),this._joints}get colliderGroups(){let e=new Set;return this._joints.forEach(t=>{t.colliderGroups.forEach(n=>{e.add(n)})}),Array.from(e)}get colliders(){let e=new Set;return this.colliderGroups.forEach(t=>{t.colliders.forEach(n=>{e.add(n)})}),Array.from(e)}addJoint(e){this._joints.add(e);let t=this._objectSpringBonesMap.get(e.bone);t==null&&(t=new Set,this._objectSpringBonesMap.set(e.bone,t)),t.add(e),this._isSortedJointsDirty=!0}addSpringBone(e){console.warn("VRMSpringBoneManager: addSpringBone() is deprecated. use addJoint() instead."),this.addJoint(e)}deleteJoint(e){this._joints.delete(e),this._objectSpringBonesMap.get(e.bone).delete(e),this._isSortedJointsDirty=!0}deleteSpringBone(e){console.warn("VRMSpringBoneManager: deleteSpringBone() is deprecated. use deleteJoint() instead."),this.deleteJoint(e)}setInitState(){this._sortJoints();for(let e=0;e<this._sortedJoints.length;e++){let t=this._sortedJoints[e];t.bone.updateMatrix(),t.bone.updateWorldMatrix(!1,!1),t.setInitState()}}reset(){this._sortJoints();for(let e=0;e<this._sortedJoints.length;e++){let t=this._sortedJoints[e];t.bone.updateMatrix(),t.bone.updateWorldMatrix(!1,!1),t.reset()}}update(e){this._sortJoints();for(let t=0;t<this._ancestors.length;t++)this._ancestors[t].updateWorldMatrix(t===0,!1);for(let t=0;t<this._sortedJoints.length;t++){let n=this._sortedJoints[t];n.bone.updateMatrix(),n.bone.updateWorldMatrix(!1,!1),n.update(e),ut(n.bone,this._relevantChildrenUpdated)}}_sortJoints(){if(!this._isSortedJointsDirty)return;let e=[],t=new Set,n=new Set,i=new Set;for(let o of this._joints)this._insertJointSort(o,t,n,e,i);this._sortedJoints=e;let r=Eo(i);this._ancestors=[],r&&(this._ancestors.push(r),ut(r,o=>{var a,l;return((l=(a=this._objectSpringBonesMap.get(o))==null?void 0:a.size)!=null?l:0)>0?!0:(this._ancestors.push(o),!1)})),this._isSortedJointsDirty=!1}_insertJointSort(e,t,n,i,r){if(n.has(e))return;if(t.has(e)){this._hasWarnedCircularDependency||(console.warn("VRMSpringBoneManager: Circular dependency detected"),this._hasWarnedCircularDependency=!0);return}t.add(e);let o=e.dependencies;for(let a of o){let l=!1,s=null;vo(a,u=>{let d=this._objectSpringBonesMap.get(u);if(d)for(let h of d)l=!0,this._insertJointSort(h,t,n,i,r);else l||(s=u)}),s&&r.add(s)}i.push(e),n.add(e)}_relevantChildrenUpdated(e){var t,n;return((n=(t=this._objectSpringBonesMap.get(e))==null?void 0:t.size)!=null?n:0)>0?!0:(e.updateWorldMatrix(!1,!1),!1)}},Un="VRMC_springBone_extended_collider",Mo=new Set(["1.0","1.0-beta"]),Ro=new Set(["1.0"]),ii=class he{get name(){return he.EXTENSION_NAME}constructor(t,n){var i;this.parser=t,this.jointHelperRoot=n?.jointHelperRoot,this.colliderHelperRoot=n?.colliderHelperRoot,this.useExtendedColliders=(i=n?.useExtendedColliders)!=null?i:!0}afterRoot(t){return be(this,null,function*(){t.userData.vrmSpringBoneManager=yield this._import(t)})}_import(t){return be(this,null,function*(){let n=yield this._v1Import(t);if(n!=null)return n;let i=yield this._v0Import(t);return i??null})}_v1Import(t){return be(this,null,function*(){var n,i,r,o,a;let l=t.parser.json;if(!(((n=l.extensionsUsed)==null?void 0:n.indexOf(he.EXTENSION_NAME))!==-1))return null;let u=new Vn,d=yield t.parser.getDependencies("node"),h=(i=l.extensions)==null?void 0:i[he.EXTENSION_NAME];if(!h)return null;let c=h.specVersion;if(!Mo.has(c))return console.warn(`VRMSpringBoneLoaderPlugin: Unknown ${he.EXTENSION_NAME} specVersion "${c}"`),null;let p=(r=h.colliders)==null?void 0:r.map((f,g)=>{var v,x,w,y,R,T,S,P,V,b,H,O,Q,pe,fe;let X=d[f.node];if(X==null)return console.warn(`VRMSpringBoneLoaderPlugin: The collider #${g} attempted to reference a node #${f.node} but not found. Skipping the collider`),null;let W=f.shape,ie=(v=f.extensions)==null?void 0:v[Un];if(this.useExtendedColliders&&ie!=null){let me=ie.specVersion;if(!Ro.has(me))console.warn(`VRMSpringBoneLoaderPlugin: Unknown ${Un} specVersion "${me}". Fallbacking to the ${he.EXTENSION_NAME} definition`);else{let N=ie.shape;if(N.sphere)return this._importSphereCollider(X,{offset:new _().fromArray((x=N.sphere.offset)!=null?x:[0,0,0]),radius:(w=N.sphere.radius)!=null?w:0,inside:(y=N.sphere.inside)!=null?y:!1});if(N.capsule)return this._importCapsuleCollider(X,{offset:new _().fromArray((R=N.capsule.offset)!=null?R:[0,0,0]),radius:(T=N.capsule.radius)!=null?T:0,tail:new _().fromArray((S=N.capsule.tail)!=null?S:[0,0,0]),inside:(P=N.capsule.inside)!=null?P:!1});if(N.plane)return this._importPlaneCollider(X,{offset:new _().fromArray((V=N.plane.offset)!=null?V:[0,0,0]),normal:new _().fromArray((b=N.plane.normal)!=null?b:[0,0,1])})}}if(W.sphere)return this._importSphereCollider(X,{offset:new _().fromArray((H=W.sphere.offset)!=null?H:[0,0,0]),radius:(O=W.sphere.radius)!=null?O:0,inside:!1});if(W.capsule)return this._importCapsuleCollider(X,{offset:new _().fromArray((Q=W.capsule.offset)!=null?Q:[0,0,0]),radius:(pe=W.capsule.radius)!=null?pe:0,tail:new _().fromArray((fe=W.capsule.tail)!=null?fe:[0,0,0]),inside:!1});console.warn(`VRMSpringBoneLoaderPlugin: The collider #${g} has no valid shape. Skipping the collider`)}),m=(o=h.colliderGroups)==null?void 0:o.map((f,g)=>{var v;return{colliders:((v=f.colliders)!=null?v:[]).map(w=>{let y=p?.[w];return y??(console.warn(`VRMSpringBoneLoaderPlugin: The collider group #${g} attempted to reference a collider #${w} but not found. Skipping the collider`),null)}).filter(w=>w!=null),name:f.name}});return(a=h.springs)==null||a.forEach((f,g)=>{var v;let x=f.joints,w=(v=f.colliderGroups)==null?void 0:v.map(T=>{let S=m?.[T];return S??(console.warn(`VRMSpringBoneLoaderPlugin: The spring #${g} attempted to reference a collider group #${T} but not found. Skipping the collider group`),null)}).filter(T=>T!=null),y=f.center!=null?d[f.center]:void 0,R;x.forEach(T=>{if(R){let S=R.node,P=d[S],V=T.node,b=d[V],H={hitRadius:R.hitRadius,dragForce:R.dragForce,gravityPower:R.gravityPower,stiffness:R.stiffness,gravityDir:R.gravityDir!=null?new _().fromArray(R.gravityDir):void 0},O=this._importJoint(P,b,H,w);y&&(O.center=y),u.addJoint(O)}R=T})}),u.setInitState(),u})}_v0Import(t){return be(this,null,function*(){var n,i,r;let o=t.parser.json;if(!(((n=o.extensionsUsed)==null?void 0:n.indexOf("VRM"))!==-1))return null;let l=(i=o.extensions)==null?void 0:i.VRM,s=l?.secondaryAnimation;if(!s)return null;let u=s?.boneGroups;if(!u)return null;let d=new Vn,h=yield t.parser.getDependencies("node"),c=(r=s.colliderGroups)==null?void 0:r.map((p,m)=>{var f;let g=h[p.node];return g==null?(console.warn(`VRMSpringBoneLoaderPlugin: The collider group #${m} attempted to reference a node #${p.node} but not found. Skipping the collider group`),null):{colliders:((f=p.colliders)!=null?f:[]).map((x,w)=>{var y,R,T;let S=new _(0,0,0);return x.offset&&S.set((y=x.offset.x)!=null?y:0,(R=x.offset.y)!=null?R:0,x.offset.z?-x.offset.z:0),this._importSphereCollider(g,{offset:S,radius:(T=x.radius)!=null?T:0,inside:!1})})}});return u?.forEach((p,m)=>{let f=p.bones;f&&f.forEach(g=>{var v,x,w,y;let R=h[g];if(R==null){console.warn(`VRMSpringBoneLoaderPlugin: The spring bone group #${m} attempted to reference a node #${g} but not found. Skipping the node`);return}let T=new _;p.gravityDir?T.set((v=p.gravityDir.x)!=null?v:0,(x=p.gravityDir.y)!=null?x:0,(w=p.gravityDir.z)!=null?w:0):T.set(0,-1,0);let S=p.center!=null?h[p.center]:void 0,P={hitRadius:p.hitRadius,dragForce:p.dragForce,gravityPower:p.gravityPower,stiffness:p.stiffiness,gravityDir:T},V=(y=p.colliderGroups)==null?void 0:y.map(b=>{let H=c?.[b];return H??(console.warn(`VRMSpringBoneLoaderPlugin: The spring #${m} attempted to reference a collider group #${b} but not found. Skipping the collider group`),null)}).filter(b=>b!=null);R.traverse(b=>{var H;let O=(H=b.children[0])!=null?H:null,Q=this._importJoint(b,O,P,V);S&&(Q.center=S),d.addJoint(Q)})})}),t.scene.updateMatrixWorld(),d.setInitState(),d})}_importJoint(t,n,i,r){let o=new go(t,n,i,r);if(this.jointHelperRoot){let a=new ho(o);this.jointHelperRoot.add(a),a.renderOrder=this.jointHelperRoot.renderOrder}return o}_importSphereCollider(t,n){let i=new ni(n),r=new tt(i);if(t.add(r),this.colliderHelperRoot){let o=new et(r);this.colliderHelperRoot.add(o),o.renderOrder=this.colliderHelperRoot.renderOrder}return r}_importCapsuleCollider(t,n){let i=new ei(n),r=new tt(i);if(t.add(r),this.colliderHelperRoot){let o=new et(r);this.colliderHelperRoot.add(o),o.renderOrder=this.colliderHelperRoot.renderOrder}return r}_importPlaneCollider(t,n){let i=new ti(n),r=new tt(i);if(t.add(r),this.colliderHelperRoot){let o=new et(r);this.colliderHelperRoot.add(o),o.renderOrder=this.colliderHelperRoot.renderOrder}return r}};ii.EXTENSION_NAME="VRMC_springBone";var To=ii,qo=class{get name(){return"VRMLoaderPlugin"}constructor(e,t){var n,i,r,o,a,l,s,u,d,h;this.parser=e;let c=t?.helperRoot,p=t?.autoUpdateHumanBones;this.expressionPlugin=(n=t?.expressionPlugin)!=null?n:new Bi(e),this.firstPersonPlugin=(i=t?.firstPersonPlugin)!=null?i:new Fi(e),this.humanoidPlugin=(r=t?.humanoidPlugin)!=null?r:new Qi(e,{helperRoot:c,autoUpdateHumanBones:p}),this.lookAtPlugin=(o=t?.lookAtPlugin)!=null?o:new lr(e,{helperRoot:c}),this.metaPlugin=(a=t?.metaPlugin)!=null?a:new hr(e),this.mtoonMaterialPlugin=(l=t?.mtoonMaterialPlugin)!=null?l:new Sr(e),this.materialsHDREmissiveMultiplierPlugin=(s=t?.materialsHDREmissiveMultiplierPlugin)!=null?s:new Pr(e),this.materialsV0CompatPlugin=(u=t?.materialsV0CompatPlugin)!=null?u:new Or(e),this.springBonePlugin=(d=t?.springBonePlugin)!=null?d:new To(e,{colliderHelperRoot:c,jointHelperRoot:c}),this.nodeConstraintPlugin=(h=t?.nodeConstraintPlugin)!=null?h:new no(e,{helperRoot:c})}beforeRoot(){return Ae(this,null,function*(){yield this.materialsV0CompatPlugin.beforeRoot(),yield this.mtoonMaterialPlugin.beforeRoot()})}loadMesh(e){return Ae(this,null,function*(){return yield this.mtoonMaterialPlugin.loadMesh(e)})}getMaterialType(e){let t=this.mtoonMaterialPlugin.getMaterialType(e);return t??null}extendMaterialParams(e,t){return Ae(this,null,function*(){yield this.materialsHDREmissiveMultiplierPlugin.extendMaterialParams(e,t),yield this.mtoonMaterialPlugin.extendMaterialParams(e,t)})}afterRoot(e){return Ae(this,null,function*(){yield this.metaPlugin.afterRoot(e),yield this.humanoidPlugin.afterRoot(e),yield this.expressionPlugin.afterRoot(e),yield this.lookAtPlugin.afterRoot(e),yield this.firstPersonPlugin.afterRoot(e),yield this.springBonePlugin.afterRoot(e),yield this.nodeConstraintPlugin.afterRoot(e),yield this.mtoonMaterialPlugin.afterRoot(e);let t=e.userData.vrmMeta,n=e.userData.vrmHumanoid;if(t&&n){let i=new pr({scene:e.scene,expressionManager:e.userData.vrmExpressionManager,firstPerson:e.userData.vrmFirstPerson,humanoid:n,lookAt:e.userData.vrmLookAt,meta:t,materials:e.userData.vrmMToonMaterials,springBoneManager:e.userData.vrmSpringBoneManager,nodeConstraintManager:e.userData.vrmNodeConstraintManager});e.userData.vrm=i}})}};function xo(e){let t=new Set;return e.traverse(n=>{if(!n.isMesh)return;let i=n;t.add(i)}),t}function On(e,t,n){if(t.size===1){let a=t.values().next().value;if(a.weight===1)return e[a.index]}let i=new Float32Array(e[0].count*3),r=0;if(n)r=1;else for(let a of t)r+=a.weight;for(let a of t){let l=e[a.index],s=a.weight/r;for(let u=0;u<l.count;u++)i[u*3+0]+=l.getX(u)*s,i[u*3+1]+=l.getY(u)*s,i[u*3+2]+=l.getZ(u)*s}return new I(i,3)}function yo(e){var t;let n=xo(e.scene),i=new Map,r=(t=e.expressionManager)==null?void 0:t.expressionMap;if(r!=null)for(let[o,a]of Object.entries(r)){let l=new Set;for(let s of a.binds)if(s instanceof Ue){if(s.weight!==0)for(let u of s.primitives){let d=i.get(u);d==null&&(d=new Map,i.set(u,d));let h=d.get(o);h==null&&(h=new Set,d.set(o,h)),h.add(s)}l.add(s)}for(let s of l)a.deleteBind(s)}for(let o of n){let a=i.get(o);if(a==null)continue;let l=o.geometry.morphAttributes;o.geometry.morphAttributes={};let s=o.geometry.clone();o.geometry=s;let u=s.morphTargetsRelative,d=l.position!=null,h=l.normal!=null,c={},p={},m=[];if(d||h){d&&(c.position=[]),h&&(c.normal=[]);let f=0;for(let[g,v]of a)d&&(c.position[f]=On(l.position,v,u)),h&&(c.normal[f]=On(l.normal,v,u)),r?.[g].addBind(new Ue({index:f,weight:1,primitives:[o]})),p[g]=f,m.push(0),f++}s.morphAttributes=c,o.morphTargetDictionary=p,o.morphTargetInfluences=m}}function Ce(e,t,n){if(e.getComponent)return e.getComponent(t,n);{let i=e.array[t*e.itemSize+n];return e.normalized&&(i=L.denormalize(i,e.array)),i}}function ri(e,t,n,i){e.setComponent?e.setComponent(t,n,i):(e.normalized&&(i=L.normalize(i,e.array)),e.array[t*e.itemSize+n]=i)}function wo(e){var t;let n=So(e),i=new Set;for(let h of n)i.has(h.geometry)&&(h.geometry=Ho(h.geometry)),i.add(h.geometry);let r=new Map;for(let h of i){let c=h.getAttribute("skinIndex"),p=(t=r.get(c))!=null?t:new Map;r.set(c,p);let m=h.getAttribute("skinWeight"),f=Ao(c,m);p.set(m,f)}let o=new Map;for(let h of n){let c=Po(h,r);o.set(h,c)}let a=[];for(let[h,c]of o){let p=!1;for(let m of a)if(Lo(c,m.boneInverseMap)){p=!0,m.meshes.add(h);for(let[g,v]of c)m.boneInverseMap.set(g,v);break}p||a.push({boneInverseMap:c,meshes:new Set([h])})}let l=new Map,s=new it,u=new it,d=new it;for(let h of a){let{boneInverseMap:c,meshes:p}=h,m=Array.from(c.keys()),f=Array.from(c.values()),g=new re(m,f),v=u.getOrCreate(g);for(let x of p){let w=x.geometry.getAttribute("skinIndex"),y=s.getOrCreate(w),R=x.skeleton.bones,T=R.map(V=>d.getOrCreate(V)).join(","),S=`${y};${v};${T}`,P=l.get(S);P==null&&(P=w.clone(),bo(P,R,m),l.set(S,P)),x.geometry.setAttribute("skinIndex",P)}for(let x of p)x.bind(g,new C)}}function So(e){let t=new Set;return e.traverse(n=>{if(!n.isSkinnedMesh)return;let i=n;t.add(i)}),t}function Ao(e,t){let n=new Set;for(let i=0;i<e.count;i++)for(let r=0;r<e.itemSize;r++){let o=Ce(e,i,r);Ce(t,i,r)!==0&&n.add(o)}return n}function Po(e,t){let n=new Map,i=e.skeleton,r=e.geometry,o=r.getAttribute("skinIndex"),a=r.getAttribute("skinWeight"),l=t.get(o),s=l?.get(a);if(!s)throw new Error("Unreachable. attributeUsedIndexSetMap does not know the skin index attribute or the skin weight attribute.");for(let u of s)n.set(i.bones[u],i.boneInverses[u]);return n}function Lo(e,t){for(let[n,i]of e.entries()){let r=t.get(n);if(r!=null&&!Io(i,r))return!1}return!0}function bo(e,t,n){let i=new Map;for(let o of t)i.set(o,i.size);let r=new Map;for(let[o,a]of n.entries()){let l=i.get(a);r.set(l,o)}for(let o=0;o<e.count;o++)for(let a=0;a<e.itemSize;a++){let l=Ce(e,o,a),s=r.get(l);ri(e,o,a,s)}e.needsUpdate=!0}function Io(e,t,n){if(n=n||1e-4,e.elements.length!=t.elements.length)return!1;for(let i=0,r=e.elements.length;i<r;i++)if(Math.abs(e.elements[i]-t.elements[i])>n)return!1;return!0}var it=class{constructor(){this._objectIndexMap=new Map,this._index=0}get(e){return this._objectIndexMap.get(e)}getOrCreate(e){let t=this._objectIndexMap.get(e);return t==null&&(t=this._index,this._objectIndexMap.set(e,t),this._index++),t}};function Ho(e){var t,n,i,r;let o=new U;o.name=e.name,o.setIndex(e.index);for(let[a,l]of Object.entries(e.attributes))o.setAttribute(a,l);for(let[a,l]of Object.entries(e.morphAttributes)){let s=a;o.morphAttributes[s]=l.concat()}o.morphTargetsRelative=e.morphTargetsRelative,o.groups=[];for(let a of e.groups)o.addGroup(a.start,a.count,a.materialIndex);return o.boundingSphere=(n=(t=e.boundingSphere)==null?void 0:t.clone())!=null?n:null,o.boundingBox=(r=(i=e.boundingBox)==null?void 0:i.clone())!=null?r:null,o.drawRange.start=e.drawRange.start,o.drawRange.count=e.drawRange.count,o.userData=e.userData,o}function Cn(e){if(Object.values(e).forEach(t=>{t?.isTexture&&t.dispose()}),e.isShaderMaterial){let t=e.uniforms;t&&Object.values(t).forEach(n=>{let i=n.value;i?.isTexture&&i.dispose()})}e.dispose()}function Vo(e){let t=e.geometry;t&&t.dispose();let n=e.skeleton;n&&n.dispose();let i=e.material;i&&(Array.isArray(i)?i.forEach(r=>Cn(r)):i&&Cn(i))}function Uo(e){e.traverse(Vo)}function Oo(e,t){var n,i;console.warn("VRMUtils.removeUnnecessaryJoints: removeUnnecessaryJoints is deprecated. Use combineSkeletons instead. combineSkeletons contributes more to the performance improvement. This function will be removed in the next major version.");let r=(n=t?.experimentalSameBoneCounts)!=null?n:!1,o=[];e.traverse(s=>{s.type==="SkinnedMesh"&&o.push(s)});let a=new Map,l=0;for(let s of o){let d=s.geometry.getAttribute("skinIndex");if(a.has(d))continue;let h=new Map,c=new Map;for(let p=0;p<d.count;p++)for(let m=0;m<d.itemSize;m++){let f=Ce(d,p,m),g=h.get(f);g==null&&(g=h.size,h.set(f,g),c.set(g,f)),ri(d,p,m,g)}d.needsUpdate=!0,a.set(d,c),l=Math.max(l,h.size)}for(let s of o){let d=s.geometry.getAttribute("skinIndex"),h=a.get(d),c=[],p=[],m=r?l:h.size;for(let g=0;g<m;g++){let v=(i=h.get(g))!=null?i:0;c.push(s.skeleton.bones[v]),p.push(s.skeleton.boneInverses[v])}let f=new re(c,p);s.bind(f,new C)}}function Co(e,t){let n=e.position.count,i=new Array(n),r=0,o=t.array;for(let a=0;a<o.length;a++){let l=o[a];i[l]||(i[l]=!0,r++)}return{isVertexUsed:i,vertexCount:n,verticesUsed:r}}function No(e){let t=[],n=[],i=0;for(let r=0;r<e.length;r++)if(e[r]){let o=i++;t[r]=o,n[o]=r}return{originalIndexNewIndexMap:t,newIndexOriginalIndexMap:n}}function Bo(e,t){var n,i,r,o;t.name=e.name,t.morphTargetsRelative=e.morphTargetsRelative,e.groups.forEach(a=>{t.addGroup(a.start,a.count,a.materialIndex)}),t.boundingBox=(i=(n=e.boundingBox)==null?void 0:n.clone())!=null?i:null,t.boundingSphere=(o=(r=e.boundingSphere)==null?void 0:r.clone())!=null?o:null,t.setDrawRange(e.drawRange.start,e.drawRange.count),t.userData=e.userData}function Do(e,t,n){let i=t.array,r=new i.constructor(i.length);for(let o=0;o<i.length;o++){let a=i[o];r[o]=n[a]}e.setIndex(new I(r,t.itemSize,t.normalized))}function Ne(e,t,n){let i=e.constructor,r=new i(t.length*n),o=!0;for(let a=0;a<t.length;a++){let s=t[a]*n,u=a*n;for(let d=0;d<n;d++){let h=e[s+d];r[u+d]=h,o=o&&h===0}}return[r,o]}function Fo(e){var t;let n=new Map,i=[];for(let[r,o]of Object.entries(e))if(o.isInterleavedBufferAttribute){let a=o,l=a.data,s=(t=n.get(l))!=null?t:[];n.set(l,s),s.push([r,a])}else{let a=o;i.push([r,a])}return[n,i]}function ko(e,t,n){let[i,r]=Fo(t);for(let[o,a]of i){let l=o.array,{stride:s}=o,[u,d]=Ne(l,n,s),h=new ze(u,s);h.setUsage(o.usage);for(let[c,p]of a){let{itemSize:m,offset:f,normalized:g}=p,v=new Ge(h,m,f,g);e.setAttribute(c,v)}}for(let[o,a]of r){let l=a.array,{itemSize:s,normalized:u}=a,[d,h]=Ne(l,n,s);e.setAttribute(o,new I(d,s,u))}}function Wo(e){var t;let n=new Map,i=[];for(let[r,o]of Object.entries(e)){let a=r;for(let l=0;l<o.length;l++){let s=o[l];if(s.isInterleavedBufferAttribute){let u=s,d=u.data,h=(t=n.get(d))!=null?t:[];n.set(d,h),h.push([a,l,u])}else{let u=s;i.push([a,l,u])}}}return[n,i]}function zo(e,t,n){var i,r;let o=!0,[a,l]=Wo(t),s={};for(let[u,d]of a){let h=u.array,{stride:c}=u,[p,m]=Ne(h,n,c);o=o&&m;let f=new ze(p,c);f.setUsage(u.usage);for(let[g,v,x]of d){let{itemSize:w,offset:y,normalized:R}=x,T=new Ge(f,w,y,R);(i=s[g])!=null||(s[g]=[]),s[g][v]=T}}for(let[u,d,h]of l){let c=h,p=c.array,{itemSize:m,normalized:f}=c,[g,v]=Ne(p,n,m);o=o&&v,(r=s[u])!=null||(s[u]=[]),s[u][d]=new I(g,m,f)}e.morphAttributes=o?{}:s}function Go(e){let t=new Map;e.traverse(n=>{if(!n.isMesh)return;let i=n,r=i.geometry,o=r.index;if(o==null)return;let a=t.get(r);if(a!=null){i.geometry=a;return}let{isVertexUsed:l,vertexCount:s,verticesUsed:u}=Co(r.attributes,o);if(u===s)return;let{originalIndexNewIndexMap:d,newIndexOriginalIndexMap:h}=No(l),c=new U;Bo(r,c),t.set(r,c),Do(c,o,d),ko(c,r.attributes,h),zo(c,r.morphAttributes,h),i.geometry=c}),Array.from(t.keys()).forEach(n=>{n.dispose()})}function jo(e){var t;((t=e.meta)==null?void 0:t.metaVersion)==="0"&&(e.scene.rotation.y=Math.PI)}var ce=class{constructor(){}};ce.combineMorphs=yo;ce.combineSkeletons=wo;ce.deepDispose=Uo;ce.removeUnnecessaryJoints=Oo;ce.removeUnnecessaryVertices=Go;ce.rotateVRM0=jo;export{on as a,an as b,yr as c,qo as d,ce as e};
/*! For license information please see chunk-MJUODAZY.js.LEGAL.txt */
