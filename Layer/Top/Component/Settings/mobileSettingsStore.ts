// Layer/Top/Component/Settings/mobileSettingsStore.ts
type Listener = () => void;

let title = "Settings";
let showBack = false;
let goBackFn: (() => void) | null = null;
let closeFn: (() => void) | null = null;
let isSearchMode = false;
let onExitSearch: (() => void) | null = null;
let searchQuery = "";
let ignoreSync = false;

// Stack for nested modals (e.g., font picker)
type ModalState = {
  title: string;
  showBack: boolean;
  goBack: () => void;
  close: () => void;
};
let modalStack: ModalState[] = [];

const listeners = new Set<Listener>();
const searchListeners = new Set<Listener>();

export const mobileSettingsStore = {
  getState() {
    return { title, showBack, isSearchMode, ignoreSync };
  },
  setState(
    newTitle: string,
    newShowBack: boolean,
    newGoBack: () => void,
    newClose: () => void,
    newIgnoreSync?: boolean
  ) {
    title = newTitle;
    showBack = newShowBack;
    goBackFn = newGoBack;
    closeFn = newClose;
    if (newIgnoreSync !== undefined) ignoreSync = newIgnoreSync;
    listeners.forEach(listener => listener());
  },
  // Push a modal onto the stack (e.g., font picker)
  pushModal(title: string, showBack: boolean, onBack: () => void, onClose: () => void) {
    // Save current state to stack
    modalStack.push({
      title: this.getState().title,
      showBack: this.getState().showBack,
      goBack: goBackFn || (() => {}),
      close: closeFn || (() => {}),
    });
    // Set new state and ignore sync
    this.setState(title, showBack, onBack, onClose, true);
  },
  // Pop the modal and restore previous state
  popModal() {
    const prev = modalStack.pop();
    if (prev) {
      this.setState(prev.title, prev.showBack, prev.goBack, prev.close, false);
    } else {
      // Fallback to default
      this.setState("Settings", false, () => {}, () => {}, false);
    }
  },
  // Search mode (unchanged)
  enterSearchMode(onExit: () => void) {
    isSearchMode = true;
    onExitSearch = onExit;
    listeners.forEach(listener => listener());
  },
  exitSearchMode() {
    isSearchMode = false;
    onExitSearch?.();
    onExitSearch = null;
    searchQuery = "";
    searchListeners.forEach(l => l());
    listeners.forEach(listener => listener());
  },
  setSearchQuery(query: string) {
    searchQuery = query;
    searchListeners.forEach(l => l());
  },
  getSearchQuery() {
    return searchQuery;
  },
  goBack() {
    goBackFn?.();
  },
  close() {
    closeFn?.();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  subscribeSearch(listener: Listener) {
    searchListeners.add(listener);
    return () => searchListeners.delete(listener);
  }
};