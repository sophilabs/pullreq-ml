//! /usr/bin/env node

const db = require('../db')
const ResumeInfo = require('./resumeInfo')

async function resetTask (destinationDB, resumeInfo) {
}

async function setUsersId (destinationDB, resumeInfo) {
  const sourceCollection = await destinationDB.collection('user')
  const ids = await sourceCollection.distinct('id')
  const bulk = sourceCollection.initializeUnorderedBulkOp()

  for (var i in ids) {
    const base64UserId = ids[i]
    const asciiId = Buffer.from(base64UserId, 'base64').toString().substring(7)
    const intId = parseInt(asciiId)
    bulk.find({id: base64UserId}).updateOne({$set: { userId: intId }})
  }

  await bulk.execute()
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

    await setUsersId(resumeDB, resumeInfo)
  } finally {
    resumeDB.close()
  }
}

module.exports = performTask
