import cdk = require('@aws-cdk/cdk');
import fs = require('fs');
import sagemaker = require('@aws-cdk/aws-sagemaker');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');

export class MlBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const configFileName = process.env.CONFIG_FILE_NAME + '';
    const config = JSON.parse(fs.readFileSync(configFileName, 'utf8'));

    const bucketName = config.Parameters.BucketName + '';
    const commitID = config.Parameters.CommitID + '';
    const environment = config.Parameters.Environment + '';
    const parentStackName = config.Parameters.ParentStackName + '';
    const modelData = config.Parameters.ModelData + '';
    const containerImage = config.Parameters.ContainerImage + '';

    // Define a unique releasename
    const releaseName = environment + '-' 
    + parentStackName + '-' 
    + commitID
    + '-' + (new Date).getTime();

    // Create a role that sagemaker can use which can access the model S3 bucket
    const sagemakerRole = new iam.Role(this, 'SagemakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com')
    });
    sagemakerRole.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonSageMakerFullAccess');

    const mlopsBucket = s3.Bucket.import(this, bucketName, {
      bucketName: bucketName
    })
    mlopsBucket.grantReadWrite(sagemakerRole);

    // Create the sagemaker model
    const model = new sagemaker.CfnModel(this, 'model', {
      primaryContainer: {
        image: containerImage,
        modelDataUrl: modelData,        
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
