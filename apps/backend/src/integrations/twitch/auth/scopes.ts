export class TwitchScopes {
    private static _scopes: string[] = ["user:write:chat", "channel:read:redemptions", "channel:manage:redemptions"]

    static scopes: string[] = TwitchScopes._scopes
}
