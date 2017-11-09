'use strict'

const db = require('../db')
const ResumeInfo = require('./resumeInfo')
const config = require('../config')
const common = require('./common')

async function performTask (task) {
  const baseUrl = `http://api.github.com/repos/${config.REPO_OWNER}/${config.REPO_NAME}/commits?`
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
    if (!resumeInfo.totalPages) {
      resumeInfo.totalPages = 100
    }

    await common.fetchAllPages({
      db: resumeDB,
      baseUrl: baseUrl,
      objectName: 'commit',
      destinationCollectionName: 'commits',
      resumeInfo: resumeInfo
    })
  } finally {
    resumeDB.close()
  }
}

module.exports = performTask
