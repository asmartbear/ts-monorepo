import * as T from "@asmartbear/testutil"
import * as ST from '@asmartbear/smarttype'
import { Document } from '../src/doc'

const UnitTestFrontMatterType = ST.OBJ({
    foo: ST.ARRAY(ST.NUM().int().min(0)),
})

test('document is dirty if text changes', () => {
    let doc = Document.fromStorageData(UnitTestFrontMatterType, { uniqueId: 'a', ns: 'db', name: 'title', frontMatter: { foo: [1, 2, 3] }, text: "hello", driverData: "dd" })
    T.eq(doc.frontMatter, { foo: [1, 2, 3] })
    T.eq(doc.text, "hello")
    T.eq(doc.isDirty, false)
    doc.text = "hello!"
    T.eq(doc.isDirty, true as any)
    T.eq(doc.getDocumentStorageData(), { uniqueId: 'a', ns: 'db', name: 'title', frontMatter: { foo: [1, 2, 3] }, text: "hello!", driverData: "dd" })
})

test('document is dirty if front matter changes', () => {
    let doc = Document.fromStorageData(UnitTestFrontMatterType, { uniqueId: 'a', ns: 'db', name: 'title', frontMatter: { foo: [1, 2, 3] }, text: "hello", driverData: "dd" })
    T.eq(doc.frontMatter, { foo: [1, 2, 3] })
    T.eq(doc.text, "hello")
    T.eq(doc.isDirty, false)
    doc.frontMatter.foo[1] = 10
    T.eq(doc.isDirty, true as any)
    T.eq(doc.getDocumentStorageData(), { uniqueId: 'a', ns: 'db', name: 'title', frontMatter: { foo: [1, 10, 3] }, text: "hello", driverData: "dd" })
})
