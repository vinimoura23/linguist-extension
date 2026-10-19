chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    // Buscar idioma alvo das configurações (padrão 'pt')
    chrome.storage.local.get({ targetLang: 'pt' }, (result) => {
      const targetLang = request.targetLang || result.targetLang || 'pt';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t`;
      
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: request.text })
      })
        .then(response => response.json())
        .then(data => {
          const translation = (data && data[0]) 
            ? data[0].filter(item => item && item[0]).map(item => item[0]).join("") 
            : "";
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

  if (request.action === "lookupWord") {
    const word = (request.word || "").trim();
    if (!word) {
      sendResponse({ translation: "" });
      return true;
    }
    const targetLang = request.targetLang || "en";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const translation = (data && data[0] && data[0][0]) ? data[0][0][0] : word;
        sendResponse({ translation: translation });
      })
      .catch(err => {
        console.error("Word lookup error:", err);
        sendResponse({ error: "Erro na consulta", translation: word });
      });
    return true;
  }
  
  if (request.action === "playAudio") {
    const plainText = (request.text || "").replace(/<[^>]*>/g, "").trim();
    // Se o texto for muito longo para o endpoint de TTS, usa chrome.tts nativo
    if (plainText.length > 200) {
      chrome.tts.speak(plainText, { lang: 'en-US' });
      sendResponse({ error: "Texto longo, usando chrome.tts nativo" });
      return true;
    }

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(plainText)}`;
    fetch(url, {
      headers: { 'Accept': 'audio/mpeg,audio/*;q=0.9' }
    })
      .then(r => {
        if (!r.ok) throw new Error("HTTP error " + r.status);
        return r.arrayBuffer();
      })
      .then(buffer => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);
        sendResponse({ audioDataUrl: 'data:audio/mp3;base64,' + base64 });
      })
      .catch(error => {
        console.error("Google TTS falhou no background, acionando fallback chrome.tts:", error);
        chrome.tts.speak(request.text, { lang: 'en-US' });
        sendResponse({ error: "Fallback para síntese nativa" });
      });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "linguist-translate",
    title: "Traduzir com Linguist",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "linguist-translate" && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "triggerContextMenuTranslation",
      text: info.selectionText
    });
  }
});
