import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/roles";
import logo from "@/assets/logo.svg";
import { useMutation } from "convex/react";
import { ArrowRight, Loader2, Phone } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

const MOCK_OTP = "1234";

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const ensureProfile = useMutation(api.profiles.ensureProfile);

  const [role, setRole] = useState<AppRole>("patient");
  const [mode, setMode] = useState<"password" | "otp">("password");

  // password mode
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // otp mode
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  // Establish the session via Convex Auth's password flow, then tag the
  // signed-in user with the chosen SMRITI role (mock credentials).
  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", {
        flow: "signUp",
        email: `${username.trim().toLowerCase()}@smriti.app`,
        password,
        name: username.trim(),
      });
      await ensureProfile({
        role,
        username: username.trim(),
        name: username.trim(),
      });
      navigate(redirect);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (phone.trim().length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setIsLoading(true);
    setError(null);
    // Simulate OTP dispatch.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setOtpSent(true);
    setIsLoading(false);
    toast.info(`OTP sent to ${phone.trim()}`, {
      description: "Demo OTP is 1234",
    });
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp !== MOCK_OTP) {
      setError("Incorrect OTP. Use 1234 for the demo.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous", {});
      await ensureProfile({
        role,
        username: `otp-${phone.trim()}`,
        phone: phone.trim(),
        name: username.trim() || ROLE_LABELS[role],
      });
      navigate(redirect);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center h-full flex-col">
          <Card className="min-w-[350px] pb-0 border shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="SMRITI"
                  width={64}
                  height={64}
                  className="rounded-lg mb-4 mt-4 cursor-pointer"
                  onClick={() => navigate("/")}
                />
              </div>
              <CardTitle className="text-xl">Sign in to SMRITI</CardTitle>
              <CardDescription>
                Choose your role to continue — each role sees its own view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <TabsList className="grid w-full grid-cols-3">
                  {APP_ROLES.map((r) => (
                    <TabsTrigger key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {APP_ROLES.map((r) => (
                  <TabsContent key={r} value={r} className="mt-4">
                    {mode === "password" ? (
                      <form
                        onSubmit={handlePasswordSubmit}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. satyam_patient"
                            autoComplete="username"
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full gap-2"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ArrowRight className="size-4" />
                          )}
                          Sign in as {ROLE_LABELS[r]}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setMode("otp");
                            setError(null);
                          }}
                          disabled={isLoading}
                        >
                          <Phone className="mr-2 size-4" />
                          Login via OTP
                        </Button>
                      </form>
                    ) : (
                      <form
                        onSubmit={handleOtpSubmit}
                        className="flex flex-col gap-3"
                      >
                        {!otpSent ? (
                          <>
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="phone">Mobile Number</Label>
                              <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="98765 43210"
                                autoComplete="tel"
                                disabled={isLoading}
                              />
                            </div>
                            <Button
                              type="button"
                              className="w-full gap-2"
                              onClick={() => void handleSendOtp()}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Phone className="size-4" />
                              )}
                              Send OTP
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Enter the 4-digit code sent to {phone}.
                            </p>
                            <div className="flex justify-center">
                              <InputOTP
                                maxLength={4}
                                value={otp}
                                onChange={setOtp}
                                disabled={isLoading}
                              >
                                <InputOTPGroup>
                                  {Array.from({ length: 4 }).map((_, i) => (
                                    <InputOTPSlot key={i} index={i} />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                            <Button
                              type="submit"
                              className="w-full gap-2"
                              disabled={isLoading || otp.length !== 4}
                            >
                              {isLoading ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <ArrowRight className="size-4" />
                              )}
                              Verify &amp; sign in
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setMode("password");
                            setOtpSent(false);
                            setOtp("");
                            setError(null);
                          }}
                          disabled={isLoading}
                        >
                          Back to password login
                        </Button>
                      </form>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
              {error && (
                <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-2 pb-4">
              <p className="text-xs text-muted-foreground text-center">
                Demo: any username + password works; OTP is 1234.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
