import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {SpotifyModule} from "../../integrations/spotify/spotify.module"
import {OverlayService} from "./services/overlay.service"
import {OverlayPlaybackService} from "./services/overlay-playback.service"
import {OverlayAssetsService} from "./assets/overlay-assets.service"
import {AssetStorage} from "./assets/storage/asset-storage"
import {S3AssetStorage} from "../../integrations/storage/s3-asset-storage"

@Module({
    imports: [PrismaModule, SpotifyModule],
    providers: [
        OverlayService,
        OverlayPlaybackService,
        OverlayAssetsService,
        {provide: AssetStorage, useClass: S3AssetStorage}
    ],
    exports: [OverlayService, OverlayPlaybackService, OverlayAssetsService]
})
export class OverlayModule {}
