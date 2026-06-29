console.log("Audio Visualizer Frontend Initialized");

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("visualizer") as HTMLCanvasElement | null;
  const audioFile = document.getElementById("audio-file") as HTMLInputElement | null;
  const audioPlayer = document.getElementById("audio-player") as HTMLAudioElement | null;

  if (canvas) {
    console.log("Canvas element successfully verified in DOM.");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw initial placeholder visual
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#3b82f6";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Load audio to start visualization", canvas.width / 2, canvas.height / 2);
    }
  } else {
    console.error("Canvas element 'visualizer' not found in DOM.");
  }

  if (audioFile && audioPlayer) {
    console.log("Audio control elements successfully verified in DOM.");
  } else {
    console.error("Audio control elements not found in DOM.");
  }
});
