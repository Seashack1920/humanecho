'use client'
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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

  // Refs for stale-closure-safe queue access
  const queueRef      = useRef([])
  const queueIndexRef = useRef(-1)
  const playNextRef   = useRef(null)

  const playTrack = useCallback((track, trackQueue = null, startIndex = null) => {
    if (!audioRef.current) return
    const safeTrack = typeof track === 'string' ? JSON.parse(track) : track
    const safeQueue = trackQueue ? trackQueue.map(t => typeof t === 'string' ? JSON.parse(t) : t) : null
    track = safeTrack
    trackQueue = safeQueue
    const audio = audioRef.current

    // If same track — toggle play/pause
    if (currentTrack?.id === track.id && !trackQueue) {
      if (isPlaying) { audio.pause(); setIsPlaying(false) }
      else { audio.play(); setIsPlaying(true) }
      return
    }

    // Set queue if provided
    if (trackQueue) {
      setQueueState(trackQueue)
      const idx = startIndex !== null ? startIndex : trackQueue.findIndex(t => t.id === track.id)
      const resolvedIdx = idx >= 0 ? idx : 0
      setQueueIndex(resolvedIdx)
      queueRef.current = trackQueue
      queueIndexRef.current = resolvedIdx
    } else if (queue.length > 0) {
      const idx = queue.findIndex(t => t.id === track.id)
      if (idx >= 0) {
        setQueueIndex(idx)
        queueIndexRef.current = idx
      }
    }

    // If track is part of an album and no queue provided, fetch album tracklist
    if (track.album_id && !trackQueue) {
      supabase.from('tracks')
        .select('id, title, duration, cloudinary_url, track_image_url, content_origin, track_type, album_id, artist_id')
        .eq('album_id', track.album_id)
        .eq('status', 'published')
        .order('track_number')
        .then(({ data }) => {
          if (data && data.length > 1) {
            const idx = data.findIndex(t => t.id === track.id)
            const resolvedIdx = idx >= 0 ? idx : 0
            setQueueState(data)
            setQueueIndex(resolvedIdx)
            queueRef.current = data
            queueIndexRef.current = resolvedIdx
          }
        })
    }

    // Play the track — fetch artist name if missing
    const trackToPlay = typeof track === 'string' ? JSON.parse(track) : { ...track }
    if (trackToPlay.artist_id && !trackToPlay.artist_name) {
      const capturedTrack = { ...trackToPlay }
      supabase.from('artists').select('name').eq('id', capturedTrack.artist_id).single()
        .then(({ data }) => {
          if (data) setCurrentTrack(prev => prev?.id === capturedTrack.id ? { ...capturedTrack, artist_name: data.name } : prev)
        })
    }
    setCurrentTrack(trackToPlay)
    audio.src = track.cloudinary_url
    audio.play().catch(() => {})
    setIsPlaying(true)
    setIsExpanded(true)
  }, [currentTrack, isPlaying, queue])

  // Set the full queue (called from album page)
  const setQueue = useCallback((tracks, startIndex = 0) => {
    setQueueState(tracks)
    setQueueIndex(startIndex)
    queueRef.current = tracks
    queueIndexRef.current = startIndex
  }, [])

  // Play next track in queue — uses refs to avoid stale closure
  const playNext = useCallback(() => {
    const currentQueue = queueRef.current
    const currentIndex = queueIndexRef.current
    if (currentQueue.length === 0) return
    const nextIndex = currentIndex + 1
    if (nextIndex < currentQueue.length) {
      const nextTrack = currentQueue[nextIndex]
      queueIndexRef.current = nextIndex
      setQueueIndex(nextIndex)
      setCurrentTrack(nextTrack)
      if (audioRef.current) {
        audioRef.current.src = nextTrack.cloudinary_url
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    } else {
      setIsPlaying(false)
    }
  }, [])

  // Play previous track in queue
  const playPrev = useCallback(() => {
    const currentQueue = queueRef.current
    const currentIndex = queueIndexRef.current
    if (currentQueue.length === 0) return
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      const prevTrack = currentQueue[prevIndex]
      queueIndexRef.current = prevIndex
      setQueueIndex(prevIndex)
      setCurrentTrack(prevTrack)
      if (audioRef.current) {
        audioRef.current.src = prevTrack.cloudinary_url
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play().catch(() => {}); setIsPlaying(true) }
  }, [currentTrack, isPlaying])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setCurrentTrack(null)
    setIsExpanded(false)
    setQueueState([])
    setQueueIndex(-1)
    queueRef.current = []
    queueIndexRef.current = -1
  }, [])

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

  // Keep playNextRef current
  playNextRef.current = playNext

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
      if (playNextRef.current) playNextRef.current()
    }
    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', updateProgress)
    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadedmetadata', updateProgress)
    }
  }, []) // Empty deps — runs once, uses refs for fresh values

  const hasNext = queueRef.current.length > 0 && queueIndexRef.current < queueRef.current.length - 1
  const hasPrev = queueRef.current.length > 0 && queueIndexRef.current > 0

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
      stop,
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
