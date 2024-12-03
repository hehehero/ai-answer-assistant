class ElementSelector {
    constructor() {
        this.isSelecting = false;
        this.currentElement = null;
        this.highlightClass = 'screenshot-highlight';
        this.mode = 'capture'; // 'capture' 或 'paste' 模式
        this.init();
    }

    init() {
        // 监听来自 popup 的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'startCapture') {
                this.mode = 'capture';
                this.startSelection();
                sendResponse({ status: 'success' });
            } else if (request.action === 'startPaste') {
                this.mode = 'paste';
                this.startSelection();
                sendResponse({ status: 'success' });
            }
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            if (!this.isSelecting) return;
            
            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (element === this.currentElement) return;
            
            this.updateHighlight(element);
        });

        // 点击事件
        document.addEventListener('click', async (e) => {
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
    }

    startSelection() {
        this.isSelecting = true;
        document.body.style.cursor = 'crosshair';
    }

    stopSelection() {
        this.isSelecting = false;
        document.body.style.cursor = 'default';
        if (this.currentElement) {
            this.currentElement.classList.remove(this.highlightClass);
            this.currentElement = null;
        }
    }

    updateHighlight(element) {
        if (this.currentElement) {
            this.currentElement.classList.remove(this.highlightClass);
        }
        this.currentElement = element;
        if (element) {
            element.classList.add(this.highlightClass);
        }
    }

    async captureElement(element) {
        try {
            console.log('开始截图...');
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
            }, response => {
                console.log('截图消息已发送', response);
            });
        } catch (error) {
            console.error('截图失败:', error);
        }
    }

    async pasteToElement(element) {
        console.log('开始粘贴流程...');
        
        try {
            // 1. 找到并处理输入框
            const textArea = element.matches('textarea') ? 
                           element : 
                           element.querySelector('textarea[data-testid="chat_input_input"]');
            
            if (!textArea) {
                throw new Error('未找到输入框');
            }
            console.log('找到输入框');

            // 2. 粘贴图片
            textArea.focus();
            await this.tryAllPasteMethods(textArea);
            console.log('图片粘贴完成');

            // 3. 等待图片上传
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('等待图片上传完成');

            // 4. 处理发送按钮
            const sendButton = document.querySelector('button[data-testid="chat_input_send_button"]');
            if (!sendButton) {
                throw new Error('未找到发送按钮');
            }

            // 5. 等待按钮可用并发送
            await this.waitForButtonActive(sendButton);
            await this.triggerSendButton(sendButton);
            
            console.log('整个流程执行完成');
            this.showTooltip(element, '图片已成功发送');

        } catch (error) {
            console.error('操作失败:', error);
            this.showTooltip(element, '操作失败: ' + error.message);
        }
    }

    async triggerSendButton(button) {
        // 移除所有禁用状态
        button.removeAttribute('disabled');
        button.setAttribute('aria-disabled', 'false');
        button.style.pointerEvents = 'auto';
        button.classList.remove('semi-button-disabled');
        button.classList.remove('semi-button-primary-disabled');

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
            button.dispatchEvent(event);
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
            // 1. 获取剪贴板内容
            const clipboardItems = await navigator.clipboard.read();
            const imageItem = clipboardItems.find(item => item.types.includes('image/png'));
            
            if (!imageItem) {
                throw new Error('剪贴板中没有图片');
            }

            const blob = await imageItem.getType('image/png');
            console.log('获取到图片blob:', blob);

            // 方法1: DataTransfer with File
            try {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(new File([blob], 'image.png', { type: 'image/png' }));
                
                const pasteEvent = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dataTransfer
                });

                console.log('尝试方法1: DataTransfer with File');
                const result = element.dispatchEvent(pasteEvent);
                
                if (this.checkPasteSuccess(element)) {
                    console.log('方法1成功');
                    this.showTooltip(element, '方法1成功：DataTransfer with File');
                    return;
                }
            } catch (error) {
                console.log('方法1失败:', error);
            }

            // 方法2: DataTransfer with setData
            try {
                console.log('尝试方法2: DataTransfer with setData');
                const dt = new DataTransfer();
                dt.setData('text/plain', '');
                dt.setData('image/png', blob);
                
                const event = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dt
                });
                element.dispatchEvent(event);
                
                if (this.checkPasteSuccess(element)) {
                    console.log('方法2成功');
                    this.showTooltip(element, '方法2成功：DataTransfer with setData');
                    return;
                }
            } catch (error) {
                console.log('方法2失败:', error);
            }

            // 方法3: CustomEvent with FormData
            try {
                console.log('尝试方法3: CustomEvent with FormData');
                const data = new FormData();
                data.append('image', blob, 'image.png');
                
                const customEvent = new CustomEvent('imagePaste', {
                    bubbles: true,
                    cancelable: true,
                    detail: { formData: data }
                });
                element.dispatchEvent(customEvent);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                
                if (this.checkPasteSuccess(element)) {
                    console.log('方法3成功');
                    this.showTooltip(element, '方法3成功：CustomEvent with FormData');
                    return;
                }
            } catch (error) {
                console.log('方法3失败:', error);
            }

            // 如果所有方法都失败
            throw new Error('所有粘贴方法都失败');
            
        } catch (error) {
            console.error('粘贴过程失败:', error);
            throw error;
        }
    }

    checkPasteSuccess(element) {
        // 等待一小段时间确保事件已处理
        return new Promise(resolve => {
            setTimeout(() => {
                // 这里添加检查粘贴是否成功的逻辑
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
}

// 初始化选择器
const selector = new ElementSelector();