// AppKit mounts a body-level web component, outside the account dialog portal.
// Its own modal must own focus/Escape while open; don't unmount wallet state
// when Radix observes an interaction outside the underlying sign-in dialog.
export function protectReownModal(event: {preventDefault: () => void}) {
  if (typeof document !== 'undefined' && document.querySelector('w3m-modal.open')) {
    event.preventDefault();
  }
}
