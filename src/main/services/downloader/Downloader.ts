import type { Audit } from "@main/services/audit/Audit";

/**
 * Downloader class
 * 
 * @property payload
 * @property audit
 */
export abstract class Downloader {
    protected payload: TrackPayload;
    public audit?: Audit;
    
    constructor(payload: TrackPayload, audit?: Audit){
        this.payload = payload;
        this.audit = audit;
    }
    
    /**
     * Prepare the download
     */
    abstract prepare():boolean;

    /**
     * Starts the download
     */
    abstract start():Promise<void>;

    /**
     * Abort the download
     */
    abstract abort():void;
}