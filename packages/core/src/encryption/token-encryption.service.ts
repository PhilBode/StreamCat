import {Injectable} from "@nestjs/common"
import {decrypt as libDecrypt, encrypt as libEncrypt} from "./crypto"
import {requireEnv} from "../config/env"

@Injectable()
export class TokenEncryptionService {
    private readonly secret = requireEnv("AUTH_SECRET")

    async encrypt(text: string): Promise<string> {
        return libEncrypt(text, this.secret)
    }

    async decrypt(encryptedStr: string): Promise<string> {
        return libDecrypt(encryptedStr, this.secret)
    }
}
