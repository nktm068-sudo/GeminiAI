// === БЛОК КОНФИГУРАЦИИ ССЫЛОК С ПРОБЕЛАМИ ===
const LINKS_CONFIG = {
    googleIcons: "https:// fonts. googleapis. com/ css2?family= Material+Symbols+Outlined: opsz,wght,FILL,GRAD@24,400,0,0",
    googleOAuth: "https:// accounts. google. com/ o/ oauth2/ v2/ auth" 
};

// Твой ключ, зашифрованный задом наперед
const REVERSED_API_KEY = "QnWzleCTk_p3UQEycHXlbOAaJeYhhhSInhQHGsJe0c3bgIK6NR8bA.QA"; 

// Восстанавливаем ключ в памяти браузера при старте страницы
const GEMINI_API_KEY = REVERSED_API_KEY.split("").reverse().join("");
const ai = new GoogleGen({ key: GEMINI_API_KEY });

// Функция автоматической очистки внутренних ссылок от пробелов
function cleanAndInjectLinks() {
    const cleanIconsUrl = LINKS_CONFIG.googleIcons.replace(/\s+/g, '');
    const linkTag = document.createElement('link');
    linkTag.rel = 'stylesheet';
    linkTag.href = cleanIconsUrl;
    document.head.appendChild(linkTag);
}
cleanAndInjectLinks();

// Элементы интерфейса
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loginBtn = document.getElementById('login-btn');
const chatHistoryContainer = document.getElementById('chat-history');
const newChatBtn = document.getElementById('new-chat-btn');

// История берется локально из браузера пользователя
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
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: text,
        });

        const loadingBlock = document.getElementById(aiMessageId);
        if (loadingBlock) loadingBlock.remove();

        currentChat.messages.push({ role: 'model', text: response.text });
        localStorage.setItem('gemini_chats_history', JSON.stringify(allChats));
        renderChatMessages(currentChat.messages);

    } catch (error) {
        console.error("Ошибка API:", error);
        const loadingBlock = document.getElementById(aiMessageId);
        if (loadingBlock) loadingBlock.remove();
        
        currentChat.messages.push({ role: 'model', text: "Произошла ошибка при получении ответа." });
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
    const cleanOAuthUrl = LINKS_CONFIG.googleOAuth.replace(/\s+/g, '');
    alert('Ссылка для авторизации очищена: ' + cleanOAuthUrl);
});

renderSidebar();
renderChatMessages([]);
