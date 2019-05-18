import cdk = require('@aws-cdk/cdk');
import fs = require('fs');
import sm = require("@aws-cdk/aws-secretsmanager");
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import codebuild = require('@aws-cdk/aws-codebuild');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');

import { githubOwner, repoName, secretGitHubOauthArn } from '../../config'

interface mlPipelineStackProps extends cdk.StackProps {
  mlProject: string;
}

export class MlPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: mlPipelineStackProps) {
    super(scope, id, props);

    const config = JSON.parse(fs.readFileSync('../ml-init/' + props.mlProject + '/config.json', 'utf8'));
    const bucketName = config.BUCKET_NAME;

    const pipelineName = 'mlops-' + props.mlProject; 
    const pipeline = new codepipeline.Pipeline(this, pipelineName, {
        pipelineName
    });

    const oauth = sm.Secret.import(this, "ImportedSecret", {
      secretArn: secretGitHubOauthArn
    });

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
        actionName: 'ml-source',
        branch: 'master',
        owner: githubOwner,
        repo: repoName,
        oauthToken: oauth.secretValue,
        output: sourceOutput,
        trigger: codepipeline_actions.GitHubTrigger.Poll
    });

    pipeline.addStage({
      name: 'ml-source',
      actions: [sourceAction],
    });
  
    /** Create the IAM Role to be used by Sagemaker */
    const sagemakerRole = new iam.Role(this, 'SagemakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com')
    });
    sagemakerRole.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonSageMakerFullAccess');

    const mlopsBucket = s3.Bucket.import(this, bucketName, {
      bucketName: bucketName
    })
    mlopsBucket.grantReadWrite(sagemakerRole);
    

    const buildEnvVariables: { [name: string]: codebuild.BuildEnvironmentVariable } = {};
    for (var p in config) {
      if( config.hasOwnProperty(p) ) {
        buildEnvVariables[p] = {
          type: codebuild.BuildEnvironmentVariableType.PlainText,
          value: config[p]
        }
      } 
    }   
    buildEnvVariables['SAGEMAKER_ROLE_ARN'] = {
      type: codebuild.BuildEnvironmentVariableType.PlainText,
      value: sagemakerRole.roleArn
    }
    buildEnvVariables['STACK_NAME'] = {
      type: codebuild.BuildEnvironmentVariableType.PlainText,
      value: this.parentApp.name
    }

    const trainingOutput = new codepipeline.Artifact();
    const project = new codebuild.PipelineProject(this, 'MyProject', {
      buildSpec: '../ml-training/' + props.mlProject + '/buildspec.yml',
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_PYTHON_3_4_5
      },
      environmentVariables: buildEnvVariables
    });

    const trainingAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'ml-training',
      input: sourceOutput,
      output: trainingOutput,
      project: project
    })

    pipeline.addStage({
      name: 'ml-training',
      actions: [trainingAction],
    });

  }
}
