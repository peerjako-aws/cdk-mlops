rm -rf training-data
mkdir training-data

aws s3 sync s3://sagemaker-sample-data-eu-west-1/tensorflow/iris/ training-data/
