const db = require('../db')
const ResumeInfo = require('./resumeInfo')
const config = require('../config')
const Progress = require('progress')
const request = require('request-promise')
const _ = require('lodash')
const fs = require('fs')
const async = require('async')

async function fetchUserInfo (destinationDB, resumeInfo) {
  const sourceCollection = destinationDB.collection('pull_requests')
  const destinationCollection = destinationDB.collection('user')

  if (resumeInfo.reset) {
    const removeCollection = await destinationDB.collection('user')
    await removeCollection.remove({})
  }

  const users = await sourceCollection.distinct('user')
  let pendingUsers = []
  for (var i in users) {
    const user = users[i]
    const exists = await destinationCollection.count({ login: user.login })
    if (!exists) {
      pendingUsers.push(user)
    }
  }

  console.log('pendingUsers', pendingUsers.length)

  const bar = new Progress(
    `fetching [:bar] :current / :total  (:percent) :rate user info/s :etas`,
    { total: users.length, curr: users.length - pendingUsers.length }
  )
  const queryTemplate = _.template(
    fs.readFileSync('templates/fetchUser.ql', {encoding: 'utf-8'})
  )

  const fetchTasks = _.map(pendingUsers, (user, idx) => {
    return (callback) => {
      const query = queryTemplate({user: user.login})
      request.post({
        uri: 'https://api.github.com/graphql',
        body: { query: query },
        auth: {
          bearer: config.GITHUB_ACCESS_TOKEN,
          sendImmediately: true
        },
        json: true,
        headers: { 'User-Agent': 'Igui\'s requester', 'Authorization': `token ${config.GITHUB_ACCESS_TOKEN}` },
        qs: { }
      }).then(async (response) => {
        if (response.data && response.data.user) {
          response.data.user.login = user.login
          await destinationCollection.insert(response.data.user)
        }
        bar.tick()
        resumeInfo.update(destinationDB, { page: idx + 1 })
        callback()
      })
    }
  })

  return new Promise((resolve, reject) => {
    const onFinish = (err) => {
      if (err) {
        reject(err)
      } else {
        resumeInfo.update(destinationDB, { complete: true })
        resolve()
      }
    }
    async.parallelLimit(fetchTasks, 5, onFinish)
  })
}

async function performTask (task) {
  const resumeDB = await db()
  try {
    const resumeInfo = await new ResumeInfo(task).loadFrom(resumeDB)

    if (resumeInfo.complete) {
      console.log('Completed')
      // return
    }
    if (resumeInfo.reset) {
      console.log('Resetting')
      return
    }

    await fetchUserInfo(resumeDB, resumeInfo)

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

  await performTask({ name: 'fetchUserInfo' })
}

if (require.main === module) {
  main()
}

