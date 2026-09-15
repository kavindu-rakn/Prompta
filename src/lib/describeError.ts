/**
 * Turns anything thrown or returned as an error into a readable message.
 *
 * Supabase database (PostgREST) errors are plain objects shaped like
 * { message, details, hint, code } - not Error instances. Treating everything
 * that is not an Error as a string turns them into "[object Object]" and throws
 * away the only information they carry.
 *
 * Kept free of imports so it can be exercised directly against real error
 * objects without loading the Supabase client.
 */
export function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack };
  }

  if (error !== null && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown; hint?: unknown; details?: unknown };

    if (typeof e.message === "string" && e.message) {
      const extras = [
        e.code ? `code ${String(e.code)}` : "",
        e.hint ? `hint: ${String(e.hint)}` : "",
      ].filter(Boolean);

      return {
        message: extras.length ? `${e.message} (${extras.join(", ")})` : e.message,
        // PostgREST puts the long form - a constraint detail, or the stack trace
        // of a failed network request - in `details`, the nearest thing to a stack.
        stack: e.details ? String(e.details) : undefined,
      };
    }

    try {
      return { message: JSON.stringify(error) };
    } catch {
      // Circular structures cannot be serialised.
      return { message: Object.prototype.toString.call(error) };
    }
  }

  return { message: error === undefined || error === null ? "unknown error" : String(error) };
}
