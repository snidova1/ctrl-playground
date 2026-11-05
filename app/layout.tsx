import type {Metadata, Viewport} from 'next';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './globals.css';

export const metadata: Metadata = {
  title: {default: 'Keyhaven · cozy life sim', template: '%s · Keyhaven'},
  description: 'A cozy life town: fish, garden, cook, catch bugs, decorate your home and visit friends. Own your Habitat and trade friend.tech-style World Keys.',
  icons: {icon: '/favicon.svg'},
  openGraph: {title: 'Keyhaven', description: 'Your cozy town. Your home. Your friends.', type: 'website'},
};
export const viewport: Viewport = {width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, themeColor: '#bfe3f7'};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
