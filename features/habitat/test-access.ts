/** Test access never grants wallet, Key, membership or backend edit permissions. */
export function isHabitatTestHost(host:string):boolean {
 const hostname=host.trim().toLowerCase().replace(/:\d+$/,'');
 return hostname==='ctrl-staging.suhiro211.workers.dev'||hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]';
}
