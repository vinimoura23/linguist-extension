document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("flashcards-list");
  const clearBtn = document.getElementById("clear-all");
  
  const btnSettings = document.getElementById("btn-settings");
  const btnFlashcards = document.getElementById("btn-flashcards");
  const viewFlashcards = document.getElementById("flashcards-view");
  const viewSettings = document.getElementById("settings-view");
  const title = document.getElementById("title");
  
  const langSelect = document.getElementById("lang-select");
  const savedMsg = document.getElementById("settings-saved");

  // Load language settings
  chrome.storage.local.get({ targetLang: 'pt' }, (result) => {
    langSelect.value = result.targetLang;
  });

  // Save language on change
  langSelect.addEventListener("change", (e) => {
    chrome.storage.local.set({ targetLang: e.target.value }, () => {
      savedMsg.style.display = "block";
      setTimeout(() => { savedMsg.style.display = "none"; }, 2000);
    });
  });

  // Tab switching
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
