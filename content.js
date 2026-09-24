let tooltipContainer = null;
let currentSelection = "";
let currentContext = "";

// Ícones SVG minimalistas
const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
const audioSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
const saveSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;

document.addEventListener("mouseup", (event) => {
  // Ignorar cliques dentro do tooltip
  if (tooltipContainer && tooltipContainer.contains(event.target)) return;

  // Usa um timeout pequeno para garantir que a seleção foi finalizada pelo navegador
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && text.length < 300) { 
      currentSelection = text;
      
      const node = selection.anchorNode;
      currentContext = node && node.parentElement ? node.parentElement.textContent.trim() : text;
      if (currentContext.length > 200) {
          currentContext = currentContext.substring(0, 200) + "...";
      }

      showIconBubble(event.pageX, event.pageY);
    } else {
      removeTooltip();
    }
  }, 10);
});

// Remove tooltip se clicar fora
document.addEventListener("mousedown", (event) => {
  if (tooltipContainer && !tooltipContainer.contains(event.target)) {
    removeTooltip();
  }
});

function removeTooltip() {
  if (tooltipContainer) {
    tooltipContainer.remove();
    tooltipContainer = null;
  }
}

function showIconBubble(x, y) {
  removeTooltip();

  tooltipContainer = document.createElement("div");
  tooltipContainer.className = "linguist-icon-bubble";
  
  // Posiciona levemente acima e à direita do cursor
  tooltipContainer.style.left = `${x + 8}px`;
  tooltipContainer.style.top = `${y - 32}px`;
  
  tooltipContainer.innerHTML = iconSVG;
  
  tooltipContainer.onclick = (e) => {
    e.stopPropagation();
    
    // Transforma a bolha no painel completo
    tooltipContainer.className = "linguist-panel";
    tooltipContainer.innerHTML = `<div class="linguist-loading">Traduzindo...</div>`;
    
    chrome.runtime.sendMessage({ action: "translate", text: currentSelection }, (response) => {
      showTranslationPanel(response.translation || "Erro na tradução");
    });
  };

  document.body.appendChild(tooltipContainer);
}

function showTranslationPanel(translation) {
  if (!tooltipContainer) return;
  tooltipContainer.innerHTML = ""; 
  
  // Header: Texto original e Botão de Áudio
  const header = document.createElement("div");
  header.className = "linguist-header";

  const originalText = document.createElement("div");
  originalText.className = "linguist-original";
  originalText.textContent = currentSelection;
  
  const audioBtn = document.createElement("button");
  audioBtn.className = "linguist-icon-btn linguist-audio-btn";
  audioBtn.innerHTML = audioSVG;
  audioBtn.title = "Ouvir pronúncia";
  audioBtn.onclick = (e) => {
    e.stopPropagation();
    playAudio(currentSelection);
  };
  
  header.appendChild(originalText);
  header.appendChild(audioBtn);

  // Corpo: Tradução
  const transText = document.createElement("div");
  transText.className = "linguist-translation";
  transText.textContent = translation;
  
  // Footer: Botão Salvar
  const footer = document.createElement("div");
  footer.className = "linguist-footer";

  const saveBtn = document.createElement("button");
  saveBtn.className = "linguist-save-btn";
  saveBtn.innerHTML = `${saveSVG} <span>Salvar</span>`;
  
  saveBtn.onclick = (e) => {
    e.stopPropagation();
    saveBtn.innerHTML = "Salvando...";
    chrome.runtime.sendMessage({
      action: "saveFlashcard",
      flashcard: {
        original: currentSelection,
        translated: translation,
        context: currentContext
      }
    }, (res) => {
      if (res && res.success) {
        saveBtn.innerHTML = "✅ Salvo";
        saveBtn.classList.add("linguist-saved");
        saveBtn.disabled = true;
      }
    });
  };

  footer.appendChild(saveBtn);

  // Montar
  tooltipContainer.appendChild(header);
  tooltipContainer.appendChild(transText);
  tooltipContainer.appendChild(footer);
}

function playAudio(text) {
  // Envia requisição para o background.js, que tem mais permissões para baixar o áudio
  // Isso contorna bloqueios de CORS e proteções do Brave Shields na página.
  chrome.runtime.sendMessage({ action: "playAudio", text: text }, (response) => {
    if (response && response.audioDataUrl) {
      const audio = new Audio(response.audioDataUrl);
      audio.play().catch(e => console.error("Erro ao reproduzir áudio recebido:", e));
    }
    // Se response não tiver audioDataUrl, o background script já usou o chrome.tts como fallback.
  });
}
