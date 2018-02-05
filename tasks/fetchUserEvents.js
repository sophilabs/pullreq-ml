'use strict'

const db = require('../db')
const Progress = require('progress')
const ResumeInfo = require('./resumeInfo')
const request = require('request-promise')
const config = require('../config')

async function fetchUserEvents (destinationDB, resumeInfo) {
  if (resumeInfo.reset) {
    const removeCollection = await destinationDB.collection('events')
    await removeCollection.remove({})
  }

  const sourceCollection = destinationDB.collection('pull_requests')
  const destinationCollection = destinationDB.collection('events')

  const users = await sourceCollection.distinct('user')

  const bar = new Progress(
    `fetching [:bar] :rate user_event timeline/s :percent :etas`,
    { total: users.length, curr: resumeInfo.page - 1 }
  )

  resumeInfo.update(destinationDB)

  for (var i in users) {
    const baseUrl = users[i].events_url.replace('{/privacy}', '') + '?'

    const bulk = destinationCollection.initializeOrderedBulkOp()
    const MAX_PAGES_PER_USER = 4
    for (var pageNumber = 1; pageNumber < MAX_PAGES_PER_USER; ++pageNumber) {
      const url = `${baseUrl}&per_page=100&page=${pageNumber}`

      var elements = await request({
        uri: url,
        json: true,
        headers: { 'User-Agent': 'Igui\'s requester' },
        qs: { access_token: config.GITHUB_ACCESS_TOKEN }
      })

      if (elements.length === 0) {
        break
      }
      elements.forEach((doc) => {
        bulk.insert(doc)
      })
    }
    await bulk.execute()
    resumeInfo.update(destinationDB, { page: i + 1 })
    bar.tick()
  }
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
      return
    }

    await fetchUserEvents(resumeDB, resumeInfo)
  } finally {
    resumeDB.close()
  }
}

module.exports = performTask
