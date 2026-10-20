import {lazy,Suspense,createElement} from 'react';
export default function dynamic(load){const Component=lazy(load);return function ClientOnly(props){return createElement(Suspense,{fallback:null},createElement(Component,props));};}
