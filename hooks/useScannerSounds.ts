'use client'

import { useEffect, useRef, useCallback } from 'react'

type SoundType = 'success' | 'error' | 'already-checked'

export function useScannerSounds() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundsEnabled = useRef(false)

  useEffect(() => {
    // Só inicializa uma vez e apenas no cliente
    if (soundsEnabled.current || typeof window === 'undefined') return

    try {
      // Inicializa AudioContext (mais confiável que HTMLAudioElement)
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      soundsEnabled.current = true
      console.log('🔊 Sistema de áudio inicializado com sucesso')
    } catch (error) {
      console.warn('⚠️ AudioContext não disponível, som desabilitado:', error)
    }

    // Cleanup ao desmontar
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      soundsEnabled.current = false
    }
  }, [])

  // Função para gerar tons sintéticos
  const createTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current || !soundsEnabled.current) return

    try {
      const ctx = audioContextRef.current
      
      // Criar oscillator e gain node
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      // Configurar oscillator
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
      
      // Configurar volume com fade in/out
      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      
      // Conectar nodes
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Tocar som
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
      
    } catch (error) {
      console.warn('⚠️ Erro ao gerar tom:', error)
    }
  }, [])

  // Tocar som de sucesso
  const playSuccessSound = () => {
    createTone(261.63, 0.1, 'sine'); // C4
    setTimeout(() => createTone(523.25, 0.15, 'sine'), 100); // C5
  };
  
  // Tocar som de erro
  const playErrorSound = () => {
    createTone(400, 0.2, 'sawtooth');
    setTimeout(() => createTone(200, 0.3, 'sawtooth'), 150);
  };
  
  // Tocar som de já verificado
  const playAlreadyCheckedSound = () => {
    createTone(440, 0.1, 'square'); // A4
    setTimeout(() => createTone(440, 0.1, 'square'), 150);
    setTimeout(() => createTone(440, 0.1, 'square'), 300);
  };
  
  // Executar som baseado no tipo
  const executeSoundByType = (type: SoundType) => {
    const soundMap = {
      'success': playSuccessSound,
      'error': playErrorSound,
      'already-checked': playAlreadyCheckedSound
    };
    
    const soundFunction = soundMap[type];
    if (soundFunction) {
      soundFunction();
    }
  };

  const playSound = useCallback(async (type: SoundType) => {
    if (!audioContextRef.current || !soundsEnabled.current) return;

    try {
      // Resume AudioContext se estiver suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      executeSoundByType(type);
    } catch (error) {
      // Silencioso para erros de autoplay
      if (error instanceof Error && !error.message.includes('autoplay')) {
        console.warn(`⚠️ Erro ao tocar som ${type}:`, error);
      }
    }
  }, [createTone])

  return playSound
} 