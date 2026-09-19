import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useVoiceGuard } from "@/hooks/use-voice-guard";
import { Mic, MicOff } from "lucide-react";

interface VoiceGuardProps {
  onKeyword: (phrase: string) => void;
}

/**
 * Subtle enable/disable toggle for voice-activated SOS. When enabled and a
 * keyword ("Help", "Bachao", "Madad") is heard, the shared SOS engine fires.
 */
export function VoiceGuard({ onKeyword }: VoiceGuardProps) {
  const guard = useVoiceGuard(onKeyword);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {guard.enabled ? (
              <Mic className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <MicOff className="size-4 text-muted-foreground" aria-hidden />
            )}
            <div>
              <Label htmlFor="voice-guard" className="text-sm font-medium">
                Voice Guard
              </Label>
              <p className="text-xs text-muted-foreground">
                Says “Help”, “Bachao” or “Madad” to send SOS automatically.
              </p>
            </div>
          </div>
          <Switch
            id="voice-guard"
            checked={guard.enabled}
            onCheckedChange={(checked) => guard.setEnabled(checked === true)}
            aria-label="Enable Voice Guard"
          />
        </div>

        {guard.enabled && guard.listening && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/50" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Listening in the background…
          </p>
        )}

        {guard.enabled && !guard.supported && (
          <p className="text-xs text-muted-foreground" role="alert">
            Voice recognition is not supported on this browser. SOS button
            still works.
          </p>
        )}

        {guard.error && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-destructive" role="alert">
              {guard.error}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={guard.clearError}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
