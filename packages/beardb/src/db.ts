import { NativeFor, SmartType } from '@asmartbear/smarttype'
import { Document } from "./doc";
import { IDriver, DocumentStorageData } from "./driver"
import invariant from 'tiny-invariant';

/** Database manager, leveraging a driver for how to load and store documents. */
export class Database {

    private docsByUniqueId = new Map<string, Document>()
    private docsByName = new Map<string, Document>()

    constructor(
        public readonly driver: IDriver<unknown>
    ) {
    }

    /** For the doc-by-name cache */
    private getNameKey(ns: string, name: string): string {
        return `${ns}::${name}`
    }

    /** Stores a document object in the caches */
    private setCache(doc: Document) {
        this.docsByUniqueId.set(doc.uniqueId, doc)
        this.docsByName.set(this.getNameKey(doc.ns, doc.name), doc)
    }

    /** Drops all in-memory objects.  Warning: This can lead to inconsistencies and lost data! */
    clearCache() {
        this.docsByUniqueId.clear()
        this.docsByName.clear()
    }

    /**
     * Loads a document by its globally-unique ID, or `undefined` if not found.
     * 
     * Uses in-memory cache of Documents, so the same Document object is returned if repeatedly requested.
     */
    async loadById<ST extends SmartType>(frontMatterType: ST, uniqueId: string): Promise<Document<ST> | undefined> {
        let doc = this.docsByUniqueId.get(uniqueId)
        if (!doc) {
            const data = await this.driver.loadById(uniqueId)
            if (!data) return undefined
            const doc = Document.fromStorageData(frontMatterType, data)
            this.setCache(doc)
            return doc
        }
        return doc.assertFrontMatterType(frontMatterType)
    }

    /**
     * Loads a document by its namespaced name, or `undefined` if not found.
     * 
     * Uses in-memory cache of Documents, so the same Document object is returned if repeatedly requested.
     */
    async loadByName<ST extends SmartType>(frontMatterType: ST, ns: string, name: string): Promise<Document<ST> | undefined> {
        let doc = this.docsByName.get(this.getNameKey(ns, name))
        if (!doc) {
            const data = await this.driver.loadByName(ns, name)
            if (!data) return undefined
            const doc = Document.fromStorageData(frontMatterType, data)
            this.setCache(doc)
            return doc
        }
        return doc.assertFrontMatterType(frontMatterType)
    }

    /** Saves all documents that contain changes, returning the number of documents that required saving. */
    async save(): Promise<number> {
        const docsChanged = Array.from(this.docsByUniqueId.values()).filter(doc => doc.isDirty)
        for (const doc of docsChanged) {
            await this.driver.save(doc.getDocumentStorageData())
            doc.clearDirty()
        }
        return docsChanged.length
    }

    /**
     * Creates a new document, saving it immediately with this state but continuing to edit it in memory.
     * 
     * @param frontMatterType the data type for the front matter
     * @param ns namespace for the document's ID
     * @param name ID unique within the namespace
     * @param initialFrontMatter front matter to start the new document with
     * @param initialText text to start the new document with
     */
    async create<ST extends SmartType>(frontMatterType: ST, ns: string, name: string, initialFrontMatter: NativeFor<ST>, initialText: string): Promise<Document<ST>> {
        const data = await this.driver.create({
            ns, name,
            frontMatter: frontMatterType.toJSON(initialFrontMatter),
            text: initialText,
        })
        const doc = Document.fromStorageData(frontMatterType, data)
        this.setCache(doc)
        return doc
    }

    /**
     * Loads an existing document by name or, if it does not exist, creates one with the given initialized data.
     * 
     * @param frontMatterType the data type for the front matter
     * @param ns namespace for the document's ID
     * @param name ID unique within the namespace
     * @param initialFrontMatter front matter to start the new document with
     * @param initialText text to start the new document with
     */
    async loadByNameOrCreate<ST extends SmartType>(frontMatterType: ST, ns: string, name: string, initialFrontMatter: NativeFor<ST>, initialText: string): Promise<Document<ST>> {
        const doc = await this.loadByName(frontMatterType, ns, name)
        if (doc) return doc
        return await this.create(frontMatterType, ns, name, initialFrontMatter, initialText)
    }
}