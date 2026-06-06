from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.datasource import DataSource
from app.schemas.datasource import DataSourceCreate, DataSourceUpdate, DataSourceResponse
from app.utils.security import encrypt_password, decrypt_password
from app.services.connection_manager import connection_manager

router = APIRouter()


@router.get("", response_model=list[DataSourceResponse])
async def list_datasources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSource).order_by(DataSource.id))
    return result.scalars().all()


@router.post("", response_model=DataSourceResponse, status_code=201)
async def create_datasource(data: DataSourceCreate, db: AsyncSession = Depends(get_db)):
    ds = DataSource(
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
    return ds


@router.get("/{datasource_id}", response_model=DataSourceResponse)
async def get_datasource(datasource_id: int, db: AsyncSession = Depends(get_db)):
    ds = await db.get(DataSource, datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    return ds


@router.put("/{datasource_id}", response_model=DataSourceResponse)
async def update_datasource(datasource_id: int, data: DataSourceUpdate, db: AsyncSession = Depends(get_db)):
    ds = await db.get(DataSource, datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["encrypted_password"] = encrypt_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(ds, key, value)

    await db.commit()
    await db.refresh(ds)
    await connection_manager.remove_engine(datasource_id)
    return ds


@router.delete("/{datasource_id}", status_code=204)
async def delete_datasource(datasource_id: int, db: AsyncSession = Depends(get_db)):
    ds = await db.get(DataSource, datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    await connection_manager.remove_engine(datasource_id)
    await db.delete(ds)
    await db.commit()


@router.post("/{datasource_id}/test")
async def test_datasource_connection(datasource_id: int, db: AsyncSession = Depends(get_db)):
    ds = await db.get(DataSource, datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    try:
        password = decrypt_password(ds.encrypted_password)
        success = await connection_manager.test_connection(
            ds.db_type, ds.host, ds.port, ds.database, ds.username, password
        )
        return {"success": success, "message": "Connection successful"}
    except Exception as e:
        return {"success": False, "message": str(e)}
