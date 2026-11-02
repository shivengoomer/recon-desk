"""Target fields per file kind. `required` fields must be mapped; row-level rules live in service.py."""
from dataclasses import dataclass

from app.models.core import FileKind


@dataclass(frozen=True)
class Field:
    name: str
    label: str
    required: bool = False
    synonyms: tuple[str, ...] = ()


FIELDS: dict[FileKind, list[Field]] = {
    FileKind.orders: [
        Field("order_ref", "Order ID", True, ("order id", "order no", "order number", "orderid", "order_id", "order ref", "suborder id", "po number")),
        Field("order_date", "Order date", True, ("order date", "date", "placed on", "created at", "order placed")),
        Field("value", "Order value", True, ("value", "order value", "value ₹", "amount", "invoice amount", "order total", "selling price", "grand total")),
        Field("payment_mode", "Payment mode", True, ("payment", "payment mode", "payment method", "pay type", "cod/prepaid")),
        Field("delivery_status", "Delivery status", False, ("delivery status", "status", "order status", "shipment status")),
        Field("delivered_on", "Delivered on", False, ("delivered on", "delivery date", "delivered date", "delivered at")),
        Field("channel", "Channel", False, ("channel", "sales channel", "marketplace", "source")),
        Field("courier", "Courier", False, ("courier", "carrier", "shipping partner", "logistics partner")),
        Field("awb", "AWB", False, ("awb", "awb no", "awb number", "tracking id", "tracking number", "waybill")),
        Field("weight_g", "Weight (g)", False, ("weight", "weight g", "weight (g)", "dead weight", "declared weight")),
    ],
    FileKind.settlement: [
        Field("order_ref", "Order ID", True, ("order id", "order no", "order item id", "order_id", "orderid", "reference", "order ref")),
        Field("gross_amount", "Gross amount", True, ("gross", "gross amount", "sale amount", "order value", "invoice value", "item price")),
        Field("net_amount", "Net settled", True, ("net", "net amount", "settlement amount", "settled amount", "payout", "net payout", "amount settled", "received")),
        Field("fee_amount", "Fees", False, ("fee", "fees", "commission", "total fees", "marketplace fee", "total deductions")),
        Field("tcs_amount", "TCS", False, ("tcs", "gst tcs", "tcs amount", "tcs deducted")),
        Field("tds_amount", "TDS", False, ("tds", "income tax tds", "tds amount", "tds deducted", "tds 194o")),
        Field("settled_on", "Settlement date", False, ("settlement date", "settled on", "payout date", "payment date", "date")),
    ],
    FileKind.cod: [
        Field("order_ref", "Order ID", True, ("order id", "order no", "order_id", "orderid", "reference", "client order id")),
        Field("cod_collected", "COD collected", True, ("cod amount", "cod collected", "collected amount", "amount collected", "cod value")),
        Field("remitted_amount", "Remitted amount", True, ("remitted", "remitted amount", "remittance", "amount remitted", "net remittance", "paid amount")),
        Field("remitted_on", "Remittance date", False, ("remittance date", "remitted on", "utr date", "payment date", "date")),
    ],
    FileKind.freight: [
        Field("order_ref", "Order ID", False, ("order id", "order no", "order_id", "orderid", "reference", "client order id")),
        Field("awb", "AWB", False, ("awb", "awb no", "awb number", "waybill", "tracking id")),
        Field("charged_amount", "Freight charged", True, ("freight", "freight charged", "total charge", "total freight", "charged amount", "billed amount", "amount")),
        Field("billed_weight_g", "Billed weight (g)", False, ("billed weight", "charged weight", "weight", "weight g", "chargeable weight")),
        Field("invoice_no", "Invoice no", False, ("invoice no", "invoice number", "invoice")),
        Field("invoice_date", "Invoice date", False, ("invoice date", "date", "billing date")),
    ],
}


def field_names(kind: FileKind) -> set[str]:
    return {f.name for f in FIELDS[kind]}


def required_names(kind: FileKind) -> list[str]:
    return [f.name for f in FIELDS[kind] if f.required]
