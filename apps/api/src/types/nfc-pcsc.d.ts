declare module "nfc-pcsc" {
    import { EventEmitter } from "node:events";

    export class NFC extends EventEmitter {}
}
