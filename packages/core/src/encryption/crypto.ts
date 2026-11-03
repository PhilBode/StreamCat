import sodium from "libsodium-wrappers"

export async function encrypt(text: string, secret: string): Promise<string> {
    await sodium.ready
    const key = sodium.crypto_generichash(sodium.crypto_secretbox_KEYBYTES, secret, null)
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const ciphertext = sodium.crypto_secretbox_easy(text, nonce, key)
    return JSON.stringify({
        nonce: sodium.to_hex(nonce),
        ciphertext: sodium.to_hex(ciphertext)
    })
}

export async function decrypt(encryptedStr: string, secret: string): Promise<string> {
    await sodium.ready
    const parsed = JSON.parse(encryptedStr)
    if (!parsed.nonce || !parsed.ciphertext) throw new Error("Invalid encrypted data: missing nonce or ciphertext")
    const key = sodium.crypto_generichash(sodium.crypto_secretbox_KEYBYTES, secret, null)
    const result = sodium.crypto_secretbox_open_easy(
        sodium.from_hex(parsed.ciphertext),
        sodium.from_hex(parsed.nonce),
        key
    )
    return sodium.to_string(result)
}
