import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SequenceGame } from "@/components/games/SequenceGame";
import { GAMES } from "@/lib/games";
import { ChevronRight, Lock } from "lucide-react";
import { useState } from "react";

export function GamesHub() {
  const progressRows = useQuery(api.games.myProgress) ?? [];
  const recordAttempt = useMutation(api.games.recordAttempt);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const activeGame = GAMES.find((g) => g.slug === activeSlug);

  const progressFor = (slug: string) => {
    const row = progressRows.find((r) => r.game === slug);
    return {
      unlockedLevel: row?.unlockedLevel ?? 1,
      bestScore: row?.bestScore ?? 0,
    };
  };

  const handleAttempt = async (
    slug: string,
    level: number,
    accuracy: number,
  ) => {
    try {
      await recordAttempt({ game: slug, level, accuracy });
    } catch {
      // Progress save failures must not break play; next attempt retries.
    }
  };

  if (activeGame) {
    const prog = progressFor(activeGame.slug);
    return (
      <SequenceGame
        slug={activeGame.slug}
        unlockedLevel={prog.unlockedLevel}
        bestScore={prog.bestScore}
        onAttempt={({ level, accuracy }) =>
          void handleAttempt(activeGame.slug, level, accuracy)
        }
        onExit={() => setActiveSlug(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Games Hub</CardTitle>
        <CardDescription>
          Seven adaptive games. Score above 75% to unlock the next level —
          progress is saved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {GAMES.map((game) => {
          const prog = progressFor(game.slug);
          return (
            <button
              key={game.slug}
              type="button"
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => setActiveSlug(game.slug)}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {game.name}
                  <span className="flex items-center gap-1">
                    {Array.from({ length: game.maxLevel }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < prog.unlockedLevel
                            ? "size-1.5 rounded-full bg-primary"
                            : "size-1.5 rounded-full bg-border"
                        }
                        aria-label={
                          i < prog.unlockedLevel
                            ? `Level ${i + 1} unlocked`
                            : `Level ${i + 1} locked`
                        }
                      />
                    ))}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {game.description} Best: {prog.bestScore}%
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {prog.unlockedLevel}/{game.maxLevel}
                <Lock className="ml-1 size-3" aria-hidden />
              </Badge>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
