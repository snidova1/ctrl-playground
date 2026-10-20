'use client';
import {UnsignedByteType} from 'three';
import {useEffect,useMemo} from 'react';import {useFrame,useThree} from '@react-three/fiber';
import {Pipeline} from './vendor/anime-pipeline';
/** Sakura Crossing depth-curvature ink, split-toned paper grade and FXAA.
 * Scene remains real 3D. Render HDR once; tone-map and encode only in final grade.
 * Native-resolution targets deliberately avoid the reference's expensive 1.5x supersampling. */
export default function AnimeFinish(){const {gl,scene,camera,size}=useThree();const pipeline=useMemo(()=>new Pipeline(gl,scene,camera,{pixelBudget:1200000}),[gl,scene,camera]);
 useEffect(()=>{pipeline.setSize(size.width,size.height);},[pipeline,size.width,size.height]);
 useEffect(()=>{const auto=gl.info.autoReset;gl.info.autoReset=false;gl.domElement.dataset.animeTarget=pipeline.rtScene.texture.type===UnsignedByteType?'ldr8':'hdr16f';gl.domElement.dataset.animeFinish='Kuwahara/depth-ink/paper-grade/FXAA';return()=>{pipeline.dispose();gl.info.autoReset=auto;delete gl.domElement.dataset.animeFinish;};},[pipeline,gl]);
 useFrame(()=>{gl.info.reset();pipeline.render();},1);return null;
}
