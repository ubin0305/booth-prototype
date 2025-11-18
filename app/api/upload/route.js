import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ url: null, error: "NO_IMAGE" });
    }

    // 로컬 환경에서 blob 작동안 할 때 가짜 URL 리턴
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        url: "https://example.com/test-image.png"
      });
    }

    // 실제 배포 환경에서만 업로드
    const base64Data = imageBase64.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    const blob = await put(`photo-${Date.now()}.png`, buffer, {
      access: "public",
      contentType: "image/png",
    });

    return NextResponse.json({ url: blob.url });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json({ url: null, error: String(err) });
  }
}
