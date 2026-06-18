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

class FirebaseStorage(BaseStorage):
    def __init__(self, bucket_name: str):
        import firebase_admin
        from firebase_admin import credentials, storage as firebase_storage
        
        if not firebase_admin._apps:
            # Uses GOOGLE_APPLICATION_CREDENTIALS automatically
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
        self.bucket = firebase_storage.bucket()

    def save(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"receipts/{uuid.uuid4().hex}{ext}"
        blob = self.bucket.blob(unique_filename)
        
        # Upload directly from the incoming file stream
        blob.upload_from_file(file.file, content_type=file.content_type)
        
        # Generate a signed URL valid for 1 hour to ensure strict privacy
        from datetime import timedelta
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=1),
            method="GET"
        )
        return signed_url
