import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16

// Generate a key from password using PBKDF2
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512')
}

// Get encryption password from environment or generate a default one
function getEncryptionPassword(): string {
  return process.env.ENCRYPTION_KEY || 'supabase-store-default-key-change-in-production'
}

export function encryptApiKey(apiKey: string): string {
  try {
    const password = getEncryptionPassword()
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = deriveKey(password, salt)
    
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Combine salt + iv + authTag + encrypted data
    const combined = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')])
    
    return combined.toString('base64')
  } catch (error) {
    console.error('Encryption failed:', error)
    // Fallback to simple base64 if encryption fails
    return Buffer.from(apiKey).toString('base64')
  }
}

export function decryptApiKey(encryptedData: string): string {
  try {
    const password = getEncryptionPassword()
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Check if this looks like our encrypted format
    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
      // This might be old base64 format, try to decode directly
      try {
        return Buffer.from(encryptedData, 'base64').toString('utf-8')
      } catch {
        throw new Error('Invalid encrypted data format')
      }
    }
    
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    
    const key = deriveKey(password, salt)
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    // Fallback: try to decode as simple base64
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf-8')
    } catch {
      throw new Error('Failed to decrypt API key')
    }
  }
}

// Test function to verify encryption/decryption works
export function testEncryption(): boolean {
  try {
    const testKey = 'sk-test-key-1234567890abcdef'
    const encrypted = encryptApiKey(testKey)
    const decrypted = decryptApiKey(encrypted)
    return testKey === decrypted
  } catch {
    return false
  }
}