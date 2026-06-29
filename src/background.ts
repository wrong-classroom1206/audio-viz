declare const chrome: any;

chrome.action.onClicked.addListener((tab: any) => {
  if (tab && tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
export {};
