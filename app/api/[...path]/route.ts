import { handleApi } from "@/server/api";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{path:string[]}>}){return handleApi(request,(await params).path);}
export async function POST(request:Request,{params}:{params:Promise<{path:string[]}>}){return handleApi(request,(await params).path);}
export const PUT=POST;
export const PATCH=POST;
export const DELETE=POST;
