import { NextRequest, NextResponse } from 'next/server';

const OPTIMIZER_URL = process.env.OPTIMIZER_URL ?? 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${OPTIMIZER_URL}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  // Normalize Python snake_case → TypeScript camelCase
  const normalized = {
    ...data,
    proposed: (data.proposed ?? []).map((p: { id: string; suggested_date: string }) => ({
      id: p.id,
      suggestedDate: p.suggested_date,
    })),
  };
  return NextResponse.json(normalized, { status: res.status });
}
