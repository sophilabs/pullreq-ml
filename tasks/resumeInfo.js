'use strict'

const _ = require('lodash')

function ResumeInfo (task) {
  this.task = task
  this.page = 1
  this.cursor = null
  this.totalPages = null
  this.reset = true
  return this
};

ResumeInfo.prototype.allowedAttrs = ['page', 'cursor', 'totalPages', 'reset', 'complete']

ResumeInfo.prototype.loadFrom = async function (db) {
  const resumeCollection = db.collection('resume')

  const defaults = {
    page: 1,
    cursor: null,
    totalPages: 0,
    reset: false,
    complete: false
  }

  const taskName = `${this.task.repoOwner}_${this.task.repoName}_${this.task.name}`
  let dbResumeInfo = await resumeCollection.findOne({ task: taskName })
  const options = _.chain(dbResumeInfo).defaults(defaults).pick(this.allowedAttrs).value()

  _.assign(this, options)
  if (this.reset) {
    this.page = 1
    this.cursor = null
  }

  return this
}

ResumeInfo.prototype.update = async function (db, options) {
  _.assign(this, _.pick(this.allowedAttrs, options))

  const cleanedInfo = _.pick(this, ['page', 'cursor', 'totalPages', 'complete'])
  const resumeCollection = db.collection('resume')
  await resumeCollection.update(
    {task: `${this.task.repoOwner}_${this.task.repoName}_${this.task.name}`},
    {$set: _.extend({}, cleanedInfo, options, { reset: false })},
    {upsert: true}
  )
}

module.exports = ResumeInfo
