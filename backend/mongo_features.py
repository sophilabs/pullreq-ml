import os
from pymongo import MongoClient
os.environ['API_USER'] = 'root'
os.environ['API_PASSWORD'] = 'iIhnQ4YdzqkY'

DB_URL = 'ec2-54-72-230-18.eu-west-1.compute.amazonaws.com:27017'
DB_USER = 'root'
DB_NAME= 'github'
DB_PWD='iIhnQ4YdzqkY'
MONGODB_URL=f'mongodb://{DB_USER}:{DB_PWD}@{DB_URL}/{DB_NAME}?retryWrites=true&w=majority'
client = MongoClient(MONGODB_URL)
database = client[DB_NAME]
#

def getAggregatoion(pr_num):
    return [
#     Hotness
    {'$match': {'number': {'$eq': pr_num}}},
    {'$lookup': {
            "from": "hotness",
            "localField": "id",
            "foreignField": "pullRequest",
            "as": "hotness"
        }},
    {"$addFields": {
            "hotness": {"$arrayElemAt": ["$hotness", 0]},
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
            "user": "$user.login",
            "body": True,
            "created_at": True,
            "author_association": True,
            "requested_reviewers": True,
            "requested_reviewers_count": {"$size": "$requested_reviewers"},
            "insertions": "$hotness.insertions",
            "deletions": "$hotness.deletions",
            "hotness": "$hotness.hotness",
            "hasTests": "$hotness.hasTests",
            "integrator_count": True,
            "user_followers": "$userInfo.followers.totalCount",
            "user_following": "$userInfo.following.totalCount",
            "user_mergedpr_count": "$userInfo.merged.totalCount",
            "user_closedpr_count": "$userInfo.closed.totalCount",
            "user_openpr_count": "$userInfo.open.totalCount"
        }}
]


