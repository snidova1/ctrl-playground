import { AsyncLocalStorage } from "node:async_hooks";
const contexts=new AsyncLocalStorage<{waitUntil:(promise:Promise<unknown>)=>void}>();
export function withExecutionContext<T>(context:{waitUntil:(promise:Promise<unknown>)=>void},run:()=>T):T{return contexts.run(context,run);}
export function background(work:Promise<unknown>){const context=contexts.getStore();if(context)context.waitUntil(work);else void work.catch(error=>console.error("Worker job failed",error instanceof Error?error.message:"unknown"));}
