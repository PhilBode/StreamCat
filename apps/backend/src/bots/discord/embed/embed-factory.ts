import {EmbedBuilder} from "discord.js"
import {COLORS, EMBED_FOOTER, spotifyCallbackUrl, URLS} from "@streamcat/core"

export class EmbedFactory {
    static twitchNotification(
        title: string,
        url: string,
        username: string,
        profilePictureUrl?: string,
        game?: string
    ): EmbedBuilder {
        const embed = this.#baseEmbed().setColor(COLORS.TWITCH_PURPLE).setTitle(title).setURL(url)

        if (profilePictureUrl) {
            embed.setAuthor({name: username, iconURL: profilePictureUrl, url})
            embed.setThumbnail(profilePictureUrl)
        }

        if (game) {
            embed.setDescription(`Streaming: \`\`${game}\`\``)
        }

        embed.setImage(URLS.TWITCH_PREVIEW(username))

        return embed
    }
    static globalBroadcast(title: string, content: string): EmbedBuilder {
        return this.#baseEmbed().setColor(COLORS.DARK).setTitle(title).setDescription(content).setTimestamp()
    }

    static templatePreview(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(COLORS.TWITCH_PURPLE)
            .setAuthor({
                name: "StreamCat",
                iconURL: "https://cdn.discordapp.com/embed/avatars/0.png",
                url: "https://twitch.tv/StreamCat"
            })
            .setTitle("Just Chatting with the community")
            .setDescription("Streaming: ``Just Chatting``")
            .setImage(URLS.TWITCH_PREVIEW("StreamCat"))
            .setURL("https://twitch.tv/StreamCat")
            .setTimestamp()
            .setFooter({text: `${EMBED_FOOTER} — Preview`})
    }

    static spotifyTutorial(): EmbedBuilder {
        return this.#baseEmbed()
            .setAuthor({name: "StreamCat"})
            .setTitle("How to connect your Spotify account:")
            .setColor(COLORS.SPOTIFY_GREEN)
            .setDescription("Disclaimer: A Spotify **Premium** account is needed for this feature to work")
            .addFields(
                {
                    name: "1. Login into your Spotify Dashboard",
                    value: URLS.SPOTIFY_DASHBOARD
                },
                {
                    name: "2. Create your app",
                    value: "Click on 'Create app', choose a name and set a random description."
                },
                {
                    name: "3. Adjust the settings",
                    value: `Click on 'Edit Settings' and add the Redirect URI:\n\`\`\`\n${spotifyCallbackUrl()}\n\`\`\``
                },
                {
                    name: "4. Done",
                    value: "Use `/spotify login` again with your Client-ID and Client-Secret."
                }
            )
            .setTimestamp()
    }

    static serverStatus(guildName: string, fields: {name: string; value: string}[]): EmbedBuilder {
        const embed = this.#baseEmbed().setColor(COLORS.DARK).setTitle(`📊 Status for ${guildName}`).setTimestamp()

        for (const field of fields) {
            embed.addFields(field)
        }

        return embed
    }

    static #baseEmbed(): EmbedBuilder {
        return new EmbedBuilder().setTimestamp().setFooter({text: EMBED_FOOTER})
    }
}
