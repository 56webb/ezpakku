import { NextResponse } from "next/server";
import { lookupWeather } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const location = searchParams.get("location")?.trim() ?? "";
  const startDate = searchParams.get("startDate")?.trim() ?? "";
  const days = Number(searchParams.get("days"));

  if ((!country && !city && !location) || !startDate || !Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ ok: false, reason: "請提供地點、出發日與天數" }, { status: 400 });
  }

  try {
    const weather = await lookupWeather({ country, city, location, startDate, days });
    return NextResponse.json({ ok: true, weather });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : "天氣查詢失敗";
    return NextResponse.json({ ok: false, reason }, { status: 502 });
  }
}
