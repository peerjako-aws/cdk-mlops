# Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template


# aws ssm put-parameter --name '/mlops/demo/github-personal-access-token' --type "SecureString" --value 'a value, for example P@ssW%rd#1'
# aws secretsmanager create-secret --name '/mlops/demo/github-personal-access-token' --secret-string mygithubtoken


# https://github.com/aws-samples/aws-reinvent-2018-trivia-game/blob/ca0e3bd20d959639479889d5b65231ec4a11f4fc/trivia-backend/cdk/ecs-service.ts

./codebuild_build.sh -i aws/codebuild/nodejs10.14.1 -a . -b ml-backend/buildspec.yml -e ml-backend/localtest.env 

./codebuild_build.sh -i aws/codebuild/python3.6.5 -c -a . -b ml-training/movielens/buildspec.yml -e ml-training/movielens/localtest.env 
