document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("flashcards-list");
  const clearBtn = document.getElementById("clear-all");
  
  const btnSettings = document.getElementById("btn-settings");
  const btnFlashcards = document.getElementById("btn-flashcards");
  const viewFlashcards = document.getElementById("flashcards-view");
  const viewSettings = document.getElementById("settings-view");
  const title = document.getElementById("title");
  
  const langSelect = document.getElementById("lang-select");
  const modeSelect = document.getElementById("mode-select");
  const toggleHover = document.getElementById("toggle-hover");
  const toggleFormatting = document.getElementById("toggle-formatting");
  const toggleStyles = document.getElementById("toggle-styles");
  const toggleBubble = document.getElementById("toggle-bubble");
  const savedMsg = document.getElementById("settings-saved");

  let savedTimeout = null;
  function showSavedFeedback() {
    clearTimeout(savedTimeout);
    savedMsg.style.display = "block";
    savedTimeout = setTimeout(() => { savedMsg.style.display = "none"; }, 2000);
  }

  // Carregar configurações
  chrome.storage.local.get({
    targetLang: 'pt',
    enableFloatingBubble: true,
    immersiveMode: 'inline-replace',
    enableWordHover: true,
    preserveFormatting: true,
    inheritPageStyles: true
  }, (result) => {
    if (langSelect) langSelect.value = result.targetLang || 'pt';
    if (modeSelect) modeSelect.value = result.immersiveMode || 'inline-replace';
    if (toggleHover) toggleHover.checked = result.enableWordHover !== false;
    if (toggleFormatting) toggleFormatting.checked = result.preserveFormatting !== false;
    if (toggleStyles) toggleStyles.checked = result.inheritPageStyles !== false;
    if (toggleBubble) toggleBubble.checked = result.enableFloatingBubble !== false;
  });

  // Salvar idioma de destino
  if (langSelect) {
    langSelect.addEventListener("change", (e) => {
      chrome.storage.local.set({ targetLang: e.target.value }, showSavedFeedback);
    });
  }

  // Salvar modo de tradução imersivo
  if (modeSelect) {
    modeSelect.addEventListener("change", (e) => {
      chrome.storage.local.set({ immersiveMode: e.target.value }, showSavedFeedback);
    });
  }

  // Salvar hover de palavras
  if (toggleHover) {
    toggleHover.addEventListener("change", (e) => {
      chrome.storage.local.set({ enableWordHover: e.target.checked }, showSavedFeedback);
    });
  }

  // Salvar preservação de formatação
  if (toggleFormatting) {
    toggleFormatting.addEventListener("change", (e) => {
      chrome.storage.local.set({ preserveFormatting: e.target.checked }, showSavedFeedback);
    });
  }

  // Salvar herança de estilos e tipografia da página
  if (toggleStyles) {
    toggleStyles.addEventListener("change", (e) => {
      chrome.storage.local.set({ inheritPageStyles: e.target.checked }, showSavedFeedback);
    });
  }

  // Salvar bolha flutuante
  if (toggleBubble) {
    toggleBubble.addEventListener("change", (e) => {
      chrome.storage.local.set({ enableFloatingBubble: e.target.checked }, showSavedFeedback);
    });
  }

  // Alternância de abas
  btnSettings.addEventListener("click", () => {
    viewFlashcards.classList.remove("active");
    viewSettings.classList.add("active");
    btnSettings.style.display = "none";
    btnFlashcards.style.display = "flex";
    title.textContent = "Configurações";
  });

  btnFlashcards.addEventListener("click", () => {
    viewSettings.classList.remove("active");
    viewFlashcards.classList.add("active");
    btnFlashcards.style.display = "none";
    btnSettings.style.display = "flex";
    title.textContent = "Linguist";
  });

  function loadFlashcards() {
    chrome.storage.local.get({ flashcards: [] }, (result) => {
      const flashcards = result.flashcards;
      listContainer.innerHTML = "";
      
      if (flashcards.length === 0) {
        listContainer.innerHTML = "<div class='empty'>Nenhum flashcard salvo ainda.<br>Selecione um texto em qualquer página para começar!</div>";
        clearBtn.style.display = "none";
        return;
      }
      clearBtn.style.display = "block";
      
      flashcards.slice().reverse().forEach(fc => {
        const div = document.createElement("div");
        div.className = "flashcard";
        
        const orig = document.createElement("p");
        orig.className = "original";
        orig.textContent = fc.original;
        
        const trans = document.createElement("p");
        trans.className = "translated";
        trans.textContent = fc.translated;
        
        const ctx = document.createElement("p");
        ctx.className = "context";
        ctx.textContent = `"${fc.context}"`;
        
        div.appendChild(orig);
        div.appendChild(trans);
        div.appendChild(ctx);
        listContainer.appendChild(div);
      });
    });
  }

  clearBtn.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja apagar todos os flashcards?")) {
      chrome.storage.local.set({ flashcards: [] }, () => {
        loadFlashcards();
      });
    }
  });

  loadFlashcards();
});
