import * as T from "@asmartbear/testutil"
import * as ST from '@asmartbear/smarttype'
import { Document } from '../src/doc'
import { Database } from '../src/db'
import { InMemoryDriver } from '../src/memory'

const FM = ST.OBJ({
    foo: ST.ARRAY(ST.NUM().int().min(0)),
})

const FM2 = ST.OBJ({
    foo: ST.NUM(),
})

test('creating, saving, retrieving some documents', async () => {
    const driver = new InMemoryDriver()
    const db = new Database(driver)

    T.undef(await db.loadById(FM, 'abcd'))
    T.undef(await db.loadByName(FM, 'n', 'a'))
    T.undef(await db.loadByName(FM, 'n', 'b'))
    T.undef(await db.loadByName(FM, 'm', 'a'))
    T.undef(await db.loadByName(FM, 'm', 'b'))

    // Create objects
    const a = await db.create(FM, 'n', 'a', { foo: [1, 2, 3] }, 'hello')
    T.eq(a.ns, 'n')
    T.eq(a.name, 'a')
    T.eq(a.frontMatter, { foo: [1, 2, 3] })
    T.eq(a.text, "hello")
    T.len(a.uniqueId, 36, "a UUID")

    T.undef(await db.loadByName(FM, 'm', 'a'))
    T.undef(await db.loadByName(FM, 'n', 'b'))
    T.be(await db.loadByName(FM, 'n', 'a'), a, "returns same object")
    T.undef(await db.loadById(FM, 'abcd'))
    T.be(await db.loadById(FM, a.uniqueId), a, "got it by unique ID")

    const b = await db.create(FM, 'm', 'a', { foo: [9, 16, 25] }, 'there')
    T.eq(b.ns, 'm')
    T.eq(b.name, 'a')
    T.eq(b.frontMatter, { foo: [9, 16, 25] })
    T.eq(b.text, "there")
    T.len(b.uniqueId, 36, "a UUID")
    T.eq(a.uniqueId != b.uniqueId, true)

    T.undef(await db.loadByName(FM, 'm', 'b'))
    T.undef(await db.loadByName(FM, 'n', 'b'))
    T.be(await db.loadByName(FM, 'n', 'a'), a, "returns same object")
    T.be(await db.loadByName(FM, 'm', 'a'), b, "returns same object")
    T.be(await db.loadById(FM, a.uniqueId), a, "got it by unique ID")
    T.be(await db.loadById(FM, b.uniqueId), b, "got it by unique ID")

    // Update objects
    b.text = 'fancy'
    a.frontMatter.foo[1] = 999
    T.eq(a.isDirty, true)
    T.eq(b.isDirty, true)
    await db.save()
    T.eq(a.isDirty, false as any)
    T.eq(b.isDirty, false as any)
    T.be(await db.loadById(FM, a.uniqueId), a, "still same in-memory object")
    T.be(await db.loadById(FM, b.uniqueId), b, "still same in-memory object")
    T.eq((await driver.loadById(a.uniqueId))?.text, 'hello', "driver data is also updated")
    T.eq((await driver.loadById(b.uniqueId))?.text, 'fancy', "driver data is also updated")
    T.eq((await driver.loadById(a.uniqueId))?.frontMatter, { foo: [1, 999, 3] }, "driver data is also updated")
    T.eq((await driver.loadById(b.uniqueId))?.frontMatter, { foo: [9, 16, 25] }, "driver data is also updated")

    // Clear caches so we can load objects from the driver
    db.clearCache()
    const c = await db.loadById(FM, a.uniqueId)
    T.defined(c)
    T.is(c != a, "different objects")
    T.eq(c.frontMatter, a.frontMatter)
    T.eq(c.text, a.text)

    const d = await db.loadByName(FM, b.ns, b.name)
    T.defined(d)
    T.is(d != b, "different objects")
    T.eq(d.frontMatter, b.frontMatter)
    T.eq(d.text, b.text)
})

test('load or create', async () => {
    const driver = new InMemoryDriver()
    const db = new Database(driver)

    // create if new
    const a = await db.loadByNameOrCreate(FM, 'n', 'a', { foo: [1, 2, 3] }, 'hello')
    T.eq(a.ns, 'n')
    T.eq(a.name, 'a')
    T.eq(a.frontMatter, { foo: [1, 2, 3] })
    T.eq(a.text, "hello")
    T.len(a.uniqueId, 36, "a UUID")

    // "create" again with different initial conditions, has same result because it loaded it first
    const b = await db.loadByNameOrCreate(FM, 'n', 'a', { foo: [4] }, 'hi')
    T.be(a, b, "same object even")
    T.eq(b.ns, 'n')
    T.eq(b.name, 'a')
    T.eq(b.frontMatter, { foo: [1, 2, 3] })
    T.eq(b.text, "hello")
    T.len(b.uniqueId, 36, "a UUID")
})
