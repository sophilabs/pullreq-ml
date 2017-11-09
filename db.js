'use strict'

const MongoClient = require('mongodb').MongoClient
const config = require('./config')

module.exports = function () {
  return MongoClient.connect(config.MONGO_DB_URL)
}