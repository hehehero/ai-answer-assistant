class ElementSelector {
    constructor() {
        this.isSelecting = false;
        this.currentElement = null;
        this.highlightClass = 'screenshot-highlight';
        this.mode = 'capture';
        this.isPasting = false;
        this.init();
    }

    init() {
        // 监听来自 popup 的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'startCapture') {
                this.mode = 'capture';
                this.startSelection();
                sendResponse({ status: 'success' });
                return true;
            } else if (request.action === 'startPaste') {
                if (this.isPasting) {
                    console.log('已有粘贴操作在进行中，忽略本次请求');
                    sendResponse({ status: 'ignored' });
                    return true;
                }
                this.directPaste();
                sendResponse({ status: 'success' });
                return true;
            } else if (request.action === 'getPromptText') {
                const promptInput = document.querySelector('#promptInput');
                sendResponse(promptInput ? promptInput.value : null);
            }
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            if (!this.isSelecting) return;
            
            console.log('mousemove event', this.isSelecting);
            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (element === this.currentElement) return;
            
            this.updateHighlight(element);
        });

        // 点击事件
        document.addEventListener('click', async (e) => {
            console.log('click event', this.isSelecting);
            if (!this.isSelecting) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const element = this.currentElement;
            this.stopSelection();
            
            if (this.mode === 'capture') {
                await this.captureElement(element);
            } else if (this.mode === 'paste') {
                await this.pasteToElement(element);
            }
        });

        // ESC 键取消选择
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSelecting) {
                this.stopSelection();
            }
        });

        // 添加键盘事监听
        document.addEventListener('keydown', function(event) {
            // 检查是否按下ESC键
            if (event.key === 'Escape') {
                // 查找并关闭弹出界面
                const popup = document.querySelector('.ai-assistant-popup');
                if (popup) {
                    popup.remove();
                }
                
                // 同时移除任何遮罩层
                const overlay = document.querySelector('.ai-assistant-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        });
    }

    startSelection() {
        this.isSelecting = true;
        console.log('startSelection: 设置选择状态', this.isSelecting);
        document.body.classList.add('selecting');
        document.body.style.cursor = 'crosshair';
        // 阻止面板的点击事件冒泡
        const panel = document.querySelector('.floating-panel');
        if (panel) {
            panel.style.pointerEvents = 'none';
        }
    }

    stopSelection() {
        console.log('stopSelection: 清理选择状态');
        this.isSelecting = false;
        document.body.classList.remove('selecting');
        document.body.style.cursor = 'default';
        if (this.currentElement) {
            this.currentElement.classList.remove(this.highlightClass);
            this.currentElement = null;
        }
        // 恢复面板的点击事件
        const panel = document.querySelector('.floating-panel');
        if (panel) {
            panel.style.pointerEvents = 'auto';
        }
    }

    updateHighlight(element) {
        console.log('updateHighlight: 更新高亮元素');
        if (this.currentElement) {
            this.currentElement.classList.remove(this.highlightClass);
        }
        this.currentElement = element;
        if (element) {
            element.classList.add(this.highlightClass);
        }
    }

    async captureElement(element) {
        if (!element) return;
        try {
            console.log('开始截图流程...');
            
            // 更新状态提示
            this.updateStatus('⚡ 正在截取精彩瞬间...');
            
            // 清空剪贴板
            try {
                await navigator.clipboard.writeText('');
            } catch (error) {
                console.log('清空剪贴板失败:', error);
            }
            
            const rect = element.getBoundingClientRect();
            chrome.runtime.sendMessage({
                action: 'captureVisibleTab',
                data: {
                    rect: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    devicePixelRatio: window.devicePixelRatio
                }
            }, async response => {
                if (response.status === 'success') {
                    this.updateStatus('🎯 截图完成，正在把图片发给 AI...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    try {
                        const clipboardItems = await navigator.clipboard.read();
                        const hasImage = clipboardItems.some(item => 
                            item.types.includes('image/png') || 
                            item.types.includes('image/jpeg')
                        );
                        
                        if (hasImage) {
                            this.updateStatus('⏳ AI 正在绞尽脑汁思考中...');
                            this.directPaste();
                        } else {
                            this.updateStatus('❌ 截图失败，请重试');
                        }
                    } catch (error) {
                        this.updateStatus('❌ 处理图片时出错');
                        console.error('检查剪贴失败:', error);
                    }
                }
            });
        } catch (error) {
            this.updateStatus('❌ 截图过程出错');
            console.error('截图过程失败:', error);
        }
    }

    async pasteToElement(element) {
        console.log('开始粘贴流程...');
        console.log('选中元素详细信息:', {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            attributes: Array.from(element.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
            })),
            innerHTML: element.innerHTML.substring(0, 200) + '...' // 只显示前200个字符
        });
        
        try {
            // 1. 找到并处理输入框
            const textArea = element.matches('textarea') ? 
                           element : 
                           element.querySelector('textarea[data-testid="chat_input_input"]');
            
            if (!textArea) {
                console.error('未找到输入框, 当前元素结构:', {
                    element: element.outerHTML.substring(0, 200),
                    children: Array.from(element.children).map(child => ({
                        tagName: child.tagName,
                        className: child.className
                    }))
                });
                throw new Error('未到输入框');
            }
            console.log('找到输入框:', {
                tagName: textArea.tagName,
                id: textArea.id,
                className: textArea.className,
                attributes: Array.from(textArea.attributes).map(attr => ({
                    name: attr.name,
                    value: attr.value
                }))
            });

            // 2. 粘贴图片
            textArea.focus();
            await this.tryAllPasteMethods(textArea);
            console.log('图片粘完成');

            // 3. 等待图片上
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('等待图片上传完成');

            // 4. 处理发送按钮
            const sendButton = document.querySelector('button[data-testid="chat_input_send_button"]');
            if (!sendButton) {
                console.error('未找到发送按钮, 当前页面所有按钮:', 
                    Array.from(document.querySelectorAll('button')).map(btn => ({
                        text: btn.textContent,
                        className: btn.className,
                        attributes: Array.from(btn.attributes).map(attr => ({
                            name: attr.name,
                            value: attr.value
                        }))
                    }))
                );
                throw new Error('未找到送按钮');
            }

            console.log('找到发送按钮:', {
                text: sendButton.textContent,
                className: sendButton.className,
                disabled: sendButton.disabled,
                ariaDisabled: sendButton.getAttribute('aria-disabled'),
                attributes: Array.from(sendButton.attributes).map(attr => ({
                    name: attr.name,
                    value: attr.value
                })),
                computedStyle: {
                    display: window.getComputedStyle(sendButton).display,
                    visibility: window.getComputedStyle(sendButton).visibility,
                    opacity: window.getComputedStyle(sendButton).opacity,
                    pointerEvents: window.getComputedStyle(sendButton).pointerEvents
                }
            });

            // 5. 等待按钮可用并发送
            await this.waitForButtonActive(sendButton);
            await this.triggerSendButton(sendButton);
            
            console.log('整个流程执行完成');
            this.showTooltip(element, '图片已成功发送');

        } catch (error) {
            console.error('操作失败:', error);
            this.showTooltip(element, '作失败: ' + error.message);
        }
    }

    async triggerSendButton(button) {
        console.log('触发发送按钮前状态:', {
            disabled: button.disabled,
            ariaDisabled: button.getAttribute('aria-disabled'),
            className: button.className,
            style: button.style,
            computedStyle: {
                display: window.getComputedStyle(button).display,
                visibility: window.getComputedStyle(button).visibility,
                opacity: window.getComputedStyle(button).opacity,
                pointerEvents: window.getComputedStyle(button).pointerEvents
            }
        });

        // 移除所有禁用状态
        button.removeAttribute('disabled');
        button.setAttribute('aria-disabled', 'false');
        button.style.pointerEvents = 'auto';
        button.classList.remove('semi-button-disabled');
        button.classList.remove('semi-button-primary-disabled');

        console.log('移除禁用状态后:', {
            disabled: button.disabled,
            ariaDisabled: button.getAttribute('aria-disabled'),
            className: button.className,
            style: button.style
        });

        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 100));

        // 触发点击事件
        const events = ['mousedown', 'mouseup', 'click'];
        for (const eventType of events) {
            const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                buttons: 1
            });
            console.log(`触发${eventType}事件`);
            const result = button.dispatchEvent(event);
            console.log(`${eventType}事件结果:`, result);
        }

        console.log('发送按钮已触发');
    }

    async waitForButtonActive(button, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const checkInterval = 100;
            let elapsed = 0;

            const check = () => {
                // 检查多个条件
                const isActive = !button.disabled && 
                               button.getAttribute('aria-disabled') === 'false' &&
                               !button.classList.contains('semi-button-disabled');

                console.log('检查按钮状态:', {
                    disabled: button.disabled,
                    ariaDisabled: button.getAttribute('aria-disabled'),
                    hasDisabledClass: button.classList.contains('semi-button-disabled')
                });

                if (isActive) {
                    console.log('发送按钮已激活');
                    resolve();
                } else if (elapsed >= timeout) {
                    reject(new Error('等待按钮激活超时'));
                } else {
                    elapsed += checkInterval;
                    setTimeout(check, checkInterval);
                }
            };

            check();
        });
    }

    async tryAllPasteMethods(element) {
        try {
            console.log('开始尝试粘贴方法...');
            
            // 1. 获取剪贴板内容
            const clipboardItems = await navigator.clipboard.read();
            console.log('获取剪贴板内容:', {
                itemCount: clipboardItems.length,
                types: clipboardItems.map(item => item.types)
            });
            
            const imageItem = clipboardItems.find(item => item.types.includes('image/png'));
            
            if (!imageItem) {
                throw new Error('剪贴板中没有图片');
            }

            const blob = await imageItem.getType('image/png');
            console.log('获取到图片blob:', {
                size: blob.size,
                type: blob.type
            });

            // 方1: DataTransfer with File
            try {
                console.log('尝试法1: DataTransfer with File');
                const dataTransfer = new DataTransfer();
                const file = new File([blob], 'image.png', { type: 'image/png' });
                dataTransfer.items.add(file);
                
                const pasteEvent = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dataTransfer
                });

                const result = element.dispatchEvent(pasteEvent);
                console.log('方法1结果:', result);
                
                if (await this.checkPasteSuccess(element)) {
                    console.log('方法1成功');
                    this.showTooltip(element, '方法1成功：DataTransfer with File');
                    return;
                }
            } catch (error) {
                console.log('方法1失败:', error);
            }

            throw new Error('没有粘贴方法都失败');
            
        } catch (error) {
            console.error('粘贴过程失败:', error);
            throw error;
        }
    }

    checkPasteSuccess(element) {
        // 等待一小段时间确保事件已处理
        return new Promise(resolve => {
            setTimeout(() => {
                // 这添加检查粘是否成功的逻辑
                // 可以检查元素的值、内容或其他状态
                const hasContent = element.value !== '' || 
                                 element.innerHTML !== '' || 
                                 element.querySelector('img') !== null;
                resolve(hasContent);
            }, 100);
        });
    }

    showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 999999;
            pointer-events: none;
            transition: opacity 0.3s;
            max-width: 300px;
            word-wrap: break-word;
        `;

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;

        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 300);
        }, 5000);
    }

    // 增加直接粘贴方法
    async directPaste() {
        try {
            console.log('🚀 开始粘贴操作...');
            
            // 发送消息给 background script 来创建新标签页
            chrome.runtime.sendMessage({
                action: 'openChatTab'
            });
            
        } catch (error) {
            console.error('❌ 操作失败:', error);
        }
    }

    // 添加更新状态的辅助方法
    updateStatus(message) {
        const statusTitle = document.querySelector('.response-container h3');
        if (statusTitle) {
            statusTitle.textContent = message;
            
            // 根据消息类型设置不同的状态样式
            if (message.includes('❌')) {
                statusTitle.className = 'status-error';
            } else if (message.includes('正在把图片发给 AI')) {
                statusTitle.className = 'status-sending';
            } else if (message.includes('正在')) {
                statusTitle.className = 'status-thinking';
            } else if (message.includes('截图完成')) {
                statusTitle.className = 'status-captured';
            } else if (message.includes('完成')) {
                statusTitle.className = 'status-replied';
            } else {
                statusTitle.className = 'status-waiting';
            }
        }
    }
}

function createFloatingPanel() {
    const panel = document.createElement('div');
    panel.className = 'floating-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <span class="title">AI助手 吾爱ID:hehehero</span>
            <div class="panel-controls">
                <span class="minimize-btn">－</span>
                <span class="close-btn">×</span>
            </div>
        </div>
        <div class="panel-content">
            <div class="panel-controls">
                <button class="panel-button" id="captureBtn">
                    <span>📷</span>截图
                </button>
                <button class="panel-button" id="clearBtn">
                    <span>🗑️</span>清空
                </button>
                <button class="panel-button hidden" id="pasteBtn">
                    <span>📋</span>粘贴
                </button>
            </div>
            <div class="response-container">
                <h3 class="status-waiting">🚀 AI 已打满鸡血，等待您的操作...</h3>
                <div id="responseContent"></div>
            </div>
        </div>
    `;

    // 添加清空按钮事件处
    const clearBtn = panel.querySelector('#clearBtn');
    clearBtn.addEventListener('click', () => {
        // 清空返回内容
        const responseContent = panel.querySelector('#responseContent');
        const statusTitle = panel.querySelector('.response-container h3');
        
        if (responseContent) {
            responseContent.innerHTML = '';
        }
        
        if (statusTitle) {
            statusTitle.textContent = '🚀 AI 已打满鸡血，等待您操作...';
            statusTitle.className = 'status-waiting';
        }
        
        console.log('已清空返回内容');
    });

    // 隐藏粘贴按钮
    const pasteBtn = panel.querySelector('#pasteBtn');
    pasteBtn.style.display = 'none';  // 完全隐藏粘贴按钮

    // 验证按钮是否创建成功
    const captureBtn = panel.querySelector('#captureBtn');
    console.log('按钮创建状态:', {
        captureBtn: !!captureBtn,
        pasteBtn: !!pasteBtn
    });

    // 添加拖动功能
    let isDragging = false;
    let initialX;
    let initialY;

    const header = panel.querySelector('.panel-header');
    
    header.addEventListener('mousedown', e => {
        isDragging = true;
        panel.classList.add('dragging');
        
        const rect = panel.getBoundingClientRect();
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        
        e.preventDefault();
        requestAnimationFrame(() => {
            const x = e.clientX - initialX;
            const y = e.clientY - initialY;
            
            panel.style.left = `${x}px`;
            panel.style.top = `${y}px`;
            panel.style.right = 'auto';
        });
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        panel.classList.remove('dragging');
    });

    // 修改按钮事件处理
    panel.querySelector('#captureBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('点击截图按钮');
        if (selector.isSelecting) {
            selector.stopSelection();
        }
        selector.mode = 'capture';
        selector.startSelection();
    });

    panel.querySelector('#pasteBtn').addEventListener('click', async () => {
        console.log('点击粘贴按钮');
        // 更新标题
        const titleElement = document.querySelector('.response-container h3');
        if (titleElement) {
            titleElement.textContent = '⏳ AI 正在绞尽脑汁思考中....';
        }
        
        // 清空返回内容
        const responseContent = document.querySelector('#responseContent');
        if (responseContent) {
            responseContent.innerHTML = `
                <div class="response-time">
                    <span class="time-label">时间：</span>
                    <span class="time-value">${new Date().toLocaleString()}</span>
                </div>
                <div class="response-text">
                    <h4>返回内容：</h4>
                    <pre>等待 AI 回复...</pre>
                </div>
            `;
        }
        
        await selector.directPaste();
    });

    // 添加最小化/恢复功能
    const minimizeBtn = panel.querySelector('.minimize-btn');
    let isMinimized = false;
    
    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        panel.classList.toggle('minimized');
        minimizeBtn.textContent = isMinimized ? '＋' : '－';
        
        if (isMinimized && selector.isSelecting) {
            selector.stopSelection();
        }
    });

    // 添加关闭按钮事件处理
    const closeBtn = panel.querySelector('.close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.remove(); // 移除整个面板
        
        // 如果正在选择，停止选择状态
        if (selector.isSelecting) {
            selector.stopSelection();
        }
    });

    return panel;
}

// 修改显示返回内容的函数
function displayResponse(messageData) {
    const responseContent = document.querySelector('#responseContent');
    const titleElement = document.querySelector('.response-container h3');
    
    if (titleElement) {
        if (messageData.status === 'thinking') {
            titleElement.textContent = 'AI 正在绞尽脑汁思考中....';
            titleElement.className = 'status-thinking';
        } else if (messageData.status === 'replied') {
            titleElement.textContent = 'AI 给了你一个敷衍的回复！';
            titleElement.className = 'status-replied';
        }
    }
    
    if (responseContent) {
        // 格式化显示内容
        const formattedContent = `
            <div class="response-time">
                <span class="time-label">时间：</span>
                <span class="time-value">${messageData.time}</span>
            </div>
            <div class="response-text">
                <h4>返回内容：</h4>
                <pre>${messageData.text || 'AI 脑子里一片空白，啥也没写'}</pre>
                <button class="expand-btn">展开全部</button>
            </div>
        `;
        
        responseContent.innerHTML = formattedContent;

        // 添加展开/收起功能
        const container = document.querySelector('.response-container');
        const expandBtn = responseContent.querySelector('.expand-btn');
        
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                const isExpanded = container.classList.toggle('expanded');
                expandBtn.textContent = isExpanded ? '收起内容' : '展开全部';
            });

            // 检查内容高度，决定是否显示展开按钮
            const content = responseContent.querySelector('.response-text');
            if (content && content.scrollHeight <= container.clientHeight - 40) {
                expandBtn.style.display = 'none';
            }
        }
    }
}

// 修改消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!selector) return;

    if (request.action === 'showPopup') {
        // 检查是否已存在面板
        const existingPanel = document.querySelector('.floating-panel');
        if (existingPanel) {
            // 如果已存在面板，则聚焦它
            existingPanel.style.opacity = '1';
            existingPanel.style.visibility = 'visible';
            // 如果是最小化状态，恢复它
            if (existingPanel.classList.contains('minimized')) {
                existingPanel.classList.remove('minimized');
                const minimizeBtn = existingPanel.querySelector('.minimize-btn');
                if (minimizeBtn) {
                    minimizeBtn.textContent = '－';
                }
            }
            return;
        }
        
        // 如果不存在面板，则创建新的
        console.log('创建浮动面板');
        const panel = createFloatingPanel();
        document.body.appendChild(panel);
    } else if (request.action === 'startCapture') {
        console.log('收到开始截图消息');
        selector.mode = 'capture';
        selector.startSelection();
    } else if (request.action === 'startPaste') {
        if (!selector.isPasting) {
            selector.directPaste();
        }
    } else if (request.action === 'displayResponse') {
        console.log('收到答复内容:', request.data);
        displayResponse(request.data);
    }
});

// 初始化选择器
const selector = new ElementSelector();