from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, func
from app.database import Base


class Chart(Base):
    __tablename__ = "charts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    chart_type = Column(String(50), nullable=False)  # bar | line | pie | area | scatter
    datasource_id = Column(Integer, ForeignKey("datasources.id", ondelete="SET NULL"), nullable=True)
    query_config = Column(Text, nullable=False)  # JSON: QueryRequest fields
    chart_config = Column(Text, nullable=False)  # JSON: visual config (colors, axis labels, etc.)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
