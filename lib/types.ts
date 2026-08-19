export type TransactionType = "EXPENSE" | "EARNING";

export type SerializedTransaction = {
  id: string;
  type: TransactionType;
  desc: string;
  amount: number;
  date: string | null; // ISO date string, e.g. "2026-09-01"
  notes: string | null;
  attachmentData: string | null; // data URL, e.g. "data:image/png;base64,..."
  attachmentName: string | null;
};

export type SerializedTrip = {
  id: string;
  name: string;
  eventDate: string | null; // ISO date string
  transactions: SerializedTransaction[];
};
