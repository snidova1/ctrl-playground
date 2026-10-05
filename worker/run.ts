export {};
// External worker for resumable queue servicing beyond request lifetimes.
const origin=process.env.APP_ORIGIN,secret=process.env.WORKER_SECRET;
if(!origin||!secret||secret.length<32)throw new Error("Set APP_ORIGIN and a WORKER_SECRET of at least 32 characters.");
const url=new URL("/api/engine/tick",origin);if(url.protocol!=="https:"&&url.hostname!=="localhost")throw new Error("Worker origin must use HTTPS.");
let stop=false;process.on("SIGINT",()=>{stop=true;});process.on("SIGTERM",()=>{stop=true;});
while(!stop){try{const r=await fetch(url,{method:"POST",headers:{...(process.env.SITE_ACCESS_TOKEN?{"OAI-Sites-Authorization":`Bearer ${process.env.SITE_ACCESS_TOKEN}`}:{ }),Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},body:"{}",signal:AbortSignal.timeout(150000)});if(!r.ok)console.error(`Worker tick failed (${r.status})`);}catch(e){console.error(e instanceof Error?e.message:"Worker tick failed");}if(process.argv.includes("--once"))break;if(!stop)await new Promise(resolve=>setTimeout(resolve,10000));}
