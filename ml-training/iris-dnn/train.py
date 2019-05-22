from sagemaker.tensorflow import TensorFlow
import sagemaker
from sagemaker.amazon.amazon_estimator import get_image_uri

import boto3, csv, io, json, re, os, sys, pprint, time, random
from time import gmtime, strftime

start = time.time()
current_timestamp = time.strftime('%Y-%m-%d-%H-%M-%S', time.gmtime())

role = sys.argv[1]
bucket = sys.argv[2]
stack_name = sys.argv[3]
commit_id = sys.argv[4]
commit_id = commit_id[0:7]

# Location to save your custom code in tar.gz format.
custom_code_upload_location = 's3://{}/customcode/tensorflow_iris'.format(bucket)

# Location where results of model training are saved.
model_artifacts_location = 's3://{}/artifacts'.format(bucket)

train_data_location = 's3://{}/iris-dnn-data'.format(bucket)

iris_estimator = TensorFlow(entry_point='ml-training/iris-dnn/iris_dnn_classifier.py',
                            role=role,
                            framework_version='1.12.0',
                            output_path=model_artifacts_location,
                            code_location=custom_code_upload_location,
                            train_instance_count=1,
                            train_instance_type='ml.c4.xlarge',
                            training_steps=900,
                            evaluation_steps=100)



pprint.pprint(vars(iris_estimator))

container = '520713654638.dkr.ecr.{}.amazonaws.com/sagemaker-tensorflow:{}-cpu-{}'.format(boto3.Session().region_name,
                                                                                        iris_estimator.framework_version,
                                                                                        iris_estimator.py_version)


iris_estimator.fit(train_data_location)
pprint.pprint(vars(iris_estimator))

pprint.pprint('Creating model')
iris_model = iris_estimator.create_model(role=role)
pprint.pprint(vars(iris_model))

#pprint.pprint('Deploy model')
#iris_predictor = iris_model.deploy(initial_instance_count=1, instance_type='ml.m4.xlarge')
#pprint.pprint(vars(iris_predictor))

containerEnv = {
    "SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
    "SAGEMAKER_ENABLE_CLOUDWATCH_METRICS": "false",
    "SAGEMAKER_PROGRAM": "iris_dnn_classifier.py",
    "SAGEMAKER_REGION": boto3.Session().region_name,
    "SAGEMAKER_SUBMIT_DIRECTORY": iris_model.source_dir,
}
best_model = iris_model.model_data
 
#
# Save config files to be used later for qa and prod sagemaker endpoint configurations
# and for prediction tests
#
config_data_qa = {
  "Parameters":
    {
        "BucketName": bucket,
        "CommitID": commit_id,
        "Environment": "qa",
        "ParentStackName": stack_name,
        "ModelData": best_model,
        "ContainerImage": container,
        "Timestamp": current_timestamp,
        "ContainerEnvironment": containerEnv
    }
}

config_data_prod = {
  "Parameters":
    {
        "BucketName": bucket,
        "CommitID": commit_id,
        "Environment": "prod",
        "ParentStackName": stack_name,
        "ModelData": best_model,
        "ContainerImage": container,
        "Timestamp": current_timestamp,
        "ContainerEnvironment": containerEnv
    }
}

pprint.pprint(config_data_qa)
pprint.pprint(config_data_prod)

json_config_data_qa = json.dumps(config_data_qa)
json_config_data_prod = json.dumps(config_data_prod)

f = open( './ml-backend/configuration_qa.json', 'w' )
f.write(json_config_data_qa)
f.close()

f = open( './ml-backend/configuration_prod.json', 'w' )
f.write(json_config_data_prod)
f.close()

end = time.time()
print(end - start)
