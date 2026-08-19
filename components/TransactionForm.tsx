"use client";

import { useState, type ChangeEvent } from "react";
import { MAX_ATTACHMENT_BYTES, validateAttachment } from "@/lib/attachments";

export type TransactionFormValues = {
  desc: string;
  amount: number;
  date: string;
  notes: string;
  attachmentData: string | null;
  attachmentName: string | null;
};

export type TransactionFormInitial = {
  desc: string;
  amount: string;
  date: string;
  notes: string;
  attachmentData: string | null;
  attachmentName: string | null;
};

export default function TransactionForm({
  kind,
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  kind: "exp" | "earn";
  initial?: TransactionFormInitial;
  busy: boolean;
  submitLabel: string;
  onSubmit: (values: TransactionFormValues) => void;
  onCancel?: () => void;
}) {
  const [desc, setDesc] = useState(initial?.desc ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [attachmentData, setAttachmentData] = useState<string | null>(initial?.attachmentData ?? null);
  const [attachmentName, setAttachmentName] = useState<string | null>(initial?.attachmentName ?? null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError(null);

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError("Image is too large — 5MB max");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const error = validateAttachment(dataUrl);
      if (error) {
        setFileError(error);
        return;
      }
      setAttachmentData(dataUrl);
      setAttachmentName(file.name);
    };
    reader.onerror = () => setFileError("Couldn't read that file");
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!desc.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit({
      desc: desc.trim(),
      amount: parsed,
      date,
      notes: notes.trim(),
      attachmentData,
      attachmentName,
    });
  }

  return (
    <div className="inline-form tx-form">
      <div className="tx-form-fields">
        <div className="field">
          <label>Description</label>
          <input
            type="text"
            placeholder={kind === "exp" ? "e.g. Entry fee" : "e.g. 1st place prize"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Amount ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="field tx-form-notes">
        <label>Notes</label>
        <textarea
          rows={2}
          placeholder="Optional notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Screenshot / receipt</label>
        {attachmentData ? (
          <div className="attachment-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachmentData} alt={attachmentName ?? "Attachment"} />
            <div className="attachment-meta">
              <span>{attachmentName ?? "Attachment"}</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAttachmentData(null);
                  setAttachmentName(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <input type="file" accept="image/*" onChange={handleFile} />
        )}
        {fileError && <div className="auth-error">{fileError}</div>}
      </div>

      <div className="tx-form-actions">
        <button type="button" disabled={busy} onClick={handleSubmit}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
