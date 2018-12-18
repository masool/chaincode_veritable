#------------------------------------------------------------------------------------------------
# Script to Start the Hyperledger Fabric Network
#------------------------------------------------------------------------------------------------

function delcointaiers(){
        CONTAINER_IDS=$(docker ps -f "name=cievus" -aq)
        if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" = " " ]; then
	echo "Removing cointaiers..."
        else
                docker rm -f $CONTAINER_IDS
        fi
}

function delimages(){
        DOCKER_IMAGE_IDS=$(docker images | grep "dev-peer[0-20]" | awk '{print $3}')
        if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" = " " ]; then
	echo "Removing images..."
        else
                docker rmi -f $DOCKER_IMAGE_IDS
        fi
}

function restartNetwork() {
  	#teardown the network and clean the containers and intermediate images
	docker-compose -f ./artifacts/docker-compose.yaml down
	delcointaiers
	delimages
	docker-compose -f ./artifacts/docker-compose.yaml up -d 
}

function installNodeModules() {
	if [ -d node_modules ]; then
		echo "=================== node Server starting =================="
	else
		echo "============== Installing node modules ============="
		npm install
	fi
}


restartNetwork

installNodeModules

pm2 start app.js
