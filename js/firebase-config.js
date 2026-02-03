// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyDR0ciXxWPacEt1fYJssrS4iiK0iD_dJMk",
    authDomain: "grudas-ae943.firebaseapp.com",
    databaseURL: "https://grudas-ae943-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "grudas-ae943",
    storageBucket: "grudas-ae943.firebasestorage.app",
    messagingSenderId: "530748143062",
    appId: "1:530748143062:web:4a3bf053318ce23a62e077",
    measurementId: "G-467DX15JST"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Инициализация служб
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.functions();

// Экспорт для использования в других файлах
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;
window.functions = functions;

// Настройка Firestore
db.settings({
    timestampsInSnapshots: true
});

// Инициализация Analytics
if (firebase.analytics) {
    const analytics = firebase.analytics();
    window.analytics = analytics;
}

console.log('Firebase инициализирован');

// Обработчик состояния авторизации
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Пользователь вошел:', user.email);
        updateUserUI(user);
    } else {
        console.log('Пользователь вышел');
        updateUserUI(null);
    }
});

// Обновление UI в зависимости от состояния пользователя
function updateUserUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userDropdown = document.getElementById('userDropdown');
    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-name');
    
    if (user) {
        // Пользователь вошел
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userDropdown) userDropdown.style.display = 'block';
        
        // Обновление информации о пользователе
        if (userAvatar && user.photoURL) {
            userAvatar.src = user.photoURL;
        } else if (userAvatar && user.displayName) {
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=4A76A8&color=fff`;
        }
        
        if (userName && user.displayName) {
            userName.textContent = user.displayName;
        }
        
        // Сохранение данных пользователя в localStorage
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));
    } else {
        // Пользователь вышел
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userDropdown) userDropdown.style.display = 'none';
        
        // Очистка localStorage
        localStorage.removeItem('user');
        
        // Перенаправление на страницу входа если на защищенной странице
        const protectedPages = ['feed.html', 'profile.html', 'messages.html', 'friends.html', 'settings.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
}

// Проверка авторизации при загрузке страницы
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user && (currentPage === 'login.html' || currentPage === 'register.html' || currentPage === 'index.html')) {
        // Пользователь уже вошел, перенаправляем на ленту
        window.location.href = 'feed.html';
    }
}

// Вызов проверки при загрузке
document.addEventListener('DOMContentLoaded', checkAuth);