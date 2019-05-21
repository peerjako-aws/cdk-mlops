import sagemaker
import sagemaker.amazon.common as smac
from sagemaker import get_execution_role
from sagemaker.predictor import json_deserializer, json_serializer

import sys, json, csv, time, pprint, json
from time import gmtime, strftime
import numpy as np
#from scipy.sparse import lil_matrix

start = time.time()

cf_configuration_filepath = sys.argv[1]

#
# load parameters created by training steps
#

with open(cf_configuration_filepath) as cf_configuration_file:
    cf_configuration = json.load(cf_configuration_file)

environment = cf_configuration["Parameters"]["Environment"]
parentStackName = cf_configuration["Parameters"]["ParentStackName"]
commit_id = cf_configuration["Parameters"]["CommitID"]
timestamp = cf_configuration["Parameters"]["Timestamp"]

endpoint_name = environment + "-" + parentStackName + "-" + commit_id + "-" + timestamp

#
# Create a sagemaker real-time predictor
#

iris_predictor = sagemaker.predictor.RealTimePredictor(endpoint_name,
                                                     serializer=json_serializer,
                                                     deserializer=json_deserializer,
                                                     content_type='application/json',
                                                     sagemaker_session=sagemaker.Session())

inference = iris_predictor.predict([6.4, 3.2, 4.5, 1.5])
pprint.pprint(inference)

maxClass = max(inference['result']['classifications'][0]['classes'], key=lambda cl: cl['score'])

pprint.pprint("Iris label with max score: %s" % (maxClass['label']))

# If label with max score is not 1 (0 or 2) we throw an error that will break the codepipeline test stage
assert maxClass['label'] == '2'

