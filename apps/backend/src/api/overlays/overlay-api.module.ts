import {Module} from "@nestjs/common"
import {AuthModule} from "../auth/auth.module"
import {OverlayModule} from "../../features/overlays/overlay.module"
import {OverlayController} from "./controllers/overlay.controller"
import {OverlayLiveController} from "./controllers/overlay-live.controller"
import {OverlayAssetsController} from "./assets/overlay-assets.controller"
import {OverlayPublicAssetsController} from "./assets/overlay-public-assets.controller"
import {AssetContentService} from "./assets/asset-content.service"

@Module({
    imports: [AuthModule, OverlayModule],
    controllers: [OverlayController, OverlayLiveController, OverlayAssetsController, OverlayPublicAssetsController],
    providers: [AssetContentService]
})
export class OverlayApiModule {}
