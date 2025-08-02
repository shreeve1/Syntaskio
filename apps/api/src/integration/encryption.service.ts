import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly encoding = 'base64';

  // In a real implementation, this key should be stored securely (e.g., in environment variables or a key management service)
  private readonly secretKey = process.env.ENCRYPTION_KEY || this.generateRandomKey();

  /**
   * Encrypts data using AES-256-CBC
   * @param data The data to encrypt
   * @returns Encrypted data as a base64 string
   */
  encrypt(data: string): string {
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher using modern crypto API
      const key = Buffer.from(this.secretKey.padEnd(32, '0').slice(0, 32));
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', this.encoding);
      encrypted += cipher.final(this.encoding);

      // Combine IV and encrypted data
      const result = Buffer.concat([
        iv,
        Buffer.from(encrypted, this.encoding)
      ]);

      return result.toString(this.encoding);
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts data using AES-256-CBC
   * @param encryptedData The encrypted data as a base64 string
   * @returns Decrypted data as a string
   */
  decrypt(encryptedData: string): string {
    try {
      // Convert base64 string to buffer
      const dataBuffer = Buffer.from(encryptedData, this.encoding);

      // Extract IV and encrypted data
      const iv = dataBuffer.subarray(0, this.ivLength);
      const encrypted = dataBuffer.subarray(this.ivLength);

      // Create decipher
      const key = Buffer.from(this.secretKey.padEnd(32, '0').slice(0, 32));
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      // Decrypt the data
      let decrypted = decipher.update(encrypted.toString(this.encoding), this.encoding, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generates a random key for encryption
   * @returns Random key as a hex string
   */
  private generateRandomKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }
}
