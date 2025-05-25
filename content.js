class KeseserunContent {
  constructor() {
    this.hiddenElements = new Map(); // 元のdisplayスタイルを保存
    this.isReady = false;
    this.init();
  }

  init() {
    // DOMが完全に読み込まれるまで待機
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setup();
      });
    } else {
      this.setup();
    }
  }

  setup() {
    // popup.jsからのメッセージを監視
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 非同期レスポンスを示す
    });

    // ページが変更された時に非表示状態を復元
    this.restoreHiddenElements().then(() => {
      this.isReady = true;
    });
  }

  handleMessage(request, sender, sendResponse) {
    // content scriptが準備完了していない場合は少し待つ
    if (!this.isReady) {
      setTimeout(() => {
        this.handleMessage(request, sender, sendResponse);
      }, 100);
      return;
    }

    switch (request.action) {
      case 'hideElements':
        this.hideElements(request.selector, sendResponse);
        break;
      case 'hideElementsUnified':
        this.hideElementsUnified(request.selector, sendResponse);
        break;
      case 'hideBareTagElements':
        this.hideBareTagElements(request.tagName, sendResponse);
        break;
      case 'showElements':
        this.showElements(request.selector, sendResponse);
        break;
      case 'showElementsUnified':
        this.showElementsUnified(request.selector, sendResponse);
        break;
      case 'showTagElements':
        this.showTagElements(request.tagName, sendResponse);
        break;
      case 'resetAll':
        this.resetAll(sendResponse);
        break;
      case 'getHiddenElements':
        this.getHiddenElements(sendResponse);
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  hideElementsUnified(selectorString, sendResponse) {
    try {
      // カンマ区切りのセレクタを配列に分割
      const selectors = selectorString.split(',').map(s => s.trim()).filter(s => s);
      let totalCount = 0;

      selectors.forEach(selector => {
        try {
          // タグ名のみの場合は生タグ要素として処理
          if (this.isBareTagName(selector)) {
            totalCount += this.hideBareTagElementsByName(selector);
          } else {
            // 通常のセレクタとして処理
            const normalizedSelector = this.normalizeSelector(selector);
            const elements = document.querySelectorAll(normalizedSelector);

            elements.forEach(element => {
              // 既に非表示でない場合のみ処理
              if (!this.hiddenElements.has(element)) {
                // 元のdisplayスタイルを保存
                const originalDisplay = window.getComputedStyle(element).display;
                this.hiddenElements.set(element, originalDisplay);
                
                // 要素を非表示に
                element.style.display = 'none';
                element.setAttribute('data-keseserun-hidden', 'true');
                totalCount++;
              }
            });
          }
        } catch (error) {
          console.warn(`Invalid selector: ${selector}`, error);
        }
      });

      // ストレージに保存
      this.saveHiddenState();

      sendResponse({ 
        success: true, 
        count: totalCount,
        message: `${totalCount}個の要素を非表示にしました`
      });
    } catch (error) {
      console.error('Error hiding elements unified:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  showElementsUnified(selectorString, sendResponse) {
    try {
      const selectors = selectorString.split(',').map(s => s.trim()).filter(s => s);
      let totalCount = 0;

      selectors.forEach(selector => {
        try {
          // タグ名のみの場合は生タグ要素として処理
          if (this.isBareTagName(selector)) {
            totalCount += this.showBareTagElementsByName(selector);
          } else {
            // 通常のセレクタとして処理
            const normalizedSelector = this.normalizeSelector(selector);
            const elements = document.querySelectorAll(normalizedSelector);

            elements.forEach(element => {
              if (this.hiddenElements.has(element)) {
                // 元のdisplayスタイルを復元
                const originalDisplay = this.hiddenElements.get(element);
                element.style.display = originalDisplay === 'none' ? '' : originalDisplay;
                element.removeAttribute('data-keseserun-hidden');
                
                // Mapから削除
                this.hiddenElements.delete(element);
                totalCount++;
              }
            });
          }
        } catch (error) {
          console.warn(`Invalid selector: ${selector}`, error);
        }
      });

      // ストレージを更新
      this.saveHiddenState();

      sendResponse({ 
        success: true, 
        count: totalCount,
        message: `${totalCount}個の要素を表示しました`
      });
    } catch (error) {
      console.error('Error showing elements unified:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  isBareTagName(selector) {
    // タグ名のみかどうかを判定（#、.、[、:などの文字が含まれていない）
    return /^[a-zA-Z][a-zA-Z0-9]*$/.test(selector);
  }

  hideBareTagElementsByName(tagName) {
    // 指定されたタグ名で、IDもclassも持たない要素を取得
    const allElements = document.querySelectorAll(tagName);
    const bareElements = Array.from(allElements).filter(element => {
      // IDもclassも設定されていない要素のみ
      return !element.id && (!element.className || element.className.trim() === '');
    });

    let count = 0;
    bareElements.forEach(element => {
      // 既に非表示でない場合のみ処理
      if (!this.hiddenElements.has(element)) {
        // 元のdisplayスタイルを保存
        const originalDisplay = window.getComputedStyle(element).display;
        this.hiddenElements.set(element, originalDisplay);
        
        // 要素を非表示に
        element.style.display = 'none';
        element.setAttribute('data-keseserun-hidden', 'true');
        element.setAttribute('data-keseserun-bare', 'true'); // 生タグ要素マーク
        count++;
      }
    });

    return count;
  }

  showBareTagElementsByName(tagName) {
    // data-keseserun-bare属性を持つ指定タグ名の要素のみを対象
    const elements = document.querySelectorAll(`${tagName}[data-keseserun-bare]`);
    let count = 0;

    elements.forEach(element => {
      if (this.hiddenElements.has(element)) {
        // 元のdisplayスタイルを復元
        const originalDisplay = this.hiddenElements.get(element);
        element.style.display = originalDisplay === 'none' ? '' : originalDisplay;
        element.removeAttribute('data-keseserun-hidden');
        element.removeAttribute('data-keseserun-bare');
        
        // Mapから削除
        this.hiddenElements.delete(element);
        count++;
      }
    });

    return count;
  }

  hideBareTagElements(tagName, sendResponse) {
    try {
      // 指定されたタグ名で、IDもclassも持たない要素を取得
      const allElements = document.querySelectorAll(tagName);
      const bareElements = Array.from(allElements).filter(element => {
        // IDもclassも設定されていない要素のみ
        return !element.id && (!element.className || element.className.trim() === '');
      });

      let count = 0;
      bareElements.forEach(element => {
        // 既に非表示でない場合のみ処理
        if (!this.hiddenElements.has(element)) {
          // 元のdisplayスタイルを保存
          const originalDisplay = window.getComputedStyle(element).display;
          this.hiddenElements.set(element, originalDisplay);
          
          // 要素を非表示に
          element.style.display = 'none';
          element.setAttribute('data-keseserun-hidden', 'true');
          element.setAttribute('data-keseserun-bare', 'true'); // 生タグ要素マーク
          count++;
        }
      });

      // ストレージに保存
      this.saveHiddenState();

      sendResponse({ 
        success: true, 
        count: count,
        message: `${count}個の${tagName}要素を非表示にしました`
      });
    } catch (error) {
      console.error('Error hiding bare tag elements:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  hideElements(selectorString, sendResponse) {
    try {
      // カンマ区切りのセレクタを配列に分割
      const selectors = selectorString.split(',').map(s => s.trim()).filter(s => s);
      let totalCount = 0;

      selectors.forEach(selector => {
        try {
          // セレクタの形式を正規化（#や.がない場合は自動で追加）
          const normalizedSelector = this.normalizeSelector(selector);
          let elements;
          
          // 通常のセレクタで検索
          elements = document.querySelectorAll(normalizedSelector);

          elements.forEach(element => {
            // 既に非表示でない場合のみ処理
            if (!this.hiddenElements.has(element)) {
              // 元のdisplayスタイルを保存
              const originalDisplay = window.getComputedStyle(element).display;
              this.hiddenElements.set(element, originalDisplay);
              
              // 要素を非表示に
              element.style.display = 'none';
              element.setAttribute('data-keseserun-hidden', 'true');
              totalCount++;
            }
          });
        } catch (error) {
          console.warn(`Invalid selector: ${selector}`, error);
        }
      });

      // ストレージに保存
      this.saveHiddenState();

      sendResponse({ 
        success: true, 
        count: totalCount,
        message: `${totalCount}個の要素を非表示にしました`
      });
    } catch (error) {
      console.error('Error hiding elements:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  showTagElements(tagName, sendResponse) {
    try {
      // data-keseserun-bare属性を持つ指定タグ名の要素のみを対象
      const elements = document.querySelectorAll(`${tagName}[data-keseserun-bare]`);
      let count = 0;

      elements.forEach(element => {
        if (this.hiddenElements.has(element)) {
          // 元のdisplayスタイルを復元
          const originalDisplay = this.hiddenElements.get(element);
          element.style.display = originalDisplay === 'none' ? '' : originalDisplay;
          element.removeAttribute('data-keseserun-hidden');
          element.removeAttribute('data-keseserun-bare');
          
          // Mapから削除
          this.hiddenElements.delete(element);
          count++;
        }
      });

      // ストレージを更新
      this.saveHiddenState();

      sendResponse({ 
        success: true, 
        count: count,
        message: `${count}個の${tagName}要素を表示しました`
      });
    } catch (error) {
      console.error('Error showing tag elements:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  showElements(selectorString, sendResponse) {
    try {
      const selectors = selectorString.split(',').map(s => s.trim()).filter(s => s);
      let totalCount = 0;

      selectors.forEach(selector => {
        try {
          let elements;
          
          // 通常のセレクタで検索
          const normalizedSelector = this.normalizeSelector(selector);
          elements = document.querySelectorAll(normalizedSelector);

          elements.forEach(element => {
            if (this.hiddenElements.has(element)) {
              // 元のdisplayスタイルを復元
              const originalDisplay = this.hiddenElements.get(element);
              element.style.display = originalDisplay === 'none' ? '' : originalDisplay;
              element.removeAttribute('data-keseserun-hidden');
              element.removeAttribute('data-keseserun-bare'); // 生タグマークも削除
              
              // Mapから削除
              this.hiddenElements.delete(element);
              totalCount++;
            }
          });
        } catch (error) {
          console.warn(`Invalid selector: ${selector}`, error);
        }
      });

      // ストレージを更新
      this.saveHiddenState();

      sendResponse({ 
        success: true, 
        count: totalCount,
        message: `${totalCount}個の要素を表示しました`
      });
    } catch (error) {
      console.error('Error showing elements:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  resetAll(sendResponse) {
    try {
      let count = 0;
      
      // すべての非表示要素を復元
      this.hiddenElements.forEach((originalDisplay, element) => {
        element.style.display = originalDisplay === 'none' ? '' : originalDisplay;
        element.removeAttribute('data-keseserun-hidden');
        element.removeAttribute('data-keseserun-bare'); // 生タグマークも削除
        count++;
      });

      // Mapをクリア
      this.hiddenElements.clear();

      // ストレージからも削除
      this.clearHiddenState();

      sendResponse({ 
        success: true, 
        count: count,
        message: `${count}個の要素を表示しました`
      });
    } catch (error) {
      console.error('Error resetting all:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  normalizeSelector(selector) {
    // 既に#や.で始まっている場合はそのまま返す
    if (selector.startsWith('#') || selector.startsWith('.') || selector.includes('[') || selector.includes(':')) {
      return selector;
    }

    // スペースが含まれている場合は複合セレクタとして扱う
    if (selector.includes(' ')) {
      return selector;
    }

    // 単純な文字列の場合、IDとして扱う（#を追加）
    return `#${selector}`;
  }

  async saveHiddenState() {
    try {
      const hiddenData = {
        selectors: [],
        tags: []
      };
      
      this.hiddenElements.forEach((originalDisplay, element) => {
        // 要素の一意識別子を生成
        const identifier = this.generateElementIdentifier(element);
        if (identifier) {
          // 生タグ要素かどうかで分類
          if (element.hasAttribute('data-keseserun-bare')) {
            hiddenData.tags.push({
              identifier,
              originalDisplay,
              tagName: element.tagName.toLowerCase()
            });
          } else {
            hiddenData.selectors.push({
              identifier,
              originalDisplay
            });
          }
        }
      });

      const key = `content_hidden_${window.location.href}`;
      await chrome.storage.local.set({ [key]: hiddenData });
    } catch (error) {
      console.error('Error saving hidden state:', error);
    }
  }

  async restoreHiddenElements() {
    try {
      const key = `content_hidden_${window.location.href}`;
      const result = await chrome.storage.local.get(key);
      const hiddenData = result[key] || { selectors: [], tags: [] };

      // 古い形式のデータとの互換性
      if (Array.isArray(hiddenData)) {
        hiddenData.forEach(({ identifier, originalDisplay }) => {
          const element = this.findElementByIdentifier(identifier);
          if (element) {
            this.hiddenElements.set(element, originalDisplay);
            element.style.display = 'none';
            element.setAttribute('data-keseserun-hidden', 'true');
          }
        });
        return;
      }

      // 新しい形式のデータ処理
      hiddenData.selectors.forEach(({ identifier, originalDisplay }) => {
        const element = this.findElementByIdentifier(identifier);
        if (element) {
          this.hiddenElements.set(element, originalDisplay);
          element.style.display = 'none';
          element.setAttribute('data-keseserun-hidden', 'true');
        }
      });

      hiddenData.tags.forEach(({ identifier, originalDisplay, tagName }) => {
        const element = this.findElementByIdentifier(identifier);
        if (element && element.tagName.toLowerCase() === tagName) {
          this.hiddenElements.set(element, originalDisplay);
          element.style.display = 'none';
          element.setAttribute('data-keseserun-hidden', 'true');
          element.setAttribute('data-keseserun-bare', 'true');
        }
      });
    } catch (error) {
      console.error('Error restoring hidden elements:', error);
    }
  }

  async clearHiddenState() {
    try {
      const key = `content_hidden_${window.location.href}`;
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Error clearing hidden state:', error);
    }
  }

  generateElementIdentifier(element) {
    // 要素の一意識別子を生成（ID > Class > タグ名 + テキストの優先順位）
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = Array.from(element.classList).slice(0, 3).join('.');
      return `.${classes}`;
    }

    // タグ名 + テキスト内容（最初の50文字）
    const text = element.textContent?.trim().substring(0, 50) || '';
    return `${element.tagName.toLowerCase()}[text="${text}"]`;
  }

  findElementByIdentifier(identifier) {
    if (identifier.startsWith('#')) {
      return document.getElementById(identifier.substring(1));
    }

    if (identifier.startsWith('.')) {
      const classes = identifier.substring(1).split('.');
      return document.querySelector(identifier);
    }

    // テキストベースの識別子
    if (identifier.includes('[text="')) {
      const [tagName, textPart] = identifier.split('[text="');
      const text = textPart.replace('"]', '');
      const elements = document.querySelectorAll(tagName);
      
      for (let element of elements) {
        if (element.textContent?.trim().startsWith(text)) {
          return element;
        }
      }
    }

    return null;
  }

  getHiddenElements(sendResponse) {
    try {
      const selectors = new Set();
      const tags = new Set();
      
      this.hiddenElements.forEach((originalDisplay, element) => {
        if (element.hasAttribute('data-keseserun-bare')) {
          // 生タグ要素
          tags.add(element.tagName.toLowerCase());
        } else {
          // 通常のセレクタ
          const identifier = this.generateElementIdentifier(element);
          if (identifier) {
            selectors.add(identifier);
          }
        }
      });

      sendResponse({
        success: true,
        selectors: Array.from(selectors),
        tags: Array.from(tags),
        count: this.hiddenElements.size
      });
    } catch (error) {
      console.error('Error getting hidden elements:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
}

// Content scriptの初期化
if (typeof window !== 'undefined') {
  new KeseserunContent();
}