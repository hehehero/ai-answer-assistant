export class Highlighter {
    constructor() {
        this.highlightElement = null;
    }

    // 创建高亮框
    createHighlight() {
        const highlight = document.createElement('div');
        highlight.style.position = 'fixed';
        highlight.style.border = '2px solid red';
        highlight.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '10000';
        highlight.style.transition = 'all 0.2s ease-in-out';
        return highlight;
    }

    // 显示高亮
    show(element) {
        if (!this.highlightElement) {
            this.highlightElement = this.createHighlight();
            document.body.appendChild(this.highlightElement);
        }

        const rect = element.getBoundingClientRect();
        this.highlightElement.style.top = rect.top + 'px';
        this.highlightElement.style.left = rect.left + 'px';
        this.highlightElement.style.width = rect.width + 'px';
        this.highlightElement.style.height = rect.height + 'px';
        this.highlightElement.style.display = 'block';
    }

    // 隐藏高亮
    hide() {
        if (this.highlightElement) {
            this.highlightElement.style.display = 'none';
        }
    }

    // 移除高亮
    remove() {
        if (this.highlightElement) {
            this.highlightElement.remove();
            this.highlightElement = null;
        }
    }
} 