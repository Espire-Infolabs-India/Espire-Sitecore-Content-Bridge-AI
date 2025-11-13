// app/api/getToken/route.ts
import { NextRequest, NextResponse } from 'next/server';

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const audience = process.env.AUDIENCE;

export async function GET(req: NextRequest) {
  const data = new URLSearchParams({
    audience: audience || 'https://api.sitecorecloud.io',
    grant_type: 'client_credentials',
    client_id: clientId || "",
    client_secret: clientSecret || ""
  });

  const response = await fetch('https://auth.sitecorecloud.io/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: data.toString(),
  });

  if (!response.ok) return NextResponse.json({ error: 'Token request failed' }, { status: 500 });
  const json = await response.json();
  return NextResponse.json(json);
}
