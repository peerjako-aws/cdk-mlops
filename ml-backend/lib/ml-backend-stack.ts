import cdk = require('@aws-cdk/cdk');
import sagemaker = require('@aws-cdk/aws-sagemaker');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');

export class MlBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Define a unique releasename
    const releaseName = process.env.ENVIRONMENT + '-' 
    + this.parentApp.name + '-' 
    + process.env.CODEBUILD_RESOLVED_SOURCE_VERSION 
    + '-' + (new Date).getTime();

    // Create a role that sagemaker can use which can access the model S3 bucket
    const sagemakerRole = new iam.Role(this, 'SagemakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com')
    });
    sagemakerRole.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonSageMakerFullAccess');

    const bucketName = process.env.BUCKET_NAME + ''
    const mlopsBucket = s3.Bucket.import(this, bucketName, {
      bucketName: bucketName
    })
    mlopsBucket.grantReadWrite(sagemakerRole);

    // Create the sagemaker model
    const model = new sagemaker.CfnModel(this, 'model', {
      primaryContainer: {
        image: process.env.SAGEMAKER_IMAGE + '',
        modelDataUrl: 's3://'+ bucketName + "/" + process.env.MODEL_PATH,        
      },
      executionRoleArn: sagemakerRole.roleArn,
      modelName: releaseName
    });

    // Create the sagemaker endpoint config for the sagemaker model
    const endpointConfig = new sagemaker.CfnEndpointConfig(this, 'endpointconfig', {
      productionVariants: [
        {
          initialInstanceCount: 1,
          initialVariantWeight: 1,
          modelName: model.modelName,
          variantName: "AllTraffic",
          instanceType: "ml.t2.medium",
        }
      ],
      endpointConfigName: releaseName
    })
    
    // Create the sagemaker endpoint using the sagemaker endpoint config
    new sagemaker.CfnEndpoint(this, 'endpoint', {
      endpointConfigName: endpointConfig.endpointConfigName,
      endpointName: releaseName
    })
  }
}
