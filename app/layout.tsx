import './globals.css'
import { PlayerProvider } from '@/context/PlayerContext'
import { BrowsingMusicProvider } from '@/context/BrowsingMusicContext'
import FloatingPlayer from '@/components/FloatingPlayer'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ReferralTracker from '@/components/ReferralTracker'

export const metadata = {
  title: 'Human Echo',
  description: 'Music, film, books and stories from independent artists',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>
          <BrowsingMusicProvider>
            <Header />
            <ReferralTracker />
            <main style={{ paddingTop: '70px', paddingBottom: '100px' }}>
              {children}
            </main>
            <Footer />
            <FloatingPlayer />
          </BrowsingMusicProvider>
        </PlayerProvider>
      </body>
    </html>
  )
}