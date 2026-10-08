import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {metadataBase:new URL("https://ctrl-public-machine.raisecompanyro.chatgpt.site"),title:{default:"CTRL · Common Ground",template:"%s · CTRL"},description:"Walk into a shared 3D courtyard. Make an object, give it a place, and leave it for someone else to discover.",icons:{icon:"/favicon.svg"},openGraph:{title:"CTRL · Common Ground",description:"A little place. Made by us.",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body><Shell>{children}</Shell></body></html>;}
