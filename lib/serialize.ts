// Dates are sent to the client as plain "YYYY-MM-DD" strings (see
// SerializedTrip / SerializedTransaction in lib/types.ts) so <input
// type="date"> can round-trip them and countdown math stays timezone-safe.
// Prisma returns real Date objects, which JSON.stringify would otherwise
// turn into full ISO timestamps — always run API responses through this
// before sending them back.
export function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
