const db = require('./db')
var wordcount = require('wordcount');

const pipeline = [
    {$match: {categories: "Bakery"}},
    {$group: {_id: "$stars", count: {$sum: 1}}}
];

const aggregations = [
    // Hotness
    {'$lookup': {
            "from": "hotness",
            "localField": "id",
            "foreignField": "pullRequest",
            "as": "hotness"
        }},
    {"$addFields": {
            "hotness": {"$arrayElemAt": ["$hotness", 0]},
        }},

    // Integrator
    {'$lookup': {
            "from": "integrators",
            "localField": "user.login",
            "foreignField": "actor",
            "as": "integrator"
        }},
    {"$addFields": {
            "integrator_count": {"$size": "$integrator"},
        }},

    // User info
    {'$lookup': {
            "from": "user",
            "localField": "user.id",
            "foreignField": "userId",
            "as": "userInfo"
        }},
    {"$addFields": {
            "userInfo": {"$arrayElemAt": ["$userInfo", 0]},
        }},

    // All needed fields
    {'$project': {
            "repoOwner": true,
            "repoName": true,
            "html_url": true,
            "number": true,
            "state": true,
            "title": true,
            "user": "$user.login",
            "body": true,
            "created_at": true,
            "author_association": true,
            "requested_reviewers": true,
            "requested_reviewers_count": {"$size": "$requested_reviewers"},
            "insertions": "$hotness.insertions",
            "deletions": "$hotness.deletions",
            "hotness": "$hotness.hotness",
            "hasTests": "$hotness.hasTests",
            "integrator_count": true,
            "user_followers": "$userInfo.followers.totalCount",
            "user_following": "$userInfo.following.totalCount",
            "user_mergedpr_count": "$userInfo.merged.totalCount",
            "user_closedpr_count": "$userInfo.closed.totalCount",
            "user_openpr_count": "$userInfo.open.totalCount"
        }}
]

async function writeCsv (keys, objs, filePath) {
    const writer = createWriteStream(filePath, {flags: 'w'});
    await writer.write(`${keys.join(',')}\n`);
    for (const obj of objs) {
        const vals = [];
        for (const key of keys) {
            vals.push(obj[key]);
        }
        await writer.write(`"${vals.join('","')}"\n`);
    }
    writer.close();
}

async function main() {
  process.on('unhandledRejection', (err) => {
    console.error(err)
    process.exit(1)
  })

  const resumeDB = await db()

  const aggCursor = await resumeDB.collection('pull_requests').aggregate(aggregations)
  const docs = []
  while (await aggCursor.hasNext()) {
    const doc = await aggCursor.next()
    delete doc['_id']
    doc.title_wc = wordcount(doc.title)
    delete doc['title']
    if (doc.body) {
      doc.body_wc = wordcount(doc.body)
      delete doc['body']
    }
    if (doc.requested_reviewers) {
      doc.requested_reviewers_count = doc.requested_reviewers.length
      delete doc['requested_reviewers']
    }
    docs.push(doc)
  }
  const keys = [
      'state', 'created_at', 'author_association', 'integrator_count', 'user', 'requested_reviewers_count',
      'insertions', 'deletions', 'hotness', 'hasTests', 'user_followers', 'user_following',
      'user_mergedpr_count', 'user_closedpr_count', 'user_openpr_count', 'title_wc', 'body_wc',
  ]

  await writeCsv(keys, docs, 'training_hippo.csv')

}

if (require.main === module) {
  main()
}
