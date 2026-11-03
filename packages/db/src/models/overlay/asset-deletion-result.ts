import type {AssetRecord} from "./asset"

export type AssetDeletionResult = {status: "deleted"; asset: AssetRecord} | {status: "in-use"} | {status: "not-found"}
