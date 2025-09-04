"use client";

import { useEffect, useState } from "react";
import { useNostr } from "@/context/NostrContext";
import { type Event } from "nostr-tools";
import { getDefaultRelays } from "@/lib/nostr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronsUpDown as ChevronsUpDownIcon, Check as CheckIcon } from "lucide-react";
import type { Provider } from "@/app/data/models";

interface ModelReviewsProps {
  modelId: string;
  providersForModel: Provider[];
}

interface ReviewItem {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
}

function formatTimeAgo(createdAtSeconds: number): string {
  const now = Date.now();
  const then = createdAtSeconds * 1000;
  const diffMs = Math.max(0, now - then);
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  const yr = Math.floor(mon / 12);
  return `${yr}y ago`;
}

export function ModelReviews({ modelId, providersForModel }: ModelReviewsProps) {
  const { isAuthenticated, publicKey, publishEvent, pool, logout } = useNostr();
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providersForModel[0]?.id || "");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<null | { id: string; pubkey: string }>(null);

  useEffect(() => {
    let active = true;
    if (!pool || !selectedProviderId) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    const relays = getDefaultRelays();
    const nextItems: ReviewItem[] = [];
    const closer = pool.subscribeMany(
      relays,
      [
        {
          kinds: [1986],
          "#t": [
            "model:" + modelId,
            "provider:" + selectedProviderId,
          ],
          limit: 50,
        },
      ],
      {
        onevent(evt: Event) {
          const hasModelTag = evt.tags?.some((t) => t[0] === "t" && t[1] === `model:${modelId}`);
          const hasProviderTag = evt.tags?.some((t) => t[0] === "t" && t[1] === `provider:${selectedProviderId}`);
          if (!hasModelTag || !hasProviderTag) return;
          nextItems.push({
            id: evt.id,
            pubkey: evt.pubkey,
            content: evt.content,
            created_at: evt.created_at,
          });
        },
        oneose() {
          if (!active) return;
          nextItems.sort((a: ReviewItem, b: ReviewItem) => b.created_at - a.created_at);
          setItems(nextItems);
          setIsLoading(false);
        },
      }
    );

    return () => {
      active = false;
      try { closer.close(); } catch {}
    };
  }, [pool, modelId, selectedProviderId]);

  async function handleSubmit() {
    setError(null);
    if (!reviewText.trim()) {
      setError("Review cannot be empty");
      return;
    }
    if (!selectedProviderId) {
      setError("Select a provider");
      return;
    }
    setIsSubmitting(true);
    try {
      const kind = 1986;
      const tags = [
        ["t", "model:" + modelId],
        ["t", "provider:" + selectedProviderId],
      ];
      const signed = await publishEvent(reviewText.trim(), kind, tags);
      if (signed) {
        setItems((prev) => [
          { id: signed.id, pubkey: signed.pubkey, content: signed.content, created_at: signed.created_at },
          ...prev,
        ]);
        setReviewText("");
      } else {
        setError("Failed to publish review");
      }
    } catch {
      setError("Error submitting review");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(reviewId: string, reviewPubkey: string) {
    if (!publicKey || publicKey !== reviewPubkey) return;
    try {
      const kind = 5; // NIP-09 deletion
      const tags = [["e", reviewId]] as string[][];
      const signed = await publishEvent("", kind, tags);
      if (signed) {
        setItems((prev) => prev.filter((it) => it.id !== reviewId));
      }
    } catch {}
  }

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-4">Model Reviews</h2>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-400">Provider:</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex w-64 items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10"
              aria-label="Select provider"
            >
              <span className="truncate">
                {providersForModel.find((p) => p.id === selectedProviderId)?.name || "Select a provider"}
              </span>
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1 bg-black text-white border-white/10">
            <div role="listbox" aria-label="Select provider" className="max-h-64 overflow-y-auto">
              {providersForModel.map((p) => {
                const isActive = p.id === selectedProviderId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setSelectedProviderId(p.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-white/10 ${isActive ? "bg-white/10" : ""}`}
                  >
                    <CheckIcon className={`h-4 w-4 ${isActive ? "opacity-100" : "opacity-0"}`} />
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isAuthenticated ? (
        <div className="space-y-3 mb-6">
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this model at the selected provider..."
            className="w-full rounded-md bg-white/5 border border-white/10 p-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            rows={3}
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !reviewText.trim()}
              className="inline-flex items-center rounded-md bg-white text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? "Publishing..." : "Publish Review"}
            </button>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="truncate">Signed as {publicKey?.slice(0, 8)}…</span>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-200 underline underline-offset-2"
                aria-label="Log out of Nostr"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 text-sm text-gray-400">Log in from the provider page reviews to post.</div>
      )}

      <div className="border border-white/10 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-gray-400">Loading reviews…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-gray-400">No reviews yet.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {items.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-sm text-gray-400">{formatTimeAgo(r.created_at)}</div>
                  {publicKey && r.pubkey === publicKey ? (
                    <button
                      type="button"
                      onClick={() => setConfirmOpen({ id: r.id, pubkey: r.pubkey })}
                      className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-white/90">{r.content}</p>
                <div className="mt-2 text-xs text-gray-500">by {r.pubkey.slice(0, 10)}…</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Dialog open={!!confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(null)}>
        <DialogContent className="bg-black text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Delete review?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will publish a deletion event to Nostr relays. It may take time for all relays to reflect the change.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setConfirmOpen(null)}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (confirmOpen) {
                  await handleDelete(confirmOpen.id, confirmOpen.pubkey);
                }
                setConfirmOpen(null);
              }}
              className="rounded-md bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-400"
            >
              Delete
            </button>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </section>
  );
}
