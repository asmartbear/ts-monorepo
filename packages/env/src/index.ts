
let hasEnvironmentLoaded = false

/** Special value in place of a string-typed default value */
export const THROW_IF_MISSING = Symbol('THROW_IF_MISSING')

/**
 * Loads the environment from `.env`.
 * Does nothing if it's already loaded
 */
export function loadEnvironment() {
    if (!hasEnvironmentLoaded) {

        // Don't let dotenv log
        const originalLog = console.log;
        try {
            console.log = () => { };
            const dotenv = require('dotenv')
            // if (isProduction()) {
            //     dotenv.config({ path: '.env.prod' });
            // } else {
            //     dotenv.config({ path: '.env.local' });
            // }
            dotenv.config({
                debug: false,
                path: '.env',
            });
        } finally {
            console.log = originalLog;
        }

        hasEnvironmentLoaded = true
    }
}

/**
 * Returns a required environment variable, throwing an exception or using a default if missing.
 * 
 * @param key the environment key to load
 * @param default the default value if it is not present (which doesn't have to be a string), or the `THROW_IF_MISSING` constant to throw in that case.
 */
export function getEnv<T>(key: string, def: T | typeof THROW_IF_MISSING): Exclude<string | T, typeof THROW_IF_MISSING> {
    const x = process.env[key]
    if (!x) {
        if (def === THROW_IF_MISSING) {
            throw new Error("Missing environment variable: " + key)
        } else {
            return def as any
        }
    }
    return x
}