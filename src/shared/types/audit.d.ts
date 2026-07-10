declare type AuditType = {
    status: 'downloading' | 'format' | 'redirect' | 'success' | 'error',
    message: string,
    info?: downloading | format | error,
}

type downloading = {
    percentage: string,
    step: number,
    total_step: number,
    speed: string,
    time_remaining: string,
}

type format = {
    step: number,
    total_step: number,
    time_remaining: string,
}

type error = {
    details: Error,
}