import type {TownDistrictKind} from '@/features/habitat/town-districts';
// Identity-only module: safe for work-site/terrain imports without importing
// layout validation, collision or the renderer back into world geography.
export const TOWN_VENUES:readonly {id:string;name:string;district:TownDistrictKind;x:number;z:number;feature:string}[]=[
 {id:'cf330000-0000-4000-8000-000000000001',name:'Willow Tea Room',district:'center',x:-8,z:2.8,feature:'tea'},
 {id:'cf330000-0000-4000-8000-000000000002',name:'Artisan Community Studio',district:'workshop',x:-82,z:-60.5,feature:'studio'},
 {id:'cf330000-0000-4000-8000-000000000003',name:'Clover Post Office',district:'residential',x:71,z:18.5,feature:'post'},
 {id:'cf330000-0000-4000-8000-000000000004',name:'Tidewater Boathouse',district:'harbor',x:-6,z:-81.5,feature:'boats'},
 {id:'cf330000-0000-4000-8000-000000000005',name:'Sunset Music Lounge',district:'festival',x:70,z:-81.5,feature:'music'},
 {id:'cf330000-0000-4000-8000-000000000006',name:'Applehill Conservatory',district:'orchard',x:69,z:71.5,feature:'plants'},
];
