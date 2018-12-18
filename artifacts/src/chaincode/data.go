package main

type Invoice struct {
	BuyerOrgID                    int     `json:"Buyer_Org_Id"`
	BuyerName                     string  `json:"Buyer_Name"`
	InvoiceNumber                 string  `json:"Invoice_Number"`
	InvoiceDate                   string  `json:"Invoice_Date"`
	PurchaseOrderNumber           string  `json:"Purchase_Order_Number"`
	PurchaseOrderDate             string  `json:"Purchase_Order_Date"`
	ShipDate                      string  `json:"Ship_Date"`
	InvoicePayableDate            string  `json:"Invoice_Payable_Date"`
	OriginalInvoiceAmount         float64 `json:"Original_Invoice_Amount"`
	InvoiceCurrency               string  `json:"Invoice_Currency"`
	SupplierRecInvNumber          string  `json:"Supplier_Rec_Inv_Number"`
	SupplierOrgID                 int     `json:"Supplier_Org_Id"`
	SupplierName                  string  `json:"Supplier_Name"`
	LegalOrgID                    int     `json:"Legal_Org_id"`
	LegalOwnerName                string  `json:"Legal_Owner_Name"`
	Obligator                     string  `json:"Obligator"`
	DiscountRate                  float64 `json:"Discount_Rate"`
	NotionalDiscount              float64 `json:"Notional_Discount"`
	AssetStatus                   string  `json:"Asset_Status"`
	CreationDate                  string  `json:"Creation_Date"`
	CreatedBy                     string  `json:"Created_By"`
	LastUpdateDate                string  `json:"Last_Update_Date"`
	LastUpdatedBy                 string  `json:"Last_Updated_By"`
	DiscountedPayableAmt          float64 `json:"Discounted_Payable_Amt"`
	AppliedDiscountRateAbsolute   float64 `json:"Applied_Discount_Rate_Absolute"`
	AppliedDiscountRateLIBORBased float64 `json:"Applied_Discount_Rate_LIBOR_Based"`
	FincoOrgID                    int     `json:"Finco_Org_Id"`
	FincoOrgName                  string  `json:"Finco_Org_Name"`
	TotalAmountToBePaidToSupplier float64 `json:"Total_amount_to_be_paid_to_Supplier"`
}
