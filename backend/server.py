from sanic import Sanic
# from sanic.response import json
from pymongo import MongoClient
import mongo_features as mf
import json
import re

app = Sanic("My Hello, world app")

@app.route('/')
async def test(request):
    return json({'hello': 'world'})

@app.post("/getMongoFeatures")
async def post_Mongo(request):
    d = request.body

    my_json = d.decode('utf8').replace("'", '"')
    data = json.loads(my_json)

    # pr_num_json= json(request.body)
    pr_num =str( data['pr']) 
    pr_num_arr=re.findall(r'^.*/(\d*)$',pr_num )
    pr_num = pr_num_arr[0]
    aggregations = mf.getAggregatoion(pr_num)
    features = mf.database.pull_requests.aggregate(aggregations)
    return features
    
if __name__ == '__main__':
   app.run()