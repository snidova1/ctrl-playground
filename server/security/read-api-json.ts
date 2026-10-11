import {AppError} from '@/server/errors';

/** Non-Habitat JSON mutation budget, measured in bytes before decoding. */
export const API_MAX_BODY_BYTES=16_000;

/**
 * Reject oversized streamed JSON before buffering it. A client can omit or
 * falsify Content-Length, so it is only an early-rejection optimization.
 * Habitat routes have their own separate, larger 80 KB budget.
 */
export async function readApiJson(request:Request):Promise<unknown>{
  const declared=request.headers.get('content-length');
  if(declared!==null){
    if(!/^\d+$/.test(declared)||!Number.isSafeInteger(Number(declared))){
      throw new AppError('INVALID_CONTENT_LENGTH',400,'Invalid request length.');
    }
    if(Number(declared)>API_MAX_BODY_BYTES){
      throw new AppError('INPUT_TOO_LARGE',413);
    }
  }

  if(!request.body)throw new AppError('INVALID_JSON',400);
  const reader=request.body.getReader();
  const decoder=new TextDecoder();
  let size=0;
  let json='';
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>API_MAX_BODY_BYTES){
        void reader.cancel().catch(()=>{});
        throw new AppError('INPUT_TOO_LARGE',413);
      }
      json+=decoder.decode(value,{stream:true});
    }
    json+=decoder.decode();
  }finally{
    reader.releaseLock();
  }

  try{return JSON.parse(json) as unknown;}
  catch{throw new AppError('INVALID_JSON',400);}
}
