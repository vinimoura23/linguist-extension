chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(request.text)}`;
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        // Concatenar todas as partes da tradução
        const translation = data[0].map(item => item[0]).join("");
        sendResponse({ translation: translation });
      })
      .catch(error => {
        console.error("Translation error:", error);
        sendResponse({ error: "Erro na tradução" });
      });
      
    return true; // Indicates asynchronous response
  }
  
  if (request.action === "saveFlashcard") {
    chrome.storage.local.get({ flashcards: [] }, (result) => {
      const flashcards = result.flashcards;
      flashcards.push({
        id: Date.now().toString(),
        original: request.flashcard.original,
        translated: request.flashcard.translated,
        context: request.flashcard.context,
        date: new Date().toISOString()
      });
      
      chrome.storage.local.set({ flashcards }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});
