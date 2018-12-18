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


echo "Creating New Affiliation: Buyer.department1"

RESP=$(curl -s -X POST \
  http://localhost:4000/api/v1/newAffiliation \
  -H "content-type: application/json" \
  -d '{
    "orgName":"Buyer",
    "affliation":"department1"
}')
echo " $RESP"
echo

echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
