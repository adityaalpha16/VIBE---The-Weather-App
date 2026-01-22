from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenWeatherMap API Key
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class WeatherData(BaseModel):
    city: str
    country: str
    temperature: float
    feels_like: float
    condition: str
    description: str
    humidity: int
    pressure: int
    wind_speed: float
    uv_index: Optional[float] = None
    icon: str
    lat: float
    lon: float

class HourlyForecast(BaseModel):
    time: str
    temperature: float
    condition: str
    icon: str
    pop: float

class DailyForecast(BaseModel):
    date: str
    day: str
    temp_max: float
    temp_min: float
    condition: str
    description: str
    icon: str
    pop: float
    humidity: int


# Add your routes to the router
@api_router.get("/")
async def root():
    return {"message": "Vibes Weather API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.get("/weather/current")
async def get_current_weather(city: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    """Get current weather for a city or coordinates"""
    if not city and (lat is None or lon is None):
        raise HTTPException(status_code=400, detail="Either city or coordinates required")
    
    try:
        async with httpx.AsyncClient() as client:
            params = {
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            }
            
            if city:
                params["q"] = city
            elif lat is not None and lon is not None:
                params["lat"] = lat
                params["lon"] = lon
            
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            weather_data = WeatherData(
                city=data["name"],
                country=data["sys"]["country"],
                temperature=data["main"]["temp"],
                feels_like=data["main"]["feels_like"],
                condition=data["weather"][0]["main"],
                description=data["weather"][0]["description"],
                humidity=data["main"]["humidity"],
                pressure=data["main"]["pressure"],
                wind_speed=data["wind"]["speed"],
                icon=data["weather"][0]["icon"],
                lat=data["coord"]["lat"],
                lon=data["coord"]["lon"]
            )
            
            return weather_data
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Weather API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weather: {str(e)}")

@api_router.get("/weather/forecast")
async def get_forecast(lat: float, lon: float):
    """Get hourly and daily forecast for coordinates"""
    try:
        async with httpx.AsyncClient() as client:
            # Get One Call API 3.0 forecast
            params = {
                "lat": lat,
                "lon": lon,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric",
                "exclude": "minutely,alerts"
            }
            
            response = await client.get(
                "https://api.openweathermap.org/data/3.0/onecall",
                params=params,
                timeout=10
            )
            
            if response.status_code == 401:
                response = await client.get(
                    "https://api.openweathermap.org/data/2.5/forecast",
                    params={
                        "lat": lat,
                        "lon": lon,
                        "appid": OPENWEATHER_API_KEY,
                        "units": "metric"
                    },
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                
                hourly_list = []
                for item in data["list"][:24]:
                    hourly_list.append(HourlyForecast(
                        time=item["dt_txt"],
                        temperature=item["main"]["temp"],
                        condition=item["weather"][0]["main"],
                        icon=item["weather"][0]["icon"],
                        pop=item.get("pop", 0) * 100
                    ))
                
                daily_dict = {}
                for item in data["list"]:
                    date = item["dt_txt"].split()[0]
                    if date not in daily_dict:
                        daily_dict[date] = {
                            "temps": [item["main"]["temp"]],
                            "condition": item["weather"][0]["main"],
                            "description": item["weather"][0]["description"],
                            "icon": item["weather"][0]["icon"],
                            "pop": item.get("pop", 0),
                            "humidity": item["main"]["humidity"]
                        }
                    else:
                        daily_dict[date]["temps"].append(item["main"]["temp"])
                
                daily_list = []
                for date, info in list(daily_dict.items())[:7]:
                    daily_list.append(DailyForecast(
                        date=date,
                        day=datetime.fromisoformat(date).strftime("%A"),
                        temp_max=max(info["temps"]),
                        temp_min=min(info["temps"]),
                        condition=info["condition"],
                        description=info["description"],
                        icon=info["icon"],
                        pop=info["pop"] * 100,
                        humidity=info["humidity"]
                    ))
                
                return {
                    "hourly": hourly_list,
                    "daily": daily_list
                }
            
            response.raise_for_status()
            data = response.json()
            
            hourly_list = []
            for item in data.get("hourly", [])[:24]:
                hourly_list.append(HourlyForecast(
                    time=datetime.fromtimestamp(item["dt"], tz=timezone.utc).strftime("%H:%M"),
                    temperature=item["temp"],
                    condition=item["weather"][0]["main"],
                    icon=item["weather"][0]["icon"],
                    pop=item.get("pop", 0) * 100
                ))
            
            daily_list = []
            for item in data.get("daily", [])[:7]:
                daily_list.append(DailyForecast(
                    date=datetime.fromtimestamp(item["dt"], tz=timezone.utc).strftime("%Y-%m-%d"),
                    day=datetime.fromtimestamp(item["dt"], tz=timezone.utc).strftime("%A"),
                    temp_max=item["temp"]["max"],
                    temp_min=item["temp"]["min"],
                    condition=item["weather"][0]["main"],
                    description=item["weather"][0]["description"],
                    icon=item["weather"][0]["icon"],
                    pop=item.get("pop", 0) * 100,
                    humidity=item["humidity"]
                ))
            
            return {
                "hourly": hourly_list,
                "daily": daily_list,
                "uv_index": data.get("current", {}).get("uvi")
            }
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Forecast API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching forecast: {str(e)}")

@api_router.get("/weather/cities")
async def search_cities(q: str):
    """Search for cities"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={
                    "q": q,
                    "limit": 5,
                    "appid": OPENWEATHER_API_KEY
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            return [{
                "name": item["name"],
                "country": item.get("country", ""),
                "state": item.get("state", ""),
                "lat": item["lat"],
                "lon": item["lon"]
            } for item in data]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching cities: {str(e)}")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()