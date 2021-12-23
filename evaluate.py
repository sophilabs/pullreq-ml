"""Does some nice evaluations on the data"""
from collections import OrderedDict
from datetime import datetime
from re import findall

from pandas.io.json import json_normalize
from pymongo import MongoClient

SEED = 7

class DataBuilder(object):
    """Builds a representation of the data"""
    DB_URL = 'mongodb://localhost:27017/github'
    DB_NAME = 'github'
    FRIDAY = 5

    def __init__(self):
        self.client = MongoClient(self.DB_URL)
        self.database = self.client[self.DB_NAME]
        self.data = []

    @classmethod
    def make_features(cls, data):
        """
        Transforms the dictionary of data from the DB into a dictionary of
        features
        """
        created_friday = int(
            datetime.strptime(
                data['created_at'], '%Y-%m-%dT%H:%M:%SZ'
            ).isoweekday() == cls.FRIDAY
        )
        description_coplexity = len(
            findall(r'\w+', data['title'] + ' ' + (data['body'] or ''))
        )
        was_merged = int(bool(data['merged_at'] or data['mergedpr_count']))
        try:
            success_rate = (data.get('user_mergedpr_count', 0) /
                (data.get('user_mergedpr_count', 0) + data.get('user_closedpr_count', 0)))
            print(success_rate)
        except ZeroDivisionError:
            success_rate = 0

        social_conn = data.get('user_followers', 0) + data.get('user_following', 0)

        return OrderedDict([
            ('repoOwner', data['repoOwner'] or 0),
            ('repoName', data['repoName'] or 0),
            ('PR', data['html_url'] or 0),
            ('created_friday', created_friday),
            ('description_complexity', description_coplexity),
            ('hotness', data['hotness'] or 0),
            ('churn', data['churn'] or 0),
            ('is_integrator', int(bool(data['integrator_count']))),
            ('has_tests', int(bool(data['hasTests']))),
            ('success_rate', success_rate),
            ('social_conn', social_conn),
            ('requested_reviewers', int(len(data['requested_reviewers']) > 0)),
            ('was_merged', was_merged),
        ])

    def build_data(self):
        """Returns a dataset from mongo_db"""
        aggregations = [
            # Hotness
            {'$lookup': {
                "from": "hotness",
                "localField": "id",
                "foreignField": "pullRequest",
                "as": "hotness"
            }},
            {"$addFields": {
                "hotness": {"$arrayElemAt": ["$hotness", 0]},
            }},

            # Merged PR
            {'$lookup': {
                "from": "mergedprs_commits",
                "localField": "number",
                "foreignField": "number",
                "as": "mergedprs"
            }},
            {"$addFields": {
                "mergedpr_count": {"$size": "$mergedprs"},
            }},

            # Integrator
            {'$lookup': {
                "from": "integrators",
                "localField": "user.login",
                "foreignField": "actor",
                "as": "integrator"
            }},
            {"$addFields": {
                "integrator_count": {"$size": "$integrator"},
            }},

            # User info
            {'$lookup': {
                "from": "user",
                "localField": "user.id",
                "foreignField": "userId",
                "as": "userInfo"
            }},
            {"$addFields": {
                "userInfo": {"$arrayElemAt": ["$userInfo", 0]},
            }},

            # All needed fields
            {'$project': {
                "repoOwner": True,
                "repoName": True,
                "html_url": True,
                "number": True,
                "state": True,
                "title": True,
                "user": "$author.login",
                "body": True,
                "created_at": True,
                "merged_at": True,
                "author_association": True,
                "requested_reviewers": True,
                "churn": "$hotness.churn",
                "hotness": "$hotness.hotness",
                "hasTests": "$hotness.hasTests",
                "mergedpr_count": True,
                "integrator_count": True,
                "user_followers": "$userInfo.followers.totalCount",
                "user_following": "$userInfo.following.totalCount",
                "user_mergedpr_count": "$userInfo.merged.totalCount",
                "user_closedpr_count": "$userInfo.closed.totalCount",
                "user_openpr_count": "$userInfo.open.totalCount"
            }}
        ]

        self.data = list(
            map(
                self.make_features,
                self.database.pull_requests.aggregate(aggregations)
            )
        )
        return self.data

def build_splitted_data(seed):
    "Builds splitted data to run tests"
    data_builder = DataBuilder()
    data = data_builder.build_data()
    dataset = json_normalize(data)
    return dataset

def main():
    "Builds and evaluates data"
    dataset = build_splitted_data(SEED)
    print(dataset)
    dataset.to_csv("features.csv", index=False)


if __name__ == '__main__':
    main()
