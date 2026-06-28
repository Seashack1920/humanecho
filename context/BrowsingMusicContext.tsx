'use client'

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

type BgTrack = {
  id: string
  title: string
  cloudinary_url: string
  mood: string | null
  loop_enabled: boolean
  description: string | null
}

type BrowsingMusicContextType = {
  tracks: BgTrack[]
  setTracks: (tracks: BgTrack[]) => void
  currentTrack: BgTrack | null
  isPlaying: boolean
  volume: number
  play: (track: BgTrack) => void
  stop: (fade?: boolean) => void
  setVolume: (vol: number) => void
  mute: () => void
  unmute: () => void
  isMuted: boolean
  registerStopBgMusic: (fn: () => void) => void
  unregisterStopBgMusic: () => void
}

const BrowsingMusicContext = createContext<BrowsingMusicContextType | null>(null)

export function BrowsingMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef       = useRef<HTMLAudioElement | null>(null)
  const fadeRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopBgMusicRef = useRef<(() => void) | null>(null)

  const [tracks, setTracks]             = useState<BgTrack[]>([])
  const [currentTrack, setCurrentTrack] = useState<BgTrack | null>(null)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [volume, setVolumeState]        = useState(0.4)
  const [isMuted, setIsMuted]           = useState(false)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (fadeRef.current) clearInterval(fadeRef.current)
    }
  }, [])

  const clearFade = () => {
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null }
  }

  const registerStopBgMusic = useCallback((fn: () => void) => {
    stopBgMusicRef.current = fn
  }, [])

  const unregisterStopBgMusic = useCallback(() => {
    stopBgMusicRef.current = null
  }, [])

  const play = useCallback((track: BgTrack) => {
    clearFade()
    // Stop any in-story background music before playing browsing music
    stopBgMusicRef.current?.()
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    audio.src    = track.cloudinary_url
    audio.loop   = track.loop_enabled
    audio.volume = isMuted ? 0 : volume
    audio.play().catch(() => {})
    setCurrentTrack(track)
    setIsPlaying(true)
  }, [volume, isMuted])

  const stop = useCallback((fade = true) => {
    if (!audioRef.current) return
    const audio = audioRef.current
    if (!fade || audio.volume === 0) {
      audio.pause()
      audio.currentTime = 0
      setIsPlaying(false)
      setCurrentTrack(null)
      return
    }
    // Fade out over ~1.5 seconds
    clearFade()
    const step = audio.volume / 15
    fadeRef.current = setInterval(() => {
      if (!audioRef.current) return
      if (audioRef.current.volume <= step) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.volume = volume
        setIsPlaying(false)
        setCurrentTrack(null)
        clearFade()
      } else {
        audioRef.current.volume = Math.max(0, audioRef.current.volume - step)
      }
    }, 100)
  }, [volume])

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol)
    if (audioRef.current && !isMuted) audioRef.current.volume = vol
  }, [isMuted])

  const mute = useCallback(() => {
    setIsMuted(true)
    if (audioRef.current) audioRef.current.volume = 0
  }, [])

  const unmute = useCallback(() => {
    setIsMuted(false)
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  return (
    <BrowsingMusicContext.Provider value={{
      tracks, setTracks,
      currentTrack, isPlaying,
      volume, setVolume,
      play, stop,
      mute, unmute, isMuted,
      registerStopBgMusic,
      unregisterStopBgMusic,
    }}>
      {children}
    </BrowsingMusicContext.Provider>
  )
}

export function useBrowsingMusic() {
  const ctx = useContext(BrowsingMusicContext)
  if (!ctx) throw new Error('useBrowsingMusic must be used within BrowsingMusicProvider')
  return ctx
}
