'use client'
import { createContext, useContext, useState, useRef, useEffect } from 'react'
const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isExpanded, setIsExpanded] = useState(false)
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(0)
  const audioRef = useRef(null)

  // Keep a ref to queue/index so the `ended` handler always sees current values
  const queueRef = useRef([])
  const queueIndexRef = useRef(0)

  const handleEndedRef = useRef(null)

useEffect(() => {
  if (!audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.volume = volume
  }
  const audio = audioRef.current

  const updateProgress = () => {
    setProgress(audio.currentTime)
    setDuration(audio.duration || 0)
  }

  // Store handler in ref so it always sees latest queue values
handleEndedRef.current = () => {
  const nextIndex = queueIndexRef.current + 1
  if (nextIndex < queueRef.current.length) {
    const nextTrack = queueRef.current[nextIndex]
    queueIndexRef.current = nextIndex
    setQueueIndex(nextIndex)
    setCurrentTrack(nextTrack)
    audio.src = nextTrack.cloudinary_url
    audio.play()
    setIsPlaying(true)
  } else {
    setIsPlaying(false)
  }
}

  const handleEnded = () => handleEndedRef.current?.()

  audio.addEventListener('timeupdate', updateProgress)
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('loadedmetadata', updateProgress)

  return () => {
    audio.removeEventListener('timeupdate', updateProgress)
    audio.removeEventListener('ended', handleEnded)
    audio.removeEventListener('loadedmetadata', updateProgress)
  }
}, [])

  // playTrack now accepts an optional queue array
  const playTrack = (track, trackQueue = []) => {
    const audio = audioRef.current
    if (!audio) return

    // Toggle play/pause if same track
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        audio.play()
        setIsPlaying(true)
      }
      return
    }

    // Set the queue (use provided queue, or single-track queue as fallback)
    const newQueue = trackQueue.length > 0 ? trackQueue : [track]
    const index = newQueue.findIndex(t => t.id === track.id)
    const resolvedIndex = index >= 0 ? index : 0

    queueRef.current = newQueue
    queueIndexRef.current = resolvedIndex
    setQueue(newQueue)
    setQueueIndex(resolvedIndex)

    setCurrentTrack(track)
    audio.src = track.cloudinary_url
    audio.play()
    setIsPlaying(true)
    setIsExpanded(true)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const pause = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setIsPlaying(false)
  }

  const seek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
    }
  }

  const changeVolume = (vol) => {
    setVolume(vol)
    if (audioRef.current) audioRef.current.volume = vol
  }

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
   <PlayerContext.Provider value={{
  currentTrack,
  isPlaying,
  progress,
  duration,
  volume,
  isExpanded,
  setIsExpanded,
  queue,
  queueIndex,
  playTrack,
  togglePlay,
  pause,
  seek,
  changeVolume,
  formatTime,
}}>
  {children}
</PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used within PlayerProvider')
  return context
}