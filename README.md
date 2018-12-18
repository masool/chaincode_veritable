## Invoice Management System


### Prerequisites and setup:

* [Docker] - v1.12 or higher
* [Docker Compose] - v1.8 or higher
* **Node.js** v8.4.0 or higher



* 3 CAs (Database: MySql)
* A Kafka orderer
* 9 peers (3 peers per Org)


## Running the sample program

 $ npm install

 ##### Terminal Window 1
#===========================================================================================
 $ ./startFabric.sh



##### Terminal Window 2
#===========================================================================================
 $ ./chainSetup.sh



##### Terminal Window 3
#===========================================================================================
* TEST REST APIs 

  $ cd e2e/
  
  # Create new Invoice
  $ create_Invoice.sh 

  # Get Invoice
  $ get_Invoice.sh

  # Get All Invoice
  $ get_All_Invoice.sh

