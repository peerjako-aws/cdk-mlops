import cdk = require('@aws-cdk/cdk');
import fs = require('fs');
import sm = require("@aws-cdk/aws-secretsmanager");
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import codebuild = require('@aws-cdk/aws-codebuild');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import sns = require('@aws-cdk/aws-sns');

import { githubOwner, repoName, secretGitHubOauthArn, gitBranch } from '../../config'
import { PolicyStatementEffect } from '@aws-cdk/aws-iam';
import { BuildEnvironmentVariableType } from '@aws-cdk/aws-codebuild';

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
        branch: gitBranch ? gitBranch : 'master',
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
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      roleName: props.mlProject + 'smr'
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
      value: this.stackName
    }

    const trainingOutput = new codepipeline.Artifact();
    const project = new codebuild.PipelineProject(this, 'TrainingProject', {
      buildSpec: './ml-training/' + props.mlProject + '/buildspec.yml',
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_PYTHON_3_6_5
      },
      environmentVariables: buildEnvVariables
    });

    project.addToRolePolicy(new iam.PolicyStatement(PolicyStatementEffect.Allow)
      .addResource(mlopsBucket.bucketArn)
      .addResource(mlopsBucket.bucketArn + '/*')
      .addAction('s3:*')
    );
    
    project.addToRolePolicy(new iam.PolicyStatement(PolicyStatementEffect.Allow)
      .addResource(sagemakerRole.roleArn)
      .addAction('iam:PassRole')
    );
    project.addToRolePolicy(new iam.PolicyStatement(PolicyStatementEffect.Allow)
      .addResource('*')
      .addAction('athena:*')
      .addAction('glue:GetTable')
      .addAction('sagemaker:*')
      .addAction('logs:CreateLogGroup')
      .addAction('logs:CreateLogStream')
      .addAction('logs:PutLogEvents')
      .addAction('logs:DescribeLogStreams')
      .addAction('logs:GetLogEvents')
    );

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

    const projectQABackend = new codebuild.PipelineProject(this, 'BackendCDKProject', {
      buildSpec: './ml-backend/buildspec.yml',
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const backendCDKBuildOutput = new codepipeline.Artifact();
    const backendCDKBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'ml-backend-cdk',
      input: trainingOutput,
      output: backendCDKBuildOutput,
      project: projectQABackend
    })

    pipeline.addStage({
      name: 'ml-backend-cdk',
      actions: [backendCDKBuildAction],
    });    

    const qaBackendChangeSet = new codepipeline_actions.CloudFormationCreateReplaceChangeSetAction({
      actionName: 'ml-qa-backend-changeset',
      templatePath: backendCDKBuildOutput.atPath('MlQABackendStack.template.yaml'),
      adminPermissions: true,
      changeSetName: 'ml-qa-backend-changeset-' + props.mlProject,
      stackName: 'ml-qa-backend-' + props.mlProject,
      runOrder: 1
    });

    const qaBackend = new codepipeline_actions.CloudFormationExecuteChangeSetAction({
      actionName: 'ml-qa-backend',
      changeSetName: 'ml-qa-backend-changeset-' + props.mlProject,
      stackName: 'ml-qa-backend-' + props.mlProject,
      runOrder: 2
    });


    const projectQATest = new codebuild.PipelineProject(this, 'QATestProject', {
      buildSpec: './ml-test/' + props.mlProject + '/buildspec.yml',
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_PYTHON_3_7_1
      },
      environmentVariables: {
        CONFIGURATION_FILE: {
          type: BuildEnvironmentVariableType.PlainText,
          value: 'configuration_qa.json'
        }
      }
    });
    
    projectQATest.addToRolePolicy(new iam.PolicyStatement(PolicyStatementEffect.Allow)
      .addResource('*')
      .addAction('sagemaker:*')
      .addAction('logs:CreateLogGroup')
      .addAction('logs:CreateLogStream')
      .addAction('logs:PutLogEvents')
      .addAction('logs:DescribeLogStreams')
      .addAction('logs:GetLogEvents')
    );

    const qaTestAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'ml-qa-test',
      input: trainingOutput,
      project: projectQATest,
      runOrder: 3
    })

    const approvalTopic = new sns.Topic(this, 'ApprovalTopic');
    approvalTopic.subscribeEmail('ApprovalSubscription', config.APPROVAL_EMAIL)
    const qaTestApproval = new codepipeline_actions.ManualApprovalAction({
      actionName: 'ml-qa-approval',
      notificationTopic: approvalTopic,
      runOrder: 4
    })

    pipeline.addStage({
      name: 'ml-qa-backend',
      actions: [qaBackendChangeSet, qaBackend, qaTestAction, qaTestApproval],
    });

    const prodBackendChangeSet = new codepipeline_actions.CloudFormationCreateReplaceChangeSetAction({
      actionName: 'ml-prod-backend-changeset',
      templatePath: backendCDKBuildOutput.atPath('MlProdBackendStack.template.yaml'),
      adminPermissions: true,
      changeSetName: 'ml-prod-backend-changeset-' + props.mlProject,
      stackName: 'ml-prod-backend-' + props.mlProject,
      runOrder: 1
    });

    const prodBackend = new codepipeline_actions.CloudFormationExecuteChangeSetAction({
      actionName: 'ml-prod-backend',
      changeSetName: 'ml-prod-backend-changeset-' + props.mlProject,
      stackName: 'ml-prod-backend-' + props.mlProject,
      runOrder: 2
    });


    const projectProdTest = new codebuild.PipelineProject(this, 'ProdTestProject', {
      buildSpec: './ml-test/' + props.mlProject + '/buildspec.yml',
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_PYTHON_3_7_1
      },
      environmentVariables: {
        CONFIGURATION_FILE: {
          type: BuildEnvironmentVariableType.PlainText,
          value: 'configuration_prod.json'
        }
      }
    });
    
    projectProdTest.addToRolePolicy(new iam.PolicyStatement(PolicyStatementEffect.Allow)
      .addResource('*')
      .addAction('sagemaker:*')
      .addAction('logs:CreateLogGroup')
      .addAction('logs:CreateLogStream')
      .addAction('logs:PutLogEvents')
      .addAction('logs:DescribeLogStreams')
      .addAction('logs:GetLogEvents')
    );

    const prodTestAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'ml-prod-test',
      input: trainingOutput,
      project: projectProdTest,
      runOrder: 3
    })

    pipeline.addStage({
      name: 'ml-prod-backend',
      actions: [prodBackendChangeSet, prodBackend, prodTestAction],
    });

  }
}
