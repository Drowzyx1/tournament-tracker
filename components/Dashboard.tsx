"use client";

import { useMemo, useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import TransactionForm, { type TransactionFormValues } from "@/components/TransactionForm";
import type { SerializedTrip, SerializedTransaction, TransactionType } from "@/lib/types";

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function tripTotals(trip: SerializedTrip) {
  let exp = 0;
  let earn = 0;
  for (const tx of trip.transactions) {
    if (tx.type === "EXPENSE") exp += tx.amount;
    else earn += tx.amount;
  }
  return { exp, earn, net: earn - exp };
}

function grandTotals(trips: SerializedTrip[]) {
  let exp = 0;
  let earn = 0;
  for (const t of trips) {
    const tt = tripTotals(t);
    exp += tt.exp;
    earn += tt.earn;
  }
  return { exp, earn, net: earn - exp };
}

function countdownInfo(dateStr: string | null) {
  if (!dateStr) return { text: "No event date set", cls: "" };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const event = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((event.getTime() - today.getTime()) / 86400000);
  if (diffDays > 1) return { text: `${diffDays} days until event`, cls: "upcoming" };
  if (diffDays === 1) return { text: "Tomorrow!", cls: "upcoming" };
  if (diffDays === 0) return { text: "Today!", cls: "today" };
  if (diffDays === -1) return { text: "Was yesterday", cls: "past" };
  return { text: `${Math.abs(diffDays)} days ago`, cls: "past" };
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — response wasn't JSON
    }
    throw new Error(message);
  }
  return res.json();
}

export default function Dashboard({
  initialTrips,
  userName,
}: {
  initialTrips: SerializedTrip[];
  userName: string | null;
}) {
  const [trips, setTrips] = useState<SerializedTrip[]>(initialTrips);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(initialTrips[0]?.id ?? null);
  const [activeForm, setActiveForm] = useState<"exp" | "earn" | null>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  );
  const gt = useMemo(() => grandTotals(trips), [trips]);

  function selectTrip(id: string) {
    setSelectedTripId(id);
    setActiveForm(null);
    setEditingTrip(false);
    setError(null);
  }

  async function handleAddTrip() {
    setError(null);
    try {
      const { trip } = await apiFetch("/api/trips", {
        method: "POST",
        body: JSON.stringify({ name: "New Trip" }),
      });
      const newTrip: SerializedTrip = { ...trip, transactions: [] };
      setTrips((prev) => [...prev, newTrip]);
      setSelectedTripId(newTrip.id);
      setEditingTrip(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create trip");
    }
  }

  async function handleDeleteTrip(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/trips/${id}`, { method: "DELETE" });
      setTrips((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (selectedTripId === id) {
          setSelectedTripId(next.length ? next[0].id : null);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete trip");
    }
  }

  async function handleSaveTrip(name: string, eventDate: string) {
    if (!selectedTrip) return;
    setError(null);
    try {
      const { trip } = await apiFetch(`/api/trips/${selectedTrip.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, eventDate: eventDate || null }),
      });
      setTrips((prev) =>
        prev.map((t) => (t.id === trip.id ? { ...t, name: trip.name, eventDate: trip.eventDate } : t))
      );
      setEditingTrip(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update trip");
    }
  }

  async function handleAddTransaction(type: TransactionType, values: TransactionFormValues) {
    if (!selectedTrip) return;
    setError(null);
    setBusy(true);
    try {
      const { transaction } = await apiFetch(`/api/trips/${selectedTrip.id}/transactions`, {
        method: "POST",
        body: JSON.stringify({
          type,
          desc: values.desc,
          amount: values.amount,
          date: values.date || null,
          notes: values.notes || null,
          attachmentData: values.attachmentData,
          attachmentName: values.attachmentName,
        }),
      });
      setTrips((prev) =>
        prev.map((t) =>
          t.id === selectedTrip.id ? { ...t, transactions: [...t.transactions, transaction] } : t
        )
      );
      setActiveForm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add entry");
    } finally {
      setBusy(false);
    }
  }

  async function handleEditTransaction(tx: SerializedTransaction, values: TransactionFormValues) {
    if (!selectedTrip) return;
    setError(null);
    setBusy(true);
    try {
      const { transaction } = await apiFetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          desc: values.desc,
          amount: values.amount,
          date: values.date || null,
          notes: values.notes || null,
          attachmentData: values.attachmentData,
          attachmentName: values.attachmentName,
        }),
      });
      setTrips((prev) =>
        prev.map((t) =>
          t.id === selectedTrip.id
            ? {
                ...t,
                transactions: t.transactions.map((x) => (x.id === tx.id ? { ...x, ...transaction } : x)),
              }
            : t
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update entry");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTransaction(tx: SerializedTransaction) {
    if (!selectedTrip) return;
    setError(null);
    try {
      await apiFetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      setTrips((prev) =>
        prev.map((t) =>
          t.id === selectedTrip.id
            ? { ...t, transactions: t.transactions.filter((x) => x.id !== tx.id) }
            : t
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete entry");
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="avatar-fallback">{(userName ?? "?").charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{userName ?? "Signed in"}</div>
            <div className="app-name">Tournament Tracker</div>
          </div>
          <SignOutButton />
        </div>

        <div className="grand-total">
          <div className="label">Overall Total</div>
          <div className="value" style={{ color: gt.net >= 0 ? "var(--good-text)" : "var(--critical)" }}>
            {fmt(gt.net)}
          </div>
          <div className="breakdown">
            <span>Earnings {fmt(gt.earn)}</span>
            <span>Expenses {fmt(gt.exp)}</span>
          </div>
        </div>

        <div className="trip-list">
          {trips.length === 0 && <div className="tx-empty">No trips yet. Add one below.</div>}
          {trips.map((t) => {
            const tt = tripTotals(t);
            const cd = countdownInfo(t.eventDate);
            return (
              <div
                key={t.id}
                className={`trip-item${t.id === selectedTripId ? " active" : ""}`}
                onClick={() => selectTrip(t.id)}
              >
                <div className="ti-main">
                  <div className="ti-name">{t.name}</div>
                  <div className="ti-countdown">{cd.text}</div>
                </div>
                <div className={`ti-net ${tt.net >= 0 ? "pos" : "neg"}`}>{fmt(tt.net)}</div>
                <button
                  className="ti-del"
                  title="Delete trip"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTrip(t.id);
                  }}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        <button className="btn-new-trip" onClick={handleAddTrip}>
          + New Trip / Tournament
        </button>
      </aside>

      <main className="main">
        {error && <div className="error-banner">{error}</div>}

        {!selectedTrip ? (
          <div className="empty-state">Create a trip or tournament on the left to get started.</div>
        ) : (
          <TripPanel
            key={selectedTrip.id}
            trip={selectedTrip}
            editingTrip={editingTrip}
            setEditingTrip={setEditingTrip}
            activeForm={activeForm}
            setActiveForm={setActiveForm}
            busy={busy}
            onSaveTrip={handleSaveTrip}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenAttachment={setLightbox}
          />
        )}
      </main>

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Attachment" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function TripPanel({
  trip,
  editingTrip,
  setEditingTrip,
  activeForm,
  setActiveForm,
  busy,
  onSaveTrip,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onOpenAttachment,
}: {
  trip: SerializedTrip;
  editingTrip: boolean;
  setEditingTrip: (v: boolean) => void;
  activeForm: "exp" | "earn" | null;
  setActiveForm: (v: "exp" | "earn" | null) => void;
  busy: boolean;
  onSaveTrip: (name: string, eventDate: string) => void;
  onAddTransaction: (type: TransactionType, values: TransactionFormValues) => void;
  onEditTransaction: (tx: SerializedTransaction, values: TransactionFormValues) => void;
  onDeleteTransaction: (tx: SerializedTransaction) => void;
  onOpenAttachment: (src: string) => void;
}) {
  const tt = tripTotals(trip);
  const cd = countdownInfo(trip.eventDate);
  const expenses = trip.transactions.filter((t) => t.type === "EXPENSE");
  const earnings = trip.transactions.filter((t) => t.type === "EARNING");

  const [nameInput, setNameInput] = useState(trip.name);
  const [dateInput, setDateInput] = useState(trip.eventDate ?? "");
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  return (
    <>
      <div className="trip-header">
        <div>
          <div className="trip-title-row">
            <h2 className="trip-title">{trip.name}</h2>
            <button
              className="icon-btn"
              title="Edit name / event date"
              onClick={() => {
                setNameInput(trip.name);
                setDateInput(trip.eventDate ?? "");
                setEditingTrip(true);
              }}
            >
              &#9998;
            </button>
          </div>
          <div className={`countdown-badge ${cd.cls}`}>{cd.text}</div>

          {editingTrip && (
            <div className="edit-row">
              <input
                type="text"
                value={nameInput}
                placeholder="Trip name"
                onChange={(e) => setNameInput(e.target.value)}
              />
              <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
              <button onClick={() => onSaveTrip(nameInput.trim() || trip.name, dateInput)}>Save</button>
              <button className="secondary" onClick={() => setEditingTrip(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile earn">
          <div className="st-label">Total Earnings</div>
          <div className="st-value">{fmt(tt.earn)}</div>
        </div>
        <div className="stat-tile exp">
          <div className="st-label">Total Expenses</div>
          <div className="st-value">{fmt(tt.exp)}</div>
        </div>
        <div className="stat-tile">
          <div className="st-label">Net Profit / Loss</div>
          <div className="st-value" style={{ color: tt.net >= 0 ? "var(--good-text)" : "var(--critical)" }}>
            {fmt(tt.net)}
          </div>
        </div>
      </div>

      <div className="action-row">
        <button
          className="btn-action exp"
          onClick={() => setActiveForm(activeForm === "exp" ? null : "exp")}
        >
          + Add Expense
        </button>
        <button
          className="btn-action earn"
          onClick={() => setActiveForm(activeForm === "earn" ? null : "earn")}
        >
          + Add Profit / Earnings
        </button>
      </div>

      {activeForm === "exp" && (
        <TransactionForm
          kind="exp"
          busy={busy}
          submitLabel="Add Expense"
          onSubmit={(values) => onAddTransaction("EXPENSE", values)}
          onCancel={() => setActiveForm(null)}
        />
      )}

      {activeForm === "earn" && (
        <TransactionForm
          kind="earn"
          busy={busy}
          submitLabel="Add Earnings"
          onSubmit={(values) => onAddTransaction("EARNING", values)}
          onCancel={() => setActiveForm(null)}
        />
      )}

      <div className="section-title">Expenses</div>
      <TxList
        items={expenses}
        kind="exp"
        busy={busy}
        editingTxId={editingTxId}
        setEditingTxId={setEditingTxId}
        onEdit={onEditTransaction}
        onDelete={onDeleteTransaction}
        onOpenAttachment={onOpenAttachment}
      />

      <div className="section-title">Profits / Earnings</div>
      <TxList
        items={earnings}
        kind="earn"
        busy={busy}
        editingTxId={editingTxId}
        setEditingTxId={setEditingTxId}
        onEdit={onEditTransaction}
        onDelete={onDeleteTransaction}
        onOpenAttachment={onOpenAttachment}
      />
    </>
  );
}

function TxList({
  items,
  kind,
  busy,
  editingTxId,
  setEditingTxId,
  onEdit,
  onDelete,
  onOpenAttachment,
}: {
  items: SerializedTransaction[];
  kind: "exp" | "earn";
  busy: boolean;
  editingTxId: string | null;
  setEditingTxId: (id: string | null) => void;
  onEdit: (tx: SerializedTransaction, values: TransactionFormValues) => void;
  onDelete: (tx: SerializedTransaction) => void;
  onOpenAttachment: (src: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="tx-list">
        <div className="tx-empty">
          {kind === "exp" ? "No expenses logged yet." : "No earnings logged yet."}
        </div>
      </div>
    );
  }
  return (
    <div className="tx-list">
      {items.map((x) =>
        x.id === editingTxId ? (
          <div className="tx-edit-wrap" key={x.id}>
            <TransactionForm
              kind={kind}
              busy={busy}
              submitLabel="Save"
              initial={{
                desc: x.desc,
                amount: String(x.amount),
                date: x.date ?? "",
                notes: x.notes ?? "",
                attachmentData: x.attachmentData,
                attachmentName: x.attachmentName,
              }}
              onSubmit={(values) => {
                onEdit(x, values);
                setEditingTxId(null);
              }}
              onCancel={() => setEditingTxId(null)}
            />
          </div>
        ) : (
          <div className="tx-row" key={x.id}>
            <div className="tx-main">
              {x.attachmentData && (
                <button
                  type="button"
                  className="tx-thumb"
                  title="View attachment"
                  onClick={() => onOpenAttachment(x.attachmentData!)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.attachmentData} alt={x.attachmentName ?? "Attachment"} />
                </button>
              )}
              <div>
                <div className="tx-desc">{x.desc}</div>
                {x.date && <div className="tx-date">{x.date}</div>}
                {x.notes && <div className="tx-notes">{x.notes}</div>}
              </div>
            </div>
            <div className="tx-right">
              <div className={`tx-amount ${kind}`}>
                {kind === "exp" ? "-" : "+"}
                {fmt(x.amount)}
              </div>
              <button className="tx-edit" title="Edit" onClick={() => setEditingTxId(x.id)}>
                &#9998;
              </button>
              <button className="tx-del" title="Delete" onClick={() => onDelete(x)}>
                &times;
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
