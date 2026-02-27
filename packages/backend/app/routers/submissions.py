import uuid
import secrets
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, cast, Date

from app.database import get_db
from app.deps import get_current_user
from app.models import Submission, SubmissionImage, SubmissionStatus, Product, User
from app.services.storage import StorageService, ImageService
from app.services.audit import AuditService
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/submissions", tags=["submissions"])

storage = StorageService()
image_svc = ImageService()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_submission(
    product_id: Optional[str] = Form(None),
    product_url: Optional[str] = Form(None),
    order_number: Optional[str] = Form(None),
    review_text: Optional[str] = Form(None),
    images: List[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    """Submit review screenshots for admin approval."""
    # Check daily submission limit
    today = date.today()
    result = await db.execute(
        select(func.count(Submission.id)).where(
            and_(
                Submission.user_id == user.id,
                cast(Submission.created_at, Date) == today,
            )
        )
    )
    today_count = result.scalar()
    if today_count >= settings.MAX_SUBMISSIONS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum {settings.MAX_SUBMISSIONS_PER_DAY} submissions per day reached"
        )

    if len(images) > settings.MAX_IMAGES_PER_SUBMISSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.MAX_IMAGES_PER_SUBMISSION} images per submission"
        )

    # Resolve product — by ID or by URL (auto-create if needed)
    product = None
    resolved_product_id: uuid.UUID

    if product_id:
        try:
            pid = uuid.UUID(product_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product_id")
        prod_result = await db.execute(
            select(Product).where(and_(Product.id == pid, Product.is_active == True))
        )
        product = prod_result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        resolved_product_id = pid
    elif product_url:
        # Look up by URL first
        prod_result = await db.execute(
            select(Product).where(Product.uzum_product_url == product_url)
        )
        product = prod_result.scalar_one_or_none()
        if not product:
            # Auto-create a placeholder product from the URL
            product = Product(
                name_uz=product_url[:120],
                name_ru=product_url[:120],
                name_en=product_url[:120],
                uzum_product_url=product_url,
                is_active=True,
            )
            db.add(product)
            await db.flush()
        resolved_product_id = product.id
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either product_id or product_url is required"
        )

    # Create submission
    submission = Submission(
        user_id=user.id,
        product_id=resolved_product_id,
        order_number=order_number,
        review_text=review_text,
        status=SubmissionStatus.PENDING,
    )
    db.add(submission)
    await db.flush()

    # Process and upload each image
    uploaded_hashes = []
    for img_file in images:
        file_data = await img_file.read()
        content_type = img_file.content_type or "image/jpeg"

        try:
            processed_bytes, ct, phash = ImageService.validate_and_process(
                file_data, content_type, img_file.filename or "upload"
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        # Check for duplicate images (anti-fraud)
        is_dup = any(ImageService.are_duplicate(phash, h) for h in uploaded_hashes)
        if is_dup:
            continue  # Skip exact duplicates within same submission

        # Check against existing submission images in DB for this user
        dup_result = await db.execute(
            select(SubmissionImage)
            .join(Submission)
            .where(Submission.user_id == user.id)
            .where(SubmissionImage.perceptual_hash.isnot(None))
        )
        existing_images = dup_result.scalars().all()
        is_global_dup = any(
            ImageService.are_duplicate(phash, img.perceptual_hash)
            for img in existing_images if img.perceptual_hash
        )

        # Upload to MinIO
        file_key = f"submissions/{submission.id}/{secrets.token_hex(8)}.jpg"
        await storage.upload_image(processed_bytes, file_key, content_type="image/jpeg")

        submission_image = SubmissionImage(
            submission_id=submission.id,
            file_key=file_key,
            original_filename=img_file.filename,
            perceptual_hash=phash,
            file_size=len(processed_bytes),
        )
        db.add(submission_image)
        uploaded_hashes.append(phash)

        if is_global_dup:
            # Mark submission as potential duplicate for admin review
            submission.status = SubmissionStatus.DUPLICATE

    # Update user stats
    user.total_submissions += 1

    await db.flush()

    return {
        "id": str(submission.id),
        "status": submission.status.value,
        "message": "Submission received and pending review",
    }


@router.get("")
async def list_my_submissions(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Submission)
        .where(Submission.user_id == user.id)
        .order_by(Submission.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    submissions = result.scalars().all()

    count_result = await db.execute(
        select(func.count(Submission.id)).where(Submission.user_id == user.id)
    )
    total = count_result.scalar()

    items = []
    for s in submissions:
        img_result = await db.execute(
            select(SubmissionImage).where(SubmissionImage.submission_id == s.id)
        )
        imgs = img_result.scalars().all()
        items.append({
            "id": str(s.id),
            "product_id": str(s.product_id),
            "status": s.status.value,
            "rejection_reason": s.rejection_reason,
            "spin_granted": s.spin_granted,
            "image_count": len(imgs),
            "image_urls": [storage.get_presigned_url(img.file_key, expires=3600) for img in imgs],
            "created_at": s.created_at.isoformat(),
        })

    return {"items": items, "total": total, "page": page, "limit": limit}
