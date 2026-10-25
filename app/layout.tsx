import type {Metadata, Viewport} from 'next';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './globals.css';

export const metadata: Metadata = {
  title: {default: 'Willow Common · CTRL', template: '%s · Willow Common'},
  description: 'A cozy life town: fish, garden, cook, catch bugs, decorate your home and visit friends. Wallet-owned homes and World Keys on CTRL.',
  icons: {icon: '/favicon.svg'},
  openGraph: {title: 'Willow Common · CTRL', description: 'Your cozy town. Your home. Your friends.', type: 'website'},
};
export const viewport: Viewport = {width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, themeColor: '#bfe3f7'};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
