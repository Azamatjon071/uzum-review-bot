import io
import hashlib
from typing import Optional, Tuple
import boto3
from botocore.client import Config
from PIL import Image
import imagehash
from app.config import get_settings

settings = get_settings()

# ─── MinIO / S3 client ────────────────────────────────────────────────────────

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}",
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def ensure_bucket_exists():
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=settings.MINIO_BUCKET)
    except Exception:
        s3.create_bucket(Bucket=settings.MINIO_BUCKET)
        import json
        policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET}/public/*"]
            }]
        }
        s3.put_bucket_policy(Bucket=settings.MINIO_BUCKET, Policy=json.dumps(policy))


class StorageService:
    def __init__(self):
        self.s3 = get_s3_client()
        self.bucket = settings.MINIO_BUCKET

    async def upload_image(
        self,
        file_data: bytes,
        key: str,
        content_type: str = "image/jpeg",
    ) -> str:
        """Upload image to MinIO, returns file key."""
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file_data,
            ContentType=content_type,
            Metadata={"uploaded-by": "uzumbot"},
        )
        return key

    def get_presigned_url(self, key: str, expires: int = 3600) -> str:
        """Get presigned URL for private file access (browser-accessible).
        Replaces the internal minio:9000 hostname with the public-facing URL
        so browsers outside Docker can load images.
        """
        url = self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )
        # Replace internal docker hostname with public-facing URL
        minio_internal = f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}"
        minio_public = settings.MINIO_PUBLIC_BASE_URL
        if minio_public and minio_internal in url:
            url = url.replace(minio_internal, minio_public.rstrip("/"))
        return url

    def get_public_url(self, key: str) -> str:
        """Get public URL for public files."""
        return f"{settings.MINIO_PUBLIC_URL}/{key}"

    async def delete_file(self, key: str):
        self.s3.delete_object(Bucket=self.bucket, Key=key)


# ─── Image processing ─────────────────────────────────────────────────────────

class ImageService:
    MAX_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    ALLOWED_TYPES = settings.allowed_image_types_list
    MAX_DIMENSION = 4096

    @staticmethod
    def validate_and_process(
        file_data: bytes,
        content_type: str,
        filename: str = "upload"
    ) -> Tuple[bytes, str, str]:
        if len(file_data) > ImageService.MAX_SIZE_BYTES:
            raise ValueError(f"File too large (max {settings.MAX_UPLOAD_SIZE_MB}MB)")
        if content_type not in ImageService.ALLOWED_TYPES:
            raise ValueError(f"File type not allowed: {content_type}")
        try:
            img = Image.open(io.BytesIO(file_data))
            img.verify()
        except Exception as e:
            raise ValueError(f"Invalid image file: {e}")
        img = Image.open(io.BytesIO(file_data))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        if img.width > ImageService.MAX_DIMENSION or img.height > ImageService.MAX_DIMENSION:
            img.thumbnail((ImageService.MAX_DIMENSION, ImageService.MAX_DIMENSION), Image.LANCZOS)
        phash = str(imagehash.phash(img))
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85, optimize=True)
        processed_bytes = output.getvalue()
        return processed_bytes, "image/jpeg", phash

    @staticmethod
    def compute_phash(file_data: bytes) -> str:
        img = Image.open(io.BytesIO(file_data))
        return str(imagehash.phash(img))

    @staticmethod
    def are_duplicate(hash1: str, hash2: str, threshold: int = 10) -> bool:
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return (h1 - h2) < threshold
