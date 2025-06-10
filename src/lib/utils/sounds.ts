/**
 * Sound effects for heroic email actions
 * Uses Web Audio API to create satisfying sounds without requiring audio files
 */

class SoundPlayer {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // Initialize audio context only when needed
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window === 'undefined') return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.isEnabled = false;
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext || !this.isEnabled) return null;
    
    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return null;
      }
    }
    
    return this.audioContext;
  }

  /**
   * Play a satisfying "delete" sound - a classic success sound
   */
  async playDeleteSound(volume: number = 0.3) {
    const ctx = await this.ensureAudioContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Create a classic, pleasant success beep
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 - a pleasant middle note
      
      // Simple, clean envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      oscillator.type = 'sine';
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (error) {
      console.warn('Failed to play delete sound:', error);
    }
  }



  /**
   * Play a success sound for completing big tasks
   */
  async playSuccessSound(volume: number = 0.35) {
    const ctx = await this.ensureAudioContext();
    if (!ctx) return;

    try {
      // Two-tone success sound
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode1 = ctx.createGain();
      const gainNode2 = ctx.createGain();
      
      oscillator1.connect(gainNode1);
      oscillator2.connect(gainNode2);
      gainNode1.connect(ctx.destination);
      gainNode2.connect(ctx.destination);
      
      // First tone
      oscillator1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      oscillator1.type = 'sine';
      gainNode1.gain.setValueAtTime(0, ctx.currentTime);
      gainNode1.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
      gainNode1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      
      // Second tone (harmony)
      oscillator2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      oscillator2.type = 'sine';
      gainNode2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gainNode2.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + 0.2);
      gainNode2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      
      oscillator1.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.3);
      oscillator2.start(ctx.currentTime + 0.15);
      oscillator2.stop(ctx.currentTime + 0.5);
    } catch (error) {
      console.warn('Failed to play success sound:', error);
    }
  }

  /**
   * Play success MP3 file for successful operations
   */
  async playSuccessMp3(volume: number = 0.5) {
    if (!this.isEnabled) return;

    try {
      const audio = new Audio('/success.mp3');
      audio.volume = Math.min(Math.max(volume, 0), 1); // Clamp between 0 and 1
      await audio.play();
    } catch (error) {
      console.warn('Failed to play success MP3:', error);
      // Fallback to generated success sound
      this.playSuccessSound(volume);
    }
  }

  /**
   * Play big success MP3 file for large successful operations (100+ emails)
   */
  async playBigSuccessMp3(volume: number = 0.6) {
    if (!this.isEnabled) return;

    try {
      const audio = new Audio('/big-success.mp3');
      audio.volume = Math.min(Math.max(volume, 0), 1); // Clamp between 0 and 1
      await audio.play();
    } catch (error) {
      console.warn('Failed to play big success MP3:', error);
      // Fallback to generated success sound for big operations
      this.playSuccessSound(volume);
    }
  }

  /**
   * Enable or disable sound effects
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Check if sounds are enabled and supported
   */
  isSupported(): boolean {
    return this.isEnabled && this.audioContext !== null;
  }
}

// Create a singleton instance
export const soundPlayer = new SoundPlayer();

// Convenience functions
export const playDeleteSound = () => soundPlayer.playDeleteSound();

export const playSuccessSound = () => soundPlayer.playSuccessSound();
export const playSuccessMp3 = () => soundPlayer.playSuccessMp3();
export const playBigSuccessMp3 = () => soundPlayer.playBigSuccessMp3(); 