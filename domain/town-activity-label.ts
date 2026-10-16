// A saved social/room action is not a completed job. Keep the journal faithful
// to the authoritative event, including older records after an application update.
const labels:Readonly<Record<string,string>>={
 completed:'Completed work',started:'Started work',cancelled:'Cancelled work',
 'route-stop':'Finished route stop',plant:'Planted seeds',water:'Watered flowers',harvest:'Harvested flowers',
 dance:'Danced together','high-five':'High five',sat:'Sat down',stood:'Stood up',
 'gathering-hosted':'Hosted a gathering','gathering-attended':'Attended a gathering',
 'switched on':'Switched on','switched off':'Switched off',
 'table-served':'Served the neighborhood table',
};
export function townActivityLabel(kind:string){return Object.hasOwn(labels,kind)?labels[kind]:'Recorded activity';}
