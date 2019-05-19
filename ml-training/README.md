

Local codebuild to test training code:

./codebuild_build.sh -i aws/codebuild/python3.6.5 -c -a . -b ml-training/movielens/buildspec.yml -e ml-training/movielens/localtest.env 

./codebuild_build.sh -i aws/codebuild/python3.6.5 -c -a . -b ml-training/iris-dnn/buildspec.yml -e ml-training/iris-dnn/localtest.env 