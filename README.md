# Github PR prediction (pullreq-ml)


This Node/Python library creates ml features for Pull Requests by learning information about a Github Project. The aim of this library is to aid data scientists build ml models for predicting pull request behaviour 

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

What things you need to install the software and how to install them

You will need the following:
* [Python 3.6](https://www.python.org/downloads/) or newer
* [Node 8](https://nodejs.org/en/download/) or newer
* [MongoDB](https://www.mongodb.com/download-center) 3.2 or newer
* [Git](https://git-scm.com/downloads)
* A Github Access Token for using the Github API. This [post](https://github.com/blog/1509-personal-api-tokens) explains how to get yours.

### Installing & Running

0. Choose a project to predict. In this document I will use https://github.com/Netflix/pygenie, because it is smaller, but you can use any, like the [Node](https://github.com/nodejs/node/) project
1. Clone this repository into your machine:

    ```bash
    git clone https://github.com/sophilabs/pullreq-ml.git
    ```
2. (Optional) Install your local copy into a virtual environment. For example using the [venv](https://docs.python.org/3/library/venv.html) library you can do the following.
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies
   ```bash
   cd pullreq-ml # or pullreq-ml-master
   npm install
   pip install -r requirements.txt
   ```
4. Run mongo
   ```bash
   docker run -p 27017:27017 --name some-mongo -d mongo
   ```
5. Replace the contents of [`config.js`](config.js) with the actual repo and database authentication. For example
   ```javascript
    module.exports = {
        // Local Mongo DB
        MONGO_DB_URL: 'mongodb://github:github@localhost:27017/github',
        // Token
        GITHUB_ACCESS_TOKEN: '<your token here>',
        // Repo Information for example for https://github.com/Netflix/pygenie you should put
    }
   ```
5. Clone the target repos inside the `targetrepo` folder
   ```bash
   cd targetrepo
   git clone https://github.com/Netflix/pygenie.git 
   ```
6. Start fetching Repo information
   ```bash
   node fetch.js
   ```
7. Create a features df for the PRs
   ```bash
   python evaluate.py
   ```
