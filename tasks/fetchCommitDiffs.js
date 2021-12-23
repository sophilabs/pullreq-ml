'use strict'

const fsExtra = require('fs-extra')
const path = require('path')
const db = require('../db')
const ResumeInfo = require('./resumeInfo')
const { executeGit } = require('./common')
const _ = require('lodash')

async function fetchDiffs (destinationDB, resumeInfo) {
  const destinationDir = path.join(process.cwd(), `targetrepo/${resumeInfo.task.repoName}`)

  if (resumeInfo.reset) {
    fsExtra.removeSync(destinationDir)
    const repoURL = `git@github.com:${resumeInfo.task.repoOwner}/${resumeInfo.task.repoName}.git`
    await executeGit(['clone', repoURL, destinationDir])

    await resumeInfo.update({ reset: false })
  }

  const sourceCollection = await destinationDB.collection('pull_requests').find({ repoOwner: resumeInfo.task.repoOwner, repoName: resumeInfo.task.repoName}).toArray()
  const pullReqNumbers = _.uniq(_.map(sourceCollection, 'number'))

  const remotePulls = pullReqNumbers.map((pullReqNumber) => {
    return `pull/${pullReqNumber}/head`
  })

  const fetchArgs = ['fetch', 'origin'].concat(remotePulls)
  await executeGit(fetchArgs, {cwd: destinationDir})
  await resumeInfo.update(destinationDB, { complete: true })
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

    await fetchDiffs(resumeDB, resumeInfo)
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

  await performTask({ name: 'fetchCommitDiffs' })
}

if (require.main === module) {
  main()
}
