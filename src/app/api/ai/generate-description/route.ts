import { NextRequest, NextResponse } from 'next/server';

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_IMPROVES_PER_HOUR = 2;
const improveAttempts = new Map<string, number[]>();

function checkImproveRateLimit(userKey: string): { allowed: boolean; retryAfterSec?: number; remaining?: number } {
  const now = Date.now();
  const recent = (improveAttempts.get(userKey) || []).filter((t) => now - t < ONE_HOUR_MS);

  if (recent.length >= MAX_IMPROVES_PER_HOUR) {
    const oldest = Math.min(...recent);
    const retryAfterSec = Math.ceil((ONE_HOUR_MS - (now - oldest)) / 1000);
    improveAttempts.set(userKey, recent);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  improveAttempts.set(userKey, recent);
  return { allowed: true, remaining: MAX_IMPROVES_PER_HOUR - recent.length };
}

const CATEGORY_LABELS: Record<string, string> = {
  cooking: 'Cocina',
  mixology: 'Mixología',
  tasting: 'Degustación',
  catering: 'Catering',
  corporate: 'Eventos corporativos',
  celebrations: 'Celebraciones',
  workshops: 'Talleres',
  other: 'Otros',
};

const TYPE_LABELS: Record<string, string> = {
  presential: 'presencial',
  virtual: 'virtual',
  hybrid: 'híbrida (presencial + virtual)',
};

interface RequestBody {
  title?: string;
  categories?: string[];
  duration?: number;
  capacity?: number;
  minCapacity?: number;
  basePrice?: number;
  currency?: string;
  experienceType?: string;
  city?: string;
  includes?: string[];
  requirements?: string[];
  currentDescription?: string;
  mode?: 'generate' | 'improve';
  userId?: string;
}

const SYSTEM_PROMPT = `Eres un copywriter experto en marketing gastronómico y SEO en español (Colombia). Tu trabajo es escribir descripciones de experiencias gastronómicas que:

1. Maximicen la conversión: usa un tono cercano, evocador y con verbos sensoriales (saborear, descubrir, vivir, compartir, sorprender).
2. Incluyan palabras clave SEO relevantes basadas en el título, las categorías y la ciudad cuando aplique, sin caer en keyword stuffing.
3. Tengan estructura clara: un gancho inicial fuerte, beneficios concretos para el comensal, qué se llevará/aprenderá, llamado sutil a reservar.
4. Tengan entre 600 y 900 caracteres (≈100–150 palabras). No excedas 1200 caracteres.
5. Estén en español neutro de Colombia, en segunda persona singular ("tú"). Sin emojis. Sin viñetas ni markdown. Sin títulos: solo el cuerpo de la descripción en 1–3 párrafos cortos.
6. Nunca inventes precios, fechas, certificaciones, premios ni datos del anfitrión que no estén en el contexto entregado.

Responde SOLO con el texto de la descripción, sin comillas, sin prefijos como "Descripción:" ni explicaciones.`;

const buildUserPrompt = (data: RequestBody): string => {
  const lines: string[] = [];
  lines.push(`Título: ${data.title || '(sin título)'}`);
  if (data.categories && data.categories.length > 0) {
    const labels = data.categories.map((c) => CATEGORY_LABELS[c] || c).join(', ');
    lines.push(`Categorías: ${labels}`);
  }
  if (data.experienceType) {
    lines.push(`Modalidad: ${TYPE_LABELS[data.experienceType] || data.experienceType}`);
  }
  if (data.city) lines.push(`Ciudad: ${data.city}`);
  if (data.duration) lines.push(`Duración: ${data.duration} minutos`);
  if (data.capacity) {
    const min = data.minCapacity && data.minCapacity !== data.capacity ? `${data.minCapacity}–` : '';
    lines.push(`Capacidad: ${min}${data.capacity} personas`);
  }
  if (data.basePrice && data.currency) {
    lines.push(`Precio por persona: ${data.basePrice.toLocaleString('es-CO')} ${data.currency}`);
  }
  const includes = data.includes?.filter((i) => i && i.trim());
  if (includes && includes.length > 0) {
    lines.push(`Incluye: ${includes.join(' · ')}`);
  }
  const requirements = data.requirements?.filter((r) => r && r.trim());
  if (requirements && requirements.length > 0) {
    lines.push(`Requisitos: ${requirements.join(' · ')}`);
  }

  if (data.mode === 'improve' && data.currentDescription?.trim()) {
    lines.push('');
    lines.push('Reescribe y mejora la siguiente descripción manteniendo su intención, pero con mejor SEO, gancho y conversión:');
    lines.push(`"""${data.currentDescription.trim()}"""`);
  } else {
    lines.push('');
    lines.push('Genera una descripción nueva siguiendo todas las reglas del sistema.');
  }

  return lines.join('\n');
};

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'El asistente IA no está configurado en este entorno.' },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as RequestBody;

    if (!body.title?.trim() && !body.currentDescription?.trim()) {
      return NextResponse.json(
        { error: 'Necesitamos al menos el título o una descripción base para generar el contenido.' },
        { status: 400 },
      );
    }

    if (body.mode === 'improve') {
      const userKey =
        body.userId?.trim() ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'anonymous';
      const limit = checkImproveRateLimit(userKey);
      if (!limit.allowed) {
        const minutes = Math.max(1, Math.ceil((limit.retryAfterSec ?? 0) / 60));
        return NextResponse.json(
          {
            error: `Has alcanzado el límite de ${MAX_IMPROVES_PER_HOUR} mejoras por hora. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}.`,
            retryAfterSec: limit.retryAfterSec,
          },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec ?? 60) } },
        );
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(body) },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', response.status, errText);
      return NextResponse.json(
        { error: 'OpenAI rechazó la solicitud. Intenta de nuevo en unos segundos.' },
        { status: 502 },
      );
    }

    const json = await response.json();
    const description: string = json.choices?.[0]?.message?.content?.trim() || '';

    if (!description) {
      return NextResponse.json(
        { error: 'No recibimos contenido del asistente. Intenta de nuevo.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error generating AI description:', error);
    return NextResponse.json(
      { error: 'Error inesperado generando la descripción.' },
      { status: 500 },
    );
  }
}
