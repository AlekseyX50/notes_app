// firebase-config.js - БЕЗОПАСНАЯ ВЕРСИЯ
console.log('🔥 Loading Firebase configuration...');

// Функция для безопасной инициализации Firebase
function initializeFirebase() {
    try {
        // Проверяем, передан ли конфиг через window
        if (!window.FIREBASE_CONFIG) {
            throw new Error('Firebase configuration not found. Please check your config files.');
        }

        const config = window.FIREBASE_CONFIG;
        
        // Валидация конфигурации
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required Firebase fields: ${missingFields.join(', ')}`);
        }

        // Проверяем, не demo ли конфиг
        if (config.apiKey.includes('demo') || config.projectId.includes('demo')) {
            console.warn('⚠️ Using demo Firebase config - app will not work with real data');
        }

        // Инициализируем Firebase
        firebase.initializeApp(config);
        
        // Создаем глобальные переменные для доступа из app.js
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        
        console.log('✅ Firebase successfully initialized');
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        showFirebaseError(error.message);
    }
}

// Функция показа ошибки
function showFirebaseError(message) {
    // Создаем красивый баннер ошибки
    const errorBanner = document.createElement('div');
    errorBanner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 15px 20px;
        text-align: center;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border-bottom: 1px solid #fca5a5;
    `;
    
    errorBanner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto;">
            <div style="flex: 1; text-align: left;">
                <strong>🔥 Ошибка конфигурации Firebase</strong>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: rgba(255,255,255,0.2); 
                           border: 1px solid rgba(255,255,255,0.3); 
                           color: white; 
                           padding: 8px 12px; 
                           border-radius: 6px; 
                           cursor: pointer; 
                           font-size: 16px;">
                ×
            </button>
        </div>
    `;
    
    document.body.appendChild(errorBanner);
}

// Запускаем инициализацию когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}