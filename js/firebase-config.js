// Упрощенная конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDR0ciXxWPacEt1fYJssrS4iiK0iD_dJMk",
    authDomain: "grudas-ae943.firebaseapp.com",
    projectId: "grudas-ae943",
    storageBucket: "grudas-ae943.firebasestorage.app",
    messagingSenderId: "530748143062",
    appId: "1:530748143062:web:4a3bf053318ce23a62e077"
};

// Проверяем, инициализирован ли Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase инициализирован");
} else {
    console.log("Firebase уже инициализирован");
}

// Инициализация служб
const auth = firebase.auth();
const db = firebase.firestore();

// Включение отладки
firebase.firestore.setLogLevel('debug');

// Проверка соединения с Firebase
function checkFirebaseConnection() {
    console.log("Проверка соединения с Firebase...");
    
    // Проверяем доступность Firebase
    const testDoc = db.collection("test").doc("connection");
    
    testDoc.set({
        test: "connection_test",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("✅ Соединение с Firestore работает");
        testDoc.delete(); // Удаляем тестовый документ
    })
    .catch((error) => {
        console.error("❌ Ошибка соединения с Firestore:", error);
        showErrorMessage("Ошибка соединения с базой данных");
    });
}

// Упрощенная функция входа
async function simpleLogin(email, password) {
    console.log("Попытка входа:", email);
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("✅ Вход успешен:", userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("❌ Ошибка входа:", error);
        return { success: false, error: error.message };
    }
}

// Упрощенная функция регистрации
async function simpleRegister(email, password, username) {
    console.log("Регистрация пользователя:", email);
    
    try {
        // Создаем пользователя в Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Обновляем displayName
        await user.updateProfile({
            displayName: username
        });
        
        // Создаем документ пользователя в Firestore
        await db.collection("users").doc(user.uid).set({
            uid: user.uid,
            email: email,
            username: username,
            displayName: username,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("✅ Регистрация успешна:", user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.error("❌ Ошибка регистрации:", error);
        return { success: false, error: error.message };
    }
}

// Проверка авторизации
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("👤 Пользователь авторизован:", user.email);
        localStorage.setItem('user_uid', user.uid);
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('user_displayName', user.displayName);
    } else {
        console.log("👤 Пользователь не авторизован");
        localStorage.removeItem('user_uid');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_displayName');
    }
});

// Выход из системы
function logout() {
    auth.signOut().then(() => {
        console.log("✅ Выход выполнен");
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("❌ Ошибка выхода:", error);
    });
}

// Показать сообщение об ошибке
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-overlay';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h3>⚠️ Ошибка</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()">Закрыть</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

// CSS для сообщения об ошибке
const errorStyle = document.createElement('style');
errorStyle.textContent = `
    .error-message-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .error-content {
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    
    .error-content h3 {
        color: #e74c3c;
        margin-bottom: 15px;
    }
    
    .error-content button {
        margin-top: 20px;
        padding: 10px 30px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
`;

document.head.appendChild(errorStyle);

// Проверяем соединение при загрузке страницы
window.addEventListener('load', () => {
    console.log("Страница загружена, проверяем Firebase...");
    setTimeout(checkFirebaseConnection, 1000);
});

// Экспортируем функции для использования
window.simpleLogin = simpleLogin;
window.simpleRegister = simpleRegister;
window.logout = logout;
window.auth = auth;
window.db = db;
window.firebase = firebase;
