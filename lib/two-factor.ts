import crypto from "crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function getEncryptionKey(): Buffer {
    const rawKey = process.env.TWO_FACTOR_ENCRYPTION_KEY
    if (!rawKey) {
        throw new Error("TWO_FACTOR_ENCRYPTION_KEY is not configured")
    }
    return crypto.createHash("sha256").update(rawKey).digest()
}

function base32Encode(data: Buffer): string {
    let bits = 0
    let value = 0
    let output = ""

    for (const byte of data) {
        value = (value << 8) | byte
        bits += 8

        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
            bits -= 5
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
    }

    return output
}

function base32Decode(input: string): Buffer {
    const cleanInput = input.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "")
    let bits = 0
    let value = 0
    const output: number[] = []

    for (const char of cleanInput) {
        const index = BASE32_ALPHABET.indexOf(char)
        if (index === -1) continue

        value = (value << 5) | index
        bits += 5

        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255)
            bits -= 8
        }
    }

    return Buffer.from(output)
}

function generateTotp(secret: string, timestampMs: number): string {
    const timeStep = Math.floor(timestampMs / 1000 / 30)
    const counter = Buffer.alloc(8)
    counter.writeBigUInt64BE(BigInt(timeStep))

    const key = base32Decode(secret)
    const hmac = crypto.createHmac("sha1", key).update(counter).digest()
    const offset = hmac[hmac.length - 1] & 0x0f
    const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)

    return String(code % 1_000_000).padStart(6, "0")
}

export function isTwoFactorEnabledGlobally(): boolean {
    return process.env.ENABLE_2FA === "true"
}

export function generateTwoFactorSecret(): string {
    return base32Encode(crypto.randomBytes(20))
}

export function buildOtpAuthUrl(username: string, secret: string): string {
    const issuer = encodeURIComponent("Police Feedback")
    const label = encodeURIComponent(`Police Feedback:${username}`)
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
}

export function verifyTotpCode(secret: string, code: string): boolean {
    const normalizedCode = code.replace(/\s+/g, "")
    if (!/^\d{6}$/.test(normalizedCode)) {
        return false
    }

    const now = Date.now()
    const candidateCodes = [
        generateTotp(secret, now - 30_000),
        generateTotp(secret, now),
        generateTotp(secret, now + 30_000),
    ]

    return candidateCodes.includes(normalizedCode)
}

export function encryptSecret(secret: string): string {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptSecret(payload: string): string {
    const key = getEncryptionKey()
    const [ivB64, tagB64, encryptedB64] = payload.split(":")
    if (!ivB64 || !tagB64 || !encryptedB64) {
        throw new Error("Invalid encrypted secret format")
    }

    const iv = Buffer.from(ivB64, "base64")
    const authTag = Buffer.from(tagB64, "base64")
    const encrypted = Buffer.from(encryptedB64, "base64")

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    return decrypted.toString("utf8")
}
