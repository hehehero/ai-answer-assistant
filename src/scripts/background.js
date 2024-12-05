let screenshotData = null;

// 存储豆包聊天标签页的ID
let chatTabId = null;

// 添加重试相关的配置
const CONFIG = {
    MESSAGE_TIMEOUT: 40000  // 等待AI回复的超时时间(毫秒)
};

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
                // 先清空剪贴板
                const emptyItem = new ClipboardItem({
                    'text/plain': new Blob([''], { type: 'text/plain' })
                });
                await navigator.clipboard.write([emptyItem]);

                // 再写入新的图片
                const clipboardItem = new ClipboardItem({
                    [blob.type]: blob
                });
                await navigator.clipboard.write([clipboardItem]);
                console.log('✅ 已保存到剪贴板');
                
                // 发送成功消息回content script
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        action: 'screenshotSaved',
                        success: true 
                    });
                });
            } catch (err) {
                console.error('保存到剪贴板失败:', err);
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        action: 'screenshotSaved',
                        success: false,
                        error: err.message
                    });
                });
            }
        }, 'image/png');
    };
    img.src = screenshot;
}

// 添加一个变量来跟踪扩展窗口
let extensionWindowId = null;

// 修改点击事件处理
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // 先检查Popup是否已经存在
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.popup !== undefined
        });

        if (!result) {
            // 如果Popup不存在，才注入脚本
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/components/Popup.js']
            });
        }
        
        // 发送显示消息
        chrome.tabs.sendMessage(tab.id, { action: 'showPopup' });
    } catch (error) {
        console.error('处理Popup失败:', error);
    }
});

// 监听窗口关闭事件
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === extensionWindowId) {
        console.log('扩展窗口已关闭，重置windowId');
        extensionWindowId = null;
    }
});

// 监听窗口焦点变化
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === extensionWindowId) {
        console.log('扩展窗口获得焦点');
    }
});

// 添加消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startCapture' || request.action === 'startPaste') {
        // 转发消息给content script
        chrome.tabs.sendMessage(sender.tab.id, request);
    }
});

chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.action === 'openChatTab') {
        // 检查是否有已有的聊天标签页
        if (chatTabId) {
            chrome.tabs.get(chatTabId, async (tab) => {
                if (chrome.runtime.lastError) {
                    createNewChatTab();
                } else {
                    chrome.tabs.update(chatTabId, { active: true }, () => {
                        executePasteScript(chatTabId);
                    });
                }
            });
        } else {
            createNewChatTab();
        }
    }
});

// 修改创建新的聊天标签页的函数
function createNewChatTab() {
    // 先关闭已存在的标签页
    if (chatTabId) {
        try {
            chrome.tabs.remove(chatTabId);
        } catch (error) {
            console.log('关闭已存在标签页失败:', error);
        }
    }

    // 创建一个面板窗口
    chrome.windows.create({
        url: 'https://www.doubao.com/chat',
        type: 'panel',          // 使用panel类型
        focused: false,         // 不聚焦
        width: 800,
        height: 600,
        top: 0,
        left: 0
    }, (window) => {
        const tab = window.tabs[0];
        chatTabId = tab.id;
        console.log('✅ [Background] 创建新标签页:', chatTabId);

        // 等待一小段时间后移动窗口
        setTimeout(() => {
            // 移动窗口到屏幕外
            chrome.windows.update(window.id, {
                left: -2000,
                focused: false
            });
        }, 100);
        
        // 监听标签页加载完成
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === chatTabId && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                console.log('✅ [Background] 标签页加载完成');
                
                // 执行粘贴脚本
                executePasteScript(chatTabId);
            }
        });

        // 设置超时检查
        setTimeout(() => {
            chrome.tabs.get(chatTabId, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    console.log('❌ [Background] 标签页创建失败或已关闭');
                    chatTabId = null;
                    handleFailedResponse(chatTabId, 0);
                }
            });
        }, CONFIG.MESSAGE_TIMEOUT);
    });
}

// 处理消息超时
function handleMessageTimeout(tabId, retryCount) {
    console.log('❌ [Background] 等待AI回复超时');
    try {
        chrome.tabs.remove(tabId);
        chatTabId = null;
        retryIfNeeded(retryCount);
    } catch (error) {
        console.log('关闭超时标签页失败:', error);
    }
}

// 验证返回的消息是否有效
function isValidResponse(data) {
    return data && 
           data.text && 
           data.text.trim().length > 0 && 
           !data.text.includes('请求太快') && 
           !data.text.includes('服务器错误') &&
           !data.text.includes('正在思考') &&
           !data.text.includes('正在输入') &&
           data.text.trim().length > 10 &&
           // 确保消息看起来是完整的
           (data.text.endsWith('.') || 
            data.text.endsWith('。') || 
            data.text.endsWith('!') || 
            data.text.endsWith('！') ||
            data.text.endsWith('?') || 
            data.text.endsWith('？'));
}

// 修改background中的消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'newMessage') {
        console.log('📥 [Background] 收到新消息:', request.data);
        
        if (request.data && request.data.text) {
            // 获取所有标签页
            chrome.tabs.query({}, (tabs) => {
                // 遍历所有标签页，找到我们的扩展页面
                tabs.forEach(tab => {
                    if (tab.id !== chatTabId) {  // 不发送给豆包标签页
                        try {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'displayResponse',
                                data: {
                                    time: new Date().toLocaleString(),
                                    text: request.data.text,
                                    status: 'replied',
                                    html: request.data.rawHTML
                                }
                            });
                        } catch (error) {
                            console.error(`发送消息到标签页 ${tab.id} 失败:`, error);
                        }
                    }
                });
            });

            // 延迟关闭窗口
            setTimeout(() => {
                if (chatTabId) {
                    chrome.tabs.get(chatTabId, (tab) => {
                        if (tab && tab.windowId) {
                            chrome.windows.remove(tab.windowId, () => {
                                console.log('✅ [Background] 豆包对话窗口已关闭');
                                chatTabId = null;
                            });
                        }
                    });
                }
            }, 500);
        }
    }
    return true;
});

// 添加一个新的监听器来确认扩展页面已准备好
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'pageReady') {
        console.log('📝 [Background] 页面已准备好接收消息');
        sendResponse({ status: 'acknowledged' });
    }
    return true;
});

// 处理失败响应
function handleFailedResponse(tabId, retryCount) {
    console.log('❌ [Background] AI回复无效或出错');
    try {
        chrome.tabs.remove(tabId);
        chatTabId = null;
        retryIfNeeded(retryCount);
    } catch (error) {
        console.log('关闭失败标签页失败:', error);
    }
}

// 重试逻辑
function retryIfNeeded(retryCount) {
    if (retryCount < CONFIG.MAX_RETRIES) {
        console.log(`🔄 [Background] 尝试重试 (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
        setTimeout(() => {
            createNewChatTab(retryCount + 1);
        }, CONFIG.RETRY_DELAY);
    } else {
        console.log('❌ [Background] 达到最大重试次数，操作失败');
        // 通知用户操作失败
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'displayError',
                    data: {
                        message: '发送图片失败，请稍后重试'
                    }
                });
            }
        });
    }
}

// 修改executePasteScript函数
function executePasteScript(tabId) {
    console.log('🚀 [Background] 开始执行粘贴脚本在标签页:', tabId);
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            console.log('🎯 [Page] 脚本开始执行');
            
            let messageComplete = false;
            let lastMessageContent = '';
            let noChangeCount = 0;
            const STABLE_THRESHOLD = 3;
            
            // 获取所有AI回复消息的函数
            const getAllAIMessages = () => {
                const messages = [];
                const xpath = '//*[@id="root"]/div[1]/div/div[2]/div[1]/div[1]/div/div/div[2]/div/div[1]/div/div/div[2]/div/div/div/div/div/div/div[1]/div';
                const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                
                for (let i = 0; i < result.snapshotLength; i++) {
                    const node = result.snapshotItem(i);
                    const text = node.textContent;
                    if (!text.includes('正在思考') && !text.includes('正在输入')) {
                        messages.push(text);
                    }
                }
                
                return messages;
            };

            // 监听新消息
            const observer = new MutationObserver((mutations) => {
                const xpath = '//*[@id="root"]/div[1]/div/div[2]/div[1]/div[1]/div/div/div[2]/div/div[1]/div/div/div[2]/div[last()]/div/div/div/div/div/div[1]/div';
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const messageContainer = result.singleNodeValue;

                if (messageContainer && !messageComplete) {
                    const currentContent = messageContainer.textContent;
                    
                    if (!currentContent.includes('正在思考') && !currentContent.includes('正在输入')) {
                        if (currentContent === lastMessageContent) {
                            noChangeCount++;
                            if (noChangeCount >= STABLE_THRESHOLD && !messageComplete) {
                                if (isValidMessage(currentContent)) {
                                    messageComplete = true;

                                    // 获取所有AI回复消息
                                    const allMessages = getAllAIMessages();
                                    const fullMessage = allMessages.join('\n');
                                    console.log('📝 [Page] 收集到的整消息:', fullMessage);

                                    const messageData = {
                                        rawHTML: messageContainer.outerHTML,
                                        text: fullMessage
                                    };

                                    // 发送消息并停止观察
                                    chrome.runtime.sendMessage({
                                        action: 'newMessage',
                                        data: messageData
                                    });
                                    
                                    observer.disconnect();
                                }
                            }
                        } else {
                            noChangeCount = 0;
                            lastMessageContent = currentContent;
                        }
                    }
                }
            });

            // 检查消息是否有效
            function isValidMessage(content) {
                if (!content || content.length < 10) return false;
                if (content.includes('正在思考') || content.includes('正在输入')) return false;
                if (content.includes('请求太快') || content.includes('服务器错误')) return false;

                // 检查是否是完整句子
                const endsWithPunctuation = /[.。!！?？]$/.test(content.trim());
                return endsWithPunctuation;
            }

            // 设置观察器配置
            const observerConfig = {
                childList: true,
                subtree: true,
                characterData: true,
                characterDataOldValue: true
            };

            // 观察整个对话区域
            const chatContainer = document.querySelector('#root');
            if (chatContainer) {
                console.log('🔍 [Page] 开始监听消息区域');
                observer.observe(chatContainer, observerConfig);
            } else {
                console.error('❌ [Page] 未找到消息容器');
            }

            // 修改粘贴和发送的逻辑
            const waitForElement = (selector, maxAttempts = 10) => {
                return new Promise((resolve, reject) => {
                    let attempts = 0;
                    const check = () => {
                        attempts++;
                        const element = document.querySelector(selector);
                        if (element) {
                            resolve(element);
                        } else if (attempts >= maxAttempts) {
                            reject(new Error(`Element ${selector} not found after ${maxAttempts} attempts`));
                        } else {
                            setTimeout(check, 1000);
                        }
                    };
                    check();
                });
            };

            // 执行粘贴和发送
            const executeActions = async () => {
                try {
                    // 等待输入框出现
                    const textArea = await waitForElement('textarea[data-testid="chat_input_input"]');
                    console.log('✅ [Page] 找到输入框');
                    
                    // 聚焦并粘贴
                    textArea.focus();
                    document.execCommand('paste');
                    console.log('✅ [Page] 粘贴完成');

                    // 等待发送按钮变为可用状态
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // 检查发送按钮状态
                    const checkAndClickSend = async (attempts = 0) => {
                        const sendButton = document.querySelector('button[data-testid="chat_input_send_button"]');
                        if (sendButton && !sendButton.disabled) {
                            sendButton.click();
                            console.log('✅ [Page] 发送按钮已点击');
                            return true;
                        } else if (attempts < 5) {
                            console.log(`⏳ [Page] 等待发送按钮可用 (${attempts + 1}/5)`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            return checkAndClickSend(attempts + 1);
                        } else {
                            throw new Error('发送按钮未能变为可用状态');
                        }
                    };

                    await checkAndClickSend();
                } catch (error) {
                    console.error('❌ [Page] 执行操作失败:', error);
                    chrome.runtime.sendMessage({
                        action: 'executionError',
                        error: error.message
                    });
                }
            };

            executeActions();
        }
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.error('❌ [Background] 执行脚本失败:', chrome.runtime.lastError);
        } else {
            console.log('✅ [Background] 脚本执行成功:', results);
        }
    });
}

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === chatTabId) {
        chatTabId = null; // 重置标签页ID
    }
});

// 添加新的错误处理监听器
chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.action === 'executionError') {
        console.error('❌ [Background] 执行错误:', request.error);
        handleFailedResponse(sender.tab.id, 0); // 触发重试机制
    }
});

// 添加窗口关闭处理
chrome.windows.onRemoved.addListener((windowId) => {
    chrome.tabs.query({ windowId }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id === chatTabId) {
            chatTabId = null;
            console.log('🔄 [Background] 豆包对话窗口已关闭，重置状态');
        }
    });
});

// 添加新的消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkClipboard') {
        // 检查剪贴板内容
        navigator.clipboard.read()
            .then(clipboardItems => {
                const hasImage = clipboardItems.some(item => 
                    item.types.includes('image/png') || 
                    item.types.includes('image/jpeg')
                );
                sendResponse({ hasImage });
            })
            .catch(error => {
                console.error('检查剪贴板失败:', error);
                sendResponse({ hasImage: false, error: error.message });
            });
        return true;
    }
});