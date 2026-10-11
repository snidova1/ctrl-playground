import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {metadataBase:new URL("https://ctrl-public-machine.raisecompanyro.chatgpt.site"),title:{default:"CTRL · Habitat",template:"%s · CTRL"},description:"Create a character, build your own world, and visit friends in CTRL Habitat.",icons:{icon:"/favicon.svg"},openGraph:{title:"CTRL · Habitat",description:"Your character. Your world.",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body><Shell>{children}</Shell></body></html>;}
