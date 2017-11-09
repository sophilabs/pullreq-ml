'use strict';

const MongoClient = require('mongodb').MongoClient
  , co = require('co')
  , progress = require('progress')
  , request = require('request-promise')
  , path = require('path')
  , fs = require('fs')
  , fsExtra = require('fs-extra')
  , async = require('async')
  , _ = require('lodash');


function *fetchAllPages(baseUrl, destinationCollection, objectName, pageEstimate) {
  var destinationDB = yield MongoClient.connect(destinationURL);

  var destinationCollection = destinationDB.collection(destinationCollection);
  yield destinationCollection.remove({});

  var bar = new progress(
    `fetching [:bar] :rate ${objectName} pages/s :percent :etas`,
    { total: pageEstimate }
  );

  console.log(`Downloading ${objectName} pages`);
  var bulk = destinationCollection.initializeOrderedBulkOp();

  for(var page_number=1; ;++page_number) {
    const url = `${baseUrl}&per_page=100&page=${page_number}`;
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
  yield bulk.execute();

  destinationDB.close();
}

function *fetchCommits() {
  const baseUrl = `http://api.github.com/repos/${owner}/${repo}/commits?`;
  yield fetchAllPages(baseUrl, 'commits', 'commit', 100);
}

function *fetchPullRequests() {
  const baseUrl = `http://api.github.com/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=ascending`
  yield fetchAllPages(baseUrl, 'pulls', 'pull req', 100);
}

function *fetchCommitDiffs() {
  const destinationDB = yield MongoClient.connect(destinationURL);

  const destinationDir = path.join(process.cwd(), 'pull_diffs');
  yield fsExtra.ensureDir(destinationDir);

  const sourceCollection = destinationDB.collection('pulls');

  console.log(`Computing needed commit_diff pages`);
  const sourceDocs = sourceCollection.find({});
  let jobs = [];
  while(yield sourceDocs.hasNext()) {
    const sourceDoc = yield sourceDocs.next();
    const destinationPath = path.join(destinationDir, `${sourceDoc.id}.diff`);

    if(fs.existsSync(destinationPath)) {
      continue;
    }
    jobs.push({ 
      id: sourceDoc.id,
      url: sourceDoc.diff_url,
      destinationPath: destinationPath
    });
  }
  destinationDB.close();  
  
  console.log(`Downloading commit_diff pages #${jobs.length}`);
  const bar = new progress(
    `fetching [:bar] :rate commit_diff pages/s :percent :etas`,
    { total: jobs.length }
  );

  for(var i in jobs) {
    var job = jobs[i];

    try {
      var rawDiff = request({
        uri: job.url,
        json: false,
        headers: { 'User-Agent': 'Igui\'s requester' },
        pool: {
          maxSockets: 1
        },
        qs: { access_token: githubAccessToken }
      });
      fs.writeFileSync(job.destinationPath, rawDiff);
    } catch(error) {
      if(error.statusCode != 404) {
          throw error;
      }
      else {
         fs.writeFileSync(job.destinationPath, "");
      }
    } finally {
      bar.tick();
    }
  }
}

function *fetchUserEvents() {
  const destinationDB = yield MongoClient.connect(destinationURL);

  const sourceCollection = destinationDB.collection('pulls');
  const destinationCollection = destinationDB.collection('events');

  const eventUrls = yield sourceCollection.distinct('user');

  const bar = new progress(
    `fetching [:bar] :rate user_event timeline/s :percent :etas`,
    { total: eventUrls.length }
  );

  var bulk = destinationCollection.initializeOrderedBulkOp();
  for(var i in eventUrls) {
    const baseUrl = eventUrls[i].events_url.replace('{/privacy}', '') + '?';
    
    const MAX_ALLOWED_PAGE_NUMBER = 4
    for(var page_number=1; page_number < MAX_ALLOWED_PAGE_NUMBER ;++page_number) {
      const url = `${baseUrl}&per_page=100&page=${page_number}`;
      var elements = yield request({
        uri: url,
        json: true,
        headers: { 'User-Agent': 'Igui\'s requester' },
        qs: { access_token: githubAccessToken }
      });
      if(elements.length == 0) {
        break;
      }
      elements.forEach((doc) => {
        bulk.insert(doc);
      });
    }
    bar.tick();
  }

  console.log('Inserting results');
  yield bulk.execute();
  
  destinationDB.close();
}

async function fetchUserInfo() {
  const destinationDB = await MongoClient.connect(destinationURL);

  const sourceCollection = destinationDB.collection('pulls');
  const destinationCollection = destinationDB.collection('user');

  await destinationCollection.deleteMany({});

  const users = await sourceCollection.distinct('user.login');
  const userQL = fs.readFileSync('fetchUser.ql', {encoding: 'utf-8'});
  const bar = new progress(
    `fetching [:bar] :rate user info/s :percent :etas`,
    { total: users.length }
  );

  const fetchTasks = users.map((user) => {
    return (callback) => {
      const query = userQL.replace('${user}', JSON.stringify(user));
      request.post({
        uri: 'https://api.github.com/graphql',
        body: { query: query },
        auth: {
          bearer: githubAccessToken,
          sendImmediately: true
        },
        json: true,
        headers: { 'User-Agent': 'Igui\'s requester' },
        qs: { access_token: githubAccessToken }
      })
      .then(async (response) => {
        // console.log('answer', JSON.stringify(response.data.user, null, 4));
        await destinationCollection.insert(response.data.user);
        bar.tick();
        callback();
      });
    }
  });

  const insertResults = async () => {
    destinationDB.close();
  }

  async.parallelLimit(fetchTasks, 5, insertResults);
}

async function fetchIntegrators() {
  const pageSize = 50;
  const destinationDB = await MongoClient.connect(destinationURL);

  const destinationCollection = destinationDB.collection('integrators');
  await destinationCollection.deleteMany({});

  const pullRequestQL = _.template(fs.readFileSync('pullRequest.ql', {encoding: 'utf-8'}));
  let bar = null;

  const handleResponse = (query, response) => {
    const pullRequests = response.data.repository.pullRequests;
    if (bar == null) {
      const totalPages = Math.ceil(pullRequests.totalCount / pageSize); 
      console.log('Total pages', totalPages);
      bar = new progress(
        `fetching [:bar] :rate merge request pages/s :percent :etas`,
        { total: totalPages }
      );
    }

    bar.tick();  

    // console.log('Got nodes', pullRequests.nodes.length);
    if (pullRequests.pageInfo.hasNextPage) {
      // console.log('Got more pages', pullRequests.pageInfo.endCursor);
      fetchNextPage(pullRequests.pageInfo.endCursor);
    } else {
      console.log('Finished');      
    }
  }

  const fetchNextPage = (after) => {
    const query = pullRequestQL({
      pageSize: pageSize,
      after: after
    });
    request.post({
      uri: 'https://api.github.com/graphql',
      body: { query: query },
      auth: {
        bearer: githubAccessToken,
        sendImmediately: true
      },
      json: true,
      headers: { 'User-Agent': 'Igui\'s requester' },
    })
    .then((response) => {
      handleResponse(query, response);
    });
  }
  
  fetchNextPage();
}

function unhandledRejection(err) {
  console.error(err);
  process.exit(1);
}



process.on('unhandledRejection', unhandledRejection);



fetchCommits();
fetchPullRequests();
fetchCommitDiffs();
fetchUserEvents();
fetchUserInfo();
fetchIntegrators();