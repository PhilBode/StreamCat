import type {EventSubSubscription} from "@twurple/eventsub-base"

export type UnsubscribeResult = "kept" | "removed"

export class TwitchSubscriptionService {
    private readonly streamSubs = new Map<string, EventSubSubscription>()
    private readonly refCounts = new Map<string, number>()
    private readonly confirmed = new Set<string>()

    get activeCount(): number {
        return this.confirmed.size
    }

    get pendingCount(): number {
        return this.streamSubs.size - this.confirmed.size
    }

    clear(): void {
        this.streamSubs.clear()
        this.refCounts.clear()
        this.confirmed.clear()
    }

    remove(userId: string): void {
        this.streamSubs.delete(userId)
        this.refCounts.delete(userId)
        this.confirmed.delete(userId)
    }

    has(userId: string): boolean {
        return this.streamSubs.has(userId)
    }

    refCount(userId: string): number {
        return this.refCounts.get(userId) ?? 0
    }

    getSubscription(userId: string): EventSubSubscription | undefined {
        return this.streamSubs.get(userId)
    }

    findBySubscriptionId(subscriptionId: string): string | undefined {
        for (const [userId, sub] of this.streamSubs) {
            if (sub.id === subscriptionId) return userId
        }
        return undefined
    }

    confirm(userId: string): void {
        if (!this.has(userId)) return
        this.confirmed.add(userId)
    }

    /** Register a fresh subscription for a user. Returns false if the user already had one (ref-count bumped). */
    register(userId: string, subscription: EventSubSubscription, refCount = 1): boolean {
        if (this.streamSubs.has(userId)) {
            this.increment(userId)
            return false
        }
        this.streamSubs.set(userId, subscription)
        this.refCounts.set(userId, refCount)
        if (subscription.verified) this.confirmed.add(userId)
        return true
    }

    setRefCount(userId: string, refCount: number): void {
        if (this.has(userId)) this.refCounts.set(userId, refCount)
    }

    increment(userId: string): void {
        this.refCounts.set(userId, (this.refCounts.get(userId) ?? 0) + 1)
    }

    /** Decrement the ref-count. When it reaches zero, clears the stored maps and returns "removed". */
    unsubscribe(userId: string): UnsubscribeResult {
        const refs = this.refCounts.get(userId) ?? 0
        if (refs > 1) {
            this.refCounts.set(userId, refs - 1)
            return "kept"
        }
        this.remove(userId)
        return "removed"
    }
}
