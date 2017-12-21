"""Does some nice evaluations on the data"""
from collections import OrderedDict
from datetime import datetime
from math import log1p
from re import findall

import numpy
from pandas.io.json import json_normalize
from sklearn import model_selection
from sklearn.metrics import confusion_matrix
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVC
from pymongo import MongoClient

class DataBuilder(object):
    """Builds a representation of the data"""
    DB_URL = 'mongodb://github:github@localhost:27017/github'
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
            success_rate = (data['user_mergedpr_count'] /
                (data['user_mergedpr_count'] + data['user_closedpr_count']))
        except ZeroDivisionError:
            success_rate = 0

        social_conn = log1p(data['user_followers'] + data['user_following'])

        return OrderedDict([
            ('created_friday', created_friday),
            ('description_complexity', description_coplexity),
            ('log_hotness', log1p(data['hotness'] or 0)),
            ('log_churn', log1p(data['churn'] or 0)),
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
                "id": True,
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

def main():
    "Builds and evaluates data"

    data_builder = DataBuilder()
    data = data_builder.build_data()
    dataset = json_normalize(data)

    #print(dataset.head(20))
    print(dataset.describe())
    #print(dataset.groupby('was_merged').size())
    #dataset.plot(kind='box', subplots=True, layout=(2,2), sharex=False, sharey=False)
    #dataset.hist()
    #scatter_matrix(dataset)
    #plt.show()

    _rows, num_features = dataset.shape
    array = dataset.values
    features = array[:, slice(0, num_features-1)]
    clasification = array[:, (num_features-1)]
    validation_size = 0.10
    seed = 7
    (x_train, _x_test, y_train, _y_test) = model_selection.train_test_split(
        features,
        clasification,
        test_size=validation_size,
        random_state=seed
    )

    models = [
        ('LR', LogisticRegression()),
        ('LDA', LinearDiscriminantAnalysis()),
        ('KNN', KNeighborsClassifier()),
        ('CART', DecisionTreeClassifier()),
        ('NB', GaussianNB()),
        #('SVM', SVC())
    ]

    # evaluate each model in turn
    for name, model in models:
        kfold = model_selection.KFold(n_splits=10, random_state=seed)

        cv_results = model_selection.cross_val_score(
            model,
            x_train,
            y_train,
            cv=kfold,
            scoring='f1',
            n_jobs=-1
        )

        y_pred = model_selection.cross_val_predict(
            model,
            x_train,
            y_train,
            cv=kfold,
            n_jobs=-1
        )
        unique, counts = numpy.unique(
            numpy.array(y_pred, dtype=int), return_counts=True
        )
        print('Predictions', dict(zip(unique, counts)))
        print('Confustion Matrix')
        print(confusion_matrix(y_train, y_pred))
        print("%s: %f (%f)" % (name, cv_results.mean(), cv_results.std()))

if __name__ == '__main__':
    main()
