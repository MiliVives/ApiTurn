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
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `El optimizador respondió con error ${res.status}.`, detail: text },
      { status: res.status },
    );
  }

  const data = await res.json();
  const normalized = {
    ...data,
    proposed: (data.proposed ?? []).map((p: { id: string; suggested_date: string }) => ({
      id: p.id,
      suggestedDate: p.suggested_date,
    })),
  };
  return NextResponse.json(normalized);
}
