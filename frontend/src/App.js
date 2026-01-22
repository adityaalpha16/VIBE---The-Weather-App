import { useState, useEffect } from 'react';
import '@/App.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  Wind,
  Droplets,
  Gauge,
  MapPin,
  Search,
  Loader2,
  Home,
  TrendingUp,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Weather backgrounds based on conditions - More dramatic and distinct
const weatherBackgrounds = {
  Clear: 'https://images.pexels.com/photos/34613802/pexels-photo-34613802.jpeg?auto=compress&cs=tinysrgb&w=1920',
  Rain: 'https://images.unsplash.com/photo-1765683011450-c2b8dae7b223?q=85&w=1920&auto=format&fit=crop',
  Drizzle: 'https://images.unsplash.com/photo-1580941675434-e950d3d8a341?q=85&w=1920&auto=format&fit=crop',
  Snow: 'https://images.unsplash.com/photo-1768065502722-dd4654c6ac69?q=85&w=1920&auto=format&fit=crop',
  Clouds: 'https://images.unsplash.com/photo-1767066971763-c2633a2765dc?q=85&w=1920&auto=format&fit=crop',
  Thunderstorm: 'https://images.unsplash.com/photo-1759980363311-d38bfed17dfe?q=85&w=1920&auto=format&fit=crop',
  Fog: 'https://images.unsplash.com/photo-1767066971763-c2633a2765dc?q=85&w=1920&auto=format&fit=crop',
  Mist: 'https://images.unsplash.com/photo-1767066971763-c2633a2765dc?q=85&w=1920&auto=format&fit=crop',
  Haze: 'https://images.unsplash.com/photo-1683654753898-cc049cc9b511?q=85&w=1920&auto=format&fit=crop',
  Default: 'https://images.unsplash.com/photo-1683654753898-cc049cc9b511?q=85&w=1920&auto=format&fit=crop',
};

const GlassCard = ({ children, className = '', hover = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className={`glass-card ${hover ? 'glass-card-hover' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

const WeatherIcon = ({ condition, size = 'w-16 h-16' }) => {
  const iconProps = { className: `${size} text-cyan-400`, strokeWidth: 1.5 };
  
  switch (condition) {
    case 'Clear':
      return <Sun {...iconProps} className={`${size} text-yellow-400`} />;
    case 'Rain':
      return <CloudRain {...iconProps} />;
    case 'Drizzle':
      return <CloudDrizzle {...iconProps} />;
    case 'Snow':
      return <CloudSnow {...iconProps} />;
    case 'Thunderstorm':
      return <CloudLightning {...iconProps} className={`${size} text-purple-400`} />;
    case 'Clouds':
      return <Cloud {...iconProps} />;
    default:
      return <Sun {...iconProps} />;
  }
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 22) return 'evening';
  return 'night';
};

const getGreeting = () => {
  const timeOfDay = getTimeOfDay();
  const greetings = {
    morning: 'Good Morning',
    afternoon: 'Good Afternoon',
    dusk: 'Beautiful Evening',
    evening: 'Good Evening',
    night: 'Good Night',
  };
  return greetings[timeOfDay];
};

function App() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Ballia');
  const [tempUnit, setTempUnit] = useState('C');
  const [activeTab, setActiveTab] = useState('7');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [backgroundImage, setBackgroundImage] = useState(weatherBackgrounds.Default);
  const [worldCities, setWorldCities] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchWeather(selectedCity);
    fetchWorldWeather();
  }, [selectedCity]);

  const fetchWorldWeather = async () => {
    const cities = [
      { name: 'London', coords: { lat: 51.5074, lon: -0.1278 } },
      { name: 'New York', coords: { lat: 40.7128, lon: -74.0060 } },
      { name: 'Tokyo', coords: { lat: 35.6762, lon: 139.6503 } },
      { name: 'Sydney', coords: { lat: -33.8688, lon: 151.2093 } },
      { name: 'Dubai', coords: { lat: 25.2048, lon: 55.2708 } },
      { name: 'Paris', coords: { lat: 48.8566, lon: 2.3522 } },
    ];

    try {
      const weatherPromises = cities.map(city =>
        axios.get(`${API}/weather/current`, {
          params: { lat: city.coords.lat, lon: city.coords.lon },
        }).then(res => ({ ...res.data, displayName: city.name })).catch(() => null)
      );

      const results = await Promise.all(weatherPromises);
      setWorldCities(results.filter(Boolean));
    } catch (error) {
      console.error('Error fetching world weather:', error);
    }
  };

  const fetchWeather = async (city) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/weather/current`, {
        params: { city },
      });
      setWeather(response.data);

      // Update background based on weather condition
      const condition = response.data.condition;
      const newBackground = weatherBackgrounds[condition] || weatherBackgrounds.Default;
      setBackgroundImage(newBackground);

      const forecastResponse = await axios.get(`${API}/weather/forecast`, {
        params: {
          lat: response.data.lat,
          lon: response.data.lon,
        },
      });
      setForecast(forecastResponse.data);
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchCities = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await axios.get(`${API}/weather/cities`, {
        params: { q: query },
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching cities:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city.name);
    setSearchQuery('');
    setSearchResults([]);
    setLoading(true); // Show loading immediately when city is selected
  };

  const convertTemp = (temp) => {
    if (tempUnit === 'F') {
      return Math.round((temp * 9) / 5 + 32);
    }
    return Math.round(temp);
  };

  if (loading && !weather) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 flex flex-col items-center gap-4"
        >
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          <p className="text-slate-200 font-medium">Loading Vibes...</p>
        </motion.div>
      </div>
    );
  }

  // Dynamic overlay based on weather condition
  const getOverlayStyle = () => {
    const condition = weather?.condition || 'Default';
    const overlays = {
      Clear: 'from-amber-950/50 via-orange-950/60 to-yellow-950/50',
      Rain: 'from-slate-950/75 via-blue-950/80 to-slate-900/75',
      Drizzle: 'from-slate-950/70 via-slate-900/75 to-blue-950/70',
      Snow: 'from-slate-950/60 via-blue-950/70 to-slate-900/60',
      Clouds: 'from-slate-950/70 via-slate-900/80 to-indigo-950/70',
      Thunderstorm: 'from-slate-950/80 via-purple-950/85 to-slate-900/80',
      Fog: 'from-slate-950/65 via-slate-900/75 to-cyan-950/70',
      Mist: 'from-slate-950/65 via-slate-900/75 to-cyan-950/70',
      Haze: 'from-slate-950/60 via-teal-950/70 to-cyan-950/65',
      Default: 'from-slate-950/70 via-slate-900/80 to-indigo-950/70',
    };
    return overlays[condition] || overlays.Default;
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-all duration-1000"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${getOverlayStyle()} backdrop-blur-sm transition-all duration-1000`} />

      {/* Loading overlay when fetching new city */}
      <AnimatePresence>
        {loading && weather && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-md"
          >
            <div className="glass-card p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-slate-200 font-medium">Updating weather...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-[1600px] mx-auto p-4 md:p-8 min-h-screen">
        {/* Logo and Title Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="glass-card p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-400/50"
              >
                <CloudRain className="w-10 h-10 text-white" strokeWidth={2} />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold text-white font-['Outfit'] tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 to-blue-400">
                    VIBE
                  </span>
                </h1>
                <p className="text-sm text-slate-400 font-medium tracking-wide">The Weather Vibes</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Feel the Weather</p>
                <p className="text-lg font-semibold text-cyan-400 font-['Outfit']">
                  {format(currentTime, 'HH:mm')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 h-full">
          <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0">
            <GlassCard className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                      {getGreeting()}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <span className="text-lg font-bold text-white font-['Outfit']">
                        {weather?.city}, {weather?.country}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative z-50" data-testid="city-search">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search city..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchCities(e.target.value);
                      }}
                      className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-white placeholder-slate-400 text-sm"
                      data-testid="city-search-input"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
                    )}
                  </div>

                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-full glass-card p-2 z-[100] max-h-60 overflow-y-auto scrollbar-thin"
                      >
                        {searchResults.map((city, idx) => (
                          <motion.button
                            key={idx}
                            onClick={() => handleCitySelect(city)}
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(34, 211, 238, 0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-cyan-400/10 text-white text-sm transition-all border border-transparent hover:border-cyan-400/30 cursor-pointer"
                            data-testid={`city-result-${idx}`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              <span className="font-medium">{city.name}</span>
                              <span className="text-slate-400 text-xs">
                                {city.state && `${city.state}, `}{city.country}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="text-center py-8 relative z-10">{/* Added relative z-10 to keep time below dropdown */}
                  <div className="text-8xl font-bold text-white font-['Outfit'] tabular-nums tracking-tighter" data-testid="current-time">
                    {format(currentTime, 'HH:mm')}
                  </div>
                  <div className="text-slate-300 mt-2 font-medium" data-testid="current-date">
                    {format(currentTime, 'EEEE, MMMM d')}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 py-4">
                  <WeatherIcon condition={weather?.condition} size="w-20 h-20" />
                  <div className="text-7xl font-bold text-white font-['Outfit'] tabular-nums" data-testid="main-temperature">
                    {convertTemp(weather?.temperature)}°
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xl font-semibold text-white capitalize" data-testid="weather-condition">
                    {weather?.description}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    Feels like {convertTemp(weather?.feels_like)}°{tempUnit}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div className="glass-card p-3 text-center" data-testid="wind-speed">
                    <Wind className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                    <div className="text-xs text-slate-400">Wind</div>
                    <div className="text-sm font-bold text-white">{weather?.wind_speed} m/s</div>
                  </div>
                  <div className="glass-card p-3 text-center" data-testid="humidity">
                    <Droplets className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                    <div className="text-xs text-slate-400">Humidity</div>
                    <div className="text-sm font-bold text-white">{weather?.humidity}%</div>
                  </div>
                  <div className="glass-card p-3 text-center" data-testid="pressure">
                    <Gauge className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                    <div className="text-xs text-slate-400">Pressure</div>
                    <div className="text-sm font-bold text-white">{weather?.pressure} hPa</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6" data-testid="monthly-rainfall-card">
              <h3 className="text-lg font-bold text-white font-['Outfit'] mb-4">Monthly Rainfall</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={[
                    { month: 'Jan', rain: 45 },
                    { month: 'Feb', rain: 52 },
                    { month: 'Mar', rain: 61 },
                    { month: 'Apr', rain: 75 },
                    { month: 'May', rain: 85 },
                    { month: 'Jun', rain: 95 },
                  ]}
                >
                  <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="rain" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <GlassCard className="p-6" data-testid="hourly-forecast-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white font-['Outfit']">Hourly Forecast</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTempUnit('C')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      tempUnit === 'C'
                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    data-testid="temp-unit-celsius"
                  >
                    °C
                  </button>
                  <button
                    onClick={() => setTempUnit('F')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      tempUnit === 'F'
                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    data-testid="temp-unit-fahrenheit"
                  >
                    °F
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={
                    forecast?.hourly?.slice(0, 12).map((item, idx) => ({
                      time: idx === 0 ? 'Now' : item.time,
                      temp: convertTemp(item.temperature),
                    })) || []
                  }
                >
                  <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={{ fill: '#22d3ee', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard className="p-6 flex-1" data-testid="world-weather-map">
              <h3 className="text-lg font-bold text-white font-['Outfit'] mb-4">World Weather</h3>
              <div className="grid grid-cols-2 gap-3 h-[300px] overflow-y-auto scrollbar-thin">
                {worldCities.map((city, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedCity(city.displayName)}
                    className="glass-card p-4 hover:bg-cyan-400/10 cursor-pointer transition-all border border-transparent hover:border-cyan-400/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-semibold text-sm">{city.displayName}</h4>
                        <p className="text-slate-400 text-xs">{city.country}</p>
                      </div>
                      <WeatherIcon condition={city.condition} size="w-8 h-8" />
                    </div>
                    <div className="text-2xl font-bold text-white font-['Outfit'] tabular-nums">
                      {convertTemp(city.temperature)}°
                    </div>
                    <p className="text-slate-300 text-xs capitalize mt-1">{city.description}</p>
                  </motion.div>
                ))}
                {worldCities.length === 0 && (
                  <div className="col-span-2 flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
            <GlassCard className="p-6">
              <div className="flex items-center justify-center mb-4">
                <WeatherIcon condition={weather?.condition} size="w-24 h-24" />
              </div>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-white font-['Outfit'] tabular-nums">
                  {convertTemp(weather?.temperature)}°{tempUnit}
                </div>
                <div className="text-slate-300 mt-2 capitalize">{weather?.condition}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <Wind className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                  <div className="text-xs text-slate-400">Wind</div>
                  <div className="text-sm font-semibold text-white">{weather?.wind_speed} m/s</div>
                </div>
                <div className="text-center">
                  <Droplets className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                  <div className="text-xs text-slate-400">Humidity</div>
                  <div className="text-sm font-semibold text-white">{weather?.humidity}%</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 flex-1" data-testid="forecast-tabs">
              <div className="flex gap-2 mb-4">
                {['4', '7', '15'].map((days) => (
                  <button
                    key={days}
                    onClick={() => setActiveTab(days)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === days
                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    data-testid={`forecast-tab-${days}days`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
                {forecast?.daily?.slice(0, parseInt(activeTab)).map((day, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card p-4 hover:bg-white/10 transition-all cursor-pointer"
                    data-testid={`forecast-day-${idx}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{day.day}</div>
                        <div className="text-xs text-slate-400">{day.date}</div>
                      </div>
                      <WeatherIcon condition={day.condition} size="w-8 h-8" />
                      <div className="text-right ml-3">
                        <div className="font-bold text-white">
                          {convertTemp(day.temp_max)}°
                        </div>
                        <div className="text-xs text-slate-400">
                          {convertTemp(day.temp_min)}°
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-around" data-testid="nav-icons">
                <button 
                  onClick={() => setSelectedCity('Ballia')}
                  className="p-3 rounded-xl hover:bg-cyan-400/20 transition-all group" 
                  data-testid="nav-home"
                  title="Reset to Ballia"
                >
                  <Home className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                </button>
                <button 
                  onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
                  className="p-3 rounded-xl hover:bg-cyan-400/20 transition-all group relative" 
                  data-testid="nav-temp-toggle"
                  title="Toggle °C/°F"
                >
                  <Gauge className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                  <span className="absolute -top-1 -right-1 text-[10px] font-bold text-cyan-400">
                    {tempUnit}
                  </span>
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="p-3 rounded-xl hover:bg-cyan-400/20 transition-all group" 
                  data-testid="nav-refresh"
                  title="Refresh"
                >
                  <TrendingUp className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                </button>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Footer Credit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 pb-4"
        >
          <div className="text-center">
            <p className="text-slate-400 text-sm font-medium">
              Designed and Developed by{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 font-semibold">
                Aditya
              </span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default App;