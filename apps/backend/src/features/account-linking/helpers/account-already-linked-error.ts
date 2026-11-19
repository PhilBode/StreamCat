export class AccountAlreadyLinkedError extends Error {
    constructor() {
        super("This Twitch account is already linked to another server.")
        this.name = "AccountAlreadyLinkedError"
    }
}
