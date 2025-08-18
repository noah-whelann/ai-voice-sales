"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [isRecording, setIsRecording] = useState(false);
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const speakingRef = useRef(false);

  const speak = (text: string, onend?: () => void) => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => (speakingRef.current = true);
    u.onend = () => {
      speakingRef.current = false;
      onend?.();
    };
    window.speechSynthesis.speak(u);
  };

  const startRecording = async () => {
    if (isRecording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      setIsRecording(false);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      const fd = new FormData();
      fd.append("file", blob, "speech.webm");
      const tr = await fetch("/api/transcribe", { method: "POST", body: fd })
        .then((r) => r.json())
        .catch(() => ({ text: "" }));
      const text = tr.text || "";
      setHeard(text);
      const chat = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userSpeech: text }),
      })
        .then((r) => r.json())
        .catch(() => ({ assistant: "Sorry, I hit an error." }));
      const a =
        chat.assistant || "Could you share your name, email, and phone?";
      setReply(a);
      speak(a);
    };
    mr.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    try {
      mediaRef.current?.stop();
    } catch {}
    try {
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    } catch {}
  };

  useEffect(() => () => stopRecording(), []);

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_800px_at_100%_-10%,#dbeafe_0%,transparent_60%),radial-gradient(900px_600px_at_-10%_0%,#fce7f3_0%,transparent_55%),linear-gradient(to_bottom,#ffffff,#fafafa)]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            AI Voice Sales
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`relative inline-flex h-2.5 w-2.5 items-center justify-center`}
            >
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${isRecording ? "bg-red-500 opacity-75 animate-ping" : "bg-gray-300"}`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isRecording ? "bg-red-500" : "bg-gray-300"}`}
              />
            </span>
            <span className="text-sm text-gray-600">
              {isRecording ? "Recording" : "Idle"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-[0_10px_40px_-20px_rgba(0,0,0,0.25)]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <button
                onClick={startRecording}
                disabled={isRecording}
                className={`h-12 rounded-2xl px-5 text-sm font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${isRecording ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-900 text-white hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] focus:ring-gray-900"}`}
                aria-label="Start recording"
              >
                <span className="mr-1">🎤</span> Start
              </button>
              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className={`h-12 rounded-2xl px-5 text-sm font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${!isRecording ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900 border border-gray-300 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.2)] focus:ring-gray-300"}`}
                aria-label="Stop recording"
              >
                ⏹ Stop
              </button>
            </div>

            <div className="mt-8 grid gap-5">
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Heard
                </div>
                <p className="min-h-6 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                  {heard || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Reply
                </div>
                <p className="min-h-6 whitespace-pre-wrap text-sm leading-6 text-gray-900">
                  {reply || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white/60 px-6 py-4 text-center text-xs text-gray-500 sm:px-8">
            Speak, we transcribe and respond out loud.
          </div>
        </div>
      </div>
    </main>
  );
}
