import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { gtsClient } from "@/lib/gotosocial";
import { Routes } from "@/router";

const SignInGoToSocial = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    if (gtsClient.isAuthenticated()) {
      navigate(Routes.ROOT, { replace: true });
    }
  }, [navigate]);

  const handleSignIn = async () => {
    setIsLoading(true);

    try {
      // Get OAuth authorization URL
      const authUrl = await gtsClient.getAuthorizationUrl();

      // Redirect to GoToSocial for authorization
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to initiate sign in:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect to GoToSocial instance");
      setIsLoading(false);
    }
  };

  return (
    <div className="py-4 sm:py-8 w-80 max-w-full min-h-svh mx-auto flex flex-col justify-start items-center">
      <div className="w-full py-4 grow flex flex-col justify-center items-center">
        <div className="w-full flex flex-row justify-center items-center mb-6">
          <img className="h-14 w-auto rounded-full shadow" src="/logo.webp" alt="Memos" />
          <p className="ml-2 text-5xl text-foreground opacity-80">Memos</p>
        </div>

        <div className="w-full flex flex-col space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Welcome</h2>
            <p className="text-muted-foreground text-sm">Sign in with your GoToSocial account</p>
            <p className="text-muted-foreground text-xs">
              Instance: <span className="font-mono">{config.instanceUrl}</span>
            </p>
          </div>

          <Button className="w-full" size="lg" onClick={handleSignIn} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Sign in with GoToSocial"}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            <p>This will redirect you to your GoToSocial instance</p>
            <p>to authorize this application.</p>
          </div>
        </div>
      </div>

      <footer className="w-full py-4 text-center text-xs text-muted-foreground">
        <p>
          Powered by{" "}
          <a href="https://gotosocial.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            GoToSocial
          </a>
        </p>
      </footer>
    </div>
  );
};

export default SignInGoToSocial;
