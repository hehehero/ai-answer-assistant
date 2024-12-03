document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const status = document.getElementById('status');

    captureBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'startCapture'});
        });
        window.close();
    });

    pasteBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'startPaste'});
        });
        window.close();
    });
}); 