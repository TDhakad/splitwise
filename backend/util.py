import os
import base64
from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

class ReceiptItem(BaseModel):
    name: str
    quantity: int
    price: float

class Receipt(BaseModel):
    items: list[ReceiptItem]
    subtotal: float
    discount: Optional[float] = 0.0
    tax: Optional[float] = 0.0
    tip: Optional[float] = 0.0
    total: float
    date: Optional[str] = None
    is_receipt: bool

def process_receipt_image(base64_image: str):
    model = ChatOllama(model=os.getenv("OLLAMA_MODEL", "gpt-4o"), num_predict=2000, base_url="https://ollama.com/")

    structured_model = model.with_structured_output(Receipt)

    message = HumanMessage(
        content=[
            {"type": "text", "text": "Act as a receipt parser. Carefully examine the image. If the image is NOT a clear receipt, invoice, or bill, set 'is_receipt' to false and return an empty list of items. If it IS a receipt, set 'is_receipt' to true, extract all line items with their names, quantities, and prices. EXCLUDE any items that are marked as 'Unavailable', 'Void', 'Return', or 'Refund'. Also extract the subtotal, discount (or savings), tax, tip, and total amounts. Use 0.0 if any amount is not present."},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{base64_image}"},
            },
        ]
    )

    response = structured_model.invoke([message])
    return response
