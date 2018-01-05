"""Does some nice evaluations on the data"""
import importlib
from collections import OrderedDict, namedtuple
from datetime import datetime
from math import log1p
from re import findall

import numpy
from pandas.io.json import json_normalize
from pymongo import MongoClient
from sklearn import model_selection
from sklearn.externals import joblib
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.svm import SVC

SEED = 7

ResultTuple = namedtuple(
    'Result',
    [
        'name',
        'cv_results',
        'predictions',
        'confusion_matrix'
    ]
)

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

def build_splitted_data(seed):
    "Builds splitted data to run tests"
    data_builder = DataBuilder()
    data = data_builder.build_data()
    dataset = json_normalize(data)

    print(dataset.describe(percentiles=None))

    _rows, num_features = dataset.shape
    array = dataset.values
    features = array[:, slice(0, num_features-1)]
    clasification = array[:, (num_features-1)]
    validation_size = 0.10
    return model_selection.train_test_split(
        features,
        clasification,
        test_size=validation_size,
        random_state=seed
    )

def explore_one_model(model_str, model_constructor_kwargs, x_train, y_train):
    "Explore one model by doing cross validation"
    class_data = model_str.split(".")
    module_path = ".".join(class_data[:-1])
    class_str = class_data[-1]

    print('Training', class_str)

    module = importlib.import_module(module_path)
    model_class = getattr(module, class_str)
    model = model_class(**model_constructor_kwargs)

    kfold = model_selection.KFold(n_splits=10, random_state=SEED)

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
    predictions = dict(zip(unique, counts))
    conf_matrix = confusion_matrix(y_train, y_pred)
    return ResultTuple(class_str, cv_results, predictions, conf_matrix)

def explore_all_classifiers():
    "Builds and evaluates data"

    (x_train, _x_test, y_train, _y_test) = build_splitted_data(SEED)

    models = [
        ('sklearn.naive_bayes.BernoulliNB', {}),
        ('sklearn.tree.DecisionTreeClassifier', {}),
        ('sklearn.tree.ExtraTreeClassifier', {}),
        ('sklearn.ensemble.ExtraTreesClassifier', {}),
        ('sklearn.naive_bayes.GaussianNB', {}),
        ('sklearn.neighbors.KNeighborsClassifier', {}),
        ('sklearn.discriminant_analysis.LinearDiscriminantAnalysis', {}),
        ('sklearn.svm.LinearSVC', {}),
        ('sklearn.linear_model.LogisticRegression', {}),
        ('sklearn.linear_model.LogisticRegressionCV', {}),
        ('sklearn.neural_network.MLPClassifier', {}),
        ('sklearn.neighbors.NearestCentroid', {}),
        ('sklearn.discriminant_analysis.QuadraticDiscriminantAnalysis', {}),
        ('sklearn.ensemble.RandomForestClassifier', {}),
        ('sklearn.linear_model.RidgeClassifier', {}),
        ('sklearn.linear_model.RidgeClassifierCV', {}),

        ('sklearn.svm.SVC', {}),
        ('sklearn.linear_model.SGDClassifier',
            {'max_iter': 1000, 'tol': 1e-3}),
        ('sklearn.linear_model.Perceptron',
            {'max_iter': 1000, 'tol': 1e-3}),
        ('sklearn.linear_model.PassiveAggressiveClassifier',
            {'max_iter': 1000, 'tol': 1e-3}),
        ('sklearn.ensemble.GradientBoostingClassifier', {}),
    ]

    results = sorted(
        (
            explore_one_model(model_str, kwargs, x_train, y_train)
            for model_str, kwargs in models
        ),
        key=lambda r: r.cv_results.mean(),
        reverse=True
    )

    for result in results:
        print('Name: {} Mean {} Std {}'.format(
            result.name,
            result.cv_results.mean(),
            result.cv_results.std()
        ))
        print('  Predictions {}'.format(result.predictions))
        print('  Confusion Matrix:\n{}'.format(result.confusion_matrix))


def main():
    "Builds and evaluates data"
    (x_train, x_test, y_train, y_test) = build_splitted_data(SEED)
    model = SVC()
    model.fit(x_train, y_train)
    y_pred = model.predict(x_test)
    print('Report on Test data')
    print(classification_report(
        y_test,
        y_pred,
        target_names=['not merged', 'merged'])
    )
    joblib.dump(model, 'classifier.pkl')
    print('Dumped classifier data to classifier.pkl')


if __name__ == '__main__':
    explore_all_classifiers()
    main()
