import type { Metadata } from 'next'
//import '../styles/globals.css';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title: 'Sitecore Marketplace Extensions',
  description: 'Sitecore Marketplace extension starter application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        </body>
    </html>
  )
}
