const utils = {
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 生成唯一ID
    generateUID() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 获取元素的完整路径
    getElementPath(element) {
        const path = [];
        while (element) {
            path.unshift(element);
            element = element.parentElement;
        }
        return path;
    }
}; 