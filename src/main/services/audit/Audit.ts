export abstract class Audit implements AuditType {
    public status: AuditType['status'];
    public message: AuditType['message'];
    public info?: AuditType['info'];


    constructor(status: AuditType['status'], message: AuditType['message'], info?: AuditType['info'], data?: string){
        this.status = status;
        this.message = message;
        if(info) this.info = info;
        if(data) this.formatInfo(data);
    }

    abstract formatInfo(data: string):void;
}