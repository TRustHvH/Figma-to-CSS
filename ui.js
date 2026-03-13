const contentDiv = document.getElementById('content');
const copyAllBtn = document.getElementById('copyAll');
const notification = document.getElementById('notification');

let currentCSS = '';

function showNotification() {
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification();
  } catch (err) {
    console.error('Ошибка копирования:', err);
  }
}

window.onmessage = async (event) => {
  const msg = event.data.pluginMessage;
  
  if (msg.type === 'no-selection') {
    contentDiv.innerHTML = `
      <div class="placeholder">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
          <path d="M16 20H32M16 24H32M16 28H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>${msg.message}</p>
      </div>
    `;
    currentCSS = '';
    copyAllBtn.disabled = true;
    copyAllBtn.style.opacity = '0.5';
    copyAllBtn.style.cursor = 'not-allowed';
  } else if (msg.type === 'styles') {
    // Отображаем CSS стили
    currentCSS = msg.css;
    
    let html = '';

    if (msg.multipleSelected) {
      html += `<div class="multi-selection-badge">Выбрано ${msg.count} элементов (показаны стили первого)</div>`;
    }
    
    html += `<pre class="css-output" id="cssCode">${escapeHtml(msg.css)}</pre>`;
    
    contentDiv.innerHTML = html;
    
    copyAllBtn.disabled = false;
    copyAllBtn.style.opacity = '1';
    copyAllBtn.style.cursor = 'pointer';

    const cssCodeElement = document.getElementById('cssCode');
    if (cssCodeElement) {
      setupAutoSelect(cssCodeElement);
    }
  }
};

function setupAutoSelect(element) {
  element.addEventListener('mouseup', async () => {
    setTimeout(async () => {
      const selectedText = window.getSelection().toString();
      if (selectedText && selectedText.trim().length > 0) {
        await copyToClipboard(selectedText);
      }
    }, 10);
  });

  element.addEventListener('touchend', async () => {
    setTimeout(async () => {
      const selectedText = window.getSelection().toString();
      if (selectedText && selectedText.trim().length > 0) {
        await copyToClipboard(selectedText);
      }
    }, 10);
  });
}

copyAllBtn.addEventListener('click', async () => {
  if (currentCSS) {
    await copyToClipboard(currentCSS);
  }
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

copyAllBtn.disabled = true;
copyAllBtn.style.opacity = '0.5';
copyAllBtn.style.cursor = 'not-allowed';
