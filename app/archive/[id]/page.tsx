import type {Metadata} from "next";
import ReceiptPage from "@/features/missions/receipt-page";
import {getMission} from "@/server/missions/repository";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const record=await getMission(id);const mission=record?.visibility==="public"?record:null;return {title:mission?`${id} / ${mission.command}`:id,description:mission?`CTRL execution record: ${mission.status}. Command, artifacts and resource provenance.`:"CTRL mission receipt.",openGraph:{title:mission?.command??id,description:`Public machine record / ${id}`}};}
export default async function Page({params}:{params:Promise<{id:string}>}){return <ReceiptPage id={(await params).id}/>;}
