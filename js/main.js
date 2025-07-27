
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

    let masterPassword = '';
    let passwords = [];
    const MAX_ATTEMPTS = 10;

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

    function updatePasswordStrengthUI(score, barElement, textElement, divElement) {
        divElement.style.display = 'block';
        let strengthText = '非常に弱い';
        let barColor = '#dc3545';
        let barWidth = '20%';

        if (score >= 2) { strengthText = '弱い'; barWidth = '40%'; barColor = '#ffc107'; }
        if (score >= 4) { strengthText = '普通'; barWidth = '60%'; barColor = '#ffc107'; }
        if (score >= 5) { strengthText = '強い'; barWidth = '80%'; barColor = '#28a745'; }
        if (score >= 6) { strengthText = '非常に強い'; barWidth = '100%'; barColor = '#28a745'; }

        textElement.textContent = strengthText;
        barElement.style.width = barWidth;
        barElement.style.backgroundColor = barColor;
    }

    // --- ロック解除失敗処理 ---
    function handleUnlockFailure() {
        let attempts = parseInt(sessionStorage.getItem('unlockAttempts') || '0', 10);
        attempts++;
        sessionStorage.setItem('unlockAttempts', attempts);

        if (attempts >= MAX_ATTEMPTS) {
            unlockErrorMessage.textContent = `マスターパスワードを${MAX_ATTEMPTS}回間違えました。データを完全に削除します。`;
            setTimeout(destroyAllData, 2000);
        } else {
            unlockErrorMessage.textContent = `マスターパスワードが違います。残り試行回数: ${MAX_ATTEMPTS - attempts}回`;
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

        if (filteredPasswords.length === 0 && passwords.length > 0) {
            const li = document.createElement('li');
            li.textContent = '該当するパスワードが見つかりません。';
            li.style.textAlign = 'center';
            passwordList.appendChild(li);
            return;
        }
        if (passwords.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'まだパスワードが登録されていません。「新規追加」から登録してください。';
            li.style.textAlign = 'center';
            passwordList.appendChild(li);
            return;
        }

        filteredPasswords.forEach((password) => {
            const li = document.createElement('li');
            const originalIndex = passwords.indexOf(password);
            li.dataset.index = originalIndex;

            li.innerHTML = `
                <span class="service-username">${password.service} (${password.username})</span>
                <div class="controls">
                    <button class="show-hide-btn" title="パスワードを表示/非表示します">👁️</button>
                    <button class="copy-btn" title="パスワードをクリップボードにコピーします">📋</button>
                    <button class="delete-btn" title="このパスワードを削除します">🗑️</button>
                </div>
            `;
            passwordList.appendChild(li);
        });
    }

    // --- イベントリスナー設定 ---

    // ロック解除 / 新規設定ボタン
    unlockButton.addEventListener('click', async () => {
        const inputPassword = masterPasswordInput.value;
        if (inputPassword.length === 0) {
            unlockErrorMessage.textContent = 'マスターパスワードを入力してください。';
            return;
        }
        unlockErrorMessage.textContent = '';

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
                unlockErrorMessage.textContent = 'パスワードが弱すぎます。より強力なパスワードを設定してください。';
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
        const li = target.closest('li');
        if (!li || !li.dataset.index) return;

        const index = parseInt(li.dataset.index, 10);
        if (isNaN(index) || index < 0 || index >= passwords.length) return;

        if (target.classList.contains('show-hide-btn')) {
            const serviceUsernameSpan = li.querySelector('.service-username');
            const passwordValueSpan = serviceUsernameSpan.querySelector('.password-value');
            if (passwordValueSpan) {
                passwordValueSpan.remove();
                target.innerHTML = '👁️';
            } else {
                const passwordValue = passwords[index].password;
                const span = document.createElement('span');
                span.className = 'password-value';
                span.textContent = ` : ${passwordValue}`;
                serviceUsernameSpan.appendChild(span);
                target.innerHTML = '🙈';
            }
        } else if (target.classList.contains('copy-btn')) {
            try {
                await navigator.clipboard.writeText(passwords[index].password);
                target.textContent = 'コピーしました!';
                setTimeout(() => { target.textContent = '📋'; }, 1500);
            } catch (err) {
                alert('クリップボードへのコピーに失敗しました。');
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm(`「${passwords[index].service}」のパスワードを本当に削除しますか？`)) {
                passwords.splice(index, 1);
                await saveData();
                displayPasswords(searchInput.value);
            }
        }
    });

    // 新規パスワード追加モーダル
    addPasswordButton.addEventListener('click', () => {
        addPasswordModal.style.display = 'block';
        serviceNameInput.value = '';
        usernameInput.value = '';
        passwordInput.value = '';
    });
    cancelButton.addEventListener('click', () => addPasswordModal.style.display = 'none');
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
        addPasswordModal.style.display = 'none';
    });

    // マスターパスワード変更モーダル
    changeMasterPasswordButton.addEventListener('click', () => {
        changeMasterPasswordModal.style.display = 'block';
        currentMasterPasswordInput.value = '';
        newMasterPasswordInput.value = '';
        confirmNewMasterPasswordInput.value = '';
        newPasswordStrengthDiv.style.display = 'none';
    });
    cancelChangeMasterPasswordButton.addEventListener('click', () => changeMasterPasswordModal.style.display = 'none');
    newMasterPasswordInput.addEventListener('input', () => {
        const password = newMasterPasswordInput.value;
        if (password.length > 0) {
            const strength = checkPasswordStrength(password);
            updatePasswordStrengthUI(strength, newPasswordStrengthBar, newPasswordStrengthText, newPasswordStrengthDiv);
        } else {
            newPasswordStrengthDiv.style.display = 'none';
        }
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
            changeMasterPasswordModal.style.display = 'none';
        } else {
            alert('現在のマスターパスワードが違います。');
        }
    });

    // --- 初期化処理 ---
    const masterPasswordStrengthListener = () => {
        const password = masterPasswordInput.value;
        if (password.length > 0) {
            const strength = checkPasswordStrength(password);
            updatePasswordStrengthUI(strength, passwordStrengthBar, passwordStrengthText, passwordStrengthDiv);
        } else {
            passwordStrengthDiv.style.display = 'none';
        }
    };

    function initLockScreen() {
        masterPasswordInput.value = '';
        unlockErrorMessage.textContent = '';
        
        const isSetupComplete = localStorage.getItem('passwordManagerSetupComplete') === 'true';

        if (isSetupComplete) {
            unlockButton.innerHTML = '🔑 ロック解除';
            destroyDataButton.style.display = 'inline-block';
            passwordStrengthDiv.style.display = 'none';
            masterPasswordInput.removeEventListener('input', masterPasswordStrengthListener);
        } else {
            unlockButton.innerHTML = '🔑 マスターパスワードを設定';
            destroyDataButton.style.display = 'none';
            passwordStrengthDiv.style.display = 'none';
            masterPasswordInput.addEventListener('input', masterPasswordStrengthListener);
        }
    }

    initLockScreen();
});
