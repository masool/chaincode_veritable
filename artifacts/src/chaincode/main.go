package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

const prefixInvoice = "IN"
const projectName = "Cievus-Invoice-app"
const version = "v1"

var logger = shim.NewLogger("cievus-Invoice-app:")

type SmartContract struct {
}

func (s *SmartContract) Init(stub shim.ChaincodeStubInterface) pb.Response {
	logger.Info("*** " + projectName + " *** " + version + " Init ***")
	return shim.Success(nil)
}

func (s *SmartContract) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	logger.Info("*** " + projectName + " *** " + version + " Invoke ***")
	function, args := stub.GetFunctionAndParameters()
	logger.Info("Function: " + function)
	switch function {
	case "createInvoice":
		return s.createInvoice(stub, args)
	case "updateInvoice":
		return s.updateInvoice(stub, args)
	case "readAInvoice":
		return s.readAInvoice(stub, args)
	case "deleteInvoice":
		return s.deleteInvoice(stub, args)
	case "getAllInvoice":
		return s.getAllInvoice(stub)
	case "getInvoiceByOrgID":
		return s.getInvoiceByOrgID(stub, args)
	case "getInvoiceHistory":
		return s.getInvoiceHistory(stub, args)
	default:
		jsonResp := "{\"status\":false,\"description\":\"Invalid Smart Contract function name.\"}"
		return shim.Error(jsonResp)
	}
}

func main() {
	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
