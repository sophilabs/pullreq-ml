'use strict';

const MongoClient = require('mongodb').MongoClient
  , assert = require('assert')
  , co = require('co')
  , progress = require('progress')
  , request = require('request-promise');

// Over SSH
const sourceURL = 'mongodb://ghtorrentro:ghtorrentro@localhost:2701/github';

// Local
const destinationURL = 'mongodb://github:github@localhost:27017/github';

// Info
const githubAccessToken = 'ba0fc7545a9010f8e18f67eed8041433a7cbf206';

const owner = 'nodejs';
const repo = 'node';

function *fetchProjects() {
  var sourceDB = yield MongoClient.connect(sourceURL);
  var destinationDB = yield MongoClient.connect(destinationURL);
  console.log("Connected correctly to server");

  const sourceCollection = sourceDB.collection('repos');

  var total = yield sourceCollection.count({ name: repo, "owner.login": owner });
  console.log('repos #', total);
  var pullRequests = sourceCollection.find({ name: repo, "owner.login": owner });

  var bar = new progress(
    'fetching [:bar] :rate repos/s :percent :etas',
    { total: total }
  );

  var destinationCollection = destinationDB.collection('repos');
  // Create ordered bulk, for unordered initializeUnorderedBulkOp()
  var bulk = destinationCollection.initializeOrderedBulkOp();

  // Iterate over the cursor
  while(yield pullRequests.hasNext()) {
    var doc = yield pullRequests.next();
    bulk.insert(doc);
    bar.tick();
  }

  console.log('Inserting results');
  var result = yield bulk.execute();

  sourceDB.close();
  destinationDB.close();
}

function *fetchPullRequests () {
  var sourceDB = yield MongoClient.connect(sourceURL);
  var destinationDB = yield MongoClient.connect(destinationURL);
  console.log("Connected correctly to server");

  const sourceCollection = sourceDB.collection('pull_requests');
  yield sourceCollection.remove({});

  var total = yield sourceCollection.count({ repo: repo, owner: owner });
  console.log('pull_req #', total);
  var pullRequests = sourceCollection.find({ repo: repo, owner: owner });

  var bar = new progress(
    'fetching [:bar] :rate pull_req/s :percent :etas',
    { total: total }
  );

  var destinationCollection = destinationDB.collection('pull_requests');
  // Create ordered bulk, for unordered initializeUnorderedBulkOp()
  var bulk = destinationCollection.initializeOrderedBulkOp();

  // Iterate over the cursor
  while(yield pullRequests.hasNext()) {
    var doc = yield pullRequests.next();
    bulk.insert(doc);
    bar.tick();
  }

  console.log('Inserting results');
  var result = yield bulk.execute();

  sourceDB.close();
  destinationDB.close();
}

function *fetchPullRequestComments () {
  var sourceDB = yield MongoClient.connect(sourceURL);
  var destinationDB = yield MongoClient.connect(destinationURL);
  console.log("Connected correctly to server");

  const sourceCollection = sourceDB.collection('pull_request_comments');
  yield sourceCollection.remove({});

  var total = yield sourceCollection.count({ repo: repo, owner: owner });
  console.log('pull_req comments #', total);
  var pullRequests = sourceCollection.find({ repo: repo, owner: owner });

  var bar = new progress(
    'fetching [:bar] :rate comments/s :percent :etas',
    { total: total }
  );

  var destinationCollection = destinationDB.collection('pull_request_comments');
  // Create ordered bulk, for unordered initializeUnorderedBulkOp()
  var bulk = destinationCollection.initializeOrderedBulkOp();

  // Iterate over the cursor
  while(yield pullRequests.hasNext()) {
    var doc = yield pullRequests.next();
    bulk.insert(doc);
    bar.tick();
  }

  console.log('Inserting results');
  var result = yield bulk.execute();

  sourceDB.close();
  destinationDB.close();
}

function *fetchUserProfiles () {
  var sourceDB = yield MongoClient.connect(sourceURL);
  var destinationDB = yield MongoClient.connect(destinationURL);
  console.log("Connected correctly to server");

  var destinationCollection = destinationDB.collection('users');
  yield destinationCollection.remove({});

  var userLogins = yield destinationDB
    .collection('pull_requests')
    .distinct("user.login");
  console.log('pull_req users #', userLogins.length);

  var sourceCollection = sourceDB.collection('users');

  var total = yield sourceCollection.count({ login: { $in: userLogins } });
  console.log('found users #', total);
  var users = sourceCollection.find({ login: { $in: userLogins }});

  var bar = new progress(
    'fetching [:bar] :rate users/s :percent :etas',
    { total: total }
  );

  var destinationCollection = destinationDB.collection('users');
  // Create ordered bulk, for unordered initializeUnorderedBulkOp()
  var bulk = destinationCollection.initializeOrderedBulkOp();

  // Iterate over the cursor
  while(yield users.hasNext()) {
    var doc = yield users.next();
    bulk.insert(doc);
    bar.tick();
  }

  console.log('Inserting results');
  var result = yield bulk.execute();

  sourceDB.close();
  destinationDB.close();
}

function *fetchAPICommits() {
  var pageEstimate = 200;

  var destinationDB = yield MongoClient.connect(destinationURL);
  console.log("Connected correctly to server");

  var destinationCollection = destinationDB.collection('raw_commits');
  yield destinationCollection.remove({});

  var bar = new progress(
    'fetching [:bar] :rate commit pages/s :percent :etas',
    { total: pageEstimate }
  );

  console.log('Downloading commits');
  var bulk = destinationCollection.initializeOrderedBulkOp();

  for(var page_number=1; ;++page_number) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?` +
      `per_page=100&page=${page_number}`;
    var commits = yield request({
      uri: url,
      json: true,
      headers: { 'User-Agent': 'Igui\'s requester' },
      qs: { access_token: githubAccessToken }
    });
    if(commits.length == 0) {
      break;
    }
    commits.forEach((doc) => {
      bulk.insert(doc);
    });
    bar.tick();
  }

  console.log('Inserting results');
  var result = yield bulk.execute();

  destinationDB.close();
}

function *fetchCommits () {
  var sourceDB = yield MongoClient.connect(sourceURL);
  var destinationDB = yield MongoClient.connect(destinationURL);
  console.log("Connected correctly to server");

  var destinationCollection = destinationDB.collection('commits');
  yield destinationCollection.remove({});

  var commitDigests = yield destinationDB
    .collection('raw_commits')
    .distinct("sha");
  console.log('commits #', commitDigests.length);

  var sourceCollection = sourceDB.collection('commits');

  var bar = new progress(
    'fetching [:bar] :rate commits/s :percent :etas',
    { total: commitDigests.length }
  );

  var destinationCollection = destinationDB.collection('commits');
  // Create ordered bulk, for unordered initializeUnorderedBulkOp()
  var bulk = destinationCollection.initializeOrderedBulkOp();

  for(var i = 0; i < commitDigests.length; ++ i) {
    var doc = yield sourceCollection.findOne({ sha: commitDigests[i] });
    if(doc) {
      // console.log(`Commit ${commitDigests[i]} not found`);
      bulk.insert(doc);
    }
    bar.tick();
  }

  console.log('Inserting results');
  var result = yield bulk.execute();

  sourceDB.close();
  destinationDB.close();
}

function unhandledRejection(err) {
  console.error(err)
  process.exit(1)
}

process.on('unhandledRejection', unhandledRejection);

// co(fetchCommits);
// co(fetchProjects);
// co(fetchPullRequests);
//co(fetchAPICommits);
co(fetchCommits);