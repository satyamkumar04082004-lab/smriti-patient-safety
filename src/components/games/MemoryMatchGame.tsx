import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GAMES, PASS_THRESHOLD } from "@/lib/games";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MemoryMatchGameProps {
  slug: string;
  unlockedLevel: number;
  bestScore: number;
  onAttempt: (args: { level: number; accuracy: number }) => void;
  onExit: () => void;
}

const SYMBOLS = ["●", "▲", "■", "◆", "★", "⬟", "✚", "❀", "☾", "♪"];

/**
 * Memory Match: find all pairs. Board size scales with level;
 * accuracy = perfect-move baseline / moves used, feeding the 75% rule.
 */
export function MemoryMatchGame({
  slug,
  unlockedLevel,
  bestScore,
  onAttempt,
  onExit,
}: MemoryMatchGameProps) {
  const game = GAMES.find((g) => g.slug === slug);
  const [level, setLevel] = useState(Math.max(1, unlockedLevel));
  const [cards, setCards] = useState<Array<{ id: number; symbol: string; flipped: boolean; matched: boolean }>>([]);
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const flippedRef = useRef<number[]>([]);

  const pairCount = 2 + level; // L1=3 pairs ... L5=7 pairs

  const startRound = useCallback(() => {
    const chosen = SYMBOLS.slice(0, pairCount);
    const deck = [...chosen, ...chosen]
      .map((symbol, id) => ({ id, symbol, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    setCards(deck);
    setMoves(0);
    setDone(false);
    setBusy(false);
    flippedRef.current = [];
  }, [pairCount]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const handleFlip = (index: number) => {
    if (busy || done) return;
    const card = cards[index];
    if (card === undefined || card.flipped || card.matched) return;

    const next = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    flippedRef.current = [...flippedRef.current, index];
    setCards(next);

    if (flippedRef.current.length < 2) return;

    const [a, b] = flippedRef.current;
    const matches = next[a].symbol === next[b].symbol;
    setMoves((m) => m + 1);
    setBusy(true);

    window.setTimeout(
      () => {
        setCards((prev) => {
          const updated = prev.map((c, i) =>
            i === a || i === b
              ? { ...c, matched: matches, flipped: matches }
              : c,
          );
          if (updated.every((c) => c.matched)) {
            setDone(true);
          }
          return updated;
        });
        flippedRef.current = [];
        setBusy(false);
      },
      matches ? 350 : 800,
    );
  };

  const finishAttempt = useCallback(
    (movesUsed: number) => {
      const perfect = pairCount; // minimum moves to clear pairCount pairs
      const accuracy = Math.max(
        0,
        Math.min(100, Math.round((perfect / Math.max(perfect, movesUsed)) * 100)),
      );
      onAttempt({ level, accuracy });
    },
    [level, onAttempt, pairCount],
  );

  useEffect(() => {
    if (done && moves > 0) finishAttempt(moves);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!game) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Unknown game.
        </CardContent>
      </Card>
    );
  }

  const accuracy =
    moves === 0
      ? 0
      : Math.max(
          0,
          Math.min(100, Math.round((pairCount / Math.max(pairCount, moves)) * 100)),
        );
  const matchedCount = cards.filter((c) => c.matched).length / 2;
  const passed = accuracy > PASS_THRESHOLD && done;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <ArrowLeft className="mr-2 size-4" />
            Hub
          </Button>
          <p className="text-sm font-medium">
            {game.name} — Level {level}
          </p>
          <Badge variant="outline">Best {bestScore}%</Badge>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {done
            ? `Board cleared in ${moves} moves — ${accuracy}% accuracy.`
            : `Find all ${pairCount} pairs. Fewer moves, higher accuracy.`}
        </p>

        {done && (
          <div className="flex flex-col items-center gap-2 rounded-md border px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              {passed ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <XCircle className="size-4" aria-hidden />
              )}
              {passed
                ? `Level ${Math.min(level + 1, game.maxLevel)} unlocked!`
                : "Score above 75% to unlock the next level"}
            </p>
            <Button size="sm" variant="outline" onClick={startRound}>
              <RotateCcw className="mr-2 size-4" />
              Play again
            </Button>
          </div>
        )}

        <div
          className="grid grid-cols-4 gap-2 self-center"
          role="grid"
          aria-label="Memory board"
        >
          {cards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              className="flex size-16 items-center justify-center rounded-md border text-xl transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              disabled={busy || card.flipped || card.matched}
              onClick={() => handleFlip(index)}
            >
              {card.flipped || card.matched ? card.symbol : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Progress
            value={(matchedCount / pairCount) * 100}
            className="h-2"
          />
          <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
            {matchedCount}/{pairCount}
          </span>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: game.maxLevel }).map((_, i) => (
            <span
              key={i}
              className={
                i < level
                  ? "size-2 rounded-full bg-primary"
                  : "size-2 rounded-full bg-border"
              }
              aria-label={`Level ${i + 1}${i < level ? " unlocked" : " locked"}`}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {level}/{game.maxLevel} levels
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
