//! /usr/bin/env node

const db = require('../db')
const ResumeInfo = require('./resumeInfo')
const path = require('path')
const moment = require('moment')
const _ = require('lodash')
const { executeGit, executeGitOutput, executeGitLines } = require('./common')
const Progress = require('progress')

const COMMIT_HOTNESS_AGE_DAYS = 90

async function resetTask (destinationDB, resumeInfo) {
  const removeCollection = await destinationDB.collection('hotness')
  await removeCollection.remove({})
  await resumeInfo.update(destinationDB, { reset: false })
}

async function getCommitedFiles (commit, commitedFilesCache, repoName) {
  const files = commitedFilesCache[commit]
  if (files) {
    return files
  }

  const commitFiles = []
  await executeGitLines(
    ['diff-tree', '--no-commit-id', '--name-only', '-r', commit],
    { cwd: path.join(process.cwd(), `targetrepo/${repoName}`), maxBuffer: 500000 },
    (line) => { commitFiles.push(line) }
  )
  return (commitedFilesCache[commit] = commitFiles)
}

async function diffTree (base, head, repoName) {
  const lines = []
  await executeGitLines(
    ['diff-tree', '--no-commit-id', '--name-only', '-M', '-C', '-B', '-r',
      base, head],
    { cwd: path.join(process.cwd(), `targetrepo/${repoName}`) },
    (line) => { lines.push(line) }
  )

  const statLine = await executeGitOutput(
    ['diff-tree', '--no-commit-id', '--shortstat', '-M', '-C', '-B', '-r',
      base, head ],
    { cwd: path.join(process.cwd(), `targetrepo/${repoName}`) }
  )

  const statRegex = /\d+\D+(\d+)?(\D+(\d+))?/

  const match = statRegex.exec(statLine)
  if (match) {
    const insertions = match[1]
    const deletions = match[3]
    return { lines: lines, insertions: insertions || 0, deletions: deletions || 0 }
  } else {
    return { lines: lines, insertions: 0, deletions: 0 }
  }
}

async function getAllCommitedFiles (minDate, maxDate, commitedFilesCache, repoName) {
  const rawCommits = await executeGitOutput(
    ['log', '--until', maxDate, '--after', minDate, '--format=format:%H'],
    { cwd: path.join(process.cwd(), `targetrepo/${repoName}`) }
  )
  const commits = _.filter(rawCommits.split('\n'), _.identity)

  const result = {}

  for (var i in commits) {
    const files = await getCommitedFiles(commits[i], commitedFilesCache, repoName)
    files.forEach((filePath) => {
      result[filePath] = (result[filePath] || 0) + 1
    })
  }
  return result
}

async function commitExists (sha1, repoName) {
  return new Promise((resolve) => {
    const execPromise = executeGit(['cat-file', '-e', sha1], {
      cwd: path.join(process.cwd(), `targetrepo/${repoName}`)
    })
    execPromise.then(
      (exitCode) => { resolve(true) },
      (exitCode) => { resolve(false) })
  })
}

async function computePullRequest (pullRequest, commitedFilesCache, repoName) {
  if (!(await commitExists(pullRequest.head.sha, repoName)) ||
      !(await commitExists(pullRequest.base.sha, repoName))) {
    // This means the PR may be merged there is no information here
    return NaN
  }

  const maxDate = moment(pullRequest.created_at).utc().format()
  const minDate = moment(maxDate).subtract(COMMIT_HOTNESS_AGE_DAYS, 'd')
    .utc().format()

  const files = await getAllCommitedFiles(minDate, maxDate, commitedFilesCache, repoName)

  const diffTreeResult = await diffTree(pullRequest.base.sha, pullRequest.head.sha, repoName)

  if (diffTreeResult.lines.length === 0) {
    return {
      hotness: 0,
      insertions: 0,
      deletions: 0,
      hasTests: false
    }
  }

  const hasTests = _.findIndex(diffTreeResult.lines, (line) => {
    return line.indexOf('test') >= 0
  }) >= 0

  const ocurrences = _.chain(diffTreeResult.lines).map((file) => {
    return files[file] || 0
  }).sortBy().value()

  const hotnessIdx = Math.floor(ocurrences.length / 2)
  const hotness = ocurrences[hotnessIdx]
  return {
    hotness: hotness,
    insertions: diffTreeResult.insertions,
    deletions: diffTreeResult.deletions,
    hasTests: hasTests
  }
}

async function computeHotnessChurn (destinationDB, resumeInfo) {
  const commitedFilesCache = {}
  const pullRequests = await destinationDB.collection('pull_requests').find(
      { repoOwner: resumeInfo.task.repoOwner, repoName: resumeInfo.task.repoName }
  ).toArray() // .sort({ id: 1 })

  const destinationCollection = destinationDB.collection('hotness')

  const totalPullRequests = pullRequests.length
  const progress = new Progress(
    `computing [:bar] :rate pull requests/s :percent :etas`,
    { total: totalPullRequests, curr: 0 }
  )

  for (let idx in pullRequests) {
    const pullRequest = pullRequests[idx]
    const computed = await computePullRequest(pullRequest, commitedFilesCache, resumeInfo.task.repoName)

    const pullRequestForDB = {
      pullRequest: pullRequest.id,
      number: pullRequest.number,
      hotness: computed.hotness,
      insertions: computed.insertions,
      deletions: computed.deletions,
      hasTests: computed.hasTests,
      repoOwner: resumeInfo.task.repoOwner,
      repoName: resumeInfo.task.repoName
    }

    console.log('pullRequestForDB', pullRequestForDB)

    destinationCollection.update(
      { pullRequest: pullRequest.id },
      pullRequestForDB,
      { upsert: true }
    )
    progress.tick()

    resumeInfo.update(destinationDB, {
      totalPages: totalPullRequests,
      page: progress.curr,
      reset: false,
      complete: false
    })
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

    await computeHotnessChurn(resumeDB, resumeInfo)
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

  await performTask({ name: 'computeHotness', repoOwner: 'Hippo-Analytics-Inc', repoName: 'lead-scoring-service' })
}

if (require.main === module) {
  main()
}



