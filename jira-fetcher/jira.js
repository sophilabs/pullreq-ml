const {Version2Client} = require('jira.js')
const {getPR} = require('./pull_request')

const client = new Version2Client({
    host: 'https://myhippo.atlassian.net',
    authentication: {
        basic: {
            email: 'nalfasi@hippo.com',
            apiToken: process.env.TOKEN,
        },
    }
})

async function main() {
    const issues = await client.issueSearch.searchForIssuesUsingJql({
        jql: 'project = Hippo AND updatedDate >= "2020-01-01" AND  status IN (Reopened) ORDER BY ID DESC'
    })
    // console.log(issues);

    let i = 0
    for (let issue of issues.issues) {
        const {id, key: ticket} = issue
        const identifier = ticket.substring(ticket.indexOf('-') + 1)
        const pr = await getPR(id, identifier)
        if (!pr) continue;

        console.log(`For ticket [${ticket}] PR found: [${pr}]`)
        i++
        if (i > 3) break;
    }
}

main();
