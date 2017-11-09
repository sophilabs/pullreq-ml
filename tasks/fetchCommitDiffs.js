'use strict'

const fsExtra = require('fs-extra')
const path = require('path')
const fs = require('fs')
const db = require('../db')
const Progress = require('progress')
const ResumeInfo = require('./resumeInfo')
const request = require('request-promise')
const config = require('../config')

async function fetchDiffs (destinationDB, resumeInfo) {
  const destinationDir = path.join(process.cwd(), 'pull_diffs')

  if (resumeInfo.reset) {
    fsExtra.removeSync(destinationDir)
  }
  fsExtra.ensureDirSync(destinationDir)

  const sourceCollection = destinationDB.collection('pull_requests')

  const sourceDocs = sourceCollection.find({})
  let jobs = []
  let doneJobs = 0

  while (await sourceDocs.hasNext()) {
    const sourceDoc = await sourceDocs.next()
    const destinationPath = path.join(destinationDir, `${sourceDoc.id}.diff`)

    if (fs.existsSync(destinationPath)) {
      ++doneJobs
    } else {
      jobs.push({
        id: sourceDoc.id,
        url: sourceDoc.diff_url,
        destinationPath: destinationPath
      })
    }
  }

  if (jobs.length === 0) {
    resumeInfo.update(destinationDB, { complete: true })
    return
  }

  const total = jobs.length + doneJobs

  console.log(`Downloading commit_diff pages #${jobs.length}`)
  const bar = new Progress(
    `fetching [:bar] :current / :total :rate commit_diff pages/s :percent :etas`,
    { total: total, curr: doneJobs }
  )
  resumeInfo.update(destinationDB, { reset: false, complete: false, totalPages: total, page: doneJobs })

  for (var i in jobs) {
    var job = jobs[i]

    try {
      const rawDiff = await request({
        uri: job.url,
        json: false,
        headers: { 'User-Agent': 'Igui\'s requester' },
        pool: {
          maxSockets: 1
        },
        qs: { access_token: config.GITHUB_ACCESS_TOKEN }
      })
      fs.writeFileSync(job.destinationPath, rawDiff)
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error
      } else {
        fs.writeFileSync(job.destinationPath, '')
      }
    } finally {
      resumeInfo.update(destinationDB, {
        page: doneJobs
      })
      bar.tick()
    }
  }

  resumeInfo.update(destinationDB, { complete: true })
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

    await fetchDiffs(resumeDB, resumeInfo)
  } finally {
    resumeDB.close()
  }
}

module.exports = performTask
