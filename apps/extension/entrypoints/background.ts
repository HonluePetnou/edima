export default defineBackground(() => {
  // Clicking the toolbar icon opens the side panel directly, instead of a popup.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});
