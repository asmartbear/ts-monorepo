import { randomUUID } from 'crypto'
import { IDriver, DocumentStorageData, NewDocumentStorageData } from './driver'

/** An `IDriver` implementation only in memory; especially useful for unit tests */
export class InMemoryDriver implements IDriver<any> {

    public readonly docData = new Map<string, DocumentStorageData<any>>()

    async create(partialData: NewDocumentStorageData): Promise<DocumentStorageData<any>> {
        const data: DocumentStorageData<any> = {
            ...partialData,
            uniqueId: randomUUID(),
            driverData: null,
        }
        this.docData.set(data.uniqueId, data)
        return Object.assign({}, data)
    }

    async save(data: DocumentStorageData<any>): Promise<void> {
        this.docData.set(data.uniqueId, Object.assign({}, data))
    }

    async loadById(uniqueId: string): Promise<DocumentStorageData<any> | undefined> {
        const result = this.docData.get(uniqueId)
        return result ? Object.assign({}, result) : undefined
    }

    async loadByName(ns: string, name: string): Promise<DocumentStorageData<any> | undefined> {
        for (const doc of this.docData.values()) {
            if (doc.ns == ns && doc.name == name) {
                return Object.assign({}, doc)
            }
        }
        return undefined
    }
}