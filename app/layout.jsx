import './globals.css';
import './live.css';
import './fonts.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import { AppShell } from './app-shell';
import { WalletProvider } from './wallet-provider';
export const metadata={title:'SLAIV — Deterministic coverage adjudication',description:'Evidence-led slashing coverage on GenLayer.'};
export default function Layout({children}){return <html lang="en"><body><WalletProvider><AppShell>{children}</AppShell></WalletProvider></body></html>}
