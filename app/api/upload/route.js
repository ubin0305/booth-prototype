import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ url: null, error: "NO_IMAGE" });
    }

    // base64 -> buffer 변환
    const base64 = imageBase64.split(",")[1];
    const buffer = Buffer.from(base64, "base64");

    // 파일명 랜덤 생성
    const filename = `photo-${Date.now()}.png`;

    // Blob Store에 업로드
    const { url } = await put(filename, buffer, {
      access: "public", // 누구나 볼 수 있게
    });

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({
      url: null,
      error: String(err),
    });
  }
}
