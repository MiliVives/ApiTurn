import { NextRequest, NextResponse } from 'next/server';

const OPTIMIZER_URL = process.env.OPTIMIZER_URL ?? 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const body = await req.json();

  let res: Response;
  try {
    res = await fetch(`${OPTIMIZER_URL}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo conectar con el servicio de optimización.' },
      { status: 503 },
    );
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = { message: await res.text().catch(() => '') };
    }
    return NextResponse.json(
      { error: 'optimizer_error', status: res.status, detail },
      { status: res.status },
    );
  }

  const data = await res.json();
  const normalized = {
    ...data,
    overflow_count: data.overflow_count ?? 0,
    proposed: (data.proposed ?? []).map((p: { id: string; suggested_date: string }) => ({
      id: p.id,
      suggestedDate: p.suggested_date,
    })),
  };
  return NextResponse.json(normalized);
}
