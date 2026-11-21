"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  Lock,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: {
            client_id: string;
            callback: (res: { credential?: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function GoogleMark() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-2 3l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2l-3.3 2.6C4.7 19.8 8.1 22 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.1 7.5C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z"
      />
      <path
        fill="#4285F4"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.5l3.3 2.6c.8-2.4 3-4.2 5.6-4.2z"
      />
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/qrs";

  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Quick Gmail modal when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not yet set in environment
  const [gmailDialogOpen, setGmailDialogOpen] = React.useState(false);
  const [gmailEmail, setGmailEmail] = React.useState("");
  const [gmailName, setGmailName] = React.useState("");
  const googleBtnRef = React.useRef<HTMLDivElement | null>(null);

  const handleGoogleCredential = React.useCallback(
    async (payload: { credential?: string; email?: string; name?: string }) => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { message?: string; user?: { name: string } };
        if (!res.ok) {
          throw new Error(data.message ?? "No se pudo autenticar con Google");
        }
        toast.success(`Bienvenido, ${data.user?.name ?? "Usuario"}`);
        setGmailDialogOpen(false);
        router.push(nextPath);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al iniciar sesión con Gmail");
      } finally {
        setLoading(false);
      }
    },
    [nextPath, router],
  );

  // Mount official Google Identity Services button if NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured
  React.useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const scriptId = "google-identity-gsi";
    const initGsi = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {
          if (res.credential) {
            void handleGoogleCredential({ credential: res.credential });
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        width: 360,
        text: "continue_with",
        shape: "pill",
      });
    };

    if (document.getElementById(scriptId)) {
      initGsi();
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    document.head.appendChild(script);
  }, [handleGoogleCredential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { email, password }
            : { name, email, password },
        ),
      });
      const data = (await res.json()) as { message?: string; user?: { name: string } };
      if (!res.ok) {
        throw new Error(data.message ?? "No se pudo completar la solicitud");
      }
      toast.success(
        mode === "login"
          ? `Bienvenido de nuevo, ${data.user?.name ?? ""}`
          : `Cuenta creada exitosamente. ¡Bienvenido, ${data.user?.name ?? ""}!`,
      );
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  const handleGmailQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = gmailEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Ingresa tu dirección de correo de Gmail válida");
      return;
    }
    await handleGoogleCredential({
      email: cleanEmail,
      name: gmailName.trim() || cleanEmail.split("@")[0],
    });
  };

  const handleDemoAccess = async () => {
    setEmail("demo@qira.alkonpos.com");
    setPassword("demo1234");
    setMode("login");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "demo@qira.alkonpos.com",
          password: "demo1234",
        }),
      });
      if (!res.ok) {
        throw new Error("No se pudo iniciar con la cuenta demo");
      }
      toast.success("Sesión iniciada con Estudio QIRA Demo");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar demo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-12">
        {/* Left Branding & Features Pitch */}
        <div className="space-y-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2.5 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-300">
            <Sparkles className="size-4 text-sky-400" />
            QIRA QRs Pro • Dynamic QR &amp; 300 DPI Print Studio
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Códigos QR Dinámicos e Impresión Profesional a{" "}
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              300 DPI
            </span>
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Crea QRs con reglas inteligentes de horario, dispositivo e idioma, mini-landings vCard / Link Hub, y diseña tarjetas físicas en centímetros listas para guillotina e imprenta.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-400/12 bg-[#0c1424]/80 p-4">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                <QrCode className="size-4 text-sky-400" />
                QRs 100% Editables
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cambia el destino, reglas, PIN o UTM en cualquier momento sin reimprimir el código.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-400/12 bg-[#0c1424]/80 p-4">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                <Layers className="size-4 text-sky-400" />
                Print Studio en cm
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Doble cara, sangrado de 3 mm, 38 tipografías, lotes CSV e imposición con marcas de corte.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Resolución &lt;50 ms con Redis
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-sky-400" />
              Verificador de contraste WCAG 3.5:1
            </span>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-6">
          <Card className="mx-auto w-full max-w-md border-sky-400/20 p-1">
            <CardHeader className="space-y-3 pb-4">
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 rounded-xl border border-sky-400/15 bg-[#08101e] p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={cn(
                    "rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                    mode === "login"
                      ? "bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={cn(
                    "rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                    mode === "register"
                      ? "bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Crear Cuenta
                </button>
              </div>

              <div>
                <CardTitle className="text-xl">
                  {mode === "login" ? "Accede a tu Estudio QIRA" : "Crea tu cuenta en QIRA Pro"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {mode === "login"
                    ? "Ingresa con tu correo y contraseña o continúa directamente con tu cuenta de Gmail."
                    : "Regístrate con tu correo y contraseña o vincula tu cuenta de Gmail en un clic."}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Google / Gmail Sign-In Button */}
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="flex justify-center" />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-center gap-2.5 border-sky-400/25 bg-[#0f1b30] font-semibold text-foreground hover:border-sky-400/50 hover:bg-[#162744]"
                  disabled={loading}
                  onClick={() => setGmailDialogOpen(true)}
                >
                  <GoogleMark />
                  {mode === "login" ? "Continuar con Gmail" : "Registrarse con Gmail"}
                </Button>
              )}

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-sky-400/12" />
                <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                  o con correo
                </span>
                <div className="w-full border-t border-sky-400/12" />
              </div>

              {/* Email + Password Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === "register" && (
                  <Field label="Nombre Completo o Empresa">
                    <div className="relative">
                      <User className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                      <Input
                        type="text"
                        required
                        minLength={2}
                        placeholder="Ej. Valentina Ríos"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </Field>
                )}

                <Field label="Correo Electrónico">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Field
                  label="Contraseña"
                  hint={mode === "register" ? "Mínimo 6 caracteres." : undefined}
                >
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                    <Input
                      type="password"
                      required
                      minLength={mode === "register" ? 6 : 1}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Button type="submit" className="h-10 w-full" disabled={loading}>
                  {loading
                    ? "Procesando..."
                    : mode === "login"
                      ? "Iniciar Sesión"
                      : "Crear Cuenta"}
                  <ArrowRight className="size-4" />
                </Button>
              </form>

              {/* Quick Demo Account Access */}
              <div className="rounded-xl border border-sky-400/12 bg-[#08101e]/75 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sky-300">¿Quieres explorar la demo?</div>
                    <div className="text-[11px] text-muted-foreground">
                      Incluye 4 QRs dinámicos, 1 tarjeta 9×5 cm y 300 escaneos.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    onClick={handleDemoAccess}
                  >
                    Entrar Demo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gmail Sign-In Dialog */}
      <Dialog open={gmailDialogOpen} onOpenChange={setGmailDialogOpen}>
        <DialogContent
          title="Continuar con tu cuenta de Gmail"
          description="Ingresa tu correo de Gmail para acceder o crear tu cuenta de QIRA Pro al instante."
        >
          <form onSubmit={handleGmailQuickSubmit} className="space-y-4 pt-1">
            <Field label="Correo de Gmail">
              <div className="relative">
                <Mail className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="tucuenta@gmail.com"
                  value={gmailEmail}
                  onChange={(e) => setGmailEmail(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Tu Nombre (opcional para cuentas nuevas)">
              <div className="relative">
                <User className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Ej. Luis Atencio"
                  value={gmailName}
                  onChange={(e) => setGmailName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                <GoogleMark />
                {loading ? "Conectando..." : "Continuar con Gmail"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Cargando acceso a QIRA Pro...
        </div>
      }
    >
      <LoginInner />
    </React.Suspense>
  );
}
