import { accountStore } from "@/store";

const useCurrentAccount = () => {
  return accountStore.getCurrentAccount();
};

export default useCurrentAccount;
