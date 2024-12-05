// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'newMessage') {
        // 当收到新消息时，更新显示状态
        const titleElement = document.querySelector('h3');
        if (titleElement) {
            titleElement.textContent = 'AI 已生成回复信息！';
        }
        // 处理其他消息逻辑...
    }
    return true;
});

// 在页面加载完成时添加点击事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 监听粘贴按钮点击事件
    const pasteButton = document.querySelector('.paste-button');
    if (pasteButton) {
        pasteButton.addEventListener('click', () => {
            // 点击粘贴按钮时更新显示状态
            const titleElement = document.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = 'AI 正在思考中....';
            }
        });
    }
}); 