#!/bin/bash
#

jq --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Please Install 'jq' to execute this script"
	echo
	exit 1
fi

starttime=$(date +%s)

count=0


echo "POST request Enroll on Buyer  ..."
echo
ORG1_TOKEN=$(curl -s -X POST \
  http://localhost:4000/api/v1/enroll_users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=BuyerAdmin&orgName=Buyer')
echo $ORG1_TOKEN
ORG1_TOKEN=$(echo $ORG1_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG1 token is $ORG1_TOKEN"
echo
echo
echo "Updating ASSET"
echo
TRX_ID=$(curl -s -X POST \
  http://localhost:4000/api/v1/update_invoice \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "args":["1012","Asset  Updated........"]
}')
echo " $TRX_ID"
echo
echo


echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
