const db = require('../db')
const ResumeInfo = require('./resumeInfo')
const config = require('../config')
const Progress = require('progress')
const request = require('request-promise')
const _ = require('lodash')
const fs = require('fs')

const PAGE_SIZE = 50

function base64ToId (base64str) {
  return Buffer.from(base64str, 'base64').toString('ascii')
    .replace(/^\d+:\w+\D/, '')
}

async function insertPullRequests (destinationDB, pullRequests) {
  const collection = await destinationDB.collection('integrators')

  const bulk = collection.initializeOrderedBulkOp()

  pullRequests.forEach((pullRequest) => {
    const pullRequestId = base64ToId(pullRequest.id)

    _.chain(pullRequest.timeline.nodes)
      .filter((event) => { return !_.isEmpty(event) })
      .each((event) => {
        const mappedEvent = {
          id: base64ToId(event.id),
          pull_request: pullRequestId,
          actor: event.actor.login,
          createdAt: event.createdAt,
          url: event.url
        }
        bulk.insert(mappedEvent)
      })
      .value()
  })

  await bulk.execute()
}

function initBar (resumeInfo, pullRequests) {
  const totalPages = Math.ceil(pullRequests.totalCount / PAGE_SIZE)
  console.log('Total pages', totalPages)
  return new Progress(
    `fetching [:bar] :rate merge request pages/s :percent :etas`,
    { total: totalPages, curr: resumeInfo.page }
  )
}

async function fetchIntegrators (destinationDB, resumeInfo) {
  if (resumeInfo.reset) {
    const removeCollection = await destinationDB.collection('integrators')
    await removeCollection.remove({})
    resumeInfo.update(destinationDB,
      { cursor: null, page: 0, totalPages: null }
    )
  }

  let bar

  return new Promise((resolve) => {
    const handleResponse = (query, response) => {
      const pullRequests = response.data.repository.pullRequests
      if (!bar) {
        bar = initBar(resumeInfo, pullRequests)
      }

      bar.tick()
      if (pullRequests.pageInfo.hasNextPage) {
        fetchNextPage(pullRequests.pageInfo.endCursor)
      } else {
        resolve()
      }

      insertPullRequests(destinationDB, pullRequests.nodes)

      resumeInfo.update(
        destinationDB,
        {
          page: resumeInfo.page + 1,
          cursor: pullRequests.pageInfo.endCursor,
          complete: !pullRequests.pageInfo.hasNextPage
        }
      )
    }

    const pullRequestQL = _.template(
      fs.readFileSync('templates/pullRequest.ql', {encoding: 'utf-8'})
    )

    const fetchNextPage = (after) => {
      const query = pullRequestQL({
        pageSize: PAGE_SIZE,
        after: after,
        owner: resumeInfo.task.repoOwner,
        name: resumeInfo.task.repoName,
      })
      request.post({
        uri: 'https://api.github.com/graphql',
        body: { query: query },
        auth: {
          bearer: config.GITHUB_ACCESS_TOKEN,
          sendImmediately: true
        },
        json: true,
        headers: { 'User-Agent': 'Igui\'s requester' }
      }).then((response) => {
        handleResponse(query, response)
      })
    }

    return fetchNextPage(resumeInfo.cursor)
  })
}

async function performTask (task) {
  const resumeDB = await db()
  try {
    const resumeInfo = await new ResumeInfo(task).loadFrom(resumeDB)

    if (resumeInfo.complete) {
      console.log('Completed')
      return
    }
    if (resumeInfo.reset) {
      console.log('Resetting')
    }

    await fetchIntegrators(resumeDB, resumeInfo)
  } finally {
    resumeDB.close()
  }
}

module.exports = performTask

async function main () {
  process.on('unhandledRejection', (err) => {
    console.error(err)
    process.exit(1)
  })

  await performTask({ name: 'fetchIntegrators' })
}

if (require.main === module) {
  main()
}


