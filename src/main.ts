interface WasmEngine {
  _fft_process: (realPtr: number, imagPtr: number, size: number) => void;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPF32: Float32Array;
}

declare global {
  interface Window {
    Module?: any;
  }
}

class AudioVisualizerApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioCtx: AudioContext | null = null;
  private audioSource: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private audioPlayer: HTMLAudioElement;
  private fileInput: HTMLInputElement;
  private statusBadge: HTMLElement;

  private wasmModule: WasmEngine | null = null;
  private fftSize = 1024;

  constructor() {
    this.canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.audioPlayer = document.getElementById('audio-player') as HTMLAudioElement;
    this.fileInput = document.getElementById('audio-file') as HTMLInputElement;
    this.statusBadge = document.getElementById('engine-status')!;

    this.initResize();
    this.setupEventListeners();
    this.tryLoadWasm();
  }

  private initResize() {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.parentElement!.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);
    resize();
  }

  private setupEventListeners() {
    this.fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.audioPlayer.src = URL.createObjectURL(file);
        this.initAudioContext();
        this.audioPlayer.play();
      }
    });
  }

  private initAudioContext() {
    if (this.audioCtx) return;

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = this.fftSize * 2;

    this.audioSource = this.audioCtx.createMediaElementSource(this.audioPlayer);
    this.audioSource.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);

    this.renderLoop();
  }

  private tryLoadWasm() {
    if (window.Module && window.Module._fft_process) {
      this.wasmModule = window.Module;
      this.statusBadge.innerText = "Engine: C++ WASM";
      this.statusBadge.classList.add('status-active');
    } else {
      this.statusBadge.innerText = "Engine: Web Audio Fallback";
      this.statusBadge.classList.add('status-active');
    }
  }

  private renderLoop = () => {
    requestAnimationFrame(this.renderLoop);
    if (!this.analyser) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.18)';
    this.ctx.fillRect(0, 0, width, height);

    const timeData = new Float32Array(this.fftSize);
    this.analyser.getFloatTimeDomainData(timeData);

    let magnitudes = new Float32Array(this.fftSize / 2);

    if (this.wasmModule) {
      const bytesPerElement = 4;
      const realPtr = this.wasmModule._malloc(this.fftSize * bytesPerElement);
      const imagPtr = this.wasmModule._malloc(this.fftSize * bytesPerElement);

      this.wasmModule.HEAPF32.set(timeData, realPtr / bytesPerElement);
      this.wasmModule.HEAPF32.set(new Float32Array(this.fftSize), imagPtr / bytesPerElement);

      this.wasmModule._fft_process(realPtr, imagPtr, this.fftSize);

      const realRes = this.wasmModule.HEAPF32.subarray(realPtr / bytesPerElement, (realPtr / bytesPerElement) + this.fftSize / 2);
      const imagRes = this.wasmModule.HEAPF32.subarray(imagPtr / bytesPerElement, (imagPtr / bytesPerElement) + this.fftSize / 2);

      for (let i = 0; i < this.fftSize / 2; i++) {
        magnitudes[i] = Math.sqrt(realRes[i] * realRes[i] + imagRes[i] * imagRes[i]);
      }

      this.wasmModule._free(realPtr);
      this.wasmModule._free(imagPtr);
    } else {
      const freqData = new Float32Array(this.analyser.frequencyBinCount);
      this.analyser.getFloatFrequencyData(freqData);
      for (let i = 0; i < magnitudes.length; i++) {
        magnitudes[i] = Math.max(0, (freqData[i] + 140) * 2);
      }
    }

    this.drawNeonWaveform(magnitudes, width, height);
  };

  private drawNeonWaveform(magnitudes: Float32Array, width: number, height: number) {
    const barCount = 64;
    const barWidth = (width / barCount) * 0.75;
    const gap = (width / barCount) * 0.25;

    this.ctx.shadowBlur = 0;

    for (let i = 0; i < barCount; i++) {
      const sampleIdx = Math.floor(Math.pow(i / barCount, 1.5) * magnitudes.length);
      let rawValue = magnitudes[sampleIdx] || 0;

      let value = (this.wasmModule) ? rawValue * 8 : rawValue * 1.5;
      value = Math.min(value, height * 0.8);

      const x = i * (barWidth + gap) + gap;
      const y = height / 2 - value / 2;

      const hue = (i / barCount) * 120 + 190;
      this.ctx.fillStyle = `hsla(${hue}, 100%, 65%, 1)`;

      this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
      this.ctx.shadowBlur = 12;

      this.ctx.beginPath();
      this.ctx.fillRect(x, y, barWidth, Math.max(value, 4));
      this.ctx.closePath();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AudioVisualizerApp();
});