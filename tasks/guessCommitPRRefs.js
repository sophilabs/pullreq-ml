//! /usr/bin/env node

const db = require('../db')
const ResumeInfo = require('./resumeInfo')
const path = require('path')
const { executeGitLines } = require('./common')

async function resetTask (destinationDB, resumeInfo) {
  const removeCollection = await destinationDB.collection('mergedprs_commits')
  await removeCollection.remove({})
  await resumeInfo.update(destinationDB, { reset: false })
}
async function computeCommitRefsPR (destinationDB, resumeInfo) {
  let prs = []

  await executeGitLines(
    ['log', '--format="%B"'],
    { cwd: path.join(process.cwd(), 'targetrepo'), maxBuffer: 500000 },
    (line) => {
      const match = /github.*\/(.*)\/(.*)\/pull\/(\d+)/.exec(line)
      if (!match) {
        return
      }
      prs.push({
        owner: match[1],
        repo: match[2],
        number: parseInt(match[3])
      })
    }
  )

  if (prs.length > 0) {
    const collection = await destinationDB.collection('mergedprs_commits')
    var bulk = collection.initializeOrderedBulkOp()
    prs.forEach((obj) => {
      bulk.insert(obj)
    })
    await bulk.execute()
  }
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
      await resetTask(resumeDB, resumeInfo)
    }

    await computeCommitRefsPR(resumeDB, resumeInfo)
  } finally {
    resumeDB.close()
  }
}

module.exports = performTask
