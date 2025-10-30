import { ArchiveIcon, BellIcon, GlobeIcon, LogOutIcon, SettingsIcon, SquareUserIcon, User2Icon } from "lucide-react";
import useCurrentAccount from "@/hooks/useCurrentAccount";
import useNavigateTo from "@/hooks/useNavigateTo";
import { cn } from "@/lib/utils";
import { Routes } from "@/router";
import { accountStore } from "@/store";
import { useTranslate } from "@/utils/i18n";
import UserAvatar from "./UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface Props {
  collapsed?: boolean;
}

const UserMenu = (props: Props) => {
  const { collapsed } = props;
  const t = useTranslate();
  const navigateTo = useNavigateTo();
  const currentAccount = useCurrentAccount();

  const handleSignOut = async () => {
    await accountStore.logout();
    window.location.href = Routes.AUTH;
  };

  const handleViewProfile = () => {
    if (!currentAccount) {
      return;
    }
    navigateTo(`${Routes.USER}/${encodeURIComponent(currentAccount.acct)}`);
  };

  const handleOpenInstance = () => {
    if (!currentAccount?.url) {
      return;
    }
    const instance = new URL(currentAccount.url);
    window.open(instance.origin, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={!currentAccount}>
        <div className={cn("w-auto flex flex-row justify-start items-center cursor-pointer text-foreground", collapsed ? "px-1" : "px-3")}>
          {currentAccount?.avatar ? (
            <UserAvatar className="shrink-0" avatarUrl={currentAccount.avatar} />
          ) : (
            <User2Icon className="w-6 mx-auto h-auto text-muted-foreground" />
          )}
          {!collapsed && (
            <span className="ml-2 text-lg font-medium text-foreground grow truncate">
              {currentAccount?.displayName || currentAccount?.username || "Anonymous"}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleViewProfile} disabled={!currentAccount}>
          <SquareUserIcon className="size-4 text-muted-foreground" />
          {t("common.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInstance} disabled={!currentAccount}>
          <GlobeIcon className="size-4 text-muted-foreground" />
          Open instance
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigateTo(Routes.ARCHIVED)}>
          <ArchiveIcon className="size-4 text-muted-foreground" />
          {t("common.archived")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigateTo(Routes.INBOX)}>
          <BellIcon className="size-4 text-muted-foreground" />
          {t("common.inbox")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigateTo(Routes.SETTING)}>
          <SettingsIcon className="size-4 text-muted-foreground" />
          {t("common.settings")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon className="size-4 text-muted-foreground" />
          {t("common.sign-out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
