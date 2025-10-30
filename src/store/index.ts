/**
 * Store Module
 *
 * This module exports all application stores and their types.
 *
 * ## Store Architecture
 *
 * Stores are divided into two categories:
 *
 * ### Server State Stores (Data Fetching)
 * These stores fetch and cache data from the backend API:
 * - **memoStore**: Memo CRUD operations
 * - **userStore**: User authentication and settings
 * - **workspaceStore**: Workspace configuration
 * - **attachmentStore**: File attachment management
 *
 * Features:
 * - Request deduplication
 * - Error handling with StoreError
 * - Optimistic updates (memo updates)
 * - Computed property memoization
 *
 * ### Client State Stores (UI State)
 * These stores manage UI preferences and transient state:
 * - **viewStore**: Display preferences (sort order, layout)
 * - **memoFilterStore**: Active search filters
 *
 * Features:
 * - localStorage persistence (viewStore)
 * - URL synchronization (memoFilterStore)
 * - No API calls
 *
 * ## Usage
 *
 * ```typescript
 * import { memoStore, userStore, viewStore } from "@/store";
 * import { observer } from "mobx-react-lite";
 *
 * const MyComponent = observer(() => {
 *   const memos = memoStore.state.memos;
 *   const user = userStore.state.currentUser;
 *
 *   return <div>...</div>;
 * });
 * ```
 */
// GoToSocial Stores
import accountStore from "./account";
// Legacy Server State Stores (to be gradually replaced)
import attachmentStore from "./attachment";
import mediaStore from "./media";
import memoStore from "./memo";
// Client State Stores
import memoFilterStore from "./memoFilter";
import statusStore from "./status";
import userStore from "./user";
import viewStore from "./view";
import workspaceStore from "./workspace";

// Utilities and Types
export { StoreError, RequestDeduplicator, createRequestKey } from "./store-utils";
export { StandardState, createServerStore, createClientStore } from "./base-store";
export type { BaseState, ServerStoreConfig, ClientStoreConfig } from "./base-store";

// Re-export filter types
export type { FilterFactor, MemoFilter } from "./memoFilter";
export { getMemoFilterKey, parseFilterQuery, stringifyFilters } from "./memoFilter";

// Re-export view types
export type { LayoutMode } from "./view";

// Re-export workspace types
export type { Theme } from "./workspace";
export { isValidTheme } from "./workspace";

// Re-export common utilities
export {
  workspaceSettingNamePrefix,
  userNamePrefix,
  memoNamePrefix,
  identityProviderNamePrefix,
  activityNamePrefix,
  extractUserIdFromName,
  extractMemoIdFromName,
  extractIdentityProviderIdFromName,
} from "./common";

// Export store instances
export {
  // GoToSocial stores
  accountStore,
  statusStore,
  mediaStore,

  // Legacy server state stores (to be gradually replaced)
  memoStore,
  userStore,
  workspaceStore,
  attachmentStore,

  // Client state stores
  memoFilterStore,
  viewStore,
};

/**
 * All stores grouped by category for convenience
 */
export const stores = {
  // GoToSocial state
  gotosocial: {
    account: accountStore,
    status: statusStore,
    media: mediaStore,
  },

  // Legacy server state (to be gradually replaced)
  server: {
    memo: memoStore,
    user: userStore,
    workspace: workspaceStore,
    attachment: attachmentStore,
  },

  // Client state
  client: {
    memoFilter: memoFilterStore,
    view: viewStore,
  },
} as const;
