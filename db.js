'use strict'

const MongoClient = require('mongodb').MongoClient
const config = require('./config')

module.exports = async function () {
  let connection = await MongoClient.connect(config.MONGO_DB_URL)
  return connection.db('github')
}
