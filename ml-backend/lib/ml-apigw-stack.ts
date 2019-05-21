import cdk = require('@aws-cdk/cdk');
import apigateway = require('@aws-cdk/aws-apigateway');
import lambda = require('@aws-cdk/aws-lambda');
import iam = require('@aws-cdk/aws-iam');
import { PolicyStatementEffect } from '@aws-cdk/aws-iam';

interface mlAPIGWStackProps extends cdk.StackProps {
    endpointSSMParamName: string;
}

export class MlAPIGWStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: mlAPIGWStackProps) {
      super(scope, id, props);
        
        // Create a lambda function for inference calling
        const handlerCallEndpoint = new lambda.Function(this, "CallSagemakerEndpoint", {
            runtime: lambda.Runtime.Python36,
            code: lambda.Code.directory("resources"),
            handler: "callsagemakerendpoint.lambda_handler",
            environment: {
                endpoint_sss_name: props.endpointSSMParamName
            }
        });

        const lambdaPolicyStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)      
            .addResource('*')
            .addAction('sagemaker:*')
            .addAction('ssm:*');
  
        handlerCallEndpoint.addToRolePolicy(lambdaPolicyStatement);
  
        // Create API
        const api = new apigateway.RestApi(this, "cdk-mlops-api", {
            restApiName: "MLOps demo Service",
            description: "This service is used for the CDK MLOps demo."
        });
        
        // Correctly handle CORS for OPTIONS calls
        this.addCorsOptions(api.root);

        // Create API CRUD part for feedback
        const getPredictIntegration = new apigateway.LambdaIntegration(handlerCallEndpoint, {
            requestTemplates: { "application/json": '{ "statusCode": "200" }' }
        });
            
        api.root.addMethod("GET", getPredictIntegration); 
    }

    // This function helps fix CORS issues that will happen when browsers do an OPTION http call
    addCorsOptions(apiResource: apigateway.IRestApiResource) {
        apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
        integrationResponses: [{
            statusCode: '200',
            responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Credentials': "'false'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
            },
        }],
        passthroughBehavior: apigateway.PassthroughBehavior.Never,
        requestTemplates: {
            "application/json": "{\"statusCode\": 200}"
        },
        }), {
        methodResponses: [{
            statusCode: '200',
            responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            },  
        }]
        })
    }

}  