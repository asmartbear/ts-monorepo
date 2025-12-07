import { SmartType, NativeFor } from '@asmartbear/smarttype'
import { DocumentStorageData } from './driver'

/** A document with YAML-compliant meta-data and arbitrary body content. */
export class Document<ST extends SmartType = SmartType> {

    private originalFrontMatterHash: string
    private originalText: string

    private constructor(
        public readonly frontMatterType: ST,
        public readonly uniqueId: string,
        public readonly ns: string,
        public readonly name: string,
        public frontMatter: NativeFor<ST>,
        public text: string,
        private readonly driverData: unknown
    ) {
        this.originalFrontMatterHash = frontMatterType.toHash(frontMatter)
        this.originalText = text
    }

    /** Creates a document given data loaded from a database */
    static fromStorageData<ST extends SmartType>(frontMatterType: ST, data: DocumentStorageData<unknown>) {
        const frontMatter = frontMatterType.fromJSON(data.frontMatter)
        return new Document(frontMatterType, data.uniqueId, data.ns, data.name, frontMatter, data.text, data.driverData)
    }

    /** True if the current data values differ from what was originally constructed. */
    get isDirty(): boolean {
        return (this.originalText != this.text) || (this.frontMatterType.toHash(this.frontMatter) != this.originalFrontMatterHash)
    }

    /** Resets what the document believes is the "database state", making the object now "clean". */
    clearDirty(): void {
        this.originalFrontMatterHash = this.frontMatterType.toHash(this.frontMatter)
        this.originalText = this.text
    }

    /** Retrieves the document data for storage in an external database. */
    getDocumentStorageData(): DocumentStorageData<unknown> {
        return {
            uniqueId: this.uniqueId,
            ns: this.ns,
            name: this.name,
            frontMatter: this.frontMatterType.toJSON(this.frontMatter),
            text: this.text,
            driverData: this.driverData
        }
    }

    /** Checks that the types match, then returns `this` casted to that type for Typescript to enjoy. */
    assertFrontMatterType<ST2 extends SmartType>(frontMatterType: ST2): Document<ST2> {
        // istanbul ignore next
        if (this.frontMatterType.description != frontMatterType.description) {
            // istanbul ignore next
            throw new Error("Document was expected to be of type " + frontMatterType.description + " but was of type " + this.frontMatterType.description)
        }
        return this as any
    }
}
