export { };

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

declare const chrome: any;

class AudioVisualizerApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioCtx: AudioContext | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private startButton: HTMLButtonElement;
  private statusBadge: HTMLElement;

  private wasmModule: WasmEngine | null = null;
  private fftSize = 1024;

  constructor() {
    this.canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.startButton = document.getElementById('start-capture') as HTMLButtonElement;
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
    this.startButton.addEventListener('click', () => {
      if (typeof chrome === 'undefined' || !chrome.tabCapture) {
        this.statusBadge.innerText = "Error: chrome.tabCapture unavailable";
        console.error("chrome.tabCapture is not available. Are you running as a Chrome Extension?");
        return;
      }

      chrome.tabCapture.capture({ audio: true, video: false }, (stream: MediaStream | null) => {
        if (!stream) {
          const err = chrome.runtime.lastError?.message || "User denied or tab inactive";
          this.statusBadge.innerText = "Capture failed";
          console.error("Tab capture failed:", err);
          return;
        }

        this.initAudioPipeline(stream);
      });
    });
  }

  private initAudioPipeline(stream: MediaStream) {
    if (this.audioCtx) return;

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = this.fftSize * 2;

    this.audioSource = this.audioCtx.createMediaStreamSource(stream);
    this.audioSource.connect(this.analyser);

    // CRITICAL STEP: Connect analyser to audioCtx.destination to prevent muting.
    this.analyser.connect(this.audioCtx.destination);

    // Disable button and change its text
    this.startButton.disabled = true;
    this.startButton.innerText = "CAPTURING ACTIVE TAB...";

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
        // Convert the Web Audio API's log decibel output into an normalized intensity scale
        magnitudes[i] = Math.max(0, (freqData[i] + 100) / 100);
      }
    }

    this.drawNeonWaveform(magnitudes, width, height);
  };

  private drawNeonWaveform(magnitudes: Float32Array, width: number, height: number) {
    const barCount = 64;
    const barWidth = (width / barCount) * 0.75;
    const gap = (width / barCount) * 0.25;

    this.ctx.shadowBlur = 0;

    // Use a logarithmic distribution curve to allocate frequency bands
    const minFrequencyBin = 1;
    const maxFrequencyBin = magnitudes.length;

    for (let i = 0; i < barCount; i++) {
      const sampleIdx = Math.floor(
        minFrequencyBin * Math.pow(maxFrequencyBin / minFrequencyBin, i / (barCount - 1))
      );

      let rawValue = magnitudes[sampleIdx] || 0;

      let value = 0;
      if (this.wasmModule) {
        // Convert C++ raw linear modules values into logarithmic DB scaling
        // This ensures the quiet highs are amplified and bounce dynamically
        const db = 20 * Math.log10(rawValue + 1e-5);
        value = Math.max(0, (db + 60) * (height / 60)) * 0.6;
      } else {
        value = rawValue * height * 0.7;
      }

      // Clamp limits safely to keep layout inside the box
      value = Math.min(value, height * 0.8);

      const x = i * (barWidth + gap) + gap;
      const y = height / 2 - value / 2;

      const hue = (i / barCount) * 120 + 190;
      this.ctx.fillStyle = `hsla(${hue}, 100%, 65%, 1)`;

      this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
      this.ctx.shadowBlur = 12;

      this.ctx.beginPath();
      // Draw standard flat 2px baseline bar if it's dead silent, otherwise render the wave value
      this.ctx.fillRect(x, y, barWidth, value > 2 ? value : 2);
      this.ctx.closePath();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AudioVisualizerApp();
});