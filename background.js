let isRunning = false;
let intervalId = null;
let stopPrompt = '';
let showAlert = false;
let monitorMode = 'presence';
let currentTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start') {
    if (!isRunning) {
      const { interval, stopPrompt: promptText, showAlert: alertEnabled, monitorMode: newMonitorMode } = message;
      stopPrompt = promptText;
      showAlert = alertEnabled;
      monitorMode = newMonitorMode || 'presence';

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          currentTabId = tabs[0].id;

          intervalId = setInterval(() => {
            chrome.scripting.executeScript({
              target: { tabId: currentTabId },
              func: refreshTab,
              args: [stopPrompt, monitorMode],
            }).catch(() => {
              stopAutoRefresh(false);
            });
          }, interval);

          isRunning = true;
          sendResponse({ status: 'running' });
        }
      });
    }
  } else if (message.action === 'stop') {
    stopAutoRefresh(message.autoStopped === true);
    sendResponse({ status: 'stopped' });
  } else if (message.action === 'getStatus') {
    sendResponse({ isRunning });
  }

  return true;
});

// Refactored stop function
function stopAutoRefresh(autoStopped = true) {
  clearInterval(intervalId);
  isRunning = false;

  chrome.storage.sync.set({ isRunning: false });

  if (showAlert && autoStopped) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '🔔 Auto-refresh Stopped! 🔔',
      message: 'The auto-refresh has been stopped. Please take action now.',
      priority: 2
    });

  }

  chrome.runtime.sendMessage({ action: 'autoRefreshStopped', autoStopped });
}

function refreshTab(prompt, monitorMode) {
  if (prompt && prompt.trim().length > 0) {
    const pageText = document.body.innerText;
    const wordExists = pageText.includes(prompt);

    if ((monitorMode === 'presence' && wordExists) || (monitorMode === 'absence' && !wordExists)) {
      chrome.runtime.sendMessage({ action: 'stop', autoStopped: true });
    } else {
      window.location.reload();
    }
  } else {
    window.location.reload();
  }
}
