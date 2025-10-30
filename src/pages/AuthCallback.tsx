import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gtsClient } from "@/lib/gotosocial";
import { Routes } from "@/router";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      // Get authorization code from URL params
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Check for OAuth errors
      if (error) {
        setStatus("error");
        setErrorMessage(errorDescription || error);
        toast.error(`Authorization failed: ${errorDescription || error}`);
        return;
      }

      // Validate code
      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code received");
        toast.error("No authorization code received");
        return;
      }

      try {
        // Exchange code for access token
        await gtsClient.exchangeCodeForToken(code);

        // Get account info
        const account = gtsClient.getCurrentAccount();
        if (account) {
          toast.success(`Welcome back, @${account.username}!`);
        }

        setStatus("success");

        // Redirect to home after a short delay
        setTimeout(() => {
          navigate(Routes.ROOT, { replace: true });
        }, 1000);
      } catch (err) {
        console.error("Failed to complete authentication:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
        toast.error("Failed to complete authentication");
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-svh flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        {status === "processing" && (
          <>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <h2 className="text-xl font-semibold">Completing sign in...</h2>
            <p className="text-muted-foreground text-sm">Please wait while we authenticate your account.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center">
              <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Authentication successful!</h2>
            <p className="text-muted-foreground text-sm">Redirecting you to the app...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Authentication failed</h2>
            <p className="text-muted-foreground text-sm">{errorMessage}</p>
            <button
              onClick={() => navigate("/auth", { replace: true })}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
