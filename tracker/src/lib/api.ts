import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

/**
 * One error shape for every route. Missing DATABASE_URL is surfaced as a
 * distinct 503 with a setup hint, because it is by far the most likely failure
 * on a fresh deploy and reads as a generic 500 otherwise.
 */
export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: 'Invalid request', issues: error.issues },
      { status: 400 }
    );
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  if (message.includes('DATABASE_URL')) {
    return NextResponse.json({ message, setupRequired: true }, { status: 503 });
  }
  console.error('[api]', error);
  return NextResponse.json({ message }, { status: 500 });
}
