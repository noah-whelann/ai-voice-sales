export function recordAudio() {
  return new Promise<Blob>((resolve) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        resolve(blob);
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 5000);
    });
  });
}
