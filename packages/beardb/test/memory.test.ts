import * as T from "@asmartbear/testutil"
import { InMemoryDriver } from '../src/memory'
import { NewDocumentStorageData } from "../src/driver"

test('creating, saving, retrieving some documents', async () => {
    const driver = new InMemoryDriver()

    T.undef(await driver.loadById('abcd'))
    T.undef(await driver.loadByName('n', 'a'))
    T.undef(await driver.loadByName('n', 'b'))
    T.undef(await driver.loadByName('m', 'a'))
    T.undef(await driver.loadByName('m', 'b'))

    const d1: NewDocumentStorageData = { ns: 'n', name: 'a', frontMatter: { foo: 123 }, text: "hi" }
    const a = await driver.create(d1)
    T.eq(a.ns, 'n')
    T.eq(a.name, 'a')
    T.eq(a.frontMatter, { foo: 123 })
    T.eq(a.text, "hi")
    T.len(a.uniqueId, 36, "a UUID")

    T.undef(await driver.loadByName('m', 'a'))
    T.undef(await driver.loadByName('n', 'b'))
    T.eq(await driver.loadByName('n', 'a'), a)
    T.undef(await driver.loadById('abcd'))
    T.eq(await driver.loadById(a.uniqueId), a, "got it by unique ID")
    T.eq((await driver.loadById(a.uniqueId)) != a, true, "loading isn't the same object as we have")

    const d2: NewDocumentStorageData = { ns: 'm', name: 'a', frontMatter: { bar: 321 }, text: "there" }
    const b = await driver.create(d2)
    T.eq(b.ns, 'm')
    T.eq(b.name, 'a')
    T.eq(b.frontMatter, { bar: 321 })
    T.eq(b.text, "there")
    T.len(b.uniqueId, 36, "a UUID")
    T.eq(a.uniqueId != b.uniqueId, true)

    T.undef(await driver.loadByName('s', 'a'))
    T.undef(await driver.loadByName('n', 'b'))
    T.eq(await driver.loadByName('n', 'a'), a)
    T.eq(await driver.loadByName('m', 'a'), b)

    b.text = 'fancy'
    b.frontMatter.bar = 999
    T.eq((await driver.loadByName('m', 'a'))?.text, 'there', "text not changed yet in the driver")
    await driver.save(b)
    T.eq(await driver.loadByName('m', 'a'), b)
})

