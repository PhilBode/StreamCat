import {Controller, Get, Header, Headers} from "@nestjs/common"
import {OverlayService} from "../../../features/overlays/services/overlay.service"

@Controller("overlays")
export class OverlayLiveController {
    constructor(private readonly overlays: OverlayService) {}

    @Get("live")
    @Header("Cache-Control", "private, no-store")
    @Header("Referrer-Policy", "no-referrer")
    live(@Headers("authorization") authorization?: string) {
        return this.overlays.live(authorization)
    }
}
