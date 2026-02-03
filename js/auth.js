// Аутентификация пользователей

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Переключение видимости пароля
        this.setupPasswordToggle();
        // Обработка форм
        this.setupForms();
        // Проверка авторизации
        this.checkAuthState();
    }

    setupPasswordToggle() {
        // Переключение видимости пароля
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
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Форма регистрации
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Google вход
        const googleLoginBtn = document.getElementById('googleLogin');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.signInWithGoogle());
        }

        // Facebook вход
        const facebookLoginBtn = document.getElementById('facebookLogin');
        if (facebookLoginBtn) {
            facebookLoginBtn.addEventListener('click', () => this.signInWithFacebook());
        }
    }

    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showMessage(message, type = 'info', elementId = null) {
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

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return password.length >= 6;
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        
        // Валидация
        if (!this.validateEmail(email)) {
            this.showMessage('Введите корректный email', 'error', 'emailError');
            return;
        }
        
        if (!this.validatePassword(password)) {
            this.showMessage('Пароль должен содержать минимум 6 символов', 'error', 'passwordError');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Настройка persistence
            const persistence = rememberMe ? 
                firebase.auth.Auth.Persistence.LOCAL : 
                firebase.auth.Auth.Persistence.SESSION;
            
            await auth.setPersistence(persistence);
            
            // Вход пользователя
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Получение данных пользователя из Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Обновление профиля Firebase
                if (userData.displayName !== user.displayName) {
                    await user.updateProfile({
                        displayName: userData.displayName
                    });
                }
                
                this.showMessage('Вход выполнен успешно!', 'success', 'loginStatus');
                
                // Перенаправление на ленту через 1 секунду
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 1000);
            } else {
                // Создание документа пользователя если его нет
                await this.createUserDocument(user);
                this.showMessage('Добро пожаловать!', 'success', 'loginStatus');
                
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 1000);
            }
            
        } catch (error) {
            console.error('Ошибка входа:', error);
            
            let errorMessage = 'Ошибка входа';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Пользователь не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Неверный пароль';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Аккаунт отключен';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Слишком много попыток. Попробуйте позже';
                    break;
            }
            
            this.showMessage(errorMessage, 'error', 'loginStatus');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const terms = document.getElementById('terms').checked;
        
        // Валидация
        let isValid = true;
        
        if (username.length < 3 || username.length > 30) {
            this.showMessage('Имя пользователя должно быть от 3 до 30 символов', 'error', 'usernameError');
            isValid = false;
        }
        
        if (!fullName) {
            this.showMessage('Введите полное имя', 'error', 'fullNameError');
            isValid = false;
        }
        
        if (!this.validateEmail(email)) {
            this.showMessage('Введите корректный email', 'error', 'emailError');
            isValid = false;
        }
        
        if (!this.validatePassword(password)) {
            this.showMessage('Пароль должен содержать минимум 6 символов', 'error', 'passwordError');
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            this.showMessage('Пароли не совпадают', 'error', 'confirmPasswordError');
            isValid = false;
        }
        
        if (!terms) {
            this.showMessage('Необходимо согласиться с условиями', 'error', 'termsError');
            isValid = false;
        }
        
        if (!isValid) return;
        
        this.showLoading(true);
        
        try {
            // Проверка уникальности имени пользователя
            const usernameQuery = await db.collection('users')
                .where('username', '==', username.toLowerCase())
                .get();
            
            if (!usernameQuery.empty) {
                throw new Error('Имя пользователя уже занято');
            }
            
            // Создание пользователя в Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Обновление профиля
            await user.updateProfile({
                displayName: fullName
            });
            
            // Создание документа пользователя в Firestore
            await this.createUserDocument(user, username, fullName);
            
            // Отправка email подтверждения
            await user.sendEmailVerification();
            
            this.showMessage('Регистрация успешна! Проверьте email для подтверждения.', 'success', 'registerStatus');
            
            // Перенаправление на ленту через 2 секунды
            setTimeout(() => {
                window.location.href = 'feed.html';
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            
            let errorMessage = 'Ошибка регистрации';
            switch (error.message) {
                case 'Имя пользователя уже занято':
                    errorMessage = 'Это имя пользователя уже занято';
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = 'Email уже используется';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Пароль слишком слабый';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Регистрация временно отключена';
                    break;
            }
            
            this.showMessage(errorMessage, 'error', 'registerStatus');
        } finally {
            this.showLoading(false);
        }
    }

    async createUserDocument(user, username = null, fullName = null) {
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: fullName || user.displayName || 'Пользователь',
            username: username?.toLowerCase() || user.email.split('@')[0],
            fullName: fullName || user.displayName || 'Пользователь',
            bio: '',
            profileImage: user.photoURL || '',
            backgroundImage: '',
            friends: [],
            followers: [],
            following: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true,
            isPrivate: false,
            settings: {
                notifications: true,
                emailNotifications: true,
                privacy: 'public'
            }
        };
        
        await db.collection('users').doc(user.uid).set(userData);
        
        return userData;
    }

    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            
            // Проверка существования пользователя в Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Создание нового пользователя
                await this.createUserDocument(user, user.email.split('@')[0], user.displayName);
            }
            
            this.showMessage('Вход через Google выполнен!', 'success');
            
            setTimeout(() => {
                window.location.href = 'feed.html';
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка входа через Google:', error);
            this.showMessage('Ошибка входа через Google', 'error');
        }
    }

    async signInWithFacebook() {
        try {
            const provider = new firebase.auth.FacebookAuthProvider();
            provider.addScope('email');
            provider.addScope('public_profile');
            
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            
            // Проверка существования пользователя в Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Создание нового пользователя
                await this.createUserDocument(user, user.email?.split('@')[0] || 'user', user.displayName);
            }
            
            this.showMessage('Вход через Facebook выполнен!', 'success');
            
            setTimeout(() => {
                window.location.href = 'feed.html';
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка входа через Facebook:', error);
            this.showMessage('Ошибка входа через Facebook', 'error');
        }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            this.showMessage('Вы успешно вышли', 'success');
            
            // Перенаправление на главную
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка выхода:', error);
            this.showMessage('Ошибка при выходе', 'error');
        }
    }

    checkAuthState() {
        // Проверка состояния авторизации при загрузке страницы
        auth.onAuthStateChanged((user) => {
            const currentPage = window.location.pathname.split('/').pop();
            
            if (user && (currentPage === 'login.html' || currentPage === 'register.html')) {
                // Пользователь уже вошел, перенаправляем на ленту
                window.location.href = 'feed.html';
            } else if (!user && currentPage === 'feed.html') {
                // Пользователь не вошел, перенаправляем на вход
                window.location.href = 'login.html';
            }
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});