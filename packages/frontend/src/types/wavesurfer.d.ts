declare module "wavesurfer.js" {
  interface WaveSurferEvents {
    // Playback events
    play: () => void;
    pause: () => void;
    finish: () => void;
    seek: () => void;
    audioprocess: (time: number) => void;

    // Loading events
    loading: (percent: number) => void;
    ready: () => void;
    error: (error: Error) => void;

    // Interaction events
    click: (relativeX: number) => void;
    drag: (relativeX: number) => void;
    scroll: (e: WheelEvent) => void;
  }

  interface WaveSurferParams {
    container: HTMLElement;
    height?: number;
    waveColor?: string;
    progressColor?: string;
    cursorColor?: string;
    barWidth?: number;
    barRadius?: number;
    responsive?: boolean;
    normalize?: boolean;
    partialRender?: boolean;
    peaks?: Float32Array[];
    duration?: number;
  }

  class WaveSurfer {
    constructor(params: WaveSurferParams);

    static create(params: WaveSurferParams): WaveSurfer;

    // Instance properties
    options: WaveSurferParams;

    // Core methods
    load(url: string, peaks?: Float32Array[], duration?: number): void;
    play(start?: number, end?: number): void;
    pause(): void;
    stop(): void;
    destroy(): void;

    // Playback methods
    getCurrentTime(): number;
    getDuration(): number;
    seekTo(progress: number): void;
    setTime(seconds: number): void;

    // Event handling
    on<K extends keyof WaveSurferEvents>(
      event: K,
      callback: WaveSurferEvents[K]
    ): void;
    un<K extends keyof WaveSurferEvents>(
      event: K,
      callback: WaveSurferEvents[K]
    ): void;

    // State methods
    isPlaying(): boolean;
    isReady(): boolean;

    // Volume methods
    getVolume(): number;
    setVolume(newVolume: number): void;

    // Configuration methods
    setOptions(params: Partial<WaveSurferParams>): void;
  }

  export default WaveSurfer;
}
