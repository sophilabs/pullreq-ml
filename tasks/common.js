'use strict'

const Progress = require('progress')
const request = require('request-promise')
const config = require('../config')
const _ = require('lodash')
const { execFile, spawn } = require('child_process')

/**
 *
 * @param {object} options
 */
async function fetchAllPages (options) {
  if (options.resumeInfo.reset) {
    const removeCollection = await options.db.collection(options.destinationCollectionName)
    await removeCollection.remove({})
  }

  const destinationCollection = await options.db.collection(options.destinationCollectionName)

  let bar = new Progress(
    `fetching [:bar] :rate ${options.objectName} pages/s :percent :etas`,
    options.resumeInfo.totalPages
  )
  bar.tick(options.resumeInfo.page - 1)

  for (var pageNumber = options.resumeInfo.page; ;++pageNumber) {
    const url = `${options.baseUrl}&per_page=100&page=${pageNumber}`
    const objects = await request({
      uri: url,
      json: true,
      headers: { 'User-Agent': 'Igui\'s requester', 'Authorization': `token ${config.GITHUB_ACCESS_TOKEN}` },
      qs: { }
    })

    if (objects.length === 0) {
      break
    }

    var bulk = destinationCollection.initializeOrderedBulkOp()
    _(objects).each((obj) => {
      obj.repoOwner = options.repoOwner
      obj.repoName = options.repoName
      bulk.insert(obj)
    })
    await bulk.execute()
    bar.tick()
    options.resumeInfo.page = pageNumber
    options.resumeInfo.update(options.db)
  }

  options.resumeInfo.update(options.db, { complete: true })
};

function executeGit (cmdargs, options) {
  return new Promise((resolve, reject) => {
    const fetchCMD = spawn('git', cmdargs, options)

    fetchCMD.stdout.on('data', (data) => {
      process.stdout.write(data)
    })

    fetchCMD.stderr.on('data', (data) => {
      process.stderr.write(data)
    })

    fetchCMD.on('exit', (code) => {
      if (code) {
        reject(new Error(
          `Child process exited with code ${code}. Args ${cmdargs.join(' ')}.`
        ))
      } else {
        resolve(code)
      }
    })
  })
}

function executeGitLines (cmdargs, options, onLine) {
  return new Promise((resolve, reject) => {
    const fetchCMD = spawn('git', cmdargs, options)

    let lastLine = ''

    fetchCMD.stdout.on('data', (data) => {
      const encodedInputData = data.toString('utf-8')
      let encodedData
      if (lastLine) {
        encodedData = lastLine + encodedInputData
      } else {
        encodedData = encodedInputData
      }

      const encodedDataLines = encodedData.split('\n')
      lastLine = _.last(encodedDataLines)
      _.chain(encodedDataLines).dropRight(1).each(onLine).value()
    })

    fetchCMD.stderr.on('data', (data) => {
      process.stderr.write(data)
    })

    fetchCMD.on('exit', (code) => {
      if (lastLine) {
        onLine(lastLine)
      }

      if (code) {
        reject(new Error(
          `Child process exited with code ${code}. Args ${cmdargs.join(' ')}`
        ))
      } else {
        resolve(code)
      }
    })
  })
}

function executeGitOutput (cmdargs, options) {
  return new Promise((resolve, reject) => {
    execFile('git', cmdargs, options, (error, stdout) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

module.exports = {
  fetchAllPages: fetchAllPages,
  executeGit: executeGit,
  executeGitOutput: executeGitOutput,
  executeGitLines: executeGitLines
}
