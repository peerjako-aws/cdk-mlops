import cdk = require('@aws-cdk/cdk');
import fs = require('fs');
import s3 = require('@aws-cdk/aws-s3');
import s3deploy = require('@aws-cdk/aws-s3-deployment');
import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');

export class MovielensInitStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    const bucketName = config.BUCKET_NAME;
    const mlopsBucket = new s3.Bucket(this, bucketName, {
      bucketName: bucketName
    });
    mlopsBucket.export();

    new s3deploy.BucketDeployment(this, 'DeployTrainingData', {
      source: s3deploy.Source.asset('./training-data'),
      destinationBucket: mlopsBucket,
      destinationKeyPrefix: 'movielens-data' // optional prefix in destination bucket
    });

    const glueDatabaseName = config.GLUE_DATABASE_NAME;
    new glue.Database(this, glueDatabaseName, {
      databaseName: glueDatabaseName
    });
        
    /** Create the IAM Role to be used by GlueCrawler */
    const glueCrawlerRole = new iam.Role(this, 'GlueGrawlerRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
    });
    glueCrawlerRole.attachManagedPolicy('arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole');
    mlopsBucket.grantRead(glueCrawlerRole);

    new glue.CfnCrawler(this, 'MLOpsMovielensCrawler', {
       databaseName: glueDatabaseName,
        targets: {
          s3Targets: [
            {
              path: mlopsBucket.bucketName+'/movielens-data'
            }
          ]
        },
        role: glueCrawlerRole.roleName        
     })

  }
}
