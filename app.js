class NotesApp {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.displayNotes();
        this.registerServiceWorker();
        this.initPWA();
    }

    bindEvents() {
        document.getElementById('save-btn').addEventListener('click', () => this.saveNote());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearEditor());
        document.getElementById('note-text').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.saveNote();
            }
        });
    }

    saveNote() {
        const text = document.getElementById('note-text').value.trim();
        
        if (!text) {
            alert('Введите текст заметки!');
            return;
        }

        const note = {
            id: Date.now(),
            text: text,
            date: new Date().toLocaleString('ru-RU')
        };

        this.notes.unshift(note);
        this.saveToStorage();
        this.displayNotes();
        this.clearEditor();
        
        // Показываем уведомление о сохранении
        this.showNotification('Заметка сохранена!');
    }

    deleteNote(id) {
        if (confirm('Удалить эту заметку?')) {
            this.notes = this.notes.filter(note => note.id !== id);
            this.saveToStorage();
            this.displayNotes();
            this.showNotification('Заметка удалена');
        }
    }

    clearEditor() {
        document.getElementById('note-text').value = '';
        document.getElementById('note-text').focus();
    }

    displayNotes() {
        const container = document.getElementById('notes-container');
        
        if (this.notes.length === 0) {
            container.innerHTML = '<div class="empty-state">Заметок пока нет. Начните писать!</div>';
            return;
        }

        container.innerHTML = this.notes.map(note => `
            <div class="note-item">
                <button class="delete-btn" onclick="app.deleteNote(${note.id})">×</button>
                <div class="note-text">${this.escapeHtml(note.text)}</div>
                <div class="note-date">Создано: ${note.date}</div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveToStorage() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
    }

    showNotification(message) {
        // Простое уведомление
        alert(message); // В реальном PWA можно использовать Notifications API
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/notes-app/sw.js');
                console.log('Service Worker зарегистрирован');
            } catch (error) {
                console.log('Ошибка регистрации Service Worker:', error);
            }
        }
    }

    initPWA() {
        let deferredPrompt;
        const installBtn = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
        });

        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                installBtn.style.display = 'none';
            }
            
            deferredPrompt = null;
        });
    }
}

// Инициализация приложения
const app = new NotesApp();