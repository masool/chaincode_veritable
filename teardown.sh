#------------------------------------------------------------------------------------------------
# Script to teardown the Network and delete chaincode running containers and images
#------------------------------------------------------------------------------------------------

function delcointaiers(){
        CONTAINER_IDS=$(docker ps -f "name=cievus" -aq)
        if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" = " " ]; then
                echo 
        else
                docker rm -f $CONTAINER_IDS
        fi
	echo
}

function delimages(){
        DOCKER_IMAGE_IDS=$(docker images | grep "dev-peer[0-20]" | awk '{print $3}')
        if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" = " " ]; then
		echo 
        else
                docker rmi -f $DOCKER_IMAGE_IDS
        fi
	echo
}

function teardownNetwork() {
        echo "Teardown the network and clean the containers and intermediate images"
        docker-compose -f ./artifacts/docker-compose.yaml down
	#Remove chaincode running containers
	delcointaiers
	#Remove chaincode specific images
	delimages
        #Cleanup the fabric-client key-value store and Remove backup
        rm -rf ./key/
	rm -rf ./logs/
        rm -rf ./artifacts/Backup/
}

teardownNetwork

# Usage HELP: run the following command to teardown the project
# $ sudo bash ./teardown.sh 