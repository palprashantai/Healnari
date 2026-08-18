/** Minimal chainable stand-in for the Supabase query builder used across
 * this codebase's services (`.from(table).select().eq().single()` etc).
 * Configured per-table with a queue of `{ data, error, count }`-shaped
 * results — each call to `.from(table)` shifts the next queued result for
 * that table, so sequential calls to the same table in one test can return
 * different things in order. Every chain method returns the same builder;
 * `.single()`/`.maybeSingle()` resolve explicitly, and the builder is also
 * itself thenable so a bare `await query` (no terminal call) resolves too —
 * both patterns are used throughout the real services. */
export function createSupabaseMock(tableResponses: Record<string, any[]>) {
  const queues: Record<string, any[]> = {};
  for (const [table, results] of Object.entries(tableResponses)) queues[table] = [...results];

  const calls: { table: string; method: string; args: any[] }[] = [];

  const from = jest.fn((table: string) => {
    const queue = queues[table] || [];
    const result = queue.length > 0 ? queue.shift() : { data: null, error: null };

    const builder: any = {};
    const chainMethods = ['select', 'eq', 'neq', 'in', 'order', 'limit', 'insert', 'update', 'delete', 'gte', 'lte', 'is', 'or', 'upsert'];
    for (const method of chainMethods) {
      builder[method] = jest.fn((...args: any[]) => {
        calls.push({ table, method, args });
        return builder;
      });
    }
    builder.single = jest.fn(() => Promise.resolve(result));
    builder.maybeSingle = jest.fn(() => Promise.resolve(result));
    builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
    return builder;
  });

  return { supabase: { admin: { from } }, from, calls };
}
