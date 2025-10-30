import { observer } from "mobx-react-lite";
import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import useCurrentAccount from "@/hooks/useCurrentAccount";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { gtsClient } from "@/lib/gotosocial";
import { cn } from "@/lib/utils";
import Loading from "@/pages/Loading";
import { Routes } from "@/router";
import { accountStore } from "@/store";

const RootLayout = observer(() => {
  const { sm } = useResponsiveWidth();
  const currentAccount = useCurrentAccount();
  const location = useLocation();
  const isExploreRoute = location.pathname.startsWith(Routes.EXPLORE);
  const isUserRoute = location.pathname.startsWith(Routes.USER);
  const isPublicRoute = isExploreRoute || isUserRoute;
  const [initialized, setInitialized] = useState(() => {
    if (!gtsClient.isAuthenticated()) {
      return isPublicRoute;
    }
    return false;
  });

  useEffect(() => {
    if (!gtsClient.isAuthenticated()) {
      setInitialized(isPublicRoute);
      return;
    }

    if (!currentAccount) {
      void accountStore.initialize();
      return;
    }

    setInitialized(true);
  }, [currentAccount, isPublicRoute]);

  return !initialized ? (
    <Loading />
  ) : (
    <div className="w-full min-h-full flex flex-row justify-center items-start sm:pl-16">
      {sm && (
        <div
          className={cn(
            "group flex flex-col justify-start items-start fixed top-0 left-0 select-none h-full bg-sidebar",
            "w-16 px-2",
            "border-r border-border",
          )}
        >
          <Navigation className="py-4 md:pt-6" collapsed={true} />
        </div>
      )}
      <main className="w-full h-auto grow shrink flex flex-col justify-start items-center">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
});

export default RootLayout;
