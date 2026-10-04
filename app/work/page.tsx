import { Suspense } from "react";
import WorkPage from "@/features/missions/work-page";
import {MachineLoading} from "@/components/states";
export default function Page(){return <Suspense fallback={<MachineLoading/>}><WorkPage/></Suspense>}
