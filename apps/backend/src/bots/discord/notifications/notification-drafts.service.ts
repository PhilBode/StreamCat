import {BadRequestException, Injectable} from "@nestjs/common"
import {randomUUID} from "node:crypto"

interface NotificationDraft {
    guildId: string
    userId: string
    type: "main" | "partner"
    template: string
    expiresAt: number
}

@Injectable()
export class NotificationDraftsService {
    private readonly drafts = new Map<string, NotificationDraft>()

    create(guildId: string, userId: string, type: NotificationDraft["type"], template: string): string {
        for (const [id, draft] of this.drafts) {
            if (draft.expiresAt <= Date.now() || (draft.guildId === guildId && draft.userId === userId))
                this.drafts.delete(id)
        }
        if (this.drafts.size >= 500)
            throw new BadRequestException("Too many pending previews. Please try again shortly.")
        const id = randomUUID()
        this.drafts.set(id, {guildId, userId, type, template, expiresAt: Date.now() + 15 * 60_000})
        return id
    }

    get(id: string, guildId: string, userId: string): NotificationDraft {
        const draft = this.drafts.get(id)
        if (!draft || draft.expiresAt <= Date.now() || draft.guildId !== guildId || draft.userId !== userId) {
            throw new BadRequestException("This preview has expired. Please start a new preview.")
        }
        return draft
    }

    remove(id: string): void {
        this.drafts.delete(id)
    }
}
