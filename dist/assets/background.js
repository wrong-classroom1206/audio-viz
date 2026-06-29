chrome.action.onClicked.addListener(e=>{e&&e.id&&chrome.sidePanel.open({tabId:e.id})});
