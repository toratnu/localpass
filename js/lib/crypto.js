
// PBKDF2でパスワードからキーを派生させる
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// データを暗号化する
async function encrypt(data, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();

    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        enc.encode(data)
    );

    const encryptedData = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedContent)),
    };

    return JSON.stringify(encryptedData);
}

// データを復号する
async function decrypt(encryptedData, password) {
    try {
        const encryptedDataObj = JSON.parse(encryptedData);
        const salt = new Uint8Array(encryptedDataObj.salt);
        const iv = new Uint8Array(encryptedDataObj.iv);
        const data = new Uint8Array(encryptedDataObj.data);

        const key = await deriveKey(password, salt);

        const decryptedContent = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            data
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedContent);
    } catch (e) {
        console.error("復号に失敗しました:", e);
        return null;
    }
}
