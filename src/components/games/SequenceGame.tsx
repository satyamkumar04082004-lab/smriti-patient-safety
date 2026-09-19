import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GAMES, PASS_THRESHOLD, sequenceAccuracy } from "@/lib/games";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SequenceGameProps {
  slug: string;
  unlockedLevel: number;
  bestScore: number;
  onAttempt: (args: { level: number; accuracy: number }) => void;
  onExit: () => void;
}

interface Round {
  sequence: number[];
  flashIndex: number | "showing" | "input" | "done";
}

/**
 * Generic adaptive sequence game engine used by pattern-memory games
 * (Bamboo Sequence, Color Recall, Sound Order). The level config scales
 * sequence length and speed; accuracy drives the 75% unlock rule.
 */
export function SequenceGame({
  slug,
  unlockedLevel,
  bestScore,
  onAttempt,
  onExit,
}: SequenceGameProps) {
  const game = GAMES.find((g) => g.slug === slug);
  const [level, setLevel] = useState(Math.max(1, unlockedLevel));
  const [phase, setPhase] = useState<"showing" | "input" | "done">("showing");
  const [sequence, setSequence] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [inputIndex, setInputIndex] = useState(0);
  const [correctTaps, setCorrectTaps] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const startRound = useCallback(() => {
    clearTimers();
    const len = 3 + level; // L1=4 ... L5=8
    const seq = Array.from({ length: len }, () =>
      Math.floor(Math.random() * 6),
    );
    setSequence(seq);
    setInputIndex(0);
    setCorrectTaps(0);
    setTotalTaps(0);
    setPhase("showing");

    const speed = Math.max(320, 700 - level * 60);
    seq.forEach((_, i) => {
      timersRef.current.push(
        window.setTimeout(() => setFlash(i), i * speed),
      );
      timersRef.current.push(
        window.setTimeout(() => setFlash(null), i * speed + speed * 0.6),
      );
    });
    timersRef.current.push(
      window.setTimeout(
        () => setPhase("input"),
        seq.length * speed + 300,
      ),
    );
  }, [clearTimers, level]);

  useEffect(() => {
    startRound();
    return clearTimers;
  }, [startRound, clearTimers]);

  const finish = useCallback(
    (correct: number, total: number) => {
      setPhase("done");
      const accuracy = sequenceAccuracy(correct, total);
      onAttempt({ level, accuracy });
    },
    [level, onAttempt],
  );

  const handleTap = (index: number) => {
    if (phase !== "input" || sequence.length === 0) return;
    const expected = sequence[inputIndex];
    const ok = index === expected;
    const nextCorrect = correctTaps + (ok ? 1 : 0);
    const nextTotal = totalTaps + 1;
    setCorrectTaps(nextCorrect);
    setTotalTaps(nextTotal);

    if (!ok) {
      // One mistake ends the round (classic sequence-game rule).
      finish(nextCorrect, nextTotal);
      return;
    }
    if (inputIndex + 1 >= sequence.length) {
      finish(nextCorrect, nextTotal);
      return;
    }
    setInputIndex(inputIndex + 1);
  };

  if (!game) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Unknown game.
        </CardContent>
      </Card>
    );
  }

  const accuracy = sequenceAccuracy(correctTaps, totalTaps);
  const lastResult =
    phase === "done"
      ? {
          accuracy,
          passed: accuracy > PASS_THRESHOLD,
        }
      : null;

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

        {phase === "showing" && (
          <p className="text-center text-sm text-muted-foreground">
            Watch the sequence…
          </p>
        )}
        {phase === "input" && (
          <p className="text-center text-sm text-muted-foreground">
            Repeat the sequence — tap the tiles in order.
          </p>
        )}
        {lastResult && (
          <div className="flex flex-col items-center gap-2 rounded-md border px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              {lastResult.passed ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <XCircle className="size-4" aria-hidden />
              )}
              {lastResult.accuracy}% accuracy —{" "}
              {lastResult.passed
                ? `Level ${Math.min(level + 1, game.maxLevel)} unlocked!`
                : "Above 75% unlocks the next level"}
            </p>
            <Button size="sm" variant="outline" onClick={startRound}>
              <RotateCcw className="mr-2 size-4" />
              Play again
            </Button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 self-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Tile ${i + 1}`}
              className="size-16 rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              disabled={phase !== "input"}
              onClick={() => handleTap(i)}
            >
              {i === flash ? "●" : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Progress value={accuracy} className="h-2" />
          <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
            {accuracy}%
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
