/**
 * Account Store
 *
 * Manages GoToSocial account data and authentication state
 */
import { makeAutoObservable } from "mobx";
import { gtsClient } from "@/lib/gotosocial";
import type { mastodon } from "@/lib/gotosocial";

class LocalState {
  // Current authenticated account
  currentAccount: mastodon.v1.AccountCredentials | null = null;

  // Account cache (keyed by account ID)
  accountMapById: Record<string, mastodon.v1.Account> = {};

  // Account relationships cache
  relationshipsById: Record<string, mastodon.v1.Relationship> = {};

  constructor() {
    makeAutoObservable(this);
  }

  setPartial(partial: Partial<LocalState>) {
    Object.assign(this, partial);
  }
}

const accountStore = (() => {
  const state = new LocalState();
  const getReadableClient = () => (gtsClient.isAuthenticated() ? gtsClient.getClient() : gtsClient.getPublicClient());

  /**
   * Initialize store with current account
   */
  const initialize = async () => {
    if (!gtsClient.isAuthenticated()) {
      return;
    }

    const account = gtsClient.getCurrentAccount();
    if (account) {
      state.setPartial({ currentAccount: account });
    }
  };

  /**
   * Get current account
   */
  const getCurrentAccount = () => {
    return state.currentAccount;
  };

  /**
   * Check if authenticated
   */
  const isAuthenticated = () => {
    return gtsClient.isAuthenticated();
  };

  /**
   * Fetch account by ID
   */
  const fetchAccount = async (id: string): Promise<mastodon.v1.Account> => {
    const client = getReadableClient();
    const account = await client.v1.accounts.$select(id).fetch();

    // Update cache
    state.setPartial({
      accountMapById: {
        ...state.accountMapById,
        [id]: account,
      },
    });

    return account;
  };

  /**
   * Get or fetch account by ID
   */
  const getOrFetchAccount = async (id: string): Promise<mastodon.v1.Account> => {
    if (state.accountMapById[id]) {
      return state.accountMapById[id];
    }
    return await fetchAccount(id);
  };

  /**
   * Lookup account by username@domain
   */
  const lookupAccount = async (acct: string): Promise<mastodon.v1.Account> => {
    const client = getReadableClient();
    const account = await client.v1.accounts.lookup({ acct });

    // Update cache
    state.setPartial({
      accountMapById: {
        ...state.accountMapById,
        [account.id]: account,
      },
    });

    return account;
  };

  /**
   * Fetch relationship with account
   */
  const fetchRelationship = async (id: string): Promise<mastodon.v1.Relationship> => {
    const client = gtsClient.getClient();
    const [relationship] = await client.v1.accounts.relationships.fetch({ id: [id] });

    // Update cache
    state.setPartial({
      relationshipsById: {
        ...state.relationshipsById,
        [id]: relationship,
      },
    });

    return relationship;
  };

  /**
   * Follow an account
   */
  const followAccount = async (id: string): Promise<mastodon.v1.Relationship> => {
    const client = gtsClient.getClient();
    const relationship = await client.v1.accounts.$select(id).follow();

    // Update cache
    state.setPartial({
      relationshipsById: {
        ...state.relationshipsById,
        [id]: relationship,
      },
    });

    return relationship;
  };

  /**
   * Unfollow an account
   */
  const unfollowAccount = async (id: string): Promise<mastodon.v1.Relationship> => {
    const client = gtsClient.getClient();
    const relationship = await client.v1.accounts.$select(id).unfollow();

    // Update cache
    state.setPartial({
      relationshipsById: {
        ...state.relationshipsById,
        [id]: relationship,
      },
    });

    return relationship;
  };

  /**
   * Update current account profile
   */
  const updateProfile = async (params: mastodon.rest.v1.UpdateCredentialsParams): Promise<mastodon.v1.AccountCredentials> => {
    const client = gtsClient.getClient();
    const account = await client.v1.accounts.updateCredentials(params);

    // Update current account
    state.setPartial({ currentAccount: account });

    return account;
  };

  /**
   * Logout
   */
  const logout = async () => {
    await gtsClient.logout();
    state.setPartial({
      currentAccount: null,
      accountMapById: {},
      relationshipsById: {},
    });
  };

  return {
    state,
    initialize,
    getCurrentAccount,
    isAuthenticated,
    fetchAccount,
    getOrFetchAccount,
    lookupAccount,
    fetchRelationship,
    followAccount,
    unfollowAccount,
    updateProfile,
    logout,
  };
})();

export default accountStore;
