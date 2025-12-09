import * as T from '@asmartbear/testutil'
import { Path } from '@asmartbear/filesystem'
import { parseUrlData } from '../src/urls'
import { convertMetascaperResultToCitationMetadata, formatCitation } from '../src/citation'

/** Parse HTML from our test directory */
async function parseTextHtml(url: string, filename: string) {
    return parseUrlData(url, await new Path(__dirname).join('html', filename).readAsString())
}

test('fastcompany', async () => {
    const url = "https://www.fastcompany.com/3033567/brainstorming-doesnt-work-try-this-technique-instead"
    const parsed = await parseTextHtml(url, "fastcompany.html")
    T.eq(parsed, {
        "author": "Rebecca Greenfield",
        "date": "2017-04-18T20:48:59.000Z",
        "dateModified": "2017-04-18T20:48:59.000Z",
        "datePublished": "2014-07-29T10:06:00.000Z",
        "description": "Ever been in a meeting where one loudmouth’s mediocre idea dominates? Then you know brainstorming needs an overhaul.",
        "image": "https://images.fastcompany.com/image/upload/f_auto,q_auto,c_fit/fc/3033567-poster-p-1-brainwriting-is-the-new-brainstorming.jpg",
        "logo": "https://images.fastcompany.com/image/upload/f_webp,q_auto,c_fit/wp-cms-2/2024/03/fc_logo.png",
        "publisher": "Fast Company",
        "title": "Brainstorming Doesn’t Work; Try This Technique Instead",
        "url": "https://www.fastcompany.com/3033567/brainstorming-doesnt-work-try-this-technique-instead/",     // has trailing; that's saved
    })
    const citeMeta = convertMetascaperResultToCitationMetadata(url, parsed)
    T.includes(citeMeta, {
        type: 'webpage',
        URL: "https://www.fastcompany.com/3033567/brainstorming-doesnt-work-try-this-technique-instead/",
        title: "Brainstorming Doesn’t Work; Try This Technique Instead",
        abstract: "Ever been in a meeting where one loudmouth’s mediocre idea dominates? Then you know brainstorming needs an overhaul.",
        author: [{ family: "Greenfield", given: "Rebecca" }],
        issued: { "date-parts": [[2014, 7, 29]] },
        "container-title": "Fast Company",
    })
    T.eq(formatCitation(citeMeta), "Greenfield, R. (2014, July 29). <i>Brainstorming Doesn’t Work; Try This Technique Instead</i>. Fast Company. https://www.fastcompany.com/3033567/brainstorming-doesnt-work-try-this-technique-instead/")
})