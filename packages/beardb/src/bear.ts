import { IDriver, DocumentStorageData, NewDocumentStorageData } from './driver'
import { BearSqlDatabase, BearSqlNote } from '@asmartbear/sqlight'

/** An `IDriver` implementation using Bear */
export class BearDriver implements IDriver<BearSqlNote> {

    constructor(
        public readonly database: BearSqlDatabase
    ) {
    }

    /** Convert our document data to the full string we set in Bear */
    private bearContent(data: NewDocumentStorageData): string {
        return BearSqlNote.createStructuredContent(
            data.name,          // title
            data.text,          // body
            [data.ns],          // tags
            data.frontMatter as any    // front matter
        )
    }

    private async bearNoteToDocumentData(note: BearSqlNote): Promise<DocumentStorageData<BearSqlNote>> {
        // the longest tag
        const longestTag = Array.from(await note.getTags()).sort((a, b) => b.length - a.length)[0]
        return {
            uniqueId: note.uniqueId,
            ns: longestTag ?? "na",
            name: note.title,
            text: note.body,
            frontMatter: note.frontMatter as any,
            driverData: note,
        }
    }

    async create(partialData: NewDocumentStorageData): Promise<DocumentStorageData<BearSqlNote>> {
        // Create the note with the right tag
        const note = await this.database.createNote([partialData.ns])
        // Form the full data that the database will need to track it
        const fullData: DocumentStorageData<BearSqlNote> = {
            ...partialData,
            uniqueId: note.uniqueId,
            driverData: note,
        }
        // Save the new note against this data
        await this.save(fullData)
        // Now we're ready for the main database
        return fullData
    }

    async save(data: DocumentStorageData<BearSqlNote>): Promise<void> {
        const note = data.driverData
        note.h1 = data.name
        note.body = data.text
        note.frontMatter = data.frontMatter as any
        await note.save()
    }

    async loadById(uniqueId: string): Promise<DocumentStorageData<BearSqlNote> | undefined> {
        const note = await this.database.getNoteByUniqueId(uniqueId)
        if (!note) return undefined;
        return await this.bearNoteToDocumentData(note)
    }

    async loadByName(ns: string, name: string): Promise<DocumentStorageData<BearSqlNote> | undefined> {
        const notes = await this.database.getNotes({
            limit: 1,
            titleExact: name,
            tagsInclude: [ns],
            orderBy: 'newest',
        })
        if (notes.length == 0) return undefined;
        return await this.bearNoteToDocumentData(notes[0])
    }
}
