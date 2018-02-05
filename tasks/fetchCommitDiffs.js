'use strict'

const fsExtra = require('fs-extra')
const path = require('path')
const db = require('../db')
const ResumeInfo = require('./resumeInfo')
const config = require('../config')
const { executeGit, executeGitLines } = require('./common')

async function fetchDiffs (destinationDB, resumeInfo) {
  const destinationDir = path.join(process.cwd(), 'targetrepo')

  if (resumeInfo.reset) {
    fsExtra.removeSync(destinationDir)
    const repoURL = `git@github.com:${config.REPO_OWNER}/${config.REPO_NAME}.git`
    await executeGit(['clone', repoURL, destinationDir])

    await resumeInfo.update({ reset: false })
  }

  const sourceCollection = destinationDB.collection('pull_requests')
  const pullReqNumbers = await sourceCollection.distinct('number')

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
