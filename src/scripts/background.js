let screenshotData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureVisibleTab') {
        captureAndCrop(request.data)
            .then(() => sendResponse({ status: 'success' }))
            .catch(error => {
                console.error('截图失败:', error);
                sendResponse({ status: 'error', error: error.message });
            });
        return true; // 保持消息通道打开
    }
});

async function captureAndCrop(data) {
    try {
        // 捕获整个可见区域
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png'
        });

        // 发送截图数据到内容脚本进行处理
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: processImage,
                args: [screenshot, data]
            });
        });
    } catch (error) {
        console.error('处理截图失败:', error);
        throw error;
    }
}

// 在内容脚本中处理图像
function processImage(screenshot, data) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = data.rect.width * data.devicePixelRatio;
        canvas.height = data.rect.height * data.devicePixelRatio;
        const ctx = canvas.getContext('2d');

        // 裁剪指定区域
        ctx.drawImage(img,
            data.rect.x * data.devicePixelRatio,
            data.rect.y * data.devicePixelRatio,
            data.rect.width * data.devicePixelRatio,
            data.rect.height * data.devicePixelRatio,
            0, 0,
            data.rect.width * data.devicePixelRatio,
            data.rect.height * data.devicePixelRatio
        );

        // 转换为 blob
        canvas.toBlob(async (blob) => {
            try {
                const clipboardItem = new ClipboardItem({
                    [blob.type]: blob
                });
                await navigator.clipboard.write([clipboardItem]);
                console.log('已保存到剪贴板');
            } catch (err) {
                console.error('保存到剪贴板失败:', err);
            }
        }, 'image/png');
    };
    img.src = screenshot;
} 