import { JSONType } from '@asmartbear/smarttype'

/**
 * The components of document data that the underlying database loads and saves.
 */
export type DocumentStorageData<DD> = {
    uniqueId: string,
    ns: string,
    name: string,
    frontMatter: JSONType,
    text: string,
    /** opaque data that the driver gets control, but only in memory */
    driverData: DD,
}

/** Same as `DocumentStorageData` but for brand new documents, which don't (for example) have a unique ID yet, because the driver assigns one. */
export type NewDocumentStorageData = Omit<DocumentStorageData<any>, 'uniqueId' | 'driverData'>

/** Database driver, implementing loading and saving documents. */
export interface IDriver<DD> {

    /**
     * Loads a document from underlying storage.
     * 
     * @param id globally-unique ID within the namespace
     * @returns the document data, or `undefined` if does not exist
     */
    loadById(uniqueId: string): Promise<DocumentStorageData<DD> | undefined>

    /**
     * Loads a document from underlying storage.
     * 
     * @param ns namespace for the document's ID
     * @param name ID unique within the namespace
     * @returns the document data, or `undefined` if does not exist
     */
    loadByName(ns: string, name: string): Promise<DocumentStorageData<DD> | undefined>

    /** 
     * Saves an existing document to underlying storage, overwriting one that exists
     * 
     * @param data structured document data to store
     */
    save(data: DocumentStorageData<DD>): Promise<void>

    /** 
     * Creates a new document in underlying storage, returning not only the data but a new unique ID
     * 
     * @param data initial structured document data to store (without the unique ID, which the driver will provide)
     */
    create(data: NewDocumentStorageData): Promise<DocumentStorageData<DD>>

}