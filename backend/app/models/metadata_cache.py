from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from app.database import Base


class MetadataTable(Base):
    __tablename__ = "metadata_tables"

    id = Column(Integer, primary_key=True, index=True)
    datasource_id = Column(Integer, ForeignKey("datasources.id", ondelete="CASCADE"), nullable=False)
    schema_name = Column(String(255), nullable=True)
    table_name = Column(String(255), nullable=False)
    synced_at = Column(DateTime, server_default=func.now())


class MetadataColumn(Base):
    __tablename__ = "metadata_columns"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("metadata_tables.id", ondelete="CASCADE"), nullable=False)
    column_name = Column(String(255), nullable=False)
    data_type = Column(String(255), nullable=False)
    is_nullable = Column(Boolean, default=True)
    is_primary_key = Column(Boolean, default=False)
    column_order = Column(Integer, default=0)
