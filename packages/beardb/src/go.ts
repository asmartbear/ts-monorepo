import * as ST from '@asmartbear/smarttype'
import { BearDriver } from "./bear"
import { Database } from "./db"
import { BearSqlDatabase } from '@asmartbear/sqlight';

const FM = ST.OBJ({
    foo: ST.ARRAY(ST.NUM().int().min(0)),
});

(async () => {
    const db = new Database(new BearDriver(BearSqlDatabase.singleton()))

    const doc = await db.create(FM, 'db/testing', 'foo', { foo: [1, 4, 9] }, 'from the database')
    console.log(doc.uniqueId)

    // const doc = await db.loadByName(FM, 'db/testing', 'foo')
    // console.log(doc?.uniqueId)
    // console.log(doc?.ns)
    // console.log(doc?.name)
    // console.log(doc?.text)
    // console.log(doc?.frontMatter)

    doc?.frontMatter.foo.push(1)
    await db.save()

})().then(() => console.log("done"))