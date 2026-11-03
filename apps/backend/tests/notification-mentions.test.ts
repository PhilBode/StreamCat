import "reflect-metadata"
import {expect, test} from "bun:test"
import {renderNotificationTemplate, templateMentions} from "../src/bots/discord/notifications/notification.service"

test("only saved template mentions are allowed; stream metadata cannot inject mentions or placeholders", () => {
    const template = "Hey @here <@123> <@&456>: {Title} {Game} {Username} {Url}"
    expect(templateMentions(template)).toEqual({
        parse: ["everyone"],
        users: ["123"],
        roles: ["456"],
        repliedUser: false
    })
    expect(templateMentions("Live: {Title}")).toEqual({parse: [], users: [], roles: [], repliedUser: false})
    const rendered = renderNotificationTemplate(template, {
        username: "streamer",
        title: "@everyone <@789> {Game} $&",
        game: "@here",
        url: "https://twitch.tv/streamer"
    })
    expect(rendered).toContain("Hey @here <@123> <@&456>")
    expect(rendered).toContain("@\u200beveryone <@\u200b789> {Game} $&")
    expect(rendered).toContain("@\u200bhere")
    expect(templateMentions(template).users).not.toContain("789")
})
