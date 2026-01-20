from sqlalchemy import Column, Integer, String, Float, ForeignKey
from geoalchemy2 import Geometry
from .database import Base

class FederalState(Base):
    __tablename__ = "federal_states"
    id = Column(Integer, primary_key=True, index=True)
    state_name = Column(String, unique=True, index=True)
    geom = Column(Geometry('MULTIPOLYGON',srid=4326))

class StateStatistic(Base):
    __tablename__ = "state_statistics"
    id = Column(Integer, primary_key=True, index=True)
    state_name = Column(String,ForeignKey("federal_states.state_name"))
    mean_ghi = Column(Float)
    mean_wpd = Column(Float)
    mean_wind_speed_ms = Column(Float)
    solar_highly_suitable_km2 = Column(Float)
    solar_mean_score = Column(Float)
    wind_highly_suitable_km2 = Column(Float)
    wind_mean_score = Column(Float)


