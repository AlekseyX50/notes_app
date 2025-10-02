class NotesApp {
    constructor() {
        this.notes = [];
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initAuth();
        this.registerServiceWorker();
        this.initPWA();
    }

    bindEvents() {
        // Аутентификация
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuth(e));
        document.getElementById('signup-btn').addEventListener('click', () => this.handleSignup());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Заметки
        document.getElementById('save-btn').addEventListener('click', () => this.saveNote());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearEditor());
        document.getElementById('note-text').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.saveNote();
            }
        });
    }

    initAuth() {
        // Слушатель изменения состояния аутентификации
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.showApp();
                this.loadNotes();
            } else {
                this.currentUser = null;
                this.showAuth();
            }
        });
    }

    async handleAuth(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');
        
        if (!email || !password) {
            this.showAuthMessage('Заполните все поля', 'error');
            return;
        }

        loginBtn.textContent = 'Вход...';
        loginBtn.classList.add('loading');

        try {
            await auth.signInWithEmailAndPassword(email, password);
            this.showAuthMessage('Успешный вход!', 'success');
        } catch (error) {
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            loginBtn.textContent = 'Войти';
            loginBtn.classList.remove('loading');
        }
    }

    async handleSignup() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const signupBtn = document.getElementById('signup-btn');
        
        if (!email || !password) {
            this.showAuthMessage('Заполните все поля', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthMessage('Пароль должен быть не менее 6 символов', 'error');
            return;
        }

        signupBtn.textContent = 'Регистрация...';
        signupBtn.classList.add('loading');

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            this.showAuthMessage('Аккаунт создан!', 'success');
        } catch (error) {
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            signupBtn.textContent = 'Создать аккаунт';
            signupBtn.classList.remove('loading');
        }
    }

    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Неверный формат email';
            case 'auth/user-disabled':
                return 'Аккаунт отключен';
            case 'auth/user-not-found':
                return 'Пользователь не найден';
            case 'auth/wrong-password':
                return 'Неверный пароль';
            case 'auth/email-already-in-use':
                return 'Email уже используется';
            case 'auth/weak-password':
                return 'Слабый пароль';
            default:
                return 'Ошибка аутентификации';
        }
    }

    showAuthMessage(message, type) {
        const messageEl = document.getElementById('auth-message');
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }

    showAuth() {
        document.getElementById('auth-screen').style.display = 'block';
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('auth-form').reset();
    }

    showApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-email').textContent = this.currentUser.email;
    }

    async saveNote() {
        if (!this.currentUser) return;

        const text = document.getElementById('note-text').value.trim();
        
        if (!text) {
            alert('Введите текст заметки!');
            return;
        }

        const note = {
            text: text,
            date: new Date().toLocaleString('ru-RU'),
            userId: this.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('notes').add(note);
            this.displayNotes();
            this.clearEditor();
            this.showNotification('Заметка сохранена!');
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка сохранения заметки');
        }
    }

    async loadNotes() {
        if (!this.currentUser) return;

        try {
            const snapshot = await db.collection('notes')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.displayNotes();
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        }
    }

    async deleteNote(id) {
        if (!this.currentUser || !confirm('Удалить эту заметку?')) return;

        try {
            await db.collection('notes').doc(id).delete();
            this.loadNotes(); // Перезагружаем заметки
            this.showNotification('Заметка удалена');
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert('Ошибка удаления заметки');
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
                <button class="delete-btn" onclick="app.deleteNote('${note.id}')">×</button>
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

    showNotification(message) {
        // Можно заменить на красивые toast-уведомления
        console.log(message);
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