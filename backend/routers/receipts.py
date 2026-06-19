import base64
import os
import tempfile

import fitz
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from .. import models
from ..auth import get_current_user
from ..util import process_receipt_image

router = APIRouter(prefix="/receipts", tags=["receipts"])

MAX_RECEIPT_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_RECEIPT_TYPES = {"image/jpeg", "image/png", "application/pdf"}


def convert_first_pdf_page_to_png(file_bytes: bytes) -> bytes:
    temp_pdf_path = None
    temp_png_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(file_bytes)
            temp_pdf_path = temp_pdf.name

        doc = fitz.open(temp_pdf_path)
        page = doc.load_page(0)
        pix = page.get_pixmap()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_png:
            temp_png_path = temp_png.name
            pix.save(temp_png_path)
            with open(temp_png_path, "rb") as image_file:
                return image_file.read()
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
        if temp_png_path and os.path.exists(temp_png_path):
            os.remove(temp_png_path)


@router.post("/scan")
async def scan_receipt(
    file: UploadFile = File(...),
    _current_user: models.User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_RECEIPT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    file_bytes = await file.read(MAX_RECEIPT_UPLOAD_BYTES + 1)
    if len(file_bytes) > MAX_RECEIPT_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")

    preview_content_type = file.content_type
    filename = file.filename or ""
    if filename.lower().endswith(".pdf") or file.content_type == "application/pdf":
        file_bytes = await run_in_threadpool(convert_first_pdf_page_to_png, file_bytes)
        preview_content_type = "image/png"

    base64_image = base64.b64encode(file_bytes).decode("utf-8")

    try:
        parsed_receipt = await run_in_threadpool(process_receipt_image, base64_image)
        return {
            "image_url": f"data:{preview_content_type};base64,{base64_image}",
            "data": parsed_receipt.dict(),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
