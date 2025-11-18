// trigger deploy
"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<HTMLCanvasElement | null>(null);

  const [pattern, setPattern] = useState<string | null>(null);
  const [loadedPatternImg, setLoadedPatternImg] = useState<HTMLImageElement | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);

  const patterns = [
    "/patterns/p1.png",
    "/patterns/p2.png",
    "/patterns/p3.png",
    "/patterns/p4.png",
    "/patterns/p5.png",
    "/patterns/p6.png",
    "/patterns/p7.png",
    "/patterns/p8.png",
  ];

  // 카메라 시작
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          const video = videoRef.current as HTMLVideoElement;
          (video as any).srcObject = stream; // ★ 빌드 오류 해결 핵심
          video.play();
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // 문양 이미지 로드
  useEffect(() => {
    if (!pattern) return setLoadedPatternImg(null);
    const img = new Image();
    img.src = pattern;
    img.onload = () => setLoadedPatternImg(img);
  }, [pattern]);

  // 오버레이 렌더링
  useEffect(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!video || !canvas) return requestAnimationFrame(loop);

      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return requestAnimationFrame(loop);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (loadedPatternImg) {
        const size = canvas.width * 0.7;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        ctx.drawImage(loadedPatternImg, x, y, size, size);
      }

      if (countdown !== null) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.font = "bold 140px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(countdown), canvas.width / 2, canvas.height / 2);
      }

      requestAnimationFrame(loop);
    };
    loop();
  }, [loadedPatternImg, countdown]);

  // 촬영
  const performCapture = async () => {
    const video = videoRef.current;
    const capture = captureRef.current;

    if (!video || !capture) return;

    const size = 800;
    capture.width = size;
    capture.height = size;

    const ctx = capture.getContext("2d");
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    const videoRatio = rect.width / rect.height;

    let drawW = size;
    let drawH = size / videoRatio;

    if (drawH < size) {
      drawH = size;
      drawW = size * videoRatio;
    }

    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;

    ctx.drawImage(video, dx, dy, drawW, drawH);

    if (loadedPatternImg) {
      const overlaySize = size * 0.7;
      const ox = (size - overlaySize) / 2;
      const oy = (size - overlaySize) / 2;
      ctx.drawImage(loadedPatternImg, ox, oy, overlaySize, overlaySize);
    }

    const resultBase64 = capture.toDataURL("image/png");
    setFinalImage(resultBase64);

    // 서버 업로드
    const upload = await fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({ imageBase64: resultBase64 }),
    });

    const data = await upload.json();

    if (!data.url) {
      alert("업로드 실패함");
      return;
    }

    // QR 코드 생성
    const qr = await QRCode.toDataURL(data.url);
    setQrData(qr);
  };

  const takePhoto = () => {
    setCountdown(3);
    let n = 3;

    const timer = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(timer);
        setCountdown(null);
        setTimeout(() => performCapture(), 200);
      } else {
        setCountdown(n);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center gap-6">
      <div className="relative w-full max-w-md">
        <video ref={videoRef} className="w-full rounded-lg" />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0 pointer-events-none"
        />
      </div>

      <canvas ref={captureRef} className="hidden" />

      <button
        onClick={takePhoto}
        className="bg-green-600 px-4 py-3 rounded w-full max-w-md text-lg font-semibold"
      >
        3 · 2 · 1 촬영
      </button>

      <div className="grid grid-cols-4 gap-2 w-full max-w-md">
        {patterns.map((p) => (
          <button
            key={p}
            onClick={() => setPattern(p)}
            className={`p-1 rounded border ${
              pattern === p ? "border-white" : "border-gray-500"
            }`}
          >
            <img src={p} className="w-full rounded" />
          </button>
        ))}
      </div>

      {finalImage && (
        <div className="flex flex-col items-center mt-6 gap-4 w-full max-w-md">
          <img src={finalImage} className="rounded-lg w-full border border-white" />
          {qrData && (
            <div className="bg-white p-4 rounded-lg">
              <img src={qrData} className="w-40 h-40" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
