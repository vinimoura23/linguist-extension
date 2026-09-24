let tooltipContainer = null;
let currentSelection = "";
let currentContext = "";

document.addEventListener("mouseup", (event) => {
  // Ignorar cliques dentro do tooltip
  if (tooltipContainer && tooltipContainer.contains(event.target)) return;

  // Usa um timeout pequeno para garantir que a seleção foi finalizada pelo navegador
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && text.length < 300) { 
      currentSelection = text;
      
      // Tentar pegar o contexto da frase (pode ser melhorado depois)
      const node = selection.anchorNode;
      currentContext = node && node.parentElement ? node.parentElement.textContent.trim() : text;
      // Limita o tamanho do contexto
      if (currentContext.length > 200) {
          currentContext = currentContext.substring(0, 200) + "...";
      }

      showTranslateButton(event.pageX, event.pageY);
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

function showTranslateButton(x, y) {
  removeTooltip();

  tooltipContainer = document.createElement("div");
  tooltipContainer.className = "linguist-tooltip";
  tooltipContainer.style.left = `${x + 10}px`;
  tooltipContainer.style.top = `${y + 10}px`;

  const btn = document.createElement("button");
  btn.textContent = "🌐 Traduzir";
  btn.className = "linguist-btn";
  
  btn.onclick = (e) => {
    e.stopPropagation();
    btn.textContent = "Traduzindo...";
    chrome.runtime.sendMessage({ action: "translate", text: currentSelection }, (response) => {
      showTranslationResult(response.translation || "Erro na tradução");
    });
  };

  tooltipContainer.appendChild(btn);
  document.body.appendChild(tooltipContainer);
}

function showTranslationResult(translation) {
  if (!tooltipContainer) return;
  tooltipContainer.innerHTML = ""; 
  
  const transText = document.createElement("p");
  transText.className = "linguist-translation";
  transText.textContent = translation;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "💾 Salvar Flashcard";
  saveBtn.className = "linguist-btn-save";
  
  saveBtn.onclick = (e) => {
    e.stopPropagation();
    saveBtn.textContent = "Salvando...";
    chrome.runtime.sendMessage({
      action: "saveFlashcard",
      flashcard: {
        original: currentSelection,
        translated: translation,
        context: currentContext
      }
    }, (res) => {
      if (res && res.success) {
        saveBtn.textContent = "✅ Salvo!";
        saveBtn.classList.add("linguist-saved");
        saveBtn.disabled = true;
        setTimeout(removeTooltip, 2000);
      }
    });
  };

  tooltipContainer.appendChild(transText);
  tooltipContainer.appendChild(saveBtn);
}
