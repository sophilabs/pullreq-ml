# Github PR prediction (pullreq-ml)

![ETL process](https://d2wlcd8my7k9h4.cloudfront.net/media/images/575815bd-fb2d-4886-9c0f-90d1b07a9683.png)

This Node/Python library builds a model to predict if a particular Pull Request (PR) will be accepted when it is created, by learning information about a Github Project. The aim of this library is to aid Project integrator in managing PRs for a particular project. You can find more information about the model and how in this [article](https://sophilabs.co/blog/pr-prediction-machine-learning).

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
4. (Optional) Create a user for your MongoDB instance
   ```bash
   echo "db.createUser({ user: 'github', 'pwd': 'github', roles: ['readWrite'] })" | mongo github
   ```
5. Replace the contents of [`config.js`](config.js) with the actual repo and database authentication. For example
   ```javascript
    module.exports = {
        // Local Mongo DB
        MONGO_DB_URL: 'mongodb://github:github@localhost:27017/github',
        // Token
        GITHUB_ACCESS_TOKEN: '<your token here>',
        // Repo Information for example for https://github.com/Netflix/pygenie you should put
        REPO_OWNER: 'Netflix',
        REPO_NAME: 'pygenie'
    }
   ```
5. Clone the target repo inside the `targetrepo` folder
   ```bash
   git clone https://github.com/Netflix/pygenie.git targetrepo
   ```
6. Start fetching Repo information
   ```bash
   node fetch.js
   ```
7. Evaluate Pull Request Acceptance for your the repository
   ```bash
   python evaluate.py
   ```



## Built With

* [Dropwizard](http://www.dropwizard.io/1.0.2/docs/) - The web framework used
* [Maven](https://maven.apache.org/) - Dependency Management
* [ROME](https://rometools.github.io/rome/) - Used to generate RSS Feeds

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## Authors

* **Ignacio Avas** - *Initial work* - [igui](https://github.com/igui)

## Acknowledgments

* Pablo Grill for his insight and knowledge over Machine Learning

## License

pullreq-ml is Copyright (c) 2018 sophilabs, inc. It is free software, and may be
redistributed under the terms specified in the [license](LICENSE) file.

## About

[![sophilabs][sophilabs-image]][sophilabs-url]

pullreq-ml is maintained and funded by sophilabs, inc. The names and logos for
sophilabs are trademarks of sophilabs, inc.
