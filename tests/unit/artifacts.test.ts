import {expect,it} from "vitest";
import {buildDemonstration} from "@/server/artifacts/build";
it("escapes command and findings instead of executing generated HTML",()=>{const html=buildDemonstration('<script>alert("x")</script>','<img src=x onerror=alert(1)>');expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');});
it("marks demonstration provenance and avoids remote assets",()=>{const html=buildDemonstration("One useful button","Curated sources");expect(html).toContain("NO LIVE RESEARCH");expect(html).not.toMatch(/<script|<link|<iframe|<img/);});
it("distinguishes live source field guides",()=>{expect(buildDemonstration("A public archive","Retrieved source",false)).toContain("SOURCE FIELD GUIDE");expect(buildDemonstration("A public archive","Retrieved source",false)).not.toContain("NO LIVE RESEARCH");});
