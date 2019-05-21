import sagemaker
import sagemaker.amazon.common as smac
from sagemaker import get_execution_role
from sagemaker.predictor import json_deserializer, json_serializer

import sys, json, csv, time, pprint, json
from time import gmtime, strftime
import numpy as np

start = time.time()


#
# Create a sagemaker real-time predictor
#
iris_predictor = sagemaker.predictor.RealTimePredictor('qa-IrisDnnPipelineStack-342d9d0-2019-05-21-06-24-09',
                                                     serializer=json_serializer,
                                                     deserializer=json_deserializer,
                                                     content_type='application/json',
                                                     sagemaker_session=sagemaker.Session())

inference = iris_predictor.predict([6.4, 3.2, 4.5, 1.5])
pprint.pprint(inference)

maxClass = max(inference['result']['classifications'][0]['classes'], key=lambda cl: cl['score'])

pprint.pprint("Iris label with max score: %s" % (maxClass['label']))

# If label with max score is not 1 (0 or 2) we throw an error that will break the codepipeline test stage
assert maxClass['label'] == '1'

