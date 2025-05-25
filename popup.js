class KeseserunPopup {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadHiddenElements();
  }

  bindEvents() {
    document.getElementById('hideBtn').addEventListener('click', () => this.hideElements());
    document.getElementById('showBtn').addEventListener('click', () => this.showElements());
    document.getElementById('resetAll').addEventListener('click', () => this.resetAll());
    
    // Enterキーでも実行できるように
    document.getElementById('selector').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.hideElements();
      }
    });
    
    // タグセレクトが変更されたときにフォームに追加
    document.getElementById('tagSelector').addEventListener('change', (e) => {
      if (e.target.value) {
        const tagName = e.target.value;
        const currentValue = document.getElementById('selector').value.trim();
        const newValue = currentValue ? `${currentValue}, ${tagName}` : tagName;
        document.getElementById('selector').value = newValue;
        e.target.value = ''; // セレクトをリセット
      }
    });
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async sendMessageToContentScript(tab, message, retryCount = 0) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          // content scriptが読み込まれていない場合の処理
          if (retryCount < 3) {
            // content scriptを再注入して再試行
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('Failed to inject content script:', chrome.runtime.lastError);
                resolve({ success: false, error: 'スクリプトの読み込みに失敗しました' });
              } else {
                // 少し待ってから再試行
                setTimeout(() => {
                  this.sendMessageToContentScript(tab, message, retryCount + 1).then(resolve);
                }, 100);
              }
            });
          } else {
            resolve({ success: false, error: 'ページとの通信に失敗しました' });
          }
        } else {
          resolve(response || { success: false, error: '応答がありません' });
        }
      });
    });
  }

  async hideElements() {
    const selector = document.getElementById('selector').value.trim();
    if (!selector) {
      this.showMessage('セレクタを入力してください', 'error');
      return;
    }

    try {
      const tab = await this.getCurrentTab();
      
      const response = await this.sendMessageToContentScript(tab, {
        action: 'hideElementsUnified',
        selector: selector
      });
      
      if (response.success) {
        this.showMessage(`${response.count}個の要素を非表示にしました`, 'success');
        document.getElementById('selector').value = '';
        this.loadHiddenElements();
      } else {
        this.showMessage(response.error || '指定された要素が見つかりませんでした', 'warning');
      }
    } catch (error) {
      console.error('Error hiding elements:', error);
      this.showMessage('エラーが発生しました', 'error');
    }
  }

  async showElements() {
    const selector = document.getElementById('selector').value.trim();
    if (!selector) {
      this.showMessage('セレクタを入力してください', 'error');
      return;
    }

    try {
      const tab = await this.getCurrentTab();
      
      const response = await this.sendMessageToContentScript(tab, {
        action: 'showElementsUnified',
        selector: selector
      });
      
      if (response.success) {
        this.showMessage(`${response.count}個の要素を表示しました`, 'success');
        document.getElementById('selector').value = '';
        this.loadHiddenElements();
      } else {
        this.showMessage(response.error || '指定された要素が見つかりませんでした', 'warning');
      }
    } catch (error) {
      console.error('Error showing elements:', error);
      this.showMessage('エラーが発生しました', 'error');
    }
  }

  async resetAll() {
    try {
      const tab = await this.getCurrentTab();
      
      const response = await this.sendMessageToContentScript(tab, {
        action: 'resetAll'
      });
      
      if (response.success) {
        this.showMessage('すべての要素を表示しました', 'success');
        this.loadHiddenElements();
      } else {
        this.showMessage(response.error || 'リセットに失敗しました', 'error');
      }
    } catch (error) {
      console.error('Error resetting all:', error);
      this.showMessage('エラーが発生しました', 'error');
    }
  }

  async saveHiddenTagSelector(tagName, url) {
    const key = `hidden_tags_${url}`;
    const result = await chrome.storage.local.get(key);
    const hiddenTags = result[key] || [];
    
    if (!hiddenTags.includes(tagName)) {
      hiddenTags.push(tagName);
      await chrome.storage.local.set({ [key]: hiddenTags });
    }
  }

  async removeHiddenTagSelector(tagName, url) {
    const key = `hidden_tags_${url}`;
    const result = await chrome.storage.local.get(key);
    const hiddenTags = result[key] || [];
    
    const updatedTags = hiddenTags.filter(t => t !== tagName);
    await chrome.storage.local.set({ [key]: updatedTags });
  }

  async saveHiddenSelector(selector, url) {
    const key = `hidden_${url}`;
    const result = await chrome.storage.local.get(key);
    const hiddenSelectors = result[key] || [];
    
    if (!hiddenSelectors.includes(selector)) {
      hiddenSelectors.push(selector);
      await chrome.storage.local.set({ [key]: hiddenSelectors });
    }
  }

  async removeHiddenSelector(selector, url) {
    const key = `hidden_${url}`;
    const result = await chrome.storage.local.get(key);
    const hiddenSelectors = result[key] || [];
    
    const updatedSelectors = hiddenSelectors.filter(s => s !== selector);
    await chrome.storage.local.set({ [key]: updatedSelectors });
  }

  async clearHiddenSelectors(url) {
    const key = `hidden_${url}`;
    const tagKey = `hidden_tags_${url}`;
    await chrome.storage.local.remove([key, tagKey]);
  }

  async loadHiddenElements() {
    try {
      const tab = await this.getCurrentTab();
      
      const response = await this.sendMessageToContentScript(tab, {
        action: 'getHiddenElements'
      });
      
      if (response.success) {
        this.renderHiddenList(response.selectors || [], response.tags || []);
      } else {
        this.renderHiddenList([], []);
      }
    } catch (error) {
      console.error('Error loading hidden elements:', error);
      this.renderHiddenList([], []);
    }
  }

  renderHiddenList(selectors, tags = []) {
    const listContainer = document.getElementById('hiddenList');
    
    if (selectors.length === 0 && tags.length === 0) {
      listContainer.innerHTML = '<p class="empty-message">まだ非表示の要素はありません</p>';
      return;
    }

    let itemsHtml = '';
    
    // 通常のセレクタ
    selectors.forEach(selector => {
      itemsHtml += `
        <div class="hidden-item">
          <span class="selector-text">${this.escapeHtml(selector)}</span>
          <button class="restore-btn" data-selector="${this.escapeHtml(selector)}" data-type="selector">表示</button>
        </div>
      `;
    });
    
    // タグ要素
    tags.forEach(tagName => {
      itemsHtml += `
        <div class="hidden-item">
          <span class="selector-text">&lt;${this.escapeHtml(tagName)}&gt; (生タグ)</span>
          <button class="restore-btn" data-selector="${this.escapeHtml(tagName)}" data-type="tag">表示</button>
        </div>
      `;
    });

    listContainer.innerHTML = itemsHtml;

    // 個別復元ボタンのイベントリスナー
    listContainer.querySelectorAll('.restore-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const selector = e.target.dataset.selector;
        const type = e.target.dataset.type;
        
        // 統一されたフォームに入力して復元
        document.getElementById('selector').value = selector;
        await this.showElements();
      });
    });
  }

  async restoreTagElements(tagName) {
    try {
      const tab = await this.getCurrentTab();
      
      chrome.tabs.sendMessage(tab.id, {
        action: 'showTagElements',
        tagName: tagName
      }, (response) => {
        if (chrome.runtime.lastError) {
          this.showMessage('ページの読み込みを待ってから再試行してください', 'error');
          return;
        }
        
        if (response && response.success) {
          this.showMessage(`${response.count}個の${tagName}要素を表示しました`, 'success');
          this.removeHiddenTagSelector(tagName, tab.url);
          this.loadHiddenElements();
        } else {
          this.showMessage('指定された要素が見つかりませんでした', 'warning');
        }
      });
    } catch (error) {
      console.error('Error restoring tag elements:', error);
      this.showMessage('エラーが発生しました', 'error');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showMessage(message, type) {
    // 簡単なメッセージ表示（実装を簡略化）
    console.log(`${type}: ${message}`);
    
    // ツールチップ風のメッセージを表示
    const existingMsg = document.querySelector('.toast-message');
    if (existingMsg) {
      existingMsg.remove();
    }

    const msgEl = document.createElement('div');
    msgEl.className = `toast-message toast-${type}`;
    msgEl.textContent = message;
    msgEl.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#ffd43b'};
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
      animation: slideDown 0.3s ease;
    `;

    document.body.appendChild(msgEl);

    setTimeout(() => {
      if (msgEl.parentNode) {
        msgEl.remove();
      }
    }, 2000);
  }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  new KeseserunPopup();
});