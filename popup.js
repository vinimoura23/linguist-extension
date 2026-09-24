document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("flashcards-list");
  const clearBtn = document.getElementById("clear-all");

  function loadFlashcards() {
    chrome.storage.local.get({ flashcards: [] }, (result) => {
      const flashcards = result.flashcards;
      listContainer.innerHTML = "";
      
      if (flashcards.length === 0) {
        listContainer.innerHTML = "<div class='empty'>Nenhum flashcard salvo ainda.<br>Selecione um texto em qualquer página para começar!</div>";
        return;
      }
      
      // Mostrar do mais novo pro mais antigo
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
