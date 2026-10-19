// Linguist - Content Script para Tradução Imersiva, Word Hover e Formatação Rica

let tooltipContainer = null;
let currentSelectionData = null;
let wordTooltipElem = null;
const wordGlossaryCache = new Map();

// Configurações com valores padrão
let enableFloatingBubble = true;
let immersiveMode = "inline-replace"; // 'inline-replace' (padrão) | 'inline-below' | 'popup-panel'
let enableWordHover = true;
let preserveFormatting = true;
let inheritPageStyles = true;
let targetLang = "pt";

// Carregar configurações do usuário
chrome.storage.local.get({
  enableFloatingBubble: true,
  immersiveMode: "inline-replace",
  enableWordHover: true,
  preserveFormatting: true,
  inheritPageStyles: true,
  targetLang: "pt"
}, (res) => {
  enableFloatingBubble = res.enableFloatingBubble !== false;
  immersiveMode = res.immersiveMode || "inline-replace";
  enableWordHover = res.enableWordHover !== false;
  preserveFormatting = res.preserveFormatting !== false;
  inheritPageStyles = res.inheritPageStyles !== false;
  targetLang = res.targetLang || "pt";
});

// Atualização em tempo real das configurações
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.enableFloatingBubble !== undefined) {
      enableFloatingBubble = changes.enableFloatingBubble.newValue !== false;
      if (!enableFloatingBubble) removeTooltip();
    }
    if (changes.immersiveMode !== undefined) {
      immersiveMode = changes.immersiveMode.newValue || "inline-replace";
    }
    if (changes.enableWordHover !== undefined) {
      enableWordHover = changes.enableWordHover.newValue !== false;
      if (!enableWordHover) hideWordTooltip();
    }
    if (changes.preserveFormatting !== undefined) {
      preserveFormatting = changes.preserveFormatting.newValue !== false;
    }
    if (changes.inheritPageStyles !== undefined) {
      inheritPageStyles = changes.inheritPageStyles.newValue !== false;
    }
    if (changes.targetLang !== undefined) {
      targetLang = changes.targetLang.newValue || "pt";
    }
  }
});

// Ícones SVG minimalistas
const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
const audioSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
const saveSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
const copySVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const checkSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const closeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
const panelSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`;
const insertSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>`;
const swapSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;

// --- Utilitários de Sanitização e Proteção de Código/Markdown ---

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return (text || '').replace(/[&<>"']/g, m => map[m]);
}

function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html || "";
  return (temp.textContent || temp.innerText || "").trim();
}

function cleanEmptyHtmlElements(html) {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Remover elementos vazios indesejados (tags de código, pré-formatados, parágrafos vazios etc.)
  const candidates = Array.from(temp.querySelectorAll("pre, code, p, blockquote, div, h1, h2, h3, h4, h5, h6, span"));
  for (let i = candidates.length - 1; i >= 0; i--) {
    const el = candidates[i];
    // Preservar elementos que contenham mídias ou formulários
    if (el.querySelector("img, svg, video, iframe, input, button")) continue;
    if (el.textContent.trim() === "") {
      el.remove();
    }
  }
  return temp.innerHTML.trim();
}

function sanitizeHtml(rawHtml) {
  if (!rawHtml) return "";

  // Colapsar quebras de linha e espaços indesejados entre tags HTML
  let cleaned = rawHtml
    .replace(/>\s+</g, "><")
    .replace(/<li[^>]*>\s+/gi, "<li>")
    .replace(/\s+<\/li>/gi, "</li>")
    .trim();

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, "text/html");
  
  const allowedTags = new Set([
    "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE",
    "SPAN", "A", "CODE", "PRE", "MARK", "H1", "H2", "H3", "H4", "H5", "H6",
    "UL", "OL", "LI", "BLOCKQUOTE", "SUB", "SUP", "KBD", "SAMP"
  ]);

  function cleanNode(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toUpperCase();
        if (!allowedTags.has(tagName)) {
          cleanNode(child);
          const frag = document.createDocumentFragment();
          while (child.firstChild) {
            frag.appendChild(child.firstChild);
          }
          child.replaceWith(frag);
        } else {
          // Limpar atributos inseguros mantendo atributos de código e estilo
          const attrs = Array.from(child.attributes);
          for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();
            if (attrName.startsWith("on")) {
              child.removeAttribute(attr.name);
            } else if (attrName === "href") {
              const val = attr.value.trim().toLowerCase();
              if (val.startsWith("javascript:") || val.startsWith("data:")) {
                child.removeAttribute(attr.name);
              } else {
                child.setAttribute("target", "_blank");
                child.setAttribute("rel", "noopener noreferrer");
              }
            } else if (attrName !== "class" && attrName !== "style" && attrName !== "title" && attrName !== "translate") {
              child.removeAttribute(attr.name);
            }
          }
          cleanNode(child);
        }
      }
    }
  }

  cleanNode(doc.body);
  return cleanEmptyHtmlElements(doc.body.innerHTML);
}

// Extrai e higieniza a seleção protegendo blocos de código e markdown com placeholders
function extractSelectionData(selection) {
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const plainText = selection.toString().trim();
  if (!plainText || plainText.length > 5000) return null;

  // Clona o conteúdo para inspecionar nós
  const fragment = range.cloneContents();
  const tempDiv = document.createElement("div");
  tempDiv.appendChild(fragment);

  // Armazena todos os blocos e comandos de código originais para protegê-los 100% da tradução
  const codeSnippets = [];

  // Encontra elementos de código raiz (pre, ou code/kbd/samp isolados fora de pre)
  const codeElements = Array.from(tempDiv.querySelectorAll("pre, code, kbd, samp")).filter(el => {
    // Descartar tags de código vazias ou contendo apenas espaços/quebras
    if (!el.textContent.trim() && !el.querySelector("img, svg, video, iframe")) {
      el.remove();
      return false;
    }
    return !el.parentElement || !el.parentElement.closest("pre");
  });

  codeElements.forEach((el) => {
    const placeholder = `___LINGUIST_CODE_${codeSnippets.length}___`;
    codeSnippets.push(el.outerHTML);
    const textNode = document.createTextNode(placeholder);
    el.replaceWith(textNode);
  });

  const formattingElements = tempDiv.querySelectorAll("b, strong, i, em, u, s, strike, p, br, a, mark, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, span");
  const hasFormattingTags = formattingElements.length > 0 || codeSnippets.length > 0;
  const hasBlockTags = tempDiv.querySelectorAll("p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, div").length > 0 || codeSnippets.some(c => c.startsWith("<pre"));

  // Capturar estilos tipográficos do elemento ancestral
  let ancestor = range.commonAncestorContainer;
  if (ancestor.nodeType === Node.TEXT_NODE) {
    ancestor = ancestor.parentElement;
  }
  const cs = ancestor ? window.getComputedStyle(ancestor) : null;
  const styleInfo = cs ? {
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    lineHeight: cs.lineHeight,
    color: cs.color,
    letterSpacing: cs.letterSpacing,
    textAlign: cs.textAlign
  } : {};

  // Formatar texto para o tradutor
  let htmlToSend = "";
  if (preserveFormatting && hasFormattingTags) {
    htmlToSend = sanitizeHtml(tempDiv.innerHTML);
  } else {
    // Proteger código em formato Markdown antes de traduzir
    let processed = plainText;
    processed = processed.replace(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g, (m, code) => {
      const idx = codeSnippets.length;
      codeSnippets.push(`<pre class="notranslate" translate="no"><code>${escapeHtml(code.trim())}</code></pre>`);
      return `___LINGUIST_CODE_${idx}___`;
    });
    processed = processed.replace(/`([^`\n]+)`/g, (m, code) => {
      const idx = codeSnippets.length;
      codeSnippets.push(`<code class="notranslate" translate="no">${escapeHtml(code)}</code>`);
      return `___LINGUIST_CODE_${idx}___`;
    });

    if (processed.includes("\n")) {
      htmlToSend = processed
        .split(/\n\s*\n/)
        .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
    } else {
      htmlToSend = escapeHtml(processed);
    }
  }

  // Obter contexto para flashcards
  let context = ancestor ? ancestor.textContent.trim() : plainText;
  if (context.length > 200) {
    context = context.substring(0, 200) + "...";
  }

  const rect = range.getBoundingClientRect();
  const coords = {
    x: rect.left + window.scrollX,
    y: rect.bottom + window.scrollY + 8,
    rect: rect
  };

  return {
    plainText: plainText,
    html: htmlToSend,
    codeSnippets: codeSnippets,
    hasFormatting: hasFormattingTags || plainText.includes("\n") || plainText.includes("`"),
    hasBlockTags: hasBlockTags || plainText.includes("\n\n") || plainText.includes("```"),
    styleInfo: styleInfo,
    context: context,
    range: range.cloneRange(),
    ancestor: ancestor,
    coords: coords
  };
}

// Localiza o bloco de texto para inserção imersiva bilíngue
function findBlockContainer(node) {
  let curr = node;
  const blockTags = new Set([
    "P", "DIV", "LI", "BLOCKQUOTE", "ARTICLE", "SECTION",
    "H1", "H2", "H3", "H4", "H5", "H6", "TD", "TH", "ASIDE"
  ]);
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr.nodeType === Node.ELEMENT_NODE && blockTags.has(curr.tagName.toUpperCase())) {
      return curr;
    }
    curr = curr.parentNode;
  }
  return null;
}

// --- Detecção de Seleção de Texto ---

let selectionTimeout = null;

document.addEventListener("mouseup", (event) => {
  if (event.target.closest && event.target.closest(".linguist-icon-bubble, .linguist-panel, .linguist-translation-unit, .linguist-bilingual-block, .linguist-immersive-pill, .linguist-inline-loading, .linguist-word-tooltip")) {
    return;
  }

  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const data = extractSelectionData(selection);

    if (data && data.plainText.length > 0) {
      currentSelectionData = data;
      if (enableFloatingBubble) {
        showIconBubble(event.pageX, event.pageY);
      }
    } else {
      removeTooltip();
    }
  }, 150);
});

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
  tooltipContainer.style.left = `${x + 8}px`;
  tooltipContainer.style.top = `${y - 32}px`;
  tooltipContainer.innerHTML = iconSVG;
  tooltipContainer.title = "Traduzir com Linguist (Modo Imersivo)";

  tooltipContainer.onclick = (e) => {
    e.stopPropagation();
    if (currentSelectionData) {
      startTranslation(currentSelectionData);
    }
  };

  document.body.appendChild(tooltipContainer);
}

// Inicia a tradução e cria/monta a unidade de tradução sem duplicações
function startTranslation(selectionData) {
  if (!selectionData) return;

  const mode = immersiveMode;
  removeTooltip();

  if (mode === "popup-panel") {
    tooltipContainer = document.createElement("div");
    tooltipContainer.className = "linguist-panel";
    tooltipContainer.style.left = `${Math.max(10, selectionData.coords.x)}px`;
    tooltipContainer.style.top = `${Math.max(10, selectionData.coords.y)}px`;
    tooltipContainer.innerHTML = `<div class="linguist-loading"><div class="linguist-spinner"></div> Traduzindo...</div>`;
    document.body.appendChild(tooltipContainer);
  } else {
    showInlineLoading(selectionData);
  }

  const textToSend = selectionData.html || selectionData.plainText;

  chrome.runtime.sendMessage({ 
    action: "translate", 
    text: textToSend,
    targetLang: targetLang 
  }, (response) => {
    removeInlineLoading();
    let translation = response?.translation || "Erro na tradução";
    let sanitized = sanitizeHtml(translation);

    // Restaurar integralmente os blocos e comandos de código originais
    if (selectionData.codeSnippets && selectionData.codeSnippets.length > 0) {
      selectionData.codeSnippets.forEach((codeHtml, idx) => {
        const placeholder = `___LINGUIST_CODE_${idx}___`;
        sanitized = sanitized.split(placeholder).join(codeHtml);
      });
    }

    sanitized = cleanEmptyHtmlElements(sanitized);

    if (mode === "popup-panel") {
      showTranslationPanel(selectionData, sanitized);
    } else {
      createTranslationUnit(selectionData, sanitized, mode);
    }
  });
}

let inlineLoadingElem = null;

function showInlineLoading(selectionData) {
  removeInlineLoading();
  inlineLoadingElem = document.createElement("div");
  inlineLoadingElem.className = "linguist-inline-loading";
  inlineLoadingElem.innerHTML = `<div class="linguist-spinner"></div> Traduzindo...`;

  const block = findBlockContainer(selectionData.range.commonAncestorContainer);
  if (block && block.parentNode) {
    block.after(inlineLoadingElem);
  } else {
    document.body.appendChild(inlineLoadingElem);
    inlineLoadingElem.style.position = "absolute";
    inlineLoadingElem.style.left = `${selectionData.coords.x}px`;
    inlineLoadingElem.style.top = `${selectionData.coords.y}px`;
  }
}

function removeInlineLoading() {
  if (inlineLoadingElem) {
    inlineLoadingElem.remove();
    inlineLoadingElem = null;
  }
}

// ========================================================
// UNIDADE UNIFICADA DE TRADUÇÃO (Controle de Estado Limpo)
// ========================================================
function createTranslationUnit(selectionData, translationHtml, initialMode) {
  const range = selectionData.range;
  if (!range) return;

  const isBlock = selectionData.hasBlockTags;
  const unit = document.createElement(isBlock ? "div" : "span");
  unit.className = isBlock ? "linguist-translation-unit linguist-unit-block" : "linguist-translation-unit linguist-unit-inline";

  // 1. Container Original: contém os nós DOM originais extraídos
  const origContainer = document.createElement(isBlock ? "div" : "span");
  origContainer.className = "linguist-unit-original";

  // 2. Container Substituído (In-Place)
  const replaceContainer = document.createElement(isBlock ? "div" : "span");
  replaceContainer.className = isBlock ? "linguist-immersive-replace-container" : "linguist-immersive-replace-inline";

  const replaceContent = document.createElement(isBlock ? "div" : "span");
  replaceContent.className = "linguist-immersive-replace-content";
  replaceContent.innerHTML = translationHtml;

  // Aplicar enriquecimento de Word Hover (se ativado)
  if (enableWordHover) {
    enhanceWithWordHover(replaceContent);
  }

  // 3. Container Bilíngue (Card abaixo)
  const bilingualContainer = document.createElement("div");
  bilingualContainer.className = "linguist-bilingual-block";

  // Construir cabeçalho bilíngue
  const bilHeader = document.createElement("div");
  bilHeader.className = "linguist-bilingual-header";

  const bilBadge = document.createElement("div");
  bilBadge.className = "linguist-bilingual-badge";
  bilBadge.innerHTML = `${iconSVG} <span>Tradução Português</span>`;

  const bilActions = document.createElement("div");
  bilActions.className = "linguist-actions-group";

  const bilReplaceBtn = document.createElement("button");
  bilReplaceBtn.className = "linguist-icon-btn";
  bilReplaceBtn.innerHTML = `${swapSVG} <span>Substituir no texto</span>`;
  bilReplaceBtn.title = "Substituir diretamente no texto (Modo In-Place)";
  bilReplaceBtn.onclick = (e) => {
    e.stopPropagation();
    setUnitState(unit, "replace");
  };

  const bilAudioBtn = document.createElement("button");
  bilAudioBtn.className = "linguist-icon-btn";
  bilAudioBtn.innerHTML = audioSVG;
  bilAudioBtn.title = "Ouvir texto original";
  bilAudioBtn.onclick = (e) => {
    e.stopPropagation();
    playAudio(selectionData.plainText);
  };

  const bilSaveBtn = document.createElement("button");
  bilSaveBtn.className = "linguist-icon-btn";
  bilSaveBtn.innerHTML = saveSVG;
  bilSaveBtn.title = "Salvar Flashcard";
  bilSaveBtn.onclick = (e) => {
    e.stopPropagation();
    saveFlashcard(selectionData.plainText, stripHtml(translationHtml), selectionData.context, bilSaveBtn);
  };

  const bilCopyBtn = document.createElement("button");
  bilCopyBtn.className = "linguist-icon-btn";
  bilCopyBtn.innerHTML = copySVG;
  bilCopyBtn.title = "Copiar tradução";
  bilCopyBtn.onclick = (e) => {
    e.stopPropagation();
    copyToClipboard(stripHtml(translationHtml), bilCopyBtn);
  };

  const bilCloseBtn = document.createElement("button");
  bilCloseBtn.className = "linguist-icon-btn";
  bilCloseBtn.innerHTML = closeSVG;
  bilCloseBtn.title = "Restaurar texto original";
  bilCloseBtn.onclick = (e) => {
    e.stopPropagation();
    restoreUnitToOriginal(unit, origContainer);
  };

  bilActions.appendChild(bilReplaceBtn);
  bilActions.appendChild(bilAudioBtn);
  bilActions.appendChild(bilSaveBtn);
  bilActions.appendChild(bilCopyBtn);
  bilActions.appendChild(bilCloseBtn);

  bilHeader.appendChild(bilBadge);
  bilHeader.appendChild(bilActions);

  const bilContent = document.createElement("div");
  bilContent.className = "linguist-bilingual-content";
  bilContent.innerHTML = translationHtml;

  bilingualContainer.appendChild(bilHeader);
  bilingualContainer.appendChild(bilContent);

  // Barra flutuante (Pill) do modo In-Place
  const pill = document.createElement("div");
  pill.className = "linguist-immersive-pill";

  const pillToggleBtn = document.createElement("button");
  pillToggleBtn.className = "linguist-pill-btn linguist-pill-toggle";
  pillToggleBtn.innerHTML = `${swapSVG} <span>Original</span>`;
  pillToggleBtn.title = "Alternar entre texto original e traduzido";

  pillToggleBtn.onclick = (e) => {
    e.stopPropagation();
    const currentState = unit.getAttribute("data-state");
    setUnitState(unit, currentState === "original" ? "replace" : "original");
  };

  const pillAudioBtn = document.createElement("button");
  pillAudioBtn.className = "linguist-pill-btn";
  pillAudioBtn.innerHTML = audioSVG;
  pillAudioBtn.title = "Ouvir texto original";
  pillAudioBtn.onclick = (e) => {
    e.stopPropagation();
    playAudio(selectionData.plainText);
  };

  const pillSaveBtn = document.createElement("button");
  pillSaveBtn.className = "linguist-pill-btn";
  pillSaveBtn.innerHTML = saveSVG;
  pillSaveBtn.title = "Salvar Flashcard";
  pillSaveBtn.onclick = (e) => {
    e.stopPropagation();
    saveFlashcard(selectionData.plainText, stripHtml(translationHtml), selectionData.context, pillSaveBtn);
  };

  const pillBilingualBtn = document.createElement("button");
  pillBilingualBtn.className = "linguist-pill-btn";
  pillBilingualBtn.innerHTML = panelSVG;
  pillBilingualBtn.title = "Exibir tradução abaixo do original (Bilíngue)";
  pillBilingualBtn.onclick = (e) => {
    e.stopPropagation();
    setUnitState(unit, "bilingual");
  };

  const pillCloseBtn = document.createElement("button");
  pillCloseBtn.className = "linguist-pill-btn";
  pillCloseBtn.innerHTML = closeSVG;
  pillCloseBtn.title = "Restaurar texto original permanentemente";
  pillCloseBtn.onclick = (e) => {
    e.stopPropagation();
    restoreUnitToOriginal(unit, origContainer);
  };

  pill.appendChild(pillToggleBtn);
  pill.appendChild(pillAudioBtn);
  pill.appendChild(pillSaveBtn);
  pill.appendChild(pillBilingualBtn);
  pill.appendChild(pillCloseBtn);

  replaceContainer.appendChild(pill);
  replaceContainer.appendChild(replaceContent);

  // Extrair o conteúdo original e colocar dentro de origContainer
  try {
    origContainer.appendChild(range.extractContents());
  } catch (err) {
    console.warn("Erro ao extrair conteúdo da seleção:", err);
    return;
  }

  unit.appendChild(origContainer);
  unit.appendChild(replaceContainer);
  unit.appendChild(bilingualContainer);

  // Inserir a unidade completa no exato ponto do DOM
  try {
    range.insertNode(unit);
  } catch (err) {
    console.warn("Erro ao inserir unidade de tradução:", err);
    return;
  }

  // Definir estado inicial (controlado 100% pelo atributo data-state no CSS)
  setUnitState(unit, initialMode === "inline-below" ? "bilingual" : "replace");
}

// Altera o estado de visualização de forma 100% determinística via CSS
function setUnitState(unit, state) {
  unit.setAttribute("data-state", state);
  const pillToggleBtn = unit.querySelector(".linguist-pill-toggle span");
  if (pillToggleBtn) {
    pillToggleBtn.textContent = (state === "original") ? "Tradução" : "Original";
  }
}

// Restaura os nós originais intactos de volta ao DOM sem qualquer wrapper residual
function restoreUnitToOriginal(unit, origContainer) {
  hideWordTooltip();
  const frag = document.createDocumentFragment();
  while (origContainer.firstChild) {
    frag.appendChild(origContainer.firstChild);
  }
  unit.replaceWith(frag);
}

// ========================================================
// RECURSO: WORD HOVER (Significado ao passar o mouse)
// ========================================================

function enhanceWithWordHover(container) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toUpperCase();
        if (tag === "CODE" || tag === "PRE" || tag === "KBD" || tag === "SAMP") {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest(".linguist-immersive-pill, .linguist-bilingual-header, .linguist-actions-group")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue;
    if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;

    // Envolve palavras individuais (mínimo 2 letras) de forma 100% segura sem innerHTML
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    const wordRegex = /[\p{L}\p{N}_-]{2,}/gu;
    let match;
    while ((match = wordRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
      }
      const wordSpan = document.createElement("span");
      wordSpan.className = "linguist-word";
      wordSpan.setAttribute("data-word", match[0]);
      wordSpan.textContent = match[0];
      frag.appendChild(wordSpan);
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.substring(lastIdx)));
    }
    textNode.replaceWith(frag);
  }
}

function ensureWordTooltip() {
  if (!wordTooltipElem) {
    wordTooltipElem = document.createElement("div");
    wordTooltipElem.className = "linguist-word-tooltip";
    (document.body || document.documentElement).appendChild(wordTooltipElem);
  }
}

function hideWordTooltip() {
  if (wordTooltipElem) {
    wordTooltipElem.classList.remove("active");
  }
}

let wordHoverTimeout = null;

document.addEventListener("mouseover", (e) => {
  if (!enableWordHover) return;
  const wordEl = e.target.closest && e.target.closest(".linguist-word");
  if (!wordEl) return;

  clearTimeout(wordHoverTimeout);
  wordHoverTimeout = setTimeout(() => {
    showWordHoverTooltip(wordEl);
  }, 120);
});

document.addEventListener("mouseout", (e) => {
  const wordEl = e.target.closest && e.target.closest(".linguist-word");
  if (wordEl) {
    const related = e.relatedTarget;
    if (related && wordEl.contains(related)) return;
    clearTimeout(wordHoverTimeout);
    hideWordTooltip();
  }
});

function showWordHoverTooltip(wordEl) {
  const rawWord = wordEl.getAttribute("data-word") || wordEl.textContent.trim();
  const cleanWord = rawWord.replace(/[^\p{L}\p{N}_-]/gu, "").toLowerCase();
  if (!cleanWord || cleanWord.length < 2) return;

  ensureWordTooltip();
  const rect = wordEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  // Coordenadas fixas na viewport para imunidade a scrolls e wrappers de overflow
  let x = rect.left + rect.width / 2;
  x = Math.max(35, Math.min(window.innerWidth - 35, x));

  const showBelow = rect.top < 36;
  const y = showBelow ? (rect.bottom + 6) : (rect.top - 6);

  if (wordGlossaryCache.has(cleanWord)) {
    positionAndShowWordTooltip(wordGlossaryCache.get(cleanWord), x, y, showBelow);
    return;
  }

  positionAndShowWordTooltip("...", x, y, showBelow);

  const lookupLang = targetLang === "en" ? "pt" : "en";
  chrome.runtime.sendMessage({ 
    action: "lookupWord", 
    word: cleanWord, 
    targetLang: lookupLang 
  }, (res) => {
    const enWord = res?.translation || cleanWord;
    wordGlossaryCache.set(cleanWord, enWord);
    if (wordTooltipElem && wordTooltipElem.classList.contains("active")) {
      positionAndShowWordTooltip(enWord, x, y, showBelow);
    }
  });
}

function positionAndShowWordTooltip(text, x, y, showBelow = false) {
  if (!wordTooltipElem) return;
  wordTooltipElem.textContent = text;
  wordTooltipElem.style.setProperty("left", `${Math.round(x)}px`, "important");
  wordTooltipElem.style.setProperty("top", `${Math.round(y)}px`, "important");
  wordTooltipElem.classList.toggle("placement-bottom", showBelow);
  wordTooltipElem.classList.add("active");
}

// ========================================================
// MODO 3: PAINEL FLUTUANTE EXPANDIDO FORMATADO
// ========================================================
function showTranslationPanel(selectionData, translationHtml) {
  if (!tooltipContainer) return;
  tooltipContainer.innerHTML = "";

  const header = document.createElement("div");
  header.className = "linguist-header";

  const origPreview = document.createElement("div");
  origPreview.className = "linguist-original";
  origPreview.textContent = selectionData.plainText;

  const headerActions = document.createElement("div");
  headerActions.className = "linguist-actions-group";

  const copyOrigBtn = document.createElement("button");
  copyOrigBtn.className = "linguist-icon-btn";
  copyOrigBtn.innerHTML = copySVG;
  copyOrigBtn.title = "Copiar texto original";
  copyOrigBtn.onclick = (e) => {
    e.stopPropagation();
    copyToClipboard(selectionData.plainText, copyOrigBtn);
  };

  const audioBtn = document.createElement("button");
  audioBtn.className = "linguist-icon-btn";
  audioBtn.innerHTML = audioSVG;
  audioBtn.title = "Ouvir pronúncia";
  audioBtn.onclick = (e) => {
    e.stopPropagation();
    playAudio(selectionData.plainText);
  };

  headerActions.appendChild(copyOrigBtn);
  headerActions.appendChild(audioBtn);

  header.appendChild(origPreview);
  header.appendChild(headerActions);

  const transRow = document.createElement("div");
  transRow.className = "linguist-translation-row";

  const transContent = document.createElement("div");
  transContent.className = "linguist-translation";
  transContent.innerHTML = translationHtml;

  const copyTransBtn = document.createElement("button");
  copyTransBtn.className = "linguist-icon-btn";
  copyTransBtn.innerHTML = copySVG;
  copyTransBtn.title = "Copiar tradução";
  copyTransBtn.onclick = (e) => {
    e.stopPropagation();
    copyToClipboard(stripHtml(translationHtml), copyTransBtn);
  };

  transRow.appendChild(transContent);
  transRow.appendChild(copyTransBtn);

  const footer = document.createElement("div");
  footer.className = "linguist-footer";

  const insertBtn = document.createElement("button");
  insertBtn.className = "linguist-insert-btn";
  insertBtn.innerHTML = `${insertSVG} <span>Substituir no texto</span>`;
  insertBtn.title = "Substituir diretamente no texto";
  insertBtn.onclick = (e) => {
    e.stopPropagation();
    removeTooltip();
    createTranslationUnit(selectionData, translationHtml, "inline-replace");
  };

  const saveBtn = document.createElement("button");
  saveBtn.className = "linguist-save-btn";
  saveBtn.innerHTML = `${saveSVG} <span>Salvar</span>`;
  saveBtn.onclick = (e) => {
    e.stopPropagation();
    saveFlashcard(selectionData.plainText, stripHtml(translationHtml), selectionData.context, saveBtn);
  };

  footer.appendChild(insertBtn);
  footer.appendChild(saveBtn);

  tooltipContainer.appendChild(header);
  tooltipContainer.appendChild(transRow);
  tooltipContainer.appendChild(footer);
}

// --- Funções Auxiliares: Flashcards, Copiar e Áudio ---

function copyToClipboard(text, btn) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const originalHTML = btn.innerHTML;
    const originalTitle = btn.title;
    btn.innerHTML = checkSVG;
    btn.title = "Copiado!";
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.title = originalTitle;
    }, 1500);
  }).catch((err) => {
    console.error("Erro ao copiar texto:", err);
  });
}

function saveFlashcard(original, translated, context, btn) {
  if (!original || !translated) return;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = "Salvando...";

  chrome.runtime.sendMessage({
    action: "saveFlashcard",
    flashcard: {
      original: original,
      translated: translated,
      context: context
    }
  }, (res) => {
    if (res && res.success) {
      btn.innerHTML = "✅ Salvo";
      btn.classList.add("linguist-saved");
      btn.disabled = true;
    } else {
      btn.innerHTML = originalHtml;
    }
  });
}

// --- Reprodução de Áudio com Síntese e Google TTS ---

let cachedVoices = [];
function updateSpeechVoices() {
  if ('speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}
updateSpeechVoices();
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = updateSpeechVoices;
}

function getBestEnglishVoice() {
  const voices = (cachedVoices && cachedVoices.length > 0)
    ? cachedVoices
    : ('speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);

  if (!voices || voices.length === 0) return null;

  const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  if (englishVoices.length === 0) return null;

  const naturalVoice = englishVoices.find(v => {
    const name = v.name || '';
    return name.includes("Natural") || name.includes("Online") || name.includes("Google");
  });
  if (naturalVoice) return naturalVoice;

  const usVoice = englishVoices.find(v => {
    const name = v.name || '';
    const lang = (v.lang || '').toLowerCase();
    return lang.includes('en-us') || name.includes("Zira") || name.includes("David");
  });
  if (usVoice) return usVoice;

  return englishVoices[0];
}

function speakWithWebSpeech(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const cleanText = stripHtml(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getBestEnglishVoice();

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("Erro na síntese de voz nativa:", e);
  }
}

function playAudio(text) {
  const cleanText = stripHtml(text);
  if (!cleanText) return;

  const audio = new Audio();
  let googleAudioPlayed = false;

  const fallbackTimer = setTimeout(() => {
    if (!googleAudioPlayed) {
      speakWithWebSpeech(cleanText);
    }
  }, 1200);

  chrome.runtime.sendMessage({ action: "playAudio", text: cleanText }, (response) => {
    if (response && response.audioDataUrl) {
      audio.src = response.audioDataUrl;
      audio.play()
        .then(() => {
          googleAudioPlayed = true;
          clearTimeout(fallbackTimer);
        })
        .catch((err) => {
          console.warn("Reprodução do áudio de estúdio bloqueada, usando voz nativa:", err);
          clearTimeout(fallbackTimer);
          speakWithWebSpeech(cleanText);
        });
    } else {
      clearTimeout(fallbackTimer);
      speakWithWebSpeech(cleanText);
    }
  });
}

// --- Menu de Contexto (Botão Direito) ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "triggerContextMenuTranslation") {
    const selection = window.getSelection();
    let data = extractSelectionData(selection);

    if (!data && request.text) {
      data = {
        plainText: request.text,
        html: escapeHtml(request.text),
        codeSnippets: [],
        hasFormatting: false,
        hasBlockTags: false,
        styleInfo: {},
        context: request.text,
        coords: {
          x: (window.innerWidth / 2) + window.scrollX,
          y: (window.innerHeight / 3) + window.scrollY
        }
      };
    }

    if (data) {
      currentSelectionData = data;
      startTranslation(data);
    }
  }
});
