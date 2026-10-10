import {AppError} from '@/server/errors';

/** Upper bound on buffered JSON input, measured in raw UTF-8 bytes, not JS characters. */
export const HABITAT_MAX_BODY_BYTES=80_000;

/**
 * Read Habitat JSON with a hard body budget.
 *
 * Content-Length is advisory: reject obvious oversize requests before touching
 * the stream, but always count chunks as clients can omit or spoof the header.
 * The request body is never fetched or proxied to a remote endpoint.
 */
export async function readHabitatJson(request:Request):Promise<unknown>{
  const declared=request.headers.get('content-length');
  if(declared!==null){
    if(!/^\d+$/.test(declared)||!Number.isSafeInteger(Number(declared))){
      throw new AppError('INVALID_CONTENT_LENGTH',400,'Invalid request length.');
    }
    if(Number(declared)>HABITAT_MAX_BODY_BYTES){
      throw new AppError('INPUT_TOO_LARGE',413,'World input is too large.');
    }
  }

  const stream=request.body;
  if(!stream)throw new SyntaxError('JSON body is required.');
  const reader=stream.getReader();
  const decoder=new TextDecoder();
  let size=0;
  let text='';
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>HABITAT_MAX_BODY_BYTES){
        // Discard remaining bytes rather than buffering an oversized request.
        void reader.cancel().catch(()=>{});
        throw new AppError('INPUT_TOO_LARGE',413,'World input is too large.');
      }
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
  }finally{
    reader.releaseLock();
  }
  return JSON.parse(text) as unknown;
}
