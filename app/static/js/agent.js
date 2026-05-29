document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('agent-chat-form');
    const chatInput = document.getElementById('agent-input');
    const chatBody = document.getElementById('agent-chat-body');
    const modelSelect = document.getElementById('model-select');
    const historyList = document.getElementById('chat-history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('chat-sidebar');
    const voiceBtn = document.getElementById('voice-input-btn');

    let chatHistory = JSON.parse(localStorage.getItem('airi_chat_history') || '[]');

    // Initialize Feather Icons
    if (window.feather) feather.replace();

    // Toggle Sidebar on Mobile
    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            sidebar.classList.toggle('fixed');
            sidebar.classList.toggle('inset-0');
            sidebar.classList.toggle('z-50');
            sidebar.classList.toggle('w-full');
        });
    }

    // Load History into Sidebar
    const renderHistory = () => {
        if (!historyList) return;
        if (chatHistory.length === 0) {
            historyList.innerHTML = '<div class="p-3 text-sm text-slate-400 italic">No recent chats</div>';
            return;
        }

        historyList.innerHTML = chatHistory.map((chat, index) => `
            <button class="w-full text-left p-3 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors truncate group flex items-center justify-between" onclick="loadChat(${index})">
                <span class="truncate">${chat.title}</span>
                <i data-feather="message-square" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </button>
        `).join('');
        if (window.feather) feather.replace();
    };

    renderHistory();

    // Voice Input Feature
    if (voiceBtn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            let isListening = false;

            recognition.onstart = () => {
                isListening = true;
                voiceBtn.classList.add('text-red-500', 'animate-pulse');
                voiceBtn.innerHTML = '<i data-feather="mic-off" class="w-5 h-5"></i>';
                if (window.feather) feather.replace();
            };

            recognition.onend = () => {
                isListening = false;
                voiceBtn.classList.remove('text-red-500', 'animate-pulse');
                voiceBtn.innerHTML = '<i data-feather="mic" class="w-5 h-5"></i>';
                if (window.feather) feather.replace();
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                chatInput.value += (chatInput.value ? ' ' : '') + transcript;

                // Trigger auto-resize
                chatInput.dispatchEvent(new Event('input'));
                chatInput.focus();
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                recognition.stop();
            };

            voiceBtn.addEventListener('click', () => {
                if (isListening) {
                    recognition.stop();
                } else {
                    recognition.start();
                }
            });
        } else {
            // Hide voice button if not supported
            voiceBtn.style.display = 'none';
        }
    }

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 200) {
            this.style.overflowY = 'scroll';
        } else {
            this.style.overflowY = 'hidden';
        }
    });

    // Handle Enter key for submission
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.requestSubmit();
        }
    });

    // Handle Form Submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Clear welcome message if it exists
        const welcome = chatBody.querySelector('.text-center.py-12');
        if (welcome) welcome.remove();

        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Add Loading State
        const loadingId = addLoadingIndicator();

        try {
            const token = localStorage.getItem('access_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ 
                    message,
                    model: modelSelect ? modelSelect.value : 'local'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to connect');
            }

            const data = await response.json();
            
            removeLoadingIndicator(loadingId);
            addMessage(data.response, 'ai');

            // Update History
            updateHistory(message, data.response);
        } catch (error) {
            removeLoadingIndicator(loadingId);
            addMessage("I'm sorry, I encountered an error connecting to the AIRI Institute brain. Please check your connection.", 'ai');
        }
    });

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-6`;
        
        const maxWidth = 'max-w-[85%] md:max-w-[70%]';
        
        if (sender === 'user') {
            div.innerHTML = `
                <div class="${maxWidth} bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-lg shadow-indigo-500/10">
                    <p class="text-sm leading-relaxed">${text}</p>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="flex items-start gap-3 ${maxWidth}">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                        <i data-feather="cpu" class="w-4 h-4 text-white"></i>
                    </div>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                        <div class="prose prose-sm dark:prose-invert text-slate-800 dark:text-slate-200 leading-relaxed">
                            ${text.replace(/\n/g, '<br>')}
                        </div>
                        <div class="mt-3 flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-2">
                            <button class="text-slate-400 hover:text-indigo-600 transition-colors"><i data-feather="thumbs-up" class="w-3 h-3"></i></button>
                            <button class="text-slate-400 hover:text-indigo-600 transition-colors"><i data-feather="thumbs-down" class="w-3 h-3"></i></button>
                            <button class="text-slate-400 hover:text-indigo-600 transition-colors ml-auto"><i data-feather="copy" class="w-3 h-3"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }

        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
        if (window.feather) feather.replace();
    }

    function addLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'flex justify-start mb-6';
        div.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                    <i data-feather="cpu" class="w-4 h-4 text-white"></i>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1">
                    <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
            </div>
        `;
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
        if (window.feather) feather.replace();
        return id;
    }

    function removeLoadingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function updateHistory(userMsg, aiMsg) {
        const title = userMsg.length > 30 ? userMsg.substring(0, 30) + '...' : userMsg;
        chatHistory.unshift({ title, date: new Date().toISOString(), messages: [{user: userMsg, ai: aiMsg}] });
        if (chatHistory.length > 10) chatHistory.pop();
        localStorage.setItem('airi_chat_history', JSON.stringify(chatHistory));
        renderHistory();
    }

    window.loadChat = (index) => {
        const chat = chatHistory[index];
        if (!chat) return;
        
        chatBody.innerHTML = '';
        chat.messages.forEach(m => {
            addMessage(m.user, 'user');
            addMessage(m.ai, 'ai');
        });
        
        if (window.innerWidth < 768) {
            sidebar.classList.add('hidden');
        }
    };

    newChatBtn.addEventListener('click', () => {
        location.reload();
    });
});
