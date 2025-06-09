import { NextRequest, NextResponse } from "next/server";
import { streamTokenProvider } from "@/actions/stream.actions";

export async function GET(req: NextRequest) {
  try {
    const token = await streamTokenProvider();
    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to get token" }, { status: 401 });
  }
}
