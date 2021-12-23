'use strict'

const fetchCommits = require('./tasks/fetchCommits')
const fetchPullRequests = require('./tasks/fetchPullRequests')
const fetchCommitDiffs = require('./tasks/fetchCommitDiffs')
const fetchUserEvents = require('./tasks/fetchUserEvents')
const fetchUserInfo = require('./tasks/fetchUserInfo')
const fetchIntegrators = require('./tasks/fetchIntegrators')
const computeHotness = require('./tasks/computeHotness')
const setUsersId = require('./tasks/setUsersId')
const config = require('./config')

const repoTasks = [
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
    name: 'fetchIntegrators',
    cb: fetchIntegrators
  },
  {
    name: 'computeHotness',
    cb: computeHotness
  }
]

const otherTasks = [
  {
    name: 'fetchUserEvents',
    cb: fetchUserEvents
  },
  {
    name: 'fetchUserInfo',
    cb: fetchUserInfo
  },
  {
    name: 'setUsersId',
    cb: setUsersId
  }
]

async function performTask (task, index, total, repoName) {
  console.log(`#${index}/${total} - ${task.name}`)
  if (task.cb) {
    task.repoOwner = config.REPO_OWNER
    task.repoName = repoName
    await task.cb(task)
  }
}

function unhandledRejection (err) {
  console.error(err)
  process.exit(1)
}

async function main () {
  process.on('unhandledRejection', unhandledRejection)

  const repos = config.REPO_NAMES
  for (let repo in repos) {
    for (let index in repoTasks) {
      const task = repoTasks[index]
      await performTask(task, parseInt(index) + 1, repoTasks.length, repos[repo])
    }
  }
  for (let index in otherTasks) {
    const task = otherTasks[index]
    await performTask(task, parseInt(index) + 1, otherTasks.length, 'NA')
  }

}

main()
