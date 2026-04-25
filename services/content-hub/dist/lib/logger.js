export const logger = {
    info(message, data) {
        console.log(JSON.stringify({ level: "info", message, ...data, ts: new Date().toISOString() }));
    },
    warn(message, data) {
        console.warn(JSON.stringify({ level: "warn", message, ...data, ts: new Date().toISOString() }));
    },
    error(message, data) {
        console.error(JSON.stringify({ level: "error", message, ...data, ts: new Date().toISOString() }));
    }
};
