'use strict'

const fetchCommits = require('./tasks/fetchCommits')
const fetchPullRequests = require('./tasks/fetchPullRequests')
const fetchCommitDiffs = require('./tasks/fetchCommitDiffs')
const fetchUserEvents = require('./tasks/fetchUserEvents')
const fetchUserInfo = require('./tasks/fetchUserInfo')
const fetchIntegrators = require('./tasks/fetchIntegrators')
const computeHotness = require('./tasks/computeHotness')
const guessCommitPRRefs = require('./tasks/guessCommitPRRefs')
const setUsersId = require('./tasks/setUsersId')

const tasks = [
  {
    name: 'fetchCommits',
    cb: fetchCommits
  },
  {
    name: 'fetchPullRequests',
    cb: fetchPullRequests
  },
  {
    name: 'fetchCommitDiffs',
    cb: fetchCommitDiffs
  },
  {
    name: 'fetchUserEvents',
    cb: fetchUserEvents
  },
  {
    name: 'fetchUserInfo',
    cb: fetchUserInfo
  },
  {
    name: 'fetchIntegrators',
    cb: fetchIntegrators
  },
  {
    name: 'computeHotness',
    cb: computeHotness
  },
  {
    name: 'guessCommitPRRefs',
    cb: guessCommitPRRefs
  },
  {
    name: 'setUsersId',
    cb: setUsersId
  }
]

async function performTask (task, index, total) {
  console.log(`#${index}/${total} - ${task.name}`)
  if (task.cb) {
    await task.cb(task)
  }
}

function unhandledRejection (err) {
  console.error(err)
  process.exit(1)
}

async function main () {
  process.on('unhandledRejection', unhandledRejection)

  for (var index in tasks) {
    const task = tasks[index]
    await performTask(task, parseInt(index) + 1, tasks.length)
  }
}

main()
