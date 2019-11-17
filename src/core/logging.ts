/**
 * Centralized logging support
 */
export class Logging {
    public static enabled = false;

    public static add(handler: (message: string) => void) {
        Logging.handlers.push(handler);
    }

    public static remove(handler: (handler: string) => void): void {
        const index = Logging.handlers.indexOf(handler);
        if (index > -1) {
            Logging.handlers.splice(index, 1);
        }
    }

    public static hasListeners(): boolean {
        return Logging.handlers.length > 0;
    }

    public static clear(): void {
        Logging.handlers.splice(0, Logging.handlers.length);
    }

    public static log(message: string) {
        if (Logging.enabled && Logging.hasListeners) {
            for (const handler of Logging.handlers) {
                handler(message);
            }
            console.log(message);
        }
    }

    private static handlers: Array<(message: string) => void> = [];
}
