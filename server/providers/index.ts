import { settings } from "@/server/env";
import { MockProvider } from "./mock";
import { OrbioProvider } from "./orbio";
export function providers(){const s=settings();if(s.mode==="mock")return new MockProvider();return new OrbioProvider(s.orbioKey,s.orbioModel,s.orbioBase);}
export function orbioPublic(){const s=settings();return new OrbioProvider(s.orbioKey,s.orbioModel,s.orbioBase);}
