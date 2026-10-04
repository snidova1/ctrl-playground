import { bucket } from "@/db";
import type { PublishingProvider } from "./types";
export class ArtifactPublisher implements PublishingProvider {async publish(key:string,content:string,mime:string){await bucket().put(key,content,{httpMetadata:{contentType:mime}});}}
