chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    // Buscar idioma alvo das configurações (padrão 'pt')
    chrome.storage.local.get({ targetLang: 'pt' }, (result) => {
      const targetLang = result.targetLang;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t`;
      
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: request.text })
      })
        .then(response => response.json())
        .then(data => {
          const translation = data[0].map(item => item[0]).join("");
          sendResponse({ translation: translation });
        })
        .catch(error => {
          console.error("Translation error:", error);
          sendResponse({ error: "Erro na tradução" });
        });
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
  
  if (request.action === "playAudio") {
    // A API não-oficial do Google TTS (tw-ob) recusa textos maiores que ~200 caracteres.
    // Para textos longos, vamos direto para a voz nativa do navegador (chrome.tts).
    if (request.text.length > 200) {
      chrome.tts.speak(request.text, { lang: 'en-US' });
      sendResponse({ error: "Texto muito longo para Google TTS, usando chrome.tts" });
      return true;
    }

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(request.text)}`;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error("HTTP error " + r.status);
        return r.arrayBuffer();
      })
      .then(buffer => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        sendResponse({ audioDataUrl: 'data:audio/mp3;base64,' + base64 });
      })
      .catch(error => {
        console.error("Google TTS via background failed, falling back to chrome.tts", error);
        // Fallback para chrome.tts no background script
        chrome.tts.speak(request.text, { lang: 'en-US' });
        sendResponse({ error: "Usando chrome.tts fallback" });
      });
    return true;
  }
});
