// Управление лентой новостей

class FeedManager {
    constructor() {
        this.currentUser = null;
        this.posts = [];
        this.init();
    }

    async init() {
        // Проверка авторизации
        this.currentUser = auth.currentUser;
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Инициализация элементов
        this.setupEventListeners();
        
        // Загрузка данных
        await this.loadUserData();
        await this.loadPosts();
        
        // Обновление статуса онлайн
        this.updateOnlineStatus(true);
        
        // Обработчик выхода
        window.addEventListener('beforeunload', () => {
            this.updateOnlineStatus(false);
        });
    }

    setupEventListeners() {
        // Создание поста
        const createPostBtn = document.getElementById('createPostBtn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => this.showCreatePostModal());
        }

        // Публикация поста
        const publishPostBtn = document.getElementById('publishPostBtn');
        if (publishPostBtn) {
            publishPostBtn.addEventListener('click', () => this.createPost());
        }

        // Модальное окно
        const modalCloseBtn = document.querySelector('.modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => this.hideCreatePostModal());
        }

        const cancelPostBtn = document.getElementById('cancelPostBtn');
        if (cancelPostBtn) {
            cancelPostBtn.addEventListener('click', () => this.hideCreatePostModal());
        }

        const submitPostBtn = document.getElementById('submitPostBtn');
        if (submitPostBtn) {
            submitPostBtn.addEventListener('click', () => this.createPostFromModal());
        }

        // Добавление фото
        const addPhotoBtn = document.getElementById('addPhotoBtn');
        if (addPhotoBtn) {
            addPhotoBtn.addEventListener('click', () => this.handleAddPhoto());
        }

        // Поиск
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Мобильное меню
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.querySelector('.navbar').classList.toggle('active');
            });
        }
    }

    async loadUserData() {
        try {
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.updateUserProfileUI(userData);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
        }
    }

    updateUserProfileUI(userData) {
        // Обновление профиля в левой колонке
        const profileAvatar = document.querySelector('.profile-avatar');
        const profileName = document.querySelector('.profile-name');
        const profileBio = document.querySelector('.profile-bio');
        
        if (profileAvatar) {
            profileAvatar.src = userData.profileImage || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=4A76A8&color=fff`;
        }
        
        if (profileName) {
            profileName.textContent = userData.displayName;
        }
        
        if (profileBio) {
            profileBio.textContent = userData.bio || 'Расскажите о себе...';
        }
        
        // Обновление статистики
        if (userData.friends) {
            document.querySelectorAll('.stat-number')[0].textContent = userData.friends.length;
        }
        
        if (userData.posts) {
            document.querySelectorAll('.stat-number')[1].textContent = userData.posts.length;
        }
    }

    async loadPosts() {
        try {
            const postsContainer = document.getElementById('postsContainer');
            if (!postsContainer) return;
            
            postsContainer.innerHTML = '<div class="loading">Загрузка постов...</div>';
            
            // Загрузка постов из Firestore
            const postsSnapshot = await db.collection('posts')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            
            this.posts = [];
            postsContainer.innerHTML = '';
            
            if (postsSnapshot.empty) {
                postsContainer.innerHTML = '<div class="empty-state">Здесь пока нет постов. Будьте первым!</div>';
                return;
            }
            
            // Обработка каждого поста
            postsSnapshot.forEach(async (doc) => {
                const postData = doc.data();
                postData.id = doc.id;
                this.posts.push(postData);
                
                // Получение данных автора
                const authorData = await this.getUserData(postData.authorId);
                
                // Создание элемента поста
                const postElement = this.createPostElement(postData, authorData);
                postsContainer.appendChild(postElement);
            });
            
        } catch (error) {
            console.error('Ошибка загрузки постов:', error);
            const postsContainer = document.getElementById('postsContainer');
            if (postsContainer) {
                postsContainer.innerHTML = '<div class="error">Ошибка загрузки постов</div>';
            }
        }
    }

    async getUserData(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            return userDoc.exists ? userDoc.data() : null;
        } catch (error) {
            console.error('Ошибка получения данных пользователя:', error);
            return null;
        }
    }

    createPostElement(postData, authorData) {
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.dataset.postId = postData.id;
        
        // Форматирование времени
        const postTime = postData.createdAt ? 
            this.formatTime(postData.createdAt.toDate()) : 
            'Только что';
        
        // Создание HTML поста
        postElement.innerHTML = `
            <div class="post-header">
                <img src="${authorData?.profileImage || 'https://ui-avatars.com/api/?name=User&background=4A76A8&color=fff'}" 
                     alt="${authorData?.displayName || 'Пользователь'}" 
                     class="post-author-avatar">
                <div class="post-author-info">
                    <h4>${authorData?.displayName || 'Пользователь'}</h4>
                    <span class="post-time">${postTime}</span>
                </div>
                <button class="post-menu">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </div>
            
            <div class="post-content">
                <p>${this.escapeHtml(postData.content)}</p>
                ${postData.images && postData.images.length > 0 ? 
                    `<div class="post-images">
                        ${postData.images.map(img => 
                            `<img src="${img}" alt="Изображение" class="post-image">`
                        ).join('')}
                    </div>` : ''
                }
            </div>
            
            <div class="post-stats">
                <span class="like-count"><i class="fas fa-heart"></i> ${postData.likes?.length || 0}</span>
                <span class="comment-count"><i class="fas fa-comment"></i> ${postData.comments?.length || 0}</span>
                <span class="share-count"><i class="fas fa-share"></i> ${postData.shares || 0}</span>
            </div>
            
            <div class="post-actions">
                <button class="post-action-btn like-btn ${postData.likes?.includes(this.currentUser.uid) ? 'active' : ''}">
                    <i class="${postData.likes?.includes(this.currentUser.uid) ? 'fas' : 'far'} fa-heart"></i> Нравится
                </button>
                <button class="post-action-btn comment-btn">
                    <i class="far fa-comment"></i> Комментировать
                </button>
                <button class="post-action-btn share-btn">
                    <i class="fas fa-share"></i> Поделиться
                </button>
            </div>
            
            <div class="post-comments">
                <div class="add-comment">
                    <img src="${this.currentUser.photoURL || 'https://ui-avatars.com/api/?name=You&background=4A76A8&color=fff'}" 
                         alt="Вы" 
                         class="comment-avatar">
                    <input type="text" placeholder="Напишите комментарий..." class="comment-input">
                </div>
            </div>
        `;
        
        // Добавление обработчиков событий
        this.addPostEventListeners(postElement, postData);
        
        return postElement;
    }

    addPostEventListeners(postElement, postData) {
        // Лайк
        const likeBtn = postElement.querySelector('.like-btn');
        likeBtn.addEventListener('click', () => this.handleLike(postData.id));
        
        // Комментарий
        const commentBtn = postElement.querySelector('.comment-btn');
        const commentInput = postElement.querySelector('.comment-input');
        
        commentBtn.addEventListener('click', () => {
            commentInput.focus();
        });
        
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && commentInput.value.trim()) {
                this.addComment(postData.id, commentInput.value.trim());
                commentInput.value = '';
            }
        });
        
        // Поделиться
        const shareBtn = postElement.querySelector('.share-btn');
        shareBtn.addEventListener('click', () => this.handleShare(postData));
        
        // Меню поста
        const postMenu = postElement.querySelector('.post-menu');
        postMenu.addEventListener('click', (e) => {
            this.showPostMenu(e, postData);
        });
    }

    async handleLike(postId) {
        try {
            const postRef = db.collection('posts').doc(postId);
            const postDoc = await postRef.get();
            
            if (!postDoc.exists) return;
            
            const postData = postDoc.data();
            const likes = postData.likes || [];
            const hasLiked = likes.includes(this.currentUser.uid);
            
            // Обновление лайков
            if (hasLiked) {
                // Удаление лайка
                await postRef.update({
                    likes: firebase.firestore.FieldValue.arrayRemove(this.currentUser.uid)
                });
            } else {
                // Добавление лайка
                await postRef.update({
                    likes: firebase.firestore.FieldValue.arrayUnion(this.currentUser.uid)
                });
                
                // Создание уведомления для автора поста
                if (postData.authorId !== this.currentUser.uid) {
                    await this.createNotification(
                        postData.authorId,
                        'like',
                        'Понравился ваш пост',
                        {
                            postId: postId,
                            userId: this.currentUser.uid
                        }
                    );
                }
            }
            
            // Обновление UI
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                const likeBtn = postElement.querySelector('.like-btn');
                const likeCount = postElement.querySelector('.like-count');
                
                const newCount = hasLiked ? likes.length - 1 : likes.length + 1;
                
                likeBtn.classList.toggle('active');
                likeBtn.innerHTML = hasLiked ? 
                    '<i class="far fa-heart"></i> Нравится' : 
                    '<i class="fas fa-heart"></i> Нравится';
                
                likeCount.innerHTML = `<i class="fas fa-heart"></i> ${newCount}`;
            }
            
        } catch (error) {
            console.error('Ошибка при лайке:', error);
        }
    }

    async addComment(postId, content) {
        try {
            const comment = {
                id: this.generateId(),
                authorId: this.currentUser.uid,
                content: content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: []
            };
            
            // Добавление комментария в пост
            await db.collection('posts').doc(postId).update({
                comments: firebase.firestore.FieldValue.arrayUnion(comment)
            });
            
            // Получение данных поста для уведомления
            const postDoc = await db.collection('posts').doc(postId).get();
            const postData = postDoc.data();
            
            // Создание уведомления для автора поста
            if (postData.authorId !== this.currentUser.uid) {
                await this.createNotification(
                    postData.authorId,
                    'comment',
                    'Прокомментировал ваш пост',
                    {
                        postId: postId,
                        userId: this.currentUser.uid,
                        comment: content.substring(0, 50)
                    }
                );
            }
            
            // Обновление UI
            this.updateCommentUI(postId, comment);
            
        } catch (error) {
            console.error('Ошибка при добавлении комментария:', error);
        }
    }

    updateCommentUI(postId, comment) {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (!postElement) return;
        
        const commentsContainer = postElement.querySelector('.post-comments');
        const addComment = postElement.querySelector('.add-comment');
        
        // Создание элемента комментария
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
            <img src="${this.currentUser.photoURL || 'https://ui-avatars.com/api/?name=You&background=4A76A8&color=fff'}" 
                 alt="Вы" 
                 class="comment-avatar">
            <div class="comment-content">
                <h5>${this.currentUser.displayName || 'Вы'}</h5>
                <p>${this.escapeHtml(comment.content)}</p>
                <span class="comment-time">Только что</span>
            </div>
        `;
        
        // Вставка перед полем ввода
        commentsContainer.insertBefore(commentElement, addComment);
        
        // Обновление счетчика комментариев
        const commentCount = postElement.querySelector('.comment-count');
        const currentCount = parseInt(commentCount.textContent.match(/\d+/)[0]) || 0;
        commentCount.innerHTML = `<i class="fas fa-comment"></i> ${currentCount + 1}`;
    }

    async handleShare(postData) {
        try {
            // Создание нового поста-шаринга
            const sharePost = {
                authorId: this.currentUser.uid,
                content: `Поделился записью от ${postData.authorName || 'пользователя'}`,
                sharedPostId: postData.id,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: [],
                comments: [],
                shares: (postData.shares || 0) + 1
            };
            
            // Сохранение в Firestore
            await db.collection('posts').add(sharePost);
            
            // Обновление счетчика шарингов оригинального поста
            if (postData.id) {
                await db.collection('posts').doc(postData.id).update({
                    shares: firebase.firestore.FieldValue.increment(1)
                });
            }
            
            // Обновление UI
            const postElement = document.querySelector(`[data-post-id="${postData.id}"]`);
            if (postElement) {
                const shareCount = postElement.querySelector('.share-count');
                const currentCount = parseInt(shareCount.textContent.match(/\d+/)[0]) || 0;
                shareCount.innerHTML = `<i class="fas fa-share"></i> ${currentCount + 1}`;
            }
            
            // Показать сообщение об успехе
            this.showMessage('Запись успешно опубликована!', 'success');
            
            // Перезагрузка ленты
            setTimeout(() => {
                this.loadPosts();
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка при шаринге:', error);
            this.showMessage('Ошибка при публикации', 'error');
        }
    }

    async createPost() {
        const contentInput = document.getElementById('postContent');
        const content = contentInput.value.trim();
        
        if (!content) {
            this.showMessage('Введите текст поста', 'error');
            return;
        }
        
        try {
            const postData = {
                authorId: this.currentUser.uid,
                content: content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: [],
                comments: [],
                shares: 0,
                images: [] // Здесь можно добавить загрузку изображений
            };
            
            // Сохранение в Firestore
            await db.collection('posts').add(postData);
            
            // Очистка поля ввода
            contentInput.value = '';
            
            // Показать сообщение об успехе
            this.showMessage('Пост опубликован!', 'success');
            
            // Перезагрузка ленты
            setTimeout(() => {
                this.loadPosts();
            }, 500);
            
        } catch (error) {
            console.error('Ошибка при создании поста:', error);
            this.showMessage('Ошибка при публикации поста', 'error');
        }
    }

    async createPostFromModal() {
        const contentInput = document.getElementById('modalPostContent');
        const content = contentInput.value.trim();
        
        if (!content) {
            this.showMessage('Введите текст поста', 'error');
            return;
        }
        
        try {
            const postData = {
                authorId: this.currentUser.uid,
                content: content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: [],
                comments: [],
                shares: 0,
                images: [] // Здесь можно добавить загрузку изображений
            };
            
            // Сохранение в Firestore
            await db.collection('posts').add(postData);
            
            // Закрытие модального окна
            this.hideCreatePostModal();
            
            // Очистка поля ввода
            contentInput.value = '';
            
            // Показать сообщение об успехе
            this.showMessage('Пост опубликован!', 'success');
            
            // Перезагрузка ленты
            setTimeout(() => {
                this.loadPosts();
            }, 500);
            
        } catch (error) {
            console.error('Ошибка при создании поста:', error);
            this.showMessage('Ошибка при публикации поста', 'error');
        }
    }

    showCreatePostModal() {
        const modal = document.getElementById('createPostModal');
        if (modal) {
            modal.classList.add('show');
            document.getElementById('modalPostContent').focus();
        }
    }

    hideCreatePostModal() {
        const modal = document.getElementById('createPostModal');
        if (modal) {
            modal.classList.remove('show');
            document.getElementById('modalPostContent').value = '';
        }
    }

    async handleAddPhoto() {
        // Создание input для загрузки файла
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            
            for (const file of files) {
                await this.uploadMedia(file);
            }
        };
        
        input.click();
    }

    async uploadMedia(file) {
        try {
            // Создание ссылки в Storage
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`posts/${this.currentUser.uid}/${Date.now()}_${file.name}`);
            
            // Загрузка файла
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            // Добавление в превью
            this.addMediaToPreview(downloadURL, file.type);
            
        } catch (error) {
            console.error('Ошибка загрузки медиа:', error);
            this.showMessage('Ошибка загрузки файла', 'error');
        }
    }

    addMediaToPreview(url, type) {
        const preview = document.getElementById('mediaPreview');
        if (!preview) return;
        
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        
        if (type.startsWith('image/')) {
            mediaElement.innerHTML = `<img src="${url}" alt="Изображение">`;
        } else if (type.startsWith('video/')) {
            mediaElement.innerHTML = `<video controls><source src="${url}" type="${type}"></video>`;
        }
        
        preview.appendChild(mediaElement);
    }

    async handleSearch(query) {
        if (query.length < 2) return;
        
        try {
            // Поиск пользователей
            const usersSnapshot = await db.collection('users')
                .where('displayName', '>=', query)
                .where('displayName', '<=', query + '\uf8ff')
                .limit(10)
                .get();
            
            // Поиск постов
            const postsSnapshot = await db.collection('posts')
                .where('content', '>=', query)
                .where('content', '<=', query + '\uf8ff')
                .limit(10)
                .get();
            
            // Здесь можно отобразить результаты поиска
            console.log('Найдено пользователей:', usersSnapshot.size);
            console.log('Найдено постов:', postsSnapshot.size);
            
        } catch (error) {
            console.error('Ошибка поиска:', error);
        }
    }

    async updateOnlineStatus(isOnline) {
        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                isOnline: isOnline,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Ошибка обновления статуса:', error);
        }
    }

    async createNotification(userId, type, message, data = {}) {
        try {
            const notification = {
                userId: userId,
                type: type,
                message: message,
                data: data,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('notifications').add(notification);
            
        } catch (error) {
            console.error('Ошибка создания уведомления:', error);
        }
    }

    // Вспомогательные методы
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;
        
        if (diff < minute) {
            return 'Только что';
        } else if (diff < hour) {
            const minutes = Math.floor(diff / minute);
            return `${minutes} мин. назад`;
        } else if (diff < day) {
            const hours = Math.floor(diff / hour);
            return `${hours} ч. назад`;
        } else if (diff < week) {
            const days = Math.floor(diff / day);
            return `${days} дн. назад`;
        } else {
            return date.toLocaleDateString('ru-RU');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showMessage(message, type = 'info') {
        // Создание элемента сообщения
        const messageEl = document.createElement('div');
        messageEl.className = `notification notification-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#FF5252' : '#2196F3'};
            color: white;
            border-radius: var(--border-radius);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageEl);
        
        // Автоматическое скрытие
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(messageEl);
            }, 300);
        }, 3000);
    }

    showPostMenu(e, postData) {
        // Создание контекстного меню
        const menu = document.createElement('div');
        menu.className = 'post-context-menu';
        menu.style.cssText = `
            position: absolute;
            background: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            min-width: 200px;
        `;
        
        menu.innerHTML = `
            <button class="menu-item"><i class="fas fa-bookmark"></i> Сохранить</button>
            <button class="menu-item"><i class="fas fa-link"></i> Копировать ссылку</button>
            <div class="menu-divider"></div>
            <button class="menu-item text-danger"><i class="fas fa-flag"></i> Пожаловаться</button>
            ${postData.authorId === this.currentUser.uid ? 
                `<button class="menu-item text-danger"><i class="fas fa-trash"></i> Удалить</button>` : ''
            }
        `;
        
        // Позиционирование
        const rect = e.target.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 5}px`;
        
        document.body.appendChild(menu);
        
        // Закрытие при клике вне меню
        const closeMenu = () => {
            document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
        
        // Предотвращение закрытия при клике на меню
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Обработка действий меню
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.textContent.trim();
                this.handlePostMenuAction(action, postData);
                closeMenu();
            });
        });
    }

    async handlePostMenuAction(action, postData) {
        switch (action) {
            case 'Сохранить':
                this.savePost(postData.id);
                break;
            case 'Копировать ссылку':
                this.copyPostLink(postData.id);
                break;
            case 'Пожаловаться':
                this.reportPost(postData.id);
                break;
            case 'Удалить':
                this.deletePost(postData.id);
                break;
        }
    }

    async savePost(postId) {
        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                savedPosts: firebase.firestore.FieldValue.arrayUnion(postId)
            });
            this.showMessage('Пост сохранен', 'success');
        } catch (error) {
            console.error('Ошибка сохранения поста:', error);
            this.showMessage('Ошибка сохранения', 'error');
        }
    }

    copyPostLink(postId) {
        const link = `${window.location.origin}/post.html?id=${postId}`;
        navigator.clipboard.writeText(link)
            .then(() => this.showMessage('Ссылка скопирована', 'success'))
            .catch(() => this.showMessage('Ошибка копирования', 'error'));
    }

    async reportPost(postId) {
        // Здесь можно открыть форму жалобы
        this.showMessage('Жалоба отправлена', 'info');
    }

    async deletePost(postId) {
        if (!confirm('Удалить этот пост?')) return;
        
        try {
            await db.collection('posts').doc(postId).delete();
            this.showMessage('Пост удален', 'success');
            
            // Удаление из DOM
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.remove();
            }
            
        } catch (error) {
            console.error('Ошибка удаления поста:', error);
            this.showMessage('Ошибка удаления', 'error');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new FeedManager();
});

// Добавление CSS анимаций для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .post-context-menu {
        position: absolute;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 200px;
    }
    
    .menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        width: 100%;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .menu-item:hover {
        background: #f5f5f5;
    }
    
    .menu-divider {
        height: 1px;
        background: #e0e0e0;
        margin: 5px 0;
    }
    
    .text-danger {
        color: #ff5252;
    }
`;
document.head.appendChild(style);