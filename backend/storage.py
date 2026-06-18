import os
import shutil
from abc import ABC, abstractmethod
from fastapi import UploadFile
import uuid

class BaseStorage(ABC):
    @abstractmethod
    def save(self, file: UploadFile) -> str:
        pass

class LocalStorage(BaseStorage):
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def save(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return the URL path where it can be accessed
        return f"/uploads/{unique_filename}"
