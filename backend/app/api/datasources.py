from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.datasource import DataSource
from app.models.user import User
from app.schemas.datasource import DataSourceCreate, DataSourceUpdate, DataSourceResponse
from app.utils.security import encrypt_password, decrypt_password
from app.services.connection_manager import connection_manager
from app.services.metadata_sync import sync_metadata
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=list[DataSourceResponse])
async def list_datasources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSource).where(DataSource.user_id == current_user.id).order_by(DataSource.id)
    )
    return result.scalars().all()


@router.post("", response_model=DataSourceResponse, status_code=201)
async def create_datasource(
    data: DataSourceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await connection_manager.test_connection(
            data.db_type, data.host, data.port, data.database, data.username, data.password
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Connection test failed: {str(e)}. DataSource was not saved."
        )

    ds = DataSource(
        user_id=current_user.id,
        name=data.name,
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        database=data.database,
        username=data.username,
        encrypted_password=encrypt_password(data.password),
        pool_size=data.pool_size,
    )
    db.add(ds)
    await db.commit()
    await db.refresh(ds)

    sync_warning = None
    try:
        await sync_metadata(ds.id, db)
    except Exception as e:
        sync_warning = f"Metadata sync failed: {str(e)}"

    resp = DataSourceResponse.model_validate(ds)
    resp.sync_warning = sync_warning
    return JSONResponse(status_code=201, content=resp.model_dump(mode="json"))


@router.get("/{datasource_id}", response_model=DataSourceResponse)
async def get_datasource(
    datasource_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSource).where(DataSource.id == datasource_id, DataSource.user_id == current_user.id)
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    return ds


@router.put("/{datasource_id}", response_model=DataSourceResponse)
async def update_datasource(
    datasource_id: int,
    data: DataSourceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSource).where(DataSource.id == datasource_id, DataSource.user_id == current_user.id)
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")

    update_data = data.model_dump(exclude_unset=True)

    test_host = update_data.get("host", ds.host)
    test_port = update_data.get("port", ds.port)
    test_database = update_data.get("database", ds.database)
    test_username = update_data.get("username", ds.username)
    test_password = update_data.get("password", decrypt_password(ds.encrypted_password))

    try:
        await connection_manager.test_connection(
            ds.db_type, test_host, test_port, test_database, test_username, test_password
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Connection test failed: {str(e)}. Changes were not saved."
        )

    if "password" in update_data:
        update_data["encrypted_password"] = encrypt_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(ds, key, value)

    await db.commit()
    await db.refresh(ds)
    await connection_manager.remove_engine(datasource_id)

    sync_warning = None
    try:
        await sync_metadata(ds.id, db)
    except Exception as e:
        sync_warning = f"Metadata sync failed: {str(e)}"

    resp = DataSourceResponse.model_validate(ds)
    resp.sync_warning = sync_warning
    return resp


@router.delete("/{datasource_id}", status_code=204)
async def delete_datasource(
    datasource_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSource).where(DataSource.id == datasource_id, DataSource.user_id == current_user.id)
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    await connection_manager.remove_engine(datasource_id)
    await db.delete(ds)
    await db.commit()


@router.post("/{datasource_id}/test")
async def test_datasource_connection(
    datasource_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSource).where(DataSource.id == datasource_id, DataSource.user_id == current_user.id)
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    try:
        password = decrypt_password(ds.encrypted_password)
        await connection_manager.test_connection(
            ds.db_type, ds.host, ds.port, ds.database, ds.username, password
        )
        return {"success": True, "message": "Connection successful"}
    except Exception as e:
        return {"success": False, "message": str(e)}
