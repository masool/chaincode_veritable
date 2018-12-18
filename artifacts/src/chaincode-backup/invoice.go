package main

import (
	"bytes"
	"encoding/json"
	"strconv"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

func (s *SmartContract) createInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("***" + projectName + "***" + version + "Create new Invoice ***")

	if len(args) != 29 {
		return shim.Error("Incorrect number of arguments. Expecting 29")
	}

	serializedID, _ := stub.GetCreator()
	logger.Info(string(serializedID))
	orgMSPID := string(serializedID[2:10])
	logger.Info(orgMSPID)
	if orgMSPID != "BuyerMSP"{
		return shim.Error("Access Denied, This user don't have permission to create new invoice ")
	}

	invoice := Invoice{}
	//err := json.Unmarshal([]byte(args[0]), &invoice)
	invoice.BuyerOrgID, _ = strconv.Atoi(args[0])
	invoice.BuyerName = args[1]
	invoice.InvoiceNumber = args[2]
	invoice.InvoiceDate = args[3]
	invoice.PurchaseOrderNumber = args[4]
	invoice.PurchaseOrderDate = args[5]
	invoice.ShipDate = args[6]
	invoice.InvoicePayableDate = args[7]
	invoice.OriginalInvoiceAmount, _ = strconv.ParseFloat(args[8], 64)
	invoice.InvoiceCurrency = args[9]
	invoice.SupplierRecInvNumber = args[10]
	invoice.SupplierOrgID, _ = strconv.Atoi(args[11])
	invoice.SupplierName = args[12]
	invoice.LegalOrgID, _ = strconv.Atoi(args[13])
	invoice.LegalOwnerName = args[14]
	invoice.Obligator = args[15]
	invoice.DiscountRate, _ = strconv.ParseFloat(args[16], 64)
	invoice.NotionalDiscount, _ = strconv.ParseFloat(args[17], 64)
	invoice.AssetStatus = args[18]
	invoice.CreationDate = args[19]
	invoice.CreatedBy = args[20]
	invoice.LastUpdateDate = args[21]
	invoice.LastUpdatedBy = args[22]
	invoice.DiscountedPayableAmt, _ = strconv.ParseFloat(args[23], 64)
	invoice.AppliedDiscountRateAbsolute, _ = strconv.ParseFloat(args[24], 64)
	invoice.AppliedDiscountRateLIBORBased, _ = strconv.ParseFloat(args[25], 64)
	invoice.FincoOrgID, _ = strconv.Atoi(args[26])
	invoice.FincoOrgName = args[27]
	invoice.TotalAmountToBePaidToSupplier, _ = strconv.ParseFloat(args[28], 64)

	if invoice.InvoiceNumber == "" {
		return shim.Error("Invoice number can't be empty")
	}
	key, err := stub.CreateCompositeKey(prefixInvoice, []string{args[2]})
	if err != nil {
		return shim.Error(err.Error())
	}
	// Check if the invoice already exist
	invoiceAsBytes, _ := stub.GetState(key)
	if invoiceAsBytes != nil {
		return shim.Error("Invoice already exist with this invoice number")
	}
	invoiceAsBytes, err = json.Marshal(invoice)
	if err != nil {
		return shim.Error(err.Error())
	}
	err = stub.PutState(key, invoiceAsBytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success([]byte("Invoice created successfully"))
}

func (s *SmartContract) updateInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("***" + projectName + "***" + version + "Update invoice ***")

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	key, err := stub.CreateCompositeKey(prefixInvoice, []string{args[0]})
	if err != nil {
		return shim.Error(err.Error())
	}
	invoiceAsBytes, _ := stub.GetState(key)
	if invoiceAsBytes == nil {
		return shim.Error("Invalid Invoice number, No invoice exist")
	}
	invoice := Invoice{}
	err = json.Unmarshal(invoiceAsBytes, &invoice)
	invoice.AssetStatus = args[1]
	// fields to be updated
	invoiceAsBytes, err = json.Marshal(invoice)
	if err != nil {
		return shim.Error(err.Error())
	}
	err = stub.PutState(key, invoiceAsBytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success([]byte("Invoice updated sucessfully"))

}

func (s *SmartContract) readAInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("***" + projectName + "***" + version + "Read invoice ***")
	logger.Info("***")
	logger.Info(args[0])
	key, err := stub.CreateCompositeKey(prefixInvoice, []string{args[0]})
	if err != nil {
		return shim.Error(err.Error())
	}
	invoiceAsBytes, _ := stub.GetState(key)
	if invoiceAsBytes == nil {
		return shim.Error("Invalid Invoice number, No invoice exist")
	}
	return shim.Success(invoiceAsBytes)
}

func (s *SmartContract) deleteInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("***" + projectName + "***" + version + "Delete invoice ***")

	key, err := stub.CreateCompositeKey(prefixInvoice, []string{args[0]})
	if err != nil {
		return shim.Error(err.Error())
	}
	invoiceAsBytes, _ := stub.GetState(key)
	if invoiceAsBytes == nil {
		return shim.Error("Invalid Invoice number, No invoice exist")
	}
	err = stub.DelState(key)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success([]byte("Invoice Deleted sucessfully"))
}

func (s *SmartContract) getAllInvoice(stub shim.ChaincodeStubInterface) pb.Response {
	logger.Info("***" + projectName + "***" + version + "Get list of all Invoice ***")
	results := []interface{}{}
	resultsIterator, err := stub.GetStateByPartialCompositeKey(prefixInvoice, []string{})
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()
	for resultsIterator.HasNext() {
		kvResult, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		invoice := Invoice{}
		err = json.Unmarshal(kvResult.Value, &invoice)
		if err != nil {
			return shim.Error(err.Error())
		}
		results = append(results, invoice)
	}
	invoiceAsBytes, err := json.Marshal(results)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(invoiceAsBytes)

}

func (s *SmartContract) getInvoiceByOrgID(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("***" + projectName + "***" + version + "Get list of all Invoice By OrgID ***")
	buyerOrgID, _ := strconv.Atoi(args[0])
	results := []interface{}{}
	resultsIterator, err := stub.GetStateByPartialCompositeKey(prefixInvoice, []string{})
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()
	for resultsIterator.HasNext() {
		kvResult, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		invoice := Invoice{}
		err = json.Unmarshal(kvResult.Value, &invoice)
		if err != nil {
			return shim.Error(err.Error())
		}
		if invoice.BuyerOrgID == buyerOrgID {
			results = append(results, invoice)
		}
	}
	invoiceAsBytes, err := json.Marshal(results)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(invoiceAsBytes)
}

func (s *SmartContract) getInvoiceHistory(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("***" + projectName + "***" + version + "Get History of A Invoice ***")
	if len(args) < 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	logger.Info("Getting history of Invoice No:" + args[0])
	key, _ := stub.CreateCompositeKey(prefixInvoice, []string{args[0]})
	resultsIterator, err := stub.GetHistoryForKey(key)
	if err != nil {
		return shim.Error("{\"status\":false,\"description\":\"" + err.Error() + "\"}")
	}
	defer resultsIterator.Close()
	// buffer is a JSON array containing historic values for the invoice
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error("{\"status\":false,\"description\":\"" + err.Error() + "\"}")
		}
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(response.TxId)
		buffer.WriteString("\"")

		buffer.WriteString(", \"value\":")
		if response.IsDelete {
			buffer.WriteString("null")
		} else {
			buffer.WriteString(string(response.Value))
		}

		buffer.WriteString(", \"timestamp\":")
		buffer.WriteString("\"")
		buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
		buffer.WriteString("\"")

		buffer.WriteString(", \"isDelete\":")
		buffer.WriteString("\"")
		buffer.WriteString(strconv.FormatBool(response.IsDelete))
		buffer.WriteString("\"")

		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")
	logger.Info("History: \n" + buffer.String())
	return shim.Success(buffer.Bytes())
}
