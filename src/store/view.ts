/**
 * View Store
 *
 * Manages UI display preferences and layout settings.
 * This is a client state store that persists to localStorage.
 */
import { makeObservable, observable } from "mobx";
import { getPlatformEnvironment } from "@/core/platform/environment";
import { StandardState } from "./base-store";

const LOCAL_STORAGE_KEY = "memos-view-setting";

/**
 * Layout mode options
 */
export type LayoutMode = "LIST" | "MASONRY";

/**
 * View store state
 * Contains UI preferences for displaying memos
 */
class ViewState extends StandardState {
  /**
   * Sort order: true = ascending (oldest first), false = descending (newest first)
   */
  orderByTimeAsc: boolean = false;

  /**
   * Display layout mode
   * - LIST: Traditional vertical list
   * - MASONRY: Pinterest-style grid layout
   */
  layout: LayoutMode = "LIST";

  constructor() {
    super();
    makeObservable(this, {
      orderByTimeAsc: observable,
      layout: observable,
    });
  }

  /**
   * Override setPartial to persist to localStorage
   */
  setPartial(partial: Partial<ViewState>): void {
    // Validate layout if provided
    if (partial.layout !== undefined && !["LIST", "MASONRY"].includes(partial.layout)) {
      console.warn(`Invalid layout "${partial.layout}", ignoring`);
      return;
    }

    Object.assign(this, partial);

    // Persist to localStorage
    const storage = getPlatformEnvironment().storage;
    try {
      storage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          orderByTimeAsc: this.orderByTimeAsc,
          layout: this.layout,
        }),
      );
    } catch (error) {
      console.warn("Failed to persist view settings:", error);
    }
  }
}

/**
 * View store instance
 */
const viewStore = (() => {
  const state = new ViewState();

  // Load from localStorage on initialization
  const storage = getPlatformEnvironment().storage;

  try {
    const cached = storage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached);

      // Validate and restore orderByTimeAsc
      if (Object.hasOwn(data, "orderByTimeAsc")) {
        state.orderByTimeAsc = Boolean(data.orderByTimeAsc);
      }

      // Validate and restore layout
      if (Object.hasOwn(data, "layout") && ["LIST", "MASONRY"].includes(data.layout)) {
        state.layout = data.layout as LayoutMode;
      }
    }
  } catch (error) {
    console.warn("Failed to load view settings from storage:", error);
  }

  /**
   * Toggle sort order between ascending and descending
   */
  const toggleSortOrder = (): void => {
    state.setPartial({ orderByTimeAsc: !state.orderByTimeAsc });
  };

  /**
   * Set the layout mode
   *
   * @param layout - The layout mode to set
   */
  const setLayout = (layout: LayoutMode): void => {
    state.setPartial({ layout });
  };

  /**
   * Reset to default settings
   */
  const resetToDefaults = (): void => {
    state.setPartial({
      orderByTimeAsc: false,
      layout: "LIST",
    });
  };

  /**
   * Clear persisted settings
   */
  const clearStorage = (): void => {
    try {
      storage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear view settings from storage:", error);
    }
  };

  return {
    state,
    toggleSortOrder,
    setLayout,
    resetToDefaults,
    clearStorage,
  };
})();

export default viewStore;
