# Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template


Local code build to test CDK synth of backend stack:
./codebuild_build.sh -i aws/codebuild/nodejs10.14.1 -a . -b ml-backend/buildspec.yml
