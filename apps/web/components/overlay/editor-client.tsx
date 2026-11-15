"use client"

import Link from "next/link"
import {OverlayEditor} from "@streamcat/overlay-engine"
import {overlayRequest} from "@/lib/overlay-request"

export function OverlayEditorClient({
    basePath,
    backHref,
    loginHref
}: {
    basePath: string
    backHref: string
    loginHref?: string
}) {
    return (
        <OverlayEditor
            basePath={basePath}
            request={overlayRequest}
            backHref={backHref}
            loginHref={loginHref}
            linkComponent={Link}
        />
    )
}
