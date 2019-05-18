wget -N http://files.grouplens.org/datasets/movielens/ml-100k.zip

rm -rf tmp-data
unzip -o ml-100k.zip -x *.test *.base *mku.sh *.pl *README -d tmp-data/
sed -i '.data' $'1s/^/userid\\\tmovieid\\\trating\\\ttimestamp\\\n/' tmp-data/ml-100k/u.data

rm -rf training-data
mkdir -p training-data/{u.data,u.genre,u.info,u.item,u.occupation,u.user}
mv tmp-data/ml-100k/u.data training-data/u.data/data.csv
mv tmp-data/ml-100k/u.genre training-data/u.genre/data.csv
mv tmp-data/ml-100k/u.info training-data/u.info/data.csv
mv tmp-data/ml-100k/u.item training-data/u.item/data.csv
mv tmp-data/ml-100k/u.occupation training-data/u.occupation/data.csv
mv tmp-data/ml-100k/u.user training-data/u.user/data.csv
rm ml-100k.zip
rm -rf tmp-data

