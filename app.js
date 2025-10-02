// app.js - Полная версия с защитой Firebase

// Проверка инициализации Firebase
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase SDK not loaded');
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; max-width: 500px;">
                <h2 style="color: #ef4444; margin-bottom: 20px;">🚨 Ошибка загрузки</h2>
                <p style="margin-bottom: 20px; color: #374151;">Firebase SDK не загружен. Проверьте подключение к интернету.</p>
                <button onclick="location.reload()" style="background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
                    Перезагрузить страницу
                </button>
            </div>
        </div>
    `;
    throw new Error('Firebase SDK not loaded');
}

if (typeof auth === 'undefined' || typeof db === 'undefined') {
    console.error('❌ Firebase not initialized properly');
    // Приложение продолжит работу, но покажет ошибку при попытке использовать Firebase
}

class NotesApp {
    constructor() {
        this.notes = [];
        this.categories = [];
        this.currentUser = null;
        this.currentCategory = 'all';
        this.theme = localStorage.getItem('theme') || 'light';
        this.currentContextMenu = null;
        this.init();
    }

    init() {
        console.log('Инициализация приложения...');
        this.bindEvents();
        this.initAuth();
        this.registerServiceWorker();
        this.initPWA();
        this.applyTheme();
    }

    bindEvents() {
        console.log('Привязка событий...');
        
        // Аутентификация
        const authForm = document.getElementById('auth-form');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleAuth(e));
        }
        
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.handleSignup());
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Заметки
        const saveBtn = document.getElementById('save-btn');
        const clearBtn = document.getElementById('clear-btn');
        const noteText = document.getElementById('note-text');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveNote());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearEditor());
        }
        
        if (noteText) {
            noteText.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.saveNote();
                }
            });
        }

        // Категории
        const addCategoryBtn = document.getElementById('add-category-btn');
        const createCategoryBtn = document.getElementById('create-category-btn');
        const cancelCategoryBtn = document.getElementById('cancel-category-btn');
        
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showCategoryModal());
        }
        
        if (createCategoryBtn) {
            createCategoryBtn.addEventListener('click', () => this.createCategory());
        }
        
        if (cancelCategoryBtn) {
            cancelCategoryBtn.addEventListener('click', () => this.hideCategoryModal());
        }

        // Тема
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Закрытие контекстного меню при нажатии Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideCategoryContextMenu();
            }
        });
    }

    initAuth() {
        console.log('Инициализация аутентификации...');
        
        // Проверяем, что Firebase инициализирован
        if (typeof auth === 'undefined') {
            console.error('Firebase Auth not available');
            this.showAuthMessage('Ошибка инициализации Firebase. Перезагрузите страницу.', 'error');
            return;
        }
        
        // Слушатель изменения состояния аутентификации
        auth.onAuthStateChanged((user) => {
            console.log('Состояние аутентификации изменено:', user);
            if (user) {
                this.currentUser = user;
                this.showApp();
                this.loadCategories();
                this.loadNotes();
            } else {
                this.currentUser = null;
                this.showAuth();
            }
        }, (error) => {
            console.error('Ошибка в слушателе аутентификации:', error);
            this.showAuthMessage('Ошибка подключения к серверу аутентификации', 'error');
        });
    }

    async handleAuth(e) {
        e.preventDefault();
        console.log('Обработка авторизации...');
        
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
            console.log('Попытка входа...');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Успешный вход:', userCredential.user);
            this.showAuthMessage('Успешный вход!', 'success');
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            loginBtn.textContent = 'Войти';
            loginBtn.classList.remove('loading');
        }
    }

    async handleSignup() {
        console.log('Обработка регистрации...');
        
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
            console.log('Попытка регистрации...');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            console.log('Успешная регистрация:', userCredential.user);
            this.showAuthMessage('Аккаунт создан!', 'success');
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            signupBtn.textContent = 'Создать аккаунт';
            signupBtn.classList.remove('loading');
        }
    }

    async logout() {
        try {
            console.log('Выход из системы...');
            await auth.signOut();
            console.log('Успешный выход');
        } catch (error) {
            console.error('Ошибка выхода:', error);
            this.showNotification('Ошибка при выходе: ' + error.message);
        }
    }

    getAuthErrorMessage(error) {
        console.log('Код ошибки:', error.code);
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
            case 'auth/network-request-failed':
                return 'Проблемы с сетью. Проверьте подключение к интернету';
            case 'auth/too-many-requests':
                return 'Слишком много попыток. Попробуйте позже';
            default:
                return 'Ошибка аутентификации: ' + error.message;
        }
    }

    showAuthMessage(message, type) {
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `auth-message ${type}`;
            messageEl.style.display = 'block';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        } else {
            alert(message); // Fallback
        }
    }

    showAuth() {
        console.log('Показ экрана авторизации');
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        const userInfo = document.getElementById('user-info');
        
        if (authScreen) authScreen.style.display = 'block';
        if (appScreen) appScreen.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        
        const authForm = document.getElementById('auth-form');
        if (authForm) authForm.reset();
    }

    showApp() {
        console.log('Показ основного приложения');
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        const userInfo = document.getElementById('user-info');
        const userEmail = document.getElementById('user-email');
        
        if (authScreen) authScreen.style.display = 'none';
        if (appScreen) appScreen.style.display = 'block';
        if (userInfo) userInfo.style.display = 'flex';
        if (userEmail && this.currentUser) userEmail.textContent = this.currentUser.email;
    }

    // === МЕТОДЫ ДЛЯ КАТЕГОРИЙ ===

    async loadCategories() {
        if (!this.currentUser) return;

        try {
            console.log('Загрузка категорий...');
            const snapshot = await db.collection('categories')
                .where('userId', '==', this.currentUser.uid)
                .get();
            
            this.categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Загружено категорий:', this.categories.length);
            this.displayCategories();
            this.updateCategorySelect();
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            this.showNotification('Ошибка загрузки категорий: ' + error.message);
        }
    }

    async createCategory() {
        if (!this.currentUser) {
            this.showNotification('Вы не авторизованы!');
            return;
        }

        const name = document.getElementById('category-name').value.trim();
        const color = document.getElementById('category-color').value;

        if (!name) {
            this.showNotification('Введите название категории');
            return;
        }

        if (this.categories.find(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            this.showNotification('Категория с таким названием уже существует');
            return;
        }

        const category = {
            name: name,
            color: color,
            userId: this.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('categories').add(category);
            this.hideCategoryModal();
            this.loadCategories();
            this.showNotification('Категория создана!');
        } catch (error) {
            console.error('Ошибка создания категории:', error);
            this.showNotification('Ошибка создания категории: ' + error.message);
        }
    }

    async deleteCategory(categoryId) {
        if (!this.currentUser) return;
        
        if (!confirm('Удалить эту категорию? Все заметки в этой категории станут без категории.')) {
            return;
        }

        try {
            // Переносим все заметки этой категории в "без категории"
            const notesSnapshot = await db.collection('notes')
                .where('userId', '==', this.currentUser.uid)
                .where('categoryId', '==', categoryId)
                .get();

            const batch = db.batch();
            
            // Обновляем все заметки этой категории
            notesSnapshot.docs.forEach(doc => {
                const noteRef = db.collection('notes').doc(doc.id);
                batch.update(noteRef, { categoryId: null });
            });

            // Удаляем саму категорию
            const categoryRef = db.collection('categories').doc(categoryId);
            batch.delete(categoryRef);

            await batch.commit();
            
            this.showNotification('Категория удалена!');
            this.loadCategories();
            this.loadNotes();
        } catch (error) {
            console.error('Ошибка удаления категории:', error);
            this.showNotification('Ошибка удаления категории: ' + error.message);
        }
    }

    showCategoryContextMenu(categoryId, event) {
        event.preventDefault();
        event.stopPropagation();

        // Удаляем существующее контекстное меню
        this.hideCategoryContextMenu();

        const menu = document.createElement('div');
        menu.className = 'category-context-menu';
        menu.style.position = 'absolute';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.background = 'var(--background)';
        menu.style.border = '1px solid var(--border)';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 4px 12px var(--shadow)';
        menu.style.zIndex = '1000';
        menu.style.padding = '8px 0';
        menu.style.minWidth = '150px';

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Удалить категорию';
        deleteButton.style.width = '100%';
        deleteButton.style.padding = '8px 16px';
        deleteButton.style.border = 'none';
        deleteButton.style.background = 'none';
        deleteButton.style.color = 'var(--error)';
        deleteButton.style.cursor = 'pointer';
        deleteButton.style.textAlign = 'left';
        deleteButton.style.fontFamily = 'inherit';
        deleteButton.style.fontSize = '14px';

        deleteButton.addEventListener('click', () => {
            this.deleteCategory(categoryId);
            this.hideCategoryContextMenu();
        });

        menu.appendChild(deleteButton);
        document.body.appendChild(menu);

        // Сохраняем ссылку на меню для последующего удаления
        this.currentContextMenu = menu;

        // Закрываем меню при клике вне его
        setTimeout(() => {
            document.addEventListener('click', this.hideCategoryContextMenu.bind(this), { once: true });
        }, 100);
    }

    hideCategoryContextMenu() {
        if (this.currentContextMenu) {
            this.currentContextMenu.remove();
            this.currentContextMenu = null;
        }
    }

    displayCategories() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        const defaultCategories = `
            <button class="category-btn ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">Все заметки</button>
            <button class="category-btn ${this.currentCategory === 'uncategorized' ? 'active' : ''}" data-category="uncategorized">Без категории</button>
        `;

        const userCategories = this.categories.map(category => `
            <button class="category-btn ${this.currentCategory === category.id ? 'active' : ''}" 
                    data-category="${category.id}" 
                    style="border-left-color: ${category.color}">
                ${this.escapeHtml(category.name)}
            </button>
        `).join('');

        container.innerHTML = defaultCategories + userCategories;

        // Добавляем обработчики событий для кнопок категорий
        container.querySelectorAll('.category-btn').forEach(btn => {
            const categoryId = btn.dataset.category;
            
            // Левый клик - выбор категории
            btn.addEventListener('click', (e) => {
                if (e.button === 0) { // Только левая кнопка мыши
                    this.setActiveCategory(categoryId);
                }
            });

            // Правый клик - контекстное меню (только для пользовательских категорий)
            if (categoryId !== 'all' && categoryId !== 'uncategorized') {
                btn.addEventListener('contextmenu', (e) => {
                    this.showCategoryContextMenu(categoryId, e);
                });
            }
        });
    }

    setActiveCategory(categoryId) {
        this.currentCategory = categoryId;
        
        // Обновляем активные кнопки
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-category="${categoryId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Обновляем заголовок
        let title = 'Мои заметки';
        if (categoryId === 'uncategorized') {
            title = 'Заметки без категории';
        } else if (categoryId !== 'all') {
            const category = this.categories.find(cat => cat.id === categoryId);
            title = category ? `Заметки: ${category.name}` : 'Мои заметки';
        }
        
        const notesTitle = document.getElementById('notes-title');
        if (notesTitle) {
            notesTitle.textContent = title;
        }

        // Фильтруем заметки
        this.displayNotes();
    }

    updateCategorySelect() {
        const select = document.getElementById('category-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">Без категории</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    showCategoryModal() {
        const modal = document.getElementById('category-modal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('category-name').value = '';
            document.getElementById('category-color').value = '#4f46e5';
        }
    }

    hideCategoryModal() {
        const modal = document.getElementById('category-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // === МЕТОДЫ ДЛЯ ТЕМЫ ===

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = this.theme === 'light' ? '🌙' : '☀️';
        }
        
        // Обновляем theme-color для PWA
        const themeColor = this.theme === 'light' ? '#4f46e5' : '#6366f1';
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeColor);
        }
    }

    // === МЕТОДЫ ДЛЯ ЗАМЕТОК ===

    async saveNote() {
        if (!this.currentUser) {
            this.showNotification('Вы не авторизованы!');
            return;
        }

        const text = document.getElementById('note-text').value.trim();
        const categorySelect = document.getElementById('category-select');
        const categoryId = categorySelect ? categorySelect.value || null : null;
        
        if (!text) {
            this.showNotification('Введите текст заметки!');
            return;
        }

        const note = {
            text: text,
            categoryId: categoryId,
            date: new Date().toLocaleString('ru-RU'),
            userId: this.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('notes').add(note);
            this.clearEditor();
            this.showNotification('Заметка сохранена!');
            await this.loadNotes();
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showNotification('Ошибка сохранения заметки: ' + error.message);
        }
    }

    async loadNotes() {
        if (!this.currentUser) {
            this.notes = [];
            this.displayNotes();
            return;
        }

        try {
            let snapshot;
            
            // Для всех заметок
            if (this.currentCategory === 'all') {
                try {
                    snapshot = await db.collection('notes')
                        .where('userId', '==', this.currentUser.uid)
                        .orderBy('createdAt', 'desc')
                        .get();
                } catch (error) {
                    console.log('Ошибка с индексом, загружаем без сортировки:', error);
                    // Если нет индекса, загружаем без сортировки и сортируем на клиенте
                    snapshot = await db.collection('notes')
                        .where('userId', '==', this.currentUser.uid)
                        .get();
                    
                    this.notes = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })).sort((a, b) => {
                        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(a.date);
                        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(b.date);
                        return dateB - dateA; // Сортировка по убыванию (новые сначала)
                    });
                    
                    this.displayNotes();
                    return;
                }
            } 
            // Для заметок без категории
            else if (this.currentCategory === 'uncategorized') {
                try {
                    snapshot = await db.collection('notes')
                        .where('userId', '==', this.currentUser.uid)
                        .where('categoryId', '==', null)
                        .orderBy('createdAt', 'desc')
                        .get();
                } catch (error) {
                    console.log('Ошибка с индексом для uncategorized, загружаем без сортировки:', error);
                    snapshot = await db.collection('notes')
                        .where('userId', '==', this.currentUser.uid)
                        .where('categoryId', '==', null)
                        .get();
                    
                    this.notes = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })).sort((a, b) => {
                        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(a.date);
                        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(b.date);
                        return dateB - dateA;
                    });
                    
                    this.displayNotes();
                    return;
                }
            } 
            // Для конкретной категории
            else {
                try {
                    snapshot = await db.collection('notes')
                        .where('userId', '==', this.currentUser.uid)
                        .where('categoryId', '==', this.currentCategory)
                        .orderBy('createdAt', 'desc')
                        .get();
                } catch (error) {
                    console.log('Ошибка с индексом для категории, загружаем без сортировки:', error);
                    snapshot = await db.collection('notes')
                        .where('userId', '==', this.currentUser.uid)
                        .where('categoryId', '==', this.currentCategory)
                        .get();
                    
                    this.notes = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })).sort((a, b) => {
                        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(a.date);
                        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(b.date);
                        return dateB - dateA;
                    });
                    
                    this.displayNotes();
                    return;
                }
            }
            
            // Если запрос прошел успешно с сортировкой
            this.notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Загружено заметок:', this.notes.length);
            this.displayNotes();
        } catch (error) {
            console.error('Общая ошибка загрузки заметок:', error);
            this.showNotification('Ошибка загрузки заметок: ' + error.message);
        }
    }

    async deleteNote(id) {
        if (!this.currentUser) return;
        
        if (!confirm('Удалить эту заметку?')) {
            return;
        }

        try {
            await db.collection('notes').doc(id).delete();
            this.showNotification('Заметка удалена');
            await this.loadNotes();
        } catch (error) {
            console.error('Ошибка удаления:', error);
            this.showNotification('Ошибка удаления заметки: ' + error.message);
        }
    }

    clearEditor() {
        const noteText = document.getElementById('note-text');
        if (noteText) {
            noteText.value = '';
            noteText.focus();
        }
    }

    displayNotes() {
        const container = document.getElementById('notes-container');
        if (!container) return;
        
        if (!this.notes || this.notes.length === 0) {
            container.innerHTML = '<div class="empty-state">Заметок пока нет. Начните писать!</div>';
            return;
        }

        const filteredNotes = this.notes.filter(note => {
            if (this.currentCategory === 'all') return true;
            if (this.currentCategory === 'uncategorized') return !note.categoryId;
            return note.categoryId === this.currentCategory;
        });

        if (filteredNotes.length === 0) {
            container.innerHTML = '<div class="empty-state">В этой категории пока нет заметок</div>';
            return;
        }

        container.innerHTML = filteredNotes.map(note => {
            const category = note.categoryId ? this.categories.find(cat => cat.id === note.categoryId) : null;
            
            return `
                <div class="note-item" style="border-left-color: ${category ? category.color : '#6b7280'}">
                    <button class="delete-btn" onclick="app.deleteNote('${note.id}')">×</button>
                    <div class="note-text">${this.escapeHtml(note.text)}</div>
                    ${category ? `<div class="note-category" style="background: ${category.color}">${this.escapeHtml(category.name)}</div>` : ''}
                    <div class="note-date">Создано: ${note.date || (note.createdAt ? new Date(note.createdAt.toDate()).toLocaleString('ru-RU') : 'Неизвестно')}</div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        // Временное решение - можно заменить на красивые toast уведомления
        console.log('Notification:', message);
        
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px var(--shadow);
            z-index: 1000;
            font-family: inherit;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Автоматически удаляем через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
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
            if (installBtn) installBtn.style.display = 'block';
        });

        if (installBtn) {
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

        window.addEventListener('appinstalled', () => {
            console.log('PWA installed');
            if (installBtn) installBtn.style.display = 'none';
            deferredPrompt = null;
        });
    }
}

// Инициализация приложения когда DOM готов
console.log('Запуск приложения...');
let app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new NotesApp();
        window.app = app; // Делаем глобально доступным для HTML onclick
    });
} else {
    app = new NotesApp();
    window.app = app; // Делаем глобально доступным для HTML onclick
}