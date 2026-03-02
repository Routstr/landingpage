"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp as ArrowUpIcon, ChevronsUpDown as ChevronsUpDownIcon, Check as CheckIcon } from "lucide-react";
import { useNostr } from "@/context/NostrContext";
import { type Event } from "nostr-tools";
import { getDefaultRelays } from "@/lib/nostr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Provider } from "@/app/data/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { isAuthenticated, publicKey, publishEvent, pool, logout, login, loginWithNsec } = useNostr();
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providersForModel[0]?.pubkey || "");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [nsecInput, setNsecInput] = useState("");
  const [open, setOpen] = useState(false);
  const [isUpvotingById, setIsUpvotingById] = useState<Record<string, boolean>>({});
  const [userUpvoted, setUserUpvoted] = useState<Record<string, boolean>>({});
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});
  const reactionByReviewerRef = useRef<Record<string, Map<string, 'up' | 'none'>>>({});
  const [sortMode, setSortMode] = useState<'top' | 'new'>('top');

  useEffect(() => {
    if (!loginOpen) {
      setError(null);
      setNsecInput("");
    }
  }, [loginOpen]);

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
      {
        kinds: [1986],
        "#t": ["model:" + modelId, "provider:" + selectedProviderId],
        limit: 50,
      },
      {
        onevent(evt: Event) {
          const hasModelTag = evt.tags?.some((t) => t[0] === "t" && t[1] === `model:${modelId}`);
          const hasProviderTag = evt.tags?.some((t) => t[0] === "t" && t[1] === `provider:${selectedProviderId}`);
          if (!hasModelTag || !hasProviderTag) return;
          nextItems.push({ id: evt.id, pubkey: evt.pubkey, content: evt.content, created_at: evt.created_at });
        },
        oneose() {
          if (!active) return;
          nextItems.sort((a: ReviewItem, b: ReviewItem) => b.created_at - a.created_at);
          setItems(nextItems);
          setIsLoading(false);
        },
      }
    );
    return () => { active = false; try { closer.close(); } catch {} };
  }, [pool, modelId, selectedProviderId]);

  useEffect(() => {
    if (!pool || items.length === 0) {
      setUpvoteCounts({});
      setUserUpvoted({});
      reactionByReviewerRef.current = {};
      return;
    }
    const reviewIds = items.map((r) => r.id);
    const relays = getDefaultRelays();
    const closer = pool.subscribeMany(
      relays,
      { kinds: [7], "#e": reviewIds, limit: 1000 },
      {
        onevent(evt: Event) {
          const eTag = evt.tags.find((t) => t[0] === "e")?.[1];
          if (!eTag) return;
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
    return () => { try { closer.close(); } catch {} };
  }, [pool, items, publicKey]);

  async function handleSubmit() {
    setError(null);
    if (!reviewText.trim() || !selectedProviderId) return;
    setIsSubmitting(true);
    try {
      const signed = await publishEvent(reviewText.trim(), 1986, [["t", "model:" + modelId], ["t", "provider:" + selectedProviderId]]);
      if (signed) {
        setItems((prev) => [{ id: signed.id, pubkey: signed.pubkey, content: signed.content, created_at: signed.created_at }, ...prev]);
        setUserUpvoted((prev) => ({ ...prev, [signed.id]: true }));
        setUpvoteCounts((prev) => ({ ...prev, [signed.id]: (prev[signed.id] || 0) + 1 }));
        try { await publishEvent("+", 7, [["e", signed.id],["p", signed.pubkey]]); } catch {}
        setReviewText("");
      }
    } catch { setError("Error submitting review"); }
    finally { setIsSubmitting(false); }
  }

  async function handleUpvote(reviewId: string, reviewPubkey: string) {
    if (!isAuthenticated) { setLoginOpen(true); return; }
    if (!publishEvent) return;
    setIsUpvotingById((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const currentlyUpvoted = !!userUpvoted[reviewId];
      const signed = await publishEvent(currentlyUpvoted ? "" : "+", 7, [["e", reviewId],["p", reviewPubkey]]);
      if (signed) {
        setUserUpvoted((prev) => ({ ...prev, [reviewId]: !currentlyUpvoted }));
        setUpvoteCounts((prev) => ({ ...prev, [reviewId]: Math.max(0, (prev[reviewId] || 0) + (currentlyUpvoted ? -1 : 1)) }));
      }
    } catch {}
    finally { setIsUpvotingById((prev) => ({ ...prev, [reviewId]: false })); }
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
    } else { list.sort((a, b) => b.created_at - a.created_at); }
    return list;
  }, [items, upvoteCounts, sortMode]);

  return (
    <div className="font-mono">
      <h2 className="text-xl font-bold text-foreground mb-8">Model Reviews</h2>

      <div className="mb-8 flex items-center gap-4">
        <span className="text-xs text-muted-foreground">Provider:</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 border-border bg-muted text-xs text-foreground hover:bg-muted"
            >
              {providersForModel.find((p) => p.pubkey === selectedProviderId)?.name || "Select Provider"}
              <ChevronsUpDownIcon className="h-3 w-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-background border-border p-1 w-64">
            {providersForModel.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => { setSelectedProviderId(p.pubkey); setOpen(false); }}
              >
                {p.name}
                {p.pubkey === selectedProviderId && <CheckIcon className="h-3 w-3" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {isAuthenticated ? (
        <div className="mb-12 space-y-4">
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience..."
            className="min-h-24 border-border bg-card text-muted-foreground placeholder:text-muted-foreground"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <Button onClick={handleSubmit} disabled={isSubmitting || !reviewText.trim()} size="sm">
              {isSubmitting ? "Publishing..." : "Publish Review"}
            </Button>
            <button onClick={logout} className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-4">Log out ({publicKey?.slice(0, 8)})</button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : (
        <Button onClick={() => setLoginOpen(true)} variant="outline" className="mb-12">Login with Nostr to Review</Button>
      )}

      <div className="flex flex-col">
        <div className="mb-4 flex justify-end">
          <Tabs
            value={sortMode}
            onValueChange={(value) => setSortMode(value as "top" | "new")}
            className="w-auto"
          >
            <TabsList variant="line" className="h-8">
              <TabsTrigger
                value="top"
                className="h-7 text-xs"
              >
                Top
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="h-7 text-xs"
              >
                Newest
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="py-12 border-t border-border/30 text-xs text-muted-foreground">Loading reviews...</div>
        ) : items.length === 0 ? (
          <div className="py-12 border-t border-border/30 text-xs text-muted-foreground">No reviews yet.</div>
        ) : (
          <div className="flex flex-col border-t border-border/30">
            {sortedItems.map((r) => (
              <div key={r.id} className="py-8 border-b border-border/30 flex gap-6">
                <div className="flex flex-col items-center gap-1">
                  <button
                    disabled={Boolean(isUpvotingById[r.id])}
                    onClick={() => handleUpvote(r.id, r.pubkey)}
                    className={`p-1 hover:bg-muted transition-colors disabled:opacity-40 ${userUpvoted[r.id] ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] font-bold text-muted-foreground">{upvoteCounts[r.id] || 0}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  <div className="mt-4 text-[10px] text-muted-foreground">npub: {r.pubkey.slice(0, 16)}...</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="bg-background border-border text-foreground font-mono">
          <DialogHeader>
            <DialogTitle>Login with Nostr</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">Use an extension or paste your nsec to sign review events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <Button className="w-full" onClick={async () => { if (await login()) setLoginOpen(false); }}>Connect Extension</Button>
            <div className="space-y-3">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Or use Private Key</span>
              <Input
                type="password"
                value={nsecInput}
                onChange={e => setNsecInput(e.target.value)}
                className="h-10 border-border bg-card text-xs text-foreground placeholder:text-muted-foreground"
                placeholder="nsec1..."
              />
              <Button variant="outline" className="w-full" onClick={() => { if (loginWithNsec(nsecInput)) setLoginOpen(false); }}>Login with nsec</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
