"use client"

let audioContext: AudioContext | null = null

export function playBeep(frequency = 880, duration = 150) {
  if (typeof window === "undefined") return
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = "sine"
  oscillator.frequency.value = frequency
  gain.gain.value = 0.1

  oscillator.connect(gain)
  gain.connect(audioContext.destination)

  oscillator.start()
  oscillator.stop(audioContext.currentTime + duration / 1000)
}
