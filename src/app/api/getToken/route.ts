// app/api/getToken/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const data = new URLSearchParams({
    audience: 'https://api.sitecorecloud.io',
    grant_type: 'client_credentials',
    client_id: "xOemE2ThuIPvthwImst8Wi2OkkdGkeN3",
    client_secret: "TOdwgC_1HWoBkMDR5Qil1ivcTK7M0ghkDq-HIbEn-HqEJ777T3dcI2C_tFZD8D1f"
  });

  const response = await fetch('https://auth.sitecorecloud.io/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: data.toString(),
  });


  //  const response = await fetch('https://xmc-espireinfol3993-espirestartef06-dev.sitecorecloud.io/oauth/token', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: data.toString(),
  // });


  if (!response.ok) return NextResponse.json({ error: 'Token request failed' }, { status: 500 });
  const json = await response.json();
  return NextResponse.json(json);
}
