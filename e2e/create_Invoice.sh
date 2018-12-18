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
echo "CREATING NEW ASSET"
echo
TRX_ID=$(curl -s -X POST \
  http://localhost:4000/api/v1/create_invoice \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{"args":["1004","Delphi Inc,"GMX0000030272","16-09-2018","PO524","10-05-2018","16-06-2018","25-11-2018","15000","USD","8521","1002","Flextronics Inc","1002","Flextronics"," ","4.50","0.25","New","16-07-2018","Tesla","16-07-2018","Supplier","14800","4.25","4.236","1055","Citibank NA","14800.12"]
}')
echo " $TRX_ID"
echo
echo


echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
