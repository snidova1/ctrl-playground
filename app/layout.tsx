import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {metadataBase:new URL("https://ctrl-public-machine.raisecompanyro.chatgpt.site"),title:{default:"CTRL · A Public Machine",template:"%s · CTRL"},description:"A publicly directed machine. Propose commands, inspect work, enter worlds, and read permanent receipts.",icons:{icon:"/favicon.svg"},openGraph:{title:"CTRL · A Public Machine",description:"Commands enter. Work comes out.",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body><Shell>{children}</Shell></body></html>;}
