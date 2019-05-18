import cdk = require('@aws-cdk/cdk');
import fs = require('fs');
import s3 = require('@aws-cdk/aws-s3');
import s3deploy = require('@aws-cdk/aws-s3-deployment');

export class IrisDnnInitStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    const bucketName = config.BUCKET_NAME;
    const mlopsBucket = new s3.Bucket(this, bucketName, {
      bucketName: bucketName
    });
    mlopsBucket.export();

    new s3deploy.BucketDeployment(this, 'DeployTrainingData', {
      source: s3deploy.Source.asset('./training-data'),
      destinationBucket: mlopsBucket,
      destinationKeyPrefix: 'iris-dnn-data' // optional prefix in destination bucket
    });
  }
}
