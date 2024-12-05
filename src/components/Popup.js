// 在Popup.js中添加检查
let popupInstance = null;

function showPopup() {
    if (popupInstance) {
        // 如果已存在实例，就显示它
        popupInstance.style.display = 'block';
        return;
    }

    // 创建新的popup实例
    const popup = document.createElement('div');
    // ... 其他popup创建代码 ...

    popupInstance = popup;
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showPopup') {
        showPopup();
    }
}); 