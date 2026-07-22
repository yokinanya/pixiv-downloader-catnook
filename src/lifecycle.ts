const LOCATION_CHANGE_EVENT = 'catnook:location-change';

export const watchLocation = (callback: () => void): (() => void) => {
  let currentUrl = location.href;
  const notifyIfChanged = (): void => {
    if (location.href === currentUrl) {
      return;
    }
    currentUrl = location.href;
    callback();
  };
  const dispatchLocationChange = (): void => {
    window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
  };
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function (...args): void {
    originalPushState.apply(this, args);
    dispatchLocationChange();
  };
  history.replaceState = function (...args): void {
    originalReplaceState.apply(this, args);
    dispatchLocationChange();
  };
  window.addEventListener(LOCATION_CHANGE_EVENT, notifyIfChanged);
  window.addEventListener('popstate', notifyIfChanged);
  const observer = new MutationObserver(notifyIfChanged);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener(LOCATION_CHANGE_EVENT, notifyIfChanged);
    window.removeEventListener('popstate', notifyIfChanged);
    observer.disconnect();
  };
};