import './globals.css'
import { PlayerProvider } from '@/context/PlayerContext'
import FloatingPlayer from '@/components/FloatingPlayer'
import Header from '@/components/Header'

export const metadata = {
  title: 'Human Echo',
  description: 'Music, film, books and stories from independent artists',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>
          <Header />
          <main style={{ paddingTop: '70px', paddingBottom: '100px' }}>
            {children}
          </main>
          <FloatingPlayer />
        </PlayerProvider>
      </body>
    </html>
  )
}
