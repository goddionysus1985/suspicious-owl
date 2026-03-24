document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chat-toggle-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatClose = document.getElementById('chat-close-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input-field');
    const chatContent = document.getElementById('chat-messages-content');

    let sessionId = localStorage.getItem('chat_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chat_session_id', sessionId);
    }

    let lastMessagesCount = 0;

    // Toggle chat
    chatToggle.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            loadMessages();
            setTimeout(scrollToBottom, 100);
        }
    });

    chatClose.addEventListener('click', () => {
        chatWindow.classList.remove('active');
    });

    // Send message
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Optimistic UI
        appendMessage({ message, is_from_admin: 0 });
        chatInput.value = '';
        scrollToBottom();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/support', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ message, session_id: sessionId })
            });

            if (!response.ok) {
                console.error('Failed to send message');
            }
        } catch (error) {
            console.error('Chat error:', error);
        }
    });

    async function loadMessages() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/support?session_id=${sessionId}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            
            if (!response.ok) return;
            
            const messages = await response.json();
            
            // Only update if count changed to avoid flickering
            if (messages.length !== lastMessagesCount) {
                chatContent.innerHTML = '';
                if (messages.length === 0) {
                    appendMessage({ 
                        message: "Вітаємо! Я менеджер ОПТИКИ. Чим можу вам допомогти?", 
                        is_from_admin: 1 
                    });
                } else {
                    messages.forEach(appendMessage);
                }
                lastMessagesCount = messages.length;
                scrollToBottom();
            }
        } catch (error) {
            console.error('Load messages error:', error);
        }
    }

    function appendMessage(msg) {
        const div = document.createElement('div');
        div.className = `message ${msg.is_from_admin ? 'support' : 'user'}`;
        div.textContent = msg.message;
        chatContent.appendChild(div);
    }

    function scrollToBottom() {
        chatContent.scrollTop = chatContent.scrollHeight;
    }

    // Poll for new messages every 4 seconds if window is open
    setInterval(() => {
        if (chatWindow && chatWindow.classList.contains('active')) {
            loadMessages();
        }
    }, 4000);
});
