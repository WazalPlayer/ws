// Упрощенный менеджер аутентификации
class SimpleAuthManager {
    constructor() {
        this.init();
    }

    init() {
        console.log("SimpleAuthManager инициализирован");
        
        // Переключение видимости пароля
        this.setupPasswordToggle();
        
        // Обработка форм
        this.setupForms();
        
        // Проверяем, авторизован ли пользователь
        this.checkAuthState();
    }

    setupPasswordToggle() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const input = this.parentElement.querySelector('input');
                const icon = this.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    setupForms() {
        // Форма входа
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log("Найдена форма входа");
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Форма регистрации
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            console.log("Найдена форма регистрации");
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showMessage(message, type = 'info', elementId = null) {
        console.log(`Сообщение [${type}]: ${message}`);
        
        const element = elementId ? document.getElementById(elementId) : document.querySelector('.status-message');
        if (element) {
            element.textContent = message;
            element.className = `status-message status-${type}`;
            element.style.display = 'block';
            
            // Автоматическое скрытие
            if (type === 'success') {
                setTimeout(() => {
                    element.style.display = 'none';
                }, 3000);
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log("Обработка входа...");
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Простая валидация
        if (!email || !password) {
            this.showMessage('Заполните все поля', 'error', 'loginStatus');
            return;
        }
        
        this.showLoading(true);
        
        try {
            console.log("Попытка входа с email:", email);
            const result = await window.simpleLogin(email, password);
            
            if (result.success) {
                this.showMessage('Вход выполнен успешно!', 'success', 'loginStatus');
                console.log("Перенаправление на feed.html...");
                
                // Перенаправление через 1 секунду
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 1000);
            } else {
                this.showMessage(`Ошибка: ${result.error}`, 'error', 'loginStatus');
                this.showLoading(false);
            }
            
        } catch (error) {
            console.error("Критическая ошибка входа:", error);
            this.showMessage('Произошла ошибка при входе', 'error', 'loginStatus');
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        console.log("Обработка регистрации...");
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        
        // Простая валидация
        if (!username || !email || !password || !confirmPassword) {
            this.showMessage('Заполните все поля', 'error', 'registerStatus');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showMessage('Пароли не совпадают', 'error', 'registerStatus');
            return;
        }
        
        if (password.length < 6) {
            this.showMessage('Пароль должен быть не менее 6 символов', 'error', 'registerStatus');
            return;
        }
        
        this.showLoading(true);
        
        try {
            console.log("Регистрация пользователя:", email);
            const result = await window.simpleRegister(email, password, username);
            
            if (result.success) {
                this.showMessage('Регистрация успешна!', 'success', 'registerStatus');
                console.log("Перенаправление на feed.html...");
                
                // Перенаправление через 2 секунды
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 2000);
            } else {
                this.showMessage(`Ошибка: ${result.error}`, 'error', 'registerStatus');
                this.showLoading(false);
            }
            
        } catch (error) {
            console.error("Критическая ошибка регистрации:", error);
            this.showMessage('Произошла ошибка при регистрации', 'error', 'registerStatus');
            this.showLoading(false);
        }
    }

    async handleLogout() {
        try {
            console.log("Выход из системы...");
            await window.logout();
        } catch (error) {
            console.error("Ошибка выхода:", error);
            this.showMessage('Ошибка при выходе', 'error');
        }
    }

    checkAuthState() {
        // Проверка состояния при загрузке страницы
        const currentPage = window.location.pathname.split('/').pop();
        
        // Если пользователь уже авторизован и пытается зайти на login/register
        if (auth.currentUser && (currentPage === 'login.html' || currentPage === 'register.html')) {
            console.log("Пользователь уже авторизован, перенаправление...");
            window.location.href = 'feed.html';
        }
        
        // Если пользователь не авторизован и пытается зайти на защищенную страницу
        const protectedPages = ['feed.html', 'profile.html', 'messages.html', 'friends.html', 'settings.html'];
        if (!auth.currentUser && protectedPages.includes(currentPage)) {
            console.log("Пользователь не авторизован, перенаправление на логин...");
            window.location.href = 'login.html';
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM загружен, инициализация SimpleAuthManager...");
    new SimpleAuthManager();
});
