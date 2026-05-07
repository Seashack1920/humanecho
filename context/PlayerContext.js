'use client'

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isExpanded, setIsExpanded] = useState(false)
  const [queue, setQueueState] = useState([])
  const [queueIndex, setQueueIndex] = useState(-1)
  const audioRef = useRef(null)

  // Play a specific track — optionally set a queue
  const playTrack = useCallback((track, trackQueue = null, startIndex = null) => {
    if (!audioRef.current) return

    const audio = audioRef.current

    // If same track — toggle play/pause
    if (currentTrack?.id === track.id && !trackQueue) {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        audio.play()
        setIsPlaying(true)
      }
      return
    }

    // Set queue if provided
    if (trackQueue) {
      setQueueState(trackQueue)
      const idx = startIndex !== null ? startIndex : trackQueue.findIndex(t => t.id === track.id)
      setQueueIndex(idx >= 0 ? idx : 0)
    } else if (queue.length > 0) {
      // Update index within existing queue
      const idx = queue.findIndex(t => t.id === track.id)
      if (idx >= 0) setQueueIndex(idx)
    }

    // Play the track
    setCurrentTrack(track)
    audio.src = track.cloudinary_url
    audio.play().catch(() => {})
    setIsPlaying(true)
    setIsExpanded(true)
  }, [currentTrack, isPlaying, queue])

  // Set the full queue (called from album page)
  const setQueue = useCallback((tracks, startIndex = 0) => {
    setQueueState(tracks)
    setQueueIndex(startIndex)
  }, [])

  // Play next track in queue
  const playNext = useCallback(() => {
    if (queue.length === 0) return
    const nextIndex = queueIndex + 1
    if (nextIndex < queue.length) {
      const nextTrack = queue[nextIndex]
      setQueueIndex(nextIndex)
      setCurrentTrack(nextTrack)
      if (audioRef.current) {
        audioRef.current.src = nextTrack.cloudinary_url
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    } else {
      // End of queue
      setIsPlaying(false)
    }
  }, [queue, queueIndex])

  // Play previous track in queue
  const playPrev = useCallback(() => {
    if (queue.length === 0) return
    // If more than 3 seconds in — restart current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    const prevIndex = queueIndex - 1
    if (prevIndex >= 0) {
      const prevTrack = queue[prevIndex]
      setQueueIndex(prevIndex)
      setCurrentTrack(prevTrack)
      if (audioRef.current) {
        audioRef.current.src = prevTrack.cloudinary_url
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    }
  }, [queue, queueIndex])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }, [currentTrack, isPlaying])

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
    }
  }, [])

  const changeVolume = useCallback((vol) => {
    setVolume(vol)
    if (audioRef.current) audioRef.current.volume = vol
  }, [])

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Set up audio element and event listeners
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

    const handleEnded = () => {
      // Auto-play next track in queue
      playNext()
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', updateProgress)

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadedmetadata', updateProgress)
    }
  }, [playNext])

  const hasNext = queue.length > 0 && queueIndex < queue.length - 1
  const hasPrev = queue.length > 0 && queueIndex > 0

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      progress,
      duration,
      volume,
      isExpanded,
      queue,
      queueIndex,
      hasNext,
      hasPrev,
      setIsExpanded,
      playTrack,
      setQueue,
      playNext,
      playPrev,
      togglePlay,
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
