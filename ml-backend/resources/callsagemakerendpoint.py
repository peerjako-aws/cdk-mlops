import sagemaker
import sagemaker.amazon.common as smac
import numpy as np
from sagemaker import get_execution_role
from sagemaker.predictor import json_deserializer, json_serializer

import sys, json, csv, time, pprint, json, os
from time import gmtime, strftime
import boto3

def lambda_handler(event, context):
    print('Received event: ' + json.dumps(event, indent=2))
    str_input_tensor_arr = event['queryStringParameters']['input_tensor'].split(',')
    endpoint_ssm_name=os.environ['endpoint_sss_name']

    try:

        x = np.array(str_input_tensor_arr)
        input_tensor = x.astype(np.float)

        ssm = boto3.client('ssm')
        parameter = ssm.get_parameter(Name=endpoint_ssm_name, WithDecryption=True)
        endpoint_name = parameter['Parameter']['Value']
        print(parameter['Parameter']['Value'])
        print('Predict for input tensor: {} using endpoint: {}'.format(input_tensor, endpoint_name))

        #
        # Create a sagemaker real-time predictor
        #
        iris_predictor = sagemaker.predictor.RealTimePredictor(endpoint_name,
                                                            serializer=json_serializer,
                                                            deserializer=json_deserializer,
                                                            content_type='application/json',
                                                            sagemaker_session=sagemaker.Session())

        inference = iris_predictor.predict(input_tensor)
        pprint.pprint(inference)
            
        return {
            "statusCode": 200,
            "body": json.dumps(inference),
            "headers": {
                "Access-Control-Allow-Origin": "*"
            }
        }
    except Exception as e:
        print('Actual error is: {0}'.format(e))
        return e

