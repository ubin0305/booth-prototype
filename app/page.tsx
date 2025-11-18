"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// 🔥 독립된 캔버스에서 문양에 색상만 입혀 Data URL을 반환하는 함수 (투명도 초기화 강화)
const createTintedPattern = (img: HTMLImageElement, color: string | null): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const size = img.width; 
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // ✅ 캔버스를 투명하게 초기화하는 코드 추가
        ctx.clearRect(0, 0, size, size);

        ctx.drawImage(img, 0, 0, size, size);

        if (color) {
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, size, size);
        }
        
        // 투명도를 유지하기 위해 PNG로 Data URL 반환
        resolve(canvas.toDataURL("image/png"));
    });
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<HTMLCanvasElement | null>(null);

  const [pattern, setPattern] = useState<string | null>(null);
  const [loadedPatternImg, setLoadedPatternImg] = useState<HTMLImageElement | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  
  const filters = [
    "#F7AE91", "#6DCFF4", "#B1B1B1", "#8CEB9C",
    "#FECF59", "#F19EFF", "#84A6F6", "#D3CA9F",
  ];
  
  // 🔥 초기값을 filters[0]으로 설정하여 색상 강제 활성화
  const [tintColor, setTintColor] = useState<string | null>(filters[0]); 

  // Body 스타일 강제 덮어쓰기
  useEffect(() => {
    document.body.style.setProperty('background-color', '#ffffff', 'important');
    document.body.style.setProperty('color', '#000000', 'important');
    document.body.style.overflowY = "auto";
  }, []);

  const patterns = [
    "/patterns/p1.png", "/patterns/p2.png", "/patterns/p3.png", "/patterns/p4.png",
    "/patterns/p5.png", "/patterns/p6.png", "/patterns/p7.png", "/patterns/p8.png",
  ];

  // 문양 이미지 로드
  useEffect(() => {
    if (!pattern) return setLoadedPatternImg(null);
    const img = new Image();
    img.src = pattern;
    img.onload = () => setLoadedPatternImg(img);
  }, [pattern]);

  // 프리뷰용 함수
  const drawTintedPattern = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    size: number
  ) => {
    ctx.drawImage(img, x, y, size, size);
    if (tintColor) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = tintColor;
      ctx.fillRect(x, y, size, size);
      ctx.globalCompositeOperation = "source-over"; // 복원
    }
  };

  // 카메라 시작
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          (videoRef.current as any).srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch((err) => {
          console.error("카메라 접근 오류:", err);
      });
  }, []);
  
  // 프리뷰 렌더링
  useEffect(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!video || !canvas) return requestAnimationFrame(loop);

      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (loadedPatternImg) {
        const size = canvas.width * 0.65;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        drawTintedPattern(ctx, loadedPatternImg, x, y, size);
      }
      
      if (countdown !== null) {
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 120px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(countdown), canvas.width / 2, canvas.height / 2);
      }
      
      requestAnimationFrame(loop);
    };
    loop(); 
  }, [loadedPatternImg, countdown, tintColor]); 

  // 🔥 촬영 로직 (PNG 투명도 완벽 보정 로직 적용)
  const performCapture = async () => {
    const video = videoRef.current;
    const capture = captureRef.current;
    if (!video || !capture || !loadedPatternImg) return;

    // 1. 캡처 캔버스에 비디오만 그리기
    const size = 800;
    capture.width = size;
    capture.height = size;

    const ctx = capture.getContext("2d")!;
    const rect = video.getBoundingClientRect();
    const ratio = rect.width / rect.height;

    let w = size;
    let h = size / ratio;
    if (h < size) { h = size; w = size * ratio; }

    // 비디오 원본 그리기 (배경)
    ctx.drawImage(video, (size - w) / 2, (size - h) / 2, w, h);
    
    // 2. 색상이 적용된 문양을 별도의 캔버스에서 생성 후 덧그리기
    if (loadedPatternImg) {
        const tintedPatternUrl = await createTintedPattern(loadedPatternImg, tintColor);
        const tintedPatternImg = new Image();
        tintedPatternImg.src = tintedPatternUrl;

        await new Promise<void>(resolve => {
            tintedPatternImg.onload = () => {
                const overlaySize = size * 0.65;
                const x = (size - overlaySize) / 2;
                const y = (size - overlaySize) / 2;
                // 이미 투명하게 처리된 이미지를 덧그림 (배경을 건드리지 않음)
                ctx.drawImage(tintedPatternImg, x, y, overlaySize, overlaySize); 
                resolve();
            };
        });
    }
    
    const base = capture.toDataURL("image/png");
    setFinalImage(base); // 최종 이미지 설정

    // 3. QR 코드 생성 (API 호출 활성화)
    let imageUrl = "https://your-final-photo-link.com/photo-" + Date.now(); // 임시 URL
    
    try {
        const up = await fetch("/api/upload", { 
            method: "POST", 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base }) 
        });
        const data = await up.json();
        if (data.url) imageUrl = data.url; // 서버에서 반환한 실제 URL 사용
        else console.error("API 응답에 URL이 없습니다:", data);

    } catch (e) {
        console.error("업로드 API 호출 실패:", e);
    }
    
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, imageUrl, { width: 400 }); 
    
    setQrData(qrCanvas.toDataURL("image/png")); // QR 이미지 설정
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
      } else setCountdown(n);
    }, 1000);
  };

  return (
    <div className="w-full min-h-screen bg-white text-black p-6 flex flex-col items-center gap-6 overflow-y-auto pb-32">

      <h1 className="text-2xl font-bold mb-4">🎨 Booth Prototype</h1>

      <div className="relative w-full max-w-md">
        <video 
            ref={videoRef} 
            className="w-full rounded-lg bg-black"
            autoPlay 
            playsInline 
            muted 
        />
        <canvas ref={overlayRef} className="absolute top-0 left-0 pointer-events-none" />
      </div>

      <canvas ref={captureRef} className="hidden" />

      <button
        onClick={takePhoto} 
        className="bg-green-600 text-white px-4 py-3 rounded w-full max-w-md text-lg font-semibold"
      >
        3 · 2 · 1 촬영
      </button>

      {/* 문양 선택 */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-md">
        {patterns.map((p) => (
          <button
            key={p}
            onClick={() => setPattern(p)}
            className={`p-1 rounded border ${
              pattern === p ? "border-black" : "border-gray-400"
            }`}
          >
            <img src={p} className="w-full rounded" />
          </button>
        ))}
      </div>

      {/* 색상 선택 */}
      <div className="grid grid-cols-8 gap-2 w-full max-w-md mt-4">
        {filters.map((c) => (
          <button
            key={c}
            onClick={() => setTintColor(c)}
            className={`w-8 h-8 rounded-full border ${
              tintColor === c ? "border-black border-2" : "border-gray-400"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {finalImage && (
        <div className="flex flex-col items-center mt-6 gap-4 w-full max-w-md">
          <img src={finalImage} className="rounded-lg w-full border border-black" />
          
          {qrData && (
            <div className="bg-white p-4 rounded-lg border border-black">
              <img src={qrData} className="w-40 h-40" /> 
            </div>
          )}
        </div>
      )}
    </div>
  );
}