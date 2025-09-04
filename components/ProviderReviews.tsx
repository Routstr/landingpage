"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp as ArrowUpIcon } from "lucide-react";
import { useNostr } from "@/context/NostrContext";
import { type Event } from "nostr-tools";
import { getDefaultRelays, validateNsec } from "@/lib/nostr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ProviderReviewsProps {
  providerId: string;
}

interface ReviewItem {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
}

export function ProviderReviews({ providerId }: ProviderReviewsProps) {
  const { isAuthenticated, publicKey, login, loginWithNsec, publishEvent, pool, isNostrAvailable, logout } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nsecInput, setNsecInput] = useState("");
  const [nsecError, setNsecError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<null | { id: string; pubkey: string }>(null);
  const [isUpvotingById, setIsUpvotingById] = useState<Record<string, boolean>>({});
  const [userUpvoted, setUserUpvoted] = useState<Record<string, boolean>>({});
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});
  const reactionByReviewerRef = useRef<Record<string, Map<string, 'up' | 'none'>>>({});
  const [sortMode, setSortMode] = useState<'top' | 'new'>('top');

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

  useEffect(() => {
    if (!loginOpen) {
      setError(null);
      setNsecError(null);
      setNsecInput("");
    }
  }, [loginOpen]);

  // Fetch reviews from relays using kind 1985 (arbitrary app-specific) with tag ["t","provider:<id>"]
  useEffect(() => {
    let active = true;
    if (!pool) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const relays = getDefaultRelays();
    const nextItems: ReviewItem[] = [];
    const closer = pool.subscribeMany(
      relays,
      [
        {
          kinds: [1985],
          "#t": ["provider:" + providerId],
          limit: 50,
        },
      ],
      {
        onevent(evt: Event) {
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
  }, [pool, providerId]);

  // Subscribe to reactions (kind 7) for the loaded reviews and compute counts
  useEffect(() => {
    if (!pool) return;
    if (items.length === 0) {
      setUpvoteCounts({});
      setUserUpvoted({});
      reactionByReviewerRef.current = {};
      return;
    }

    const reviewIds = items.map((r) => r.id);
    const relays = getDefaultRelays();
    const closer = pool.subscribeMany(
      relays,
      [
        {
          kinds: [7],
          "#e": reviewIds,
          limit: 1000,
        },
      ],
      {
        onevent(evt: Event) {
          const eTag = evt.tags.find((t) => t[0] === "e")?.[1];
          if (!eTag) return;
          // Track latest reaction per (review, pubkey); count only positives as upvotes
          const content = (evt.content || "").trim();
          const isPositive = content === "+" || content === "❤️" || content === "👍" || content === "❤";
          if (!reactionByReviewerRef.current[eTag]) reactionByReviewerRef.current[eTag] = new Map<string, 'up' | 'none'>();
          reactionByReviewerRef.current[eTag].set(evt.pubkey, isPositive ? 'up' : 'none');
          let count = 0;
          reactionByReviewerRef.current[eTag].forEach((v) => { if (v === 'up') count++; });
          setUpvoteCounts((prev) => ({ ...prev, [eTag]: count }));
          if (publicKey && evt.pubkey === publicKey) setUserUpvoted((prev) => ({ ...prev, [eTag]: isPositive }));
        },
      }
    );

    return () => {
      try { closer.close(); } catch {}
    };
  }, [pool, items, publicKey]);

  async function handleSubmit() {
    setError(null);
    if (!reviewText.trim()) {
      setError("Review cannot be empty");
      return;
    }
    if (!publishEvent) return;
    setIsSubmitting(true);
    try {
      const content = reviewText.trim();
      const kind = 1985;
      // Use context publish which signs and publishes with tag t=provider:<id>
      const signed = await publishEvent(content, kind, [["t", "provider:" + providerId]]);
      if (signed) {
        // optimistic prepend
        setItems((prev) => [
          {
            id: signed.id,
            pubkey: signed.pubkey,
            content: signed.content,
            created_at: signed.created_at,
          },
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

  async function handleUpvote(reviewId: string, reviewPubkey: string) {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    if (!publishEvent) return;
    setIsUpvotingById((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const kind = 7; // NIP-25 reaction
      const tags = [
        ["e", reviewId],
        ["p", reviewPubkey],
      ] as string[][];
      const currentlyUpvoted = !!userUpvoted[reviewId];
      const content = currentlyUpvoted ? "" : "+"; // empty content clears upvote in our counting
      const signed = await publishEvent(content, kind, tags);
      if (signed) {
        if (currentlyUpvoted) {
          setUserUpvoted((prev) => ({ ...prev, [reviewId]: false }));
          setUpvoteCounts((prev) => ({ ...prev, [reviewId]: Math.max(0, (prev[reviewId] || 0) - 1) }));
        } else {
          setUserUpvoted((prev) => ({ ...prev, [reviewId]: true }));
          setUpvoteCounts((prev) => ({ ...prev, [reviewId]: (prev[reviewId] || 0) + 1 }));
        }
      }
    } catch {}
    finally {
      setIsUpvotingById((prev) => ({ ...prev, [reviewId]: false }));
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

  const sortedItems = useMemo(() => {
    const list = [...items];
    if (sortMode === 'top') {
      list.sort((a, b) => {
        const bu = upvoteCounts[b.id] || 0;
        const au = upvoteCounts[a.id] || 0;
        if (bu !== au) return bu - au;
        return b.created_at - a.created_at;
      });
    } else {
      list.sort((a, b) => b.created_at - a.created_at);
    }
    return list;
  }, [items, upvoteCounts, sortMode]);

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-4">Reviews</h2>

      <div className="mb-6">
        {isAuthenticated ? (
          <div className="space-y-3">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this provider..."
              className="w-full rounded-md bg-white/5 border border-white/10 p-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              rows={3}
            />
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : null}
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
          <>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center rounded-md bg-white text-black px-4 py-2 text-sm font-medium"
            >
              Login with Nostr
            </button>
            <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
              <DialogContent className="bg-black text-white border-white/10">
                <DialogHeader>
                  <DialogTitle>Login to post a review</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Use a NIP-07 browser extension or paste your nsec. We&apos;ll use your key to sign review events.
                  </DialogDescription>
                </DialogHeader>

                {error ? <p className="text-sm text-red-400">{error}</p> : null}

                <div className="space-y-2 mt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await login();
                      if (!ok) setError("Failed to connect to Nostr extension");
                      if (ok) setLoginOpen(false);
                    }}
                    className="inline-flex items-center rounded-md bg-white text-black px-4 py-2 text-sm font-medium"
                  >
                    Connect Nostr extension
                  </button>
                  {!isNostrAvailable ? (
                    <p className="text-xs text-gray-500">
                      No Nostr extension detected. Install a NIP-07 wallet (e.g., nos2x or Alby) and try again.
                    </p>
                  ) : null}
                </div>

                <div className="pt-4">
                  <label className="block text-xs text-gray-400 mb-1">Or login with nsec (advanced)</label>
                  <input
                    value={nsecInput}
                    onChange={(e) => {
                      setNsecInput(e.target.value.trim());
                      setNsecError(null);
                    }}
                    placeholder="nsec1..."
                    type="password"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="nsec private key"
                    className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  {nsecError ? (
                    <p className="text-xs text-red-400 mt-1">{nsecError}</p>
                  ) : (
                    <p className="text-[11px] text-gray-500 mt-1">Warning: this stores your nsec in localStorage to enable signing.</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!nsecInput) {
                          setNsecError("Enter your nsec");
                          return;
                        }
                        if (!validateNsec(nsecInput)) {
                          setNsecError("Invalid nsec format");
                          return;
                        }
                        const ok = loginWithNsec(nsecInput);
                        if (!ok) setNsecError("Failed to login with nsec");
                        if (ok) setLoginOpen(false);
                      }}
                      className="inline-flex items-center rounded-md bg-white text-black px-3 py-1.5 text-xs font-medium"
                    >
                      Login with nsec
                    </button>
                  </div>
                </div>

                <DialogFooter />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="mb-2 flex items-center justify-end">
        <div className="flex items-center gap-1 text-xs rounded-md border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setSortMode('top')}
            aria-pressed={sortMode === 'top'}
            className={`px-2 py-1 ${sortMode === 'top' ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white'}`}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => setSortMode('new')}
            aria-pressed={sortMode === 'new'}
            className={`px-2 py-1 ${sortMode === 'new' ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white'}`}
          >
            Newest
          </button>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-gray-400">Loading reviews…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-gray-400">No reviews yet.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {sortedItems.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center select-none">
                    <button
                      type="button"
                      onClick={() => handleUpvote(r.id, r.pubkey)}
                      disabled={!!isUpvotingById[r.id]}
                      aria-label={userUpvoted[r.id] ? "Unupvote" : "Upvote"}
                      className={`p-1 ${userUpvoted[r.id] ? "text-orange-400" : "text-gray-400 hover:text-gray-200"}`}
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <div className="text-xs text-gray-300">
                      {upvoteCounts[r.id] || 0}
                    </div>
                  </div>
                  <div className="flex-1">
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
                  </div>
                </div>
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


