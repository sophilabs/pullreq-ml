'use strict'

const Progress = require('progress')
const request = require('request-promise')
const config = require('../config')
const _ = require('lodash')

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
      headers: { 'User-Agent': 'Igui\'s requester' },
      qs: { access_token: config.GITHUB_ACCESS_TOKEN }
    })

    if (objects.length === 0) {
      break
    }

    var bulk = destinationCollection.initializeOrderedBulkOp()
    _(objects).each((obj) => { bulk.insert(obj) })
    await bulk.execute()
    bar.tick()
    options.resumeInfo.page = pageNumber
    options.resumeInfo.update(options.db)
  }

  options.resumeInfo.update(options.db, { complete: true })
};

module.exports = {
  fetchAllPages: fetchAllPages
}
