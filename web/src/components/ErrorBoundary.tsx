import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-foreground">
                {this.props.fallbackTitle || "Une interruption est survenue"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {this.state.error?.message || "Les données de cette page ont rencontré un format inattendu. Cliquez sur le bouton ci-dessous pour rafraîchir."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="default"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto gap-2 font-bold bg-primary text-primary-foreground"
              >
                <RefreshCw className="h-4 w-4" />
                Recharger la page
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="w-full sm:w-auto gap-2 font-semibold"
              >
                <Home className="h-4 w-4" />
                Accueil
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
