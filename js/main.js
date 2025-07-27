document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const lockScreen = document.getElementById('lock-screen');
    const mainScreen = document.getElementById('main-screen');
    const masterPasswordInput = document.getElementById('master-password-input');
    const passwordStrengthDiv = document.getElementById('password-strength');
    const passwordStrengthBar = document.getElementById('password-strength-bar');
    const passwordStrengthText = document.getElementById('password-strength-text');
    const unlockButton = document.getElementById('unlock-button');
    const destroyDataButton = document.getElementById('destroy-data-button');
    const unlockErrorMessage = document.getElementById('unlock-error-message');

    const lockButton = document.getElementById('lock-button');
    const searchInput = document.getElementById('search-input');
    const addPasswordButton = document.getElementById('add-password-button');
    const passwordList = document.getElementById('password-list');

    const addPasswordModal = document.getElementById('add-password-modal');
    const serviceNameInput = document.getElementById('service-name-input');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const saveButton = document.getElementById('save-button');
    const cancelButton = document.getElementById('cancel-button');

    const changeMasterPasswordButton = document.getElementById('change-master-password-button');
    const changeMasterPasswordModal = document.getElementById('change-master-password-modal');
    const currentMasterPasswordInput = document.getElementById('current-master-password-input');
    const newMasterPasswordInput = document.getElementById('new-master-password-input');
    const newPasswordStrengthDiv = document.getElementById('new-password-strength');
    const newPasswordStrengthBar = document.getElementById('new-password-strength-bar');
    const newPasswordStrengthText = document.getElementById('new-password-strength-text');
    const confirmNewMasterPasswordInput = document.getElementById('confirm-new-master-password-input');
    const saveNewMasterPasswordButton = document.getElementById('save-new-master-password-button');
    const cancelChangeMasterPasswordButton = document.getElementById('cancel-change-master-password-button');

    // DOM要素の取得 (追加分)
    const downloadButton = document.getElementById('download-button');
    const uploadButton = document.getElementById('upload-button');
    const importPasswordModal = document.getElementById('import-password-modal');
    const importFileInput = document.getElementById('import-file-input');
    const importMasterPasswordInput = document.getElementById('import-master-password-input');
    const confirmImportButton = document.getElementById('confirm-import-button');
    const cancelImportButton = document.getElementById('cancel-import-button');
    const importErrorMessage = document.getElementById('import-error-message');

    let masterPassword = '';
    let passwords = [];
    const MAX_ATTEMPTS = 10;

    // --- UIユーティリティ関数 ---
    function toggleCollapsible(id) {
        const element = document.getElementById(id);
        element.classList.toggle('active');
    }

    function showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    function hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    function showError(message, targetElement = unlockErrorMessage) {
        targetElement.textContent = message;
        targetElement.style.display = 'block';
        setTimeout(() => {
            targetElement.style.display = 'none';
        }, 3000);
    }

    function clearModalInputs(modalId) {
        const modal = document.getElementById(modalId);
        modal.querySelectorAll('input').forEach(input => {
            input.value = '';
        });
        modal.querySelectorAll('.password-strength').forEach(strength => {
            strength.classList.remove('visible');
        });
    }

    // --- ダウンロード機能 ---
    async function exportPasswords() {
        if (passwords.length === 0) {
            alert('保存されたパスワードがありません。');
            return;
        }
        const encryptedData = await encrypt(JSON.stringify(passwords), masterPassword);
        const blob = new Blob([encryptedData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `localpass_export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('パスワードデータをダウンロードしました。');
    }

    // --- アップロード機能 ---
    async function importPasswords() {
        const file = importFileInput.files[0];
        const importPassword = importMasterPasswordInput.value;

        if (!file) {
            showError('ファイルを選択してください。', importErrorMessage);
            return;
        }
        if (!importPassword) {
            showError('マスターパスワードを入力してください。', importErrorMessage);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const encryptedData = event.target.result;
                const decryptedData = await decrypt(encryptedData, importPassword);

                if (decryptedData) {
                    const importedPasswords = JSON.parse(decryptedData);
                    if (!Array.isArray(importedPasswords)) {
                        throw new Error('インポートされたデータ形式が不正です。');
                    }
                    // 既存のパスワードとマージするか、上書きするかはユーザーの選択によるが、今回は上書き
                    passwords = importedPasswords;
                    await saveData();
                    displayPasswords();
                    hideModal('import-password-modal');
                    alert('パスワードデータをインポートしました。');
                } else {
                    showError('マスターパスワードが違います、またはファイルが破損しています。', importErrorMessage);
                }
            } catch (e) {
                console.error('インポートエラー:', e);
                showError('ファイルの読み込みまたは復号に失敗しました。', importErrorMessage);
            }
        };
        reader.readAsText(file);
    }

    // --- パスワード強度チェック ---
    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        return score;
    }

    function updatePasswordStrength(password, barElement, textElement, divElement) {
        if (password.length === 0) {
            divElement.classList.remove('visible');
            return;
        }
        divElement.classList.add('visible');

        let score = checkPasswordStrength(password);
        let width = Math.min(score * 20, 100);
        let strengthText = '非常に弱い';
        let className = '';

        if (score >= 3) { strengthText = '弱い'; }
        if (score >= 4) { strengthText = '普通'; className = 'medium'; }
        if (score >= 5) { strengthText = '強い'; className = 'strong'; }
        if (score >= 6) { strengthText = '非常に強い'; className = 'strong'; }

        barElement.style.width = width + '%';
        barElement.className = 'strength-progress ' + className;
        textElement.textContent = strengthText;
    }

    // --- ロック解除失敗処理 ---
    function handleUnlockFailure() {
        let attempts = parseInt(sessionStorage.getItem('unlockAttempts') || '0', 10);
        attempts++;
        sessionStorage.setItem('unlockAttempts', attempts);

        if (attempts >= MAX_ATTEMPTS) {
            showError(`マスターパスワードを${MAX_ATTEMPTS}回間違えました。データを完全に削除します。`);
            setTimeout(destroyAllData, 2000);
        } else {
            showError(`マスターパスワードが違います。残り試行回数: ${MAX_ATTEMPTS - attempts}回`);
        }
    }

    // --- データ全削除処理 ---
    function destroyAllData() {
        localStorage.removeItem('passwordManagerData');
        localStorage.removeItem('passwordManagerSetupComplete');
        sessionStorage.removeItem('unlockAttempts');
        alert('全てのデータが削除されました。ページをリロードします。');
        location.reload();
    }
    
    destroyDataButton.addEventListener('click', () => {
        if (confirm('本当に全てのデータを完全に削除しますか？この操作は元に戻せません。')) {
            if (confirm('最終確認です。本当に全てのデータを削除してもよろしいですか？')) {
                destroyAllData();
            }
        }
    });

    // --- 画面表示切替 ---
    function showMainScreen() {
        lockScreen.style.display = 'none';
        mainScreen.style.display = 'block';
        displayPasswords();
    }

    function showLockScreen() {
        lockScreen.style.display = 'block';
        mainScreen.style.display = 'none';
        masterPassword = '';
        passwords = [];
        passwordList.innerHTML = '';
        initLockScreen();
    }

    // --- データの保存・表示 ---
    async function saveData() {
        const encryptedData = await encrypt(JSON.stringify(passwords), masterPassword);
        localStorage.setItem('passwordManagerData', encryptedData);
    }

    function displayPasswords(filter = '') {
        passwordList.innerHTML = '';
        const filteredPasswords = passwords.filter(p => p.service.toLowerCase().includes(filter.toLowerCase()));

        if (filteredPasswords.length === 0) {
            passwordList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🔍</span>
                    <p>${passwords.length === 0 ? 'まだパスワードが登録されていません' : '該当するパスワードが見つかりません'}</p>
                </div>
            `;
            return;
        }

        passwordList.innerHTML = filteredPasswords.map((password, index) => `
            <div class="password-item">
                <div class="password-info">
                    <div class="service-name">${password.service}</div>
                    <div class="username">${password.username}</div>
                    <div class="password-value" id="password-${index}" style="display: none;">
                        ${password.password}
                    </div>
                </div>
                <div class="password-controls">
                    <button class="btn btn-secondary btn-icon show-hide-btn" data-index="${index}" title="表示/非表示">
                        👁️
                    </button>
                    <button class="btn btn-primary btn-icon copy-btn" data-index="${index}" title="コピー">
                        📋
                    </button>
                    <button class="btn btn-danger btn-icon delete-btn" data-index="${index}" title="削除">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    // --- イベントリスナー設定 ---

    // ロック解除 / 新規設定ボタン
    unlockButton.addEventListener('click', async () => {
        const inputPassword = masterPasswordInput.value;
        if (inputPassword.length === 0) {
            showError('マスターパスワードを入力してください。');
            return;
        }

        const isSetupComplete = localStorage.getItem('passwordManagerSetupComplete') === 'true';

        if (isSetupComplete) { // セットアップ済みの場合：ロック解除
            const encryptedData = localStorage.getItem('passwordManagerData');
            const decryptedData = await decrypt(encryptedData, inputPassword);
            if (decryptedData) {
                sessionStorage.removeItem('unlockAttempts');
                masterPassword = inputPassword;
                passwords = JSON.parse(decryptedData);
                showMainScreen();
            } else {
                handleUnlockFailure();
            }
        } else { // 未セットアップの場合：新規設定
            if (checkPasswordStrength(inputPassword) < 4) {
                showError('パスワードが弱すぎます。より強力なパスワードを設定してください。');
                return;
            }
            masterPassword = inputPassword;
            passwords = [];
            await saveData();
            localStorage.setItem('passwordManagerSetupComplete', 'true'); // セットアップ完了フラグを立てる
            showMainScreen();
        }
    });

    // ロックボタン
    lockButton.addEventListener('click', showLockScreen);

    // 検索
    searchInput.addEventListener('input', () => displayPasswords(searchInput.value));

    // パスワードリストの操作（イベント委任）
    passwordList.addEventListener('click', async (e) => {
        const target = e.target;
        const index = target.dataset.index;
        if (index === undefined) return;

        const passwordItem = passwords[index];

        if (target.classList.contains('show-hide-btn')) {
            const passwordValueElement = document.getElementById(`password-${index}`);
            if (passwordValueElement.style.display === 'none') {
                passwordValueElement.style.display = 'block';
                target.innerHTML = '🙈';
            } else {
                passwordValueElement.style.display = 'none';
                target.innerHTML = '👁️';
            }
        } else if (target.classList.contains('copy-btn')) {
            try {
                await navigator.clipboard.writeText(passwordItem.password);
                target.textContent = 'コピーしました!';
                setTimeout(() => { target.textContent = '📋'; }, 1500);
            } catch (err) {
                alert('クリップボードへのコピーに失敗しました。');
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm(`「${passwordItem.service}」のパスワードを本当に削除しますか？`)) {
                passwords.splice(index, 1);
                await saveData();
                displayPasswords(searchInput.value);
            }
        }
    });

    // 新規パスワード追加モーダル
    addPasswordButton.addEventListener('click', () => {
        showModal('add-password-modal');
        clearModalInputs('add-password-modal');
    });
    cancelButton.addEventListener('click', () => hideModal('add-password-modal'));
    saveButton.addEventListener('click', async () => {
        const service = serviceNameInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!service || !password) {
            alert('サービス名とパスワードは必須です。');
            return;
        }
        passwords.push({ service, username, password });
        await saveData();
        displayPasswords(searchInput.value);
        hideModal('add-password-modal');
    });

    // マスターパスワード変更モーダル
    changeMasterPasswordButton.addEventListener('click', () => {
        showModal('change-master-password-modal');
        clearModalInputs('change-master-password-modal');
    });
    cancelChangeMasterPasswordButton.addEventListener('click', () => hideModal('change-master-password-modal'));
    newMasterPasswordInput.addEventListener('input', () => {
        updatePasswordStrength(newMasterPasswordInput.value, newPasswordStrengthBar, newPasswordStrengthText, newPasswordStrengthDiv);
    });
    saveNewMasterPasswordButton.addEventListener('click', async () => {
        const currentPassword = currentMasterPasswordInput.value;
        const newPassword = newMasterPasswordInput.value;
        const confirmPassword = confirmNewMasterPasswordInput.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('全ての項目を入力してください。');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('新しいパスワードが一致しません。');
            return;
        }
        if (checkPasswordStrength(newPassword) < 4) {
            alert('新しいパスワードが弱すぎます。');
            return;
        }
        
        const encryptedData = localStorage.getItem('passwordManagerData');
        const decryptedData = await decrypt(encryptedData, currentPassword);

        if (decryptedData) {
            masterPassword = newPassword;
            passwords = JSON.parse(decryptedData);
            await saveData();
            alert('マスターパスワードが変更されました。');
            hideModal('change-master-password-modal');
        } else {
            alert('現在のマスターパスワードが違います。');
        }
    });

    // モーダル外クリックで閉じる
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });

    // 折りたたみ可能なセクションのイベントリスナー
    document.getElementById('usage-info').querySelector('.collapsible-header').addEventListener('click', () => {
        toggleCollapsible('usage-info');
    });
    document.getElementById('usage-guide').querySelector('.collapsible-header').addEventListener('click', () => {
        toggleCollapsible('usage-guide');
    });

    // Enterキーでの操作
    masterPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            unlockButton.click();
        }
    });

    // ダウンロード・アップロードボタンのイベントリスナー
    downloadButton.addEventListener('click', exportPasswords);
    uploadButton.addEventListener('click', () => {
        showModal('import-password-modal');
        clearModalInputs('import-password-modal');
        importErrorMessage.style.display = 'none'; // エラーメッセージを非表示に
    });
    confirmImportButton.addEventListener('click', importPasswords);
    cancelImportButton.addEventListener('click', () => hideModal('import-password-modal'));

    // --- 初期化処理 ---
    const masterPasswordStrengthListener = () => {
        updatePasswordStrength(masterPasswordInput.value, passwordStrengthBar, passwordStrengthText, passwordStrengthDiv);
    };

    function initLockScreen() {
        masterPasswordInput.value = '';
        unlockErrorMessage.textContent = '';
        
        const isSetupComplete = localStorage.getItem('passwordManagerSetupComplete') === 'true';

        if (isSetupComplete) {
            unlockButton.innerHTML = '🔑 ロック解除';
            destroyDataButton.style.display = 'inline-flex'; // flexに変更
            passwordStrengthDiv.classList.remove('visible');
            masterPasswordInput.removeEventListener('input', masterPasswordStrengthListener);
        } else {
            unlockButton.innerHTML = '🔑 マスターパスワードを設定';
            destroyDataButton.style.display = 'none';
            passwordStrengthDiv.classList.remove('visible');
            masterPasswordInput.addEventListener('input', masterPasswordStrengthListener);
        }
    }

    initLockScreen();
});