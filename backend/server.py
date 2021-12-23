from sanic import Sanic
from sanic.response import json
from pymongo import MongoClient
import mongo_features as mf


app = Sanic("My Hello, world app")

@app.route('/')
async def test(request):
    return json({'hello': 'world'})

@app.post("/getMongoFeatures")
async def post_Mongo(request):
    pr_num_json= json(request.body)
    pr_num = request.body.pr.extract(r'^.*/(\d*)$')
    aggregations = mf.getAggregatoion(pr_num)
    features = mf.database.pull_requests.aggregate(aggregations)
    return features
    
if __name__ == '__main__':
   app.run()