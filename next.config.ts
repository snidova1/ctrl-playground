import type {NextConfig} from "next";
import path from "node:path";
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://api.web3modal.org https://api.web3modal.com",
  "font-src 'self' https://fonts.reown.com",
  "connect-src 'self' blob: https://rpc.mainnet.chain.robinhood.com https://robinhood-sepolia-rpc.publicnode.com https://rpc.testnet.chain.robinhood.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://api.web3modal.org https://api.web3modal.com https://pulse.walletconnect.org https://fonts.reown.com",
  "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org",
  "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join('; ');
const config:NextConfig={devIndicators:false,distDir:process.env.CTRL_BUILD_TARGET==="node"?".next-node":".next",webpack(config,{webpack}){if(process.env.CTRL_BUILD_TARGET==="node")config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/,path.resolve(process.cwd(),"lib/platform-node.ts")));return config;},async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},{key:"Content-Security-Policy",value:contentSecurityPolicy}]}];}};
export default config;
