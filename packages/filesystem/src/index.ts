import util from 'util';
import fs, { createReadStream } from "fs"
import os from "os";
import path from "path"
import { createHash, randomUUID } from 'crypto';
import { execFile } from 'child_process';

type MaybePromise<T> = T | Promise<T>

/** Meta-data about a path */
export type PathInfo = {
    /**
     * Last-modified time, in milliseconds
     */
    lastModifiedMs: number,
    /**
     * Size of the file, in bytes
     */
    size: number,
    /**
     * True if this is a regular file, as opposed to a directory.
     */
    isFile: boolean,
    /**
     * True if this is a directory.
     */
    isDir: boolean,
}

/**
 * Converts a node `fs.Stats` object into a `PathInfo` object, handling undefined values gracefully.
 */
export function pathInfoFromFsStat(stats?: fs.Stats): PathInfo {
    return {
        lastModifiedMs: Math.ceil(stats?.mtimeMs ?? 0),        // No floating-point nonsense!  Milliseconds is good enough already.
        size: stats?.size ?? 0,
        isFile: stats?.isFile() ?? false,
        isDir: stats?.isDirectory() ?? false,
    }
}

/**
 * Callbacks which the path system can make upon various events.
 */
export type PathCallbacks = {
    /**
     * Function that steps should call whenever something writes a path.  Is allowed to be a Promise.
     * 
     * Might trigger refresh of browser pages.
     * Might accumulate for manifest generation.
     * 
     * @param pth The path that was written.
     */
    onPathWritten: (pth: Path) => MaybePromise<void>
}

/**
 * Represents a path in the filesystem.
 */
export class Path {
    /**
     * Absolute path to this file on disk.
     */
    public readonly absPath: string


    constructor(
        /**
         * The full path to the file, or another Path object to copy.
         * Trailing slashes are ignored, and relative paths are converted to absolute using the current working directory.
         */
        absPath: string | Path,
        /**
         * Callbacks that the path system can make upon various events.
         */
        public readonly callbacks?: PathCallbacks
    ) {
        this.absPath = absPath instanceof Path ? absPath.absPath : path.resolve(absPath)
    }

    /**
     * The operating system's temporary directory.
     */
    static systemTempDir: Path = new Path(os.tmpdir())

    /**
     * The current user's HOME directory.
     */
    static userHomeDir: Path = new Path(os.homedir())

    /**
     * Path to the void.
     */
    static devNull: Path = new Path('/dev/null')

    /**
     * Creates a path from a string, supporting relative and absolute, and also replacing leading '~'
     * with the full path to the user's home directory.
     */
    static withCliExpansion(p: string): Path {
        if (p[0] === '~') {
            return Path.userHomeDir.join(p.slice(1));
        }
        return new Path(p)
    }

    /** Creates a path to the current working directory, which can change over the execution of the script. */
    static cwd(): Path {
        return new Path("")     // resolves to `process.cwd()` in Node (by unit-test), and does something "reasonable" in other contexts.
    }

    toString(): string {
        return this.absPath
    }

    valueOf(): string {
        return this.absPath
    }

    // For Map key equality
    [Symbol.toPrimitive](hint: string): string {
        // istanbul ignore next
        return this.absPath;
    }

    // Define custom console output for Node.js
    [util.inspect.custom](): string {
        // istanbul ignore next
        return this.absPath;
    }

    toSimplified() {
        return this.absPath
    }

    toJSON(): string {
        return this.absPath
    }

    /**
     * Returns a `file://` URL to this path.
     */
    get localUrl(): string {
        return 'file://' + this.absPath
    }

    /**
     * Just the filename, without any directory structure.
     */
    get filename(): string {
        return path.basename(this.absPath)
    }

    /**
     * The file extension, including the `'.'`.  Or `''` if there is no extension.
     */
    get extension(): string {
        return path.extname(this.absPath)
    }

    /**
     * Returns the parent path of this path.
     */
    get parent(): Path {
        return new Path(path.dirname(this.absPath), this.callbacks)
    }

    /**
     * Starting from this path, join any number of other path segments, and return a new `Path` object.
     * If the additional paths start with a leading slash, they do _not_ reset the absolute path, but rather
     * are still just concatenated.
     */
    join(...paths: (string | Path)[]): Path {
        return new Path(path.join(this.absPath, ...(paths.map(String))), this.callbacks)
    }

    /**
     * Returns a path fragment relative to this path, without a leading slash.
     * Empty string if the paths are identical.
     * Uses '..' segments if the given path isn't a child, and thus needs more traversal to be reached from here.
     */
    relativeToMe(other: string | Path): string {
        return path.relative(this.absPath, String(other))
    }

    /**
     * If the other path has no parents in common with this one, or the only common path
     * is the user's home directory, returns the absolute path.  Otherwise returns the path relative to our own.
     */
    maybeRelativeToMe(other: string | Path): string {
        if (other instanceof Path) other = other.absPath
        const common = this.commonParent(other)
        if (common.absPath.length > 1 && common.absPath !== Path.userHomeDir.absPath) {
            return this.relativeToMe(other)
        }
        return String(other)
    }

    /**
     * Returns the path that is common to ourselves and the argument.  No trailing slash.
     * Will be '/' if nothing is in common.
     */
    commonParent(other: string | Path): Path {
        const p1 = this.absPath.split('/')
        const p2 = String(other).split('/')
        const n = Math.min(p1.length, p2.length)
        let i = 0
        for (; i < n; ++i) {
            if (p1[i] != p2[i]) break
        }
        return new Path('/' + p1.slice(0, i).join('/'))
    }

    /**
     * Returns `true` if the other path is identical to, or located underneath, the current path.
     */
    isParentOf(other: string | Path): boolean {
        const otherPath = typeof other === "string" ? other : other.absPath
        if (otherPath.length < this.absPath.length) {       // can't be a parent if it's shorter
            return false
        }
        if (!otherPath.startsWith(this.absPath)) {      // can't be a parent unless we're a prefix
            return false
        }
        return otherPath[this.absPath.length] === path.sep || otherPath.length === this.absPath.length
    }

    /**
     * Gets filesystem information, like last-modified and size.
     * 
     * Returns all zeros, but a real structures, if the file doesn't exist.
     */
    async getInfo(): Promise<PathInfo> {
        try {
            return pathInfoFromFsStat(await fs.promises.stat(this.absPath))
        } catch {
            return pathInfoFromFsStat(undefined)
        }
    }

    /**
     * Gets filesystem information, like last-modified and size.
     * 
     * Returns all zeros, but a real structures, if the file doesn't exist.
     * 
     * Generally you should use the async version `getInfo()`, but this is a very fast operation
     * in the era of local SSDs, so you can sometimes get away with it.
     */
    getInfoSync(): PathInfo {
        try {
            return pathInfoFromFsStat(fs.statSync(this.absPath))
        } catch {
            return pathInfoFromFsStat(undefined)
        }
    }

    /**
     * True if this path exists, and is a file (i.e. not a directory).
     */
    async isFile(): Promise<boolean> {
        return (await this.getInfo()).isFile
    }

    /**
     * True if this path exists, and is a directory.
     */
    async isDir(): Promise<boolean> {
        return (await this.getInfo()).isDir
    }

    /**
     * True if this file is newer than the other file, or if the sizes don't match, or if either file doesn't exist.
     */
    async isNewerThan(other: Path): Promise<boolean> {
        try {
            const [myStats, otherStats] = await Promise.all([fs.promises.stat(this.absPath), fs.promises.stat(other.absPath)]);
            return myStats.size != otherStats.size || myStats.mtimeMs > otherStats.mtimeMs;
        } catch {
            return true
        }
    }

    /**
     * True if this file is newer than the other file, or if the sizes don't match, or if either file doesn't exist.
     */
    isNewerThanSync(other: Path): boolean {
        try {
            const myStats = this.getInfoSync()
            const otherStats = other.getInfoSync()
            return myStats.size != otherStats.size || myStats.lastModifiedMs > otherStats.lastModifiedMs;
        } catch {
            return true
        }
    }

    /**
     * Creates this path as a directory (and any parent directories as needed).
     */
    async mkdir(): Promise<void> {
        if (await this.isDir() !== true) {
            await fs.promises.mkdir(this.absPath, { recursive: true })
        }
    }

    /**
     * Creates this path as a directory (and any parent directories as needed).
     */
    mkdirSync(): void {
        if (this.getInfoSync().isDir !== true) {
            fs.mkdirSync(this.absPath, { recursive: true })
        }
    }

    /**
     * Read in the contents of this file as a raw buffer.
     */
    async readAsBuffer(): Promise<Buffer> {
        return fs.promises.readFile(this.absPath)
    }

    /**
     * Read in the contents of this file as an encoded string.
     * 
     * Default is `UTF-8`, but for example `"base64"`.
     */
    async readAsString(encoding: BufferEncoding = "utf-8"): Promise<string> {
        return fs.promises.readFile(this.absPath, { encoding })
    }

    /**
     * Read in the contents of this file as a list of lines.  Lines can be empty, though initial and final empty lines are trimmed.
     */
    async readLines(): Promise<string[]> {
        return (await this.readAsString()).trim().split(/\r?\n/)
    }

    /**
     * Touch a file, creating if it doesn't already exist, setting the modification time to the given time, or "now" if not given.
     * 
     * @param pth The path to the file to touch.
     * @param t The time to set the file to, either as a `Date` or number of milliseocnds, or "now" if not given.
     */
    async touch(t?: Date | number): Promise<void> {
        const timestamp = t ? (t instanceof Date ? t.getTime() / 1000 : t) : Date.now() / 1000;

        try {
            await fs.promises.utimes(this.absPath, timestamp, timestamp);
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') { // File doesn't exist, so create it
                await this.writeAsString("")
                await fs.promises.utimes(this.absPath, timestamp, timestamp);       // reset the timestamp
            } else {
                // Re-throw any other errors
                throw error;
            }
        }
    }

    /**
     * Writes file from a raw buffer, creating parent directories if needed.
     */
    async write(content: Buffer): Promise<void> {

        // Write the file
        try {
            await fs.promises.writeFile(this.absPath, content);
        } catch (err: any) {
            // Check for parent directory needs to be created.  Don't do this ahead of time because nearly always
            // the parent does exist, and we save ourselves a round-trip to the filesystem.
            if (err?.code === "ENOENT") {
                await fs.promises.mkdir(path.dirname(this.absPath), { recursive: true });
                await fs.promises.writeFile(this.absPath, content);
            } else {
                throw err;
            }
        }

        // Eventually successful, so make callbacks.
        await this.callbacks?.onPathWritten(this)
    }

    /**
     * Writes file from a string, creating parent directories if needed, with specific encoding (default `UTF-8`)
     */
    async writeAsString(content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {

        // Write the file
        try {
            await fs.promises.writeFile(this.absPath, content, { encoding });
        } catch (err: any) {
            // Check for parent directory needs to be created.  Don't do this ahead of time because nearly always
            // the parent does exist, and we save ourselves a round-trip to the filesystem.
            if (err?.code === "ENOENT") {
                await fs.promises.mkdir(path.dirname(this.absPath), { recursive: true });
                await fs.promises.writeFile(this.absPath, content, { encoding });
            } else {
                throw err;
            }
        }

        // Eventually successful, so make callbacks.
        await this.callbacks?.onPathWritten(this)
    }

    /**
     * Writes file, creating parent directories if needed, but only if the content is different.
     * 
     * @param content the string to write (if different)
     * @param atomically if true, write into a separate file and atomically move into place
     * @param useDestDirectory if atomic, should we use the same directory (faster moves) or not (outside of the directory tree)
     * @returns true if the file was actually written, false otherwise.
     */
    async writeAsStringIfDifferent(content: string, atomically: boolean = false, useDestDirectory: boolean = true): Promise<boolean> {
        // If requested, check existing content and exit immediately if they're the same
        try {
            if (await this.readAsString() === content) {
                return false
            }
        } catch {
            // fall through
        }
        // console.error("writing string", this.absPath)
        if (atomically) {
            await this.atomicWriteAsString(content, useDestDirectory)
        } else {
            await this.writeAsString(content)
        }
        return true
    }

    /**
     * Copies this file to another location, creating parent directories if needed, using efficient copy-on-write where possible.
     * 
     * @param dest The destination path to copy to.
     * @param onlyIfNewer If true, only copies the file if the source is newer than the destination, or if sizes mismatch or if either file doesn't exist.
     * @returns true if the file was actually copied, false otherwise.
     */
    async copyTo(dest: Path, onlyIfNewer: boolean): Promise<boolean> {
        if (onlyIfNewer && !await this.isNewerThan(dest)) {
            return false
        }
        try {
            // console.error("copying", this.absPath, dest.absPath)
            await fs.promises.copyFile(this.absPath, dest.absPath, fs.constants.COPYFILE_FICLONE);
        } catch (e) {
            // Also make sure parent directories exist in this case
            await fs.promises.mkdir(path.dirname(dest.absPath), { recursive: true });
            await fs.promises.copyFile(this.absPath, dest.absPath, fs.constants.COPYFILE_FICLONE);
        }
        await dest.callbacks?.onPathWritten(dest)
        return true
    }

    /**
     * Moves this file to another location, creating parent directories if needed, using efficient copy-on-write where possible.
     * 
     * @param dest The destination path to copy to.
     * @returns true if the file was actually copied, false otherwise.
     */
    async moveTo(dest: Path): Promise<boolean> {
        try {
            // console.error("copying", this.absPath, dest.absPath)
            await fs.promises.rename(this.absPath, dest.absPath);
        } catch (e) {
            // Also make sure parent directories exist in this case
            await fs.promises.mkdir(path.dirname(dest.absPath), { recursive: true });
            await fs.promises.rename(this.absPath, dest.absPath);
        }
        await dest.callbacks?.onPathWritten(dest)
        return true
    }

    /**
     * Deletes this file, really unlinking from the current directory.  Errors if it wasn't
     * possible to delete, or didn't exist.
     */
    async unlink(): Promise<void> {
        await fs.promises.unlink(this.absPath)
    }

    /**
     * Deletes this file, really unlinking from the current directory.  Errors if it wasn't
     * possible to delete, or didn't exist.
     */
    unlinkSync(): void {
        fs.unlinkSync(this.absPath)
    }

    /**
     * List files in this directory.  Does not include `.` or `..`.  Error if it's not a directory.
     */
    async list(options: {
        includeFiles?: boolean,
        includeDirs?: boolean,
    }): Promise<Path[]> {
        let files = await fs.promises.readdir(this.absPath, { withFileTypes: true });
        files = files.filter(f =>
            (options.includeFiles !== false || !f.isFile()) &&
            (options.includeDirs !== false || !f.isDirectory())
        );
        return files.map(f => this.join(f.name))
    }

    /**
     * Compute the MD5 of the content of this file.
     */
    md5(): Promise<string> {
        const absPath = this.absPath
        return new Promise((resolve, reject) => {
            const hash = createHash('md5');
            const stream = createReadStream(absPath);

            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }

    /**
     * Returns a path to a temporary file which is guaranteed to be unique.  Does not create the file nor parent directories.
     * 
     * @param prefix The prefix of the filename (before the unique part).
     * @param suffix The suffix of the filename (after the unique part).
     * @param dir The directory to create the temporary file in.  If not specified, uses the system temporary directory.
     */
    static getTempPath(prefix: string = "", suffix: string = "", dir: Path | null | undefined = undefined): Path {
        if (!dir) dir = Path.systemTempDir
        return dir.join(`${prefix}${randomUUID()}${suffix}`);
    }

    /**
     * Executes a callback with a temporary file path, which is guaranteed to be unique.
     * The file is not created ahead of time, but parent directories have been created.
     * Whether the callback completes successfully or not, the temporary file is deleted afterwards.
     * 
     * @param prefix The prefix of the filename (before the unique part).
     * @param suffix The suffix of the filename (after the unique part).
     * @param dir The directory to create the temporary file in.  If not specified, uses the system temporary directory.
     */
    static async withTempFile<T>(
        fCallback: (tempFile: Path) => Promise<T>,
        prefix: string = "",
        suffix: string = "",
        dir: Path | null | undefined = undefined,
    ): Promise<T> {
        const tempFile = Path.getTempPath(prefix, suffix, dir)
        await tempFile.parent.mkdir()
        try {
            return await fCallback(tempFile)
        } finally {
            try {
                if (await tempFile.isFile()) {
                    await tempFile.unlink()
                }
            } catch (err) {
                console.error(`Failed to delete temporary file: ${tempFile}`, err);
            }
        }
    }

    /**
     * Performs an atomic write by asking the caller to write to a temporary file, then renaming it to the final destination
     * if the callback indicates that we should.  The temp file is deleted whether or not the callback wants it copied to
     * the final destination.
     * 
     * Returns the result of the calling function, in case you have computed data that you want passed back out.
     * 
     * @param fWrite A function that writes to the path given to it (parent directories have already been created).  Returns a promised boolean of `true` to say that the temp file should be moved to the destination, or `false` to say that it should be deleted (if created at all).
     * @param useDestDirectory If true, the temporary file is created in the same directory as the destination file.  If false, it's created in the system temporary directory.
     */
    atomicWrite(
        fWrite: (dst: Path) => Promise<boolean>,
        useDestDirectory: boolean = true,
    ): Promise<void> {
        return Path.withTempFile<void>(async (tempFile) => {
            const wantCopy = await fWrite(tempFile)
            if (wantCopy) {
                await tempFile.moveTo(this)
            }
        },
            useDestDirectory ? ".tmp-" : "",         // prefix
            this.extension,         // copy the extension, in case that's important
            useDestDirectory ? this.parent : undefined      // dir
        )
    }

    /**
     * Same as `writeAsString()` but uses an atomic write.
     */
    atomicWriteAsString(content: string, useDestDirectory: boolean = true): Promise<void> {
        return this.atomicWrite(async (tempFile) => {
            await tempFile.writeAsString(content)
            return true
        }, useDestDirectory)
    }

    /**
     * Opens a Finder window revealing this file.
     */
    revealInFinder() {
        execFile('open', ['-R', this.absPath])
    }

    /**
     * Opens this file using the application that is associated with it; does not wait for that to happen before returning.
     * 
     * @param app if non-trivial, open using the application named this, otherwise uses the default application
     */
    openInApplication(app?: string | null | undefined) {
        const args: string[] = []
        if (app) {
            args.push('-a')
            args.push(app)
        }
        args.push(this.absPath)
        execFile('open', args)
    }

    /**
     * Opens a URL in the Default profile in the existing Chrome process; doesn't wait for it to happen before returning.
     */
    static openUrlInBrowser(url: string) {
        // exec(`open '${url}'`);       // this works, but the one below is far better for our typical use-case
        // Ref: https://peter.sh/experiments/chromium-command-line-switches/
        execFile(`open`, [`-na`, `Google Chrome`, `--args`, `--new-window`, `--profile-directory="Default"`, url]);
    }

}