import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { gtsClient } from "./lib/gotosocial";
import { Routes } from "./router";
import { accountStore } from "./store";

const App = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (gtsClient.isAuthenticated()) {
      void accountStore.initialize();
    }
  }, []);

  useEffect(() => {
    const isAuthSection = location.pathname.startsWith(Routes.AUTH);
    const isExplorePage = location.pathname.startsWith(Routes.EXPLORE);
    const isUserPage = location.pathname.startsWith(Routes.USER);
    const authenticated = gtsClient.isAuthenticated();

    if (!authenticated) {
      if (!isAuthSection && !isExplorePage && !isUserPage) {
        navigate(Routes.EXPLORE, { replace: true });
      }
      return;
    }

    void accountStore.initialize();

    if (location.pathname === Routes.AUTH) {
      navigate(Routes.ROOT, { replace: true });
    }
  }, [location.pathname, navigate]);

  return <Outlet />;
});

export default App;
