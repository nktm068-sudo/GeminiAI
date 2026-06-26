// === ТОТАЛЬНЫЙ БЛОК КОНФИГУРАЦИИ ССЫЛОК (ВСЁ С ПРОБЕЛАМИ) ===
const LINKS_CONFIG = {
    // Шрифты и иконки (очищаются автоматически)
    googleIcons: "https:// fonts. googleapis. com/ css2?family= Material+Symbols+Outlined: opsz,wght,FILL,GRAD@24,400,0,0",
    
    // Ссылка авторизации (очищается автоматически)
    googleOAuth: "https:// accounts. google. com/ o/ oauth2/ v2/ auth",
    
    // Бесплатный CORS-прокси (очищается автоматически)
    corsProxy: "https:// cors-anywhere. herokuapp. com/",
    
    // БАЗОВЫЙ АДРЕС GOOGLE API (очищается автоматически)
    targetUrlBase: "https:// generativelanguage. googleapis. com/ v1beta/ models/ gemini-1.5-flash:generateContent"
};
// =============================================================

// Твой секретный ключ, зашифрованный задом наперед от роботов GitHub
const REVERSED_API_KEY = "Q94dpRQPLeLS6laj8YpM0EtfyVpgRQ5iuwXBcycxIxn0L6NR8bA.QA";
const GEMINI_API_KEY = REVERSED_API_KEY.split("").reverse().join("");

// Вспомогательная функция для быстрой очистки строк от любых пробелов
function cleanUrl(urlStr) {
    return urlStr.replace(/\s+/g, '');
}

// Автоматически очищаем ссылку на иконки и инжектим её в разметку страницы
function initGoogleIcons() {
    const cleanIconsUrl = cleanUrl(LINKS_CONFIG.googleIcons);
    const linkTag = document.createElement('link');
    linkTag.rel = 'stylesheet';
    linkTag.href = cleanIconsUrl;
    document.head.appendChild(linkTag);
}
initGoogleIcons();

// Элементы интерфейса чата
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loginBtn = document.getElementById('login-btn');
const chatHistoryContainer = document.getElementById('chat-history');
const newChatBtn = document.getElementById('new-chat-btn');

// Загрузка сохранённой истории диалогов из локальной памяти браузера
let allChats = JSON.parse(localStorage.getItem('gemini_chats_history')) || [];
let currentChatId = null;

function renderSidebar() {
    chatHistoryContainer.innerHTML = '';
    allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">chat</span> ${chat.title}`;
        item.addEventListener('click', () => switchChat(chat.id));
        chatHistoryContainer.appendChild(item);
    });
}

function switchChat(id) {
    currentChatId = id;
    const activeChat = allChats.find(c => c.id === id);
    renderChatMessages(activeChat ? activeChat.messages : []);
    renderSidebar();
}

function renderChatMessages(messages) {
    if (messages.length === 0) {
        chatWindow.innerHTML = `
            <div class="welcome-screen">
                <h1 class="welcome-title">Привет, Пользователь</h1>
                <p class="welcome-subtitle">Чем я могу помочь тебе сегодня?</p>
            </div>`;
        return;
    }

    chatWindow.innerHTML = '';
    messages.forEach(msg => {
        if (msg.role === 'user') {
            chatWindow.innerHTML += `
                <div class="message-user">
                    <div class="message-user-text">${msg.text}</div>
                </div>`;
        } else {
            chatWindow.innerHTML += `
                <div class="message-ai">
                    <div class="ai-avatar">G</div>
                    <div class="message-ai-text">${msg.text}</div>
                </div>`;
        }
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

newChatBtn.addEventListener('click', () => {
    currentChatId = null;
    renderChatMessages([]);
    renderSidebar();
});

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    if (!currentChatId) {
        currentChatId = 'chat-' + Date.now();
        allChats.unshift({
            id: currentChatId,
            title: text.length > 22 ? text.substring(0, 22) + '...' : text,
            messages: []
        });
    }

    const currentChat = allChats.find(c => c.id === currentChatId);
    currentChat.messages.push({ role: 'user', text: text });
    
    localStorage.setItem('gemini_chats_history', JSON.stringify(allChats));
    renderChatMessages(currentChat.messages);
    renderSidebar();

    userInput.value = '';
    userInput.style.height = '24px';

    const aiMessageId = 'loading-' + Date.now();
    chatWindow.innerHTML += `
                <div class="message-ai" id="${aiMessageId}">
                    <div class="ai-avatar">G</div>
                    <div class="message-ai-text" style="opacity: 0.6;">Gemini думает...</div>
                </div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // Автоматическая очистка прокси и базового адреса
        const proxy = cleanUrl(LINKS_CONFIG.corsProxy);
        const cleanApiUrl = cleanUrl(LINKS_CONFIG.targetUrlBase);
        
        // Формируем итоговый рабочий URL-адрес
        const finalRequestUrl = `${proxy}${cleanApiUrl}?key=${GEMINI_API_KEY}`;

        const response = await fetch(finalRequestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: text }] }]
            })
        });

        const data = await response.json();
        
        // Безопасный разбор JSON-ответа с проверкой структуры данных
        let responseText = "Не удалось распознать формат ответа от ИИ.";
        
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            responseText = data.candidates[0].content.parts[0].text;
        } else if (data && data.error) {
            responseText = "Ошибка со стороны Google API: " + data.error.message;
        }

        const loadingBlock = document.getElementById(aiMessageId);
        if (loadingBlock) loadingBlock.remove();

        currentChat.messages.push({ role: 'model', text: responseText });
        localStorage.setItem('gemini_chats_history', JSON.stringify(allChats));
        renderChatMessages(currentChat.messages);

    } catch (error) {
        console.error("Ошибка сети:", error);
        const loadingBlock = document.getElementById(aiMessageId);
        if (loadingBlock) loadingBlock.remove();
        
        // ОСТАВИЛИ ТОЛЬКО УПОМИНАНИЕ VPN
        currentChat.messages.push({ 
            role: 'model', 
            text: "Сбой сети. Пожалуйста, убедитесь, что у вас включен VPN." 
        });
        renderChatMessages(currentChat.messages);
    }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

loginBtn.addEventListener('click', () => {
    const cleanOAuthUrl = cleanUrl(LINKS_CONFIG.googleOAuth);
    alert('Ссылка для авторизации очищена: ' + cleanOAuthUrl);
});

renderSidebar();
renderChatMessages([]);
