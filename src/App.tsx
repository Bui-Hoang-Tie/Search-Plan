import { useState, useMemo } from 'react';
import Map from './components/Map';
import { calculateDrift, movePoint, calculateMultiFacilitySearchArea, Facility } from './lib/iamsar';
import { Wind, Navigation, Ship, Clock, Crosshair, MapPin, Gauge } from 'lucide-react';

export default function App() {
  const [lkpLat, setLkpLat] = useState<number>(20.3000); 
  const [lkpLng, setLkpLng] = useState<number>(107.5000); // Gulf of Tonkin approximate
  const [hoursElapsed, setHoursElapsed] = useState<number>(5);

  const [windSpeed, setWindSpeed] = useState<number>(15);
  const [windDir, setWindDir] = useState<number>(45); // Wind from NE
  const [currentSpeed, setCurrentSpeed] = useState<number>(1.2);
  const [currentDir, setCurrentDir] = useState<number>(180); // Flowing to South

  const [leewayType, setLeewayType] = useState<string>('RAFT'); // PIW, RAFT, BOAT

  const generateId = () => Math.random().toString(36).substring(2, 9);
  
  const [facilities, setFacilities] = useState<Facility[]>([{
    id: generateId(), name: 'Tàu SAR 411', type: 'VESSEL', portLat: 20.86, portLng: 106.68, speed: 20, endurance: 24, sweepWidth: 2, color: '#22D3EE'
  }]);

  const [weatherLoading, setWeatherLoading] = useState(false);

  // Compute Search Plan
  const plan = useMemo(() => {
    const drift = calculateDrift(windSpeed, windDir, currentSpeed, currentDir, leewayType);
    const distanceDrifted = drift.speed * hoursElapsed;
    const datum = movePoint(lkpLat, lkpLng, distanceDrifted, drift.direction);
    
    const multiPlan = calculateMultiFacilitySearchArea(datum, facilities);

    return { drift, distanceDrifted, datum, multiPlan };
  }, [lkpLat, lkpLng, hoursElapsed, windSpeed, windDir, currentSpeed, currentDir, leewayType, facilities]);

  const handleFetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lkpLat}&longitude=${lkpLng}&current=wind_speed_10m,wind_direction_10m&windspeed_unit=kn`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.current) {
        setWindSpeed(Math.round(data.current.wind_speed_10m * 10) / 10);
        setWindDir(data.current.wind_direction_10m);
      }
    } catch(err) {
      console.error(err);
      alert('Không thể lấy dữ liệu thời tiết!');
    }
    setWeatherLoading(false);
  };

  const handleAddFacility = () => {
    const colors = ['#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#60A5FA'];
    const newColor = colors[facilities.length % colors.length];
    setFacilities([...facilities, {
      id: generateId(), name: `Phương tiện ${facilities.length + 1}`, type: 'VESSEL', portLat: 20.86, portLng: 106.68, speed: 20, endurance: 10, sweepWidth: 2, color: newColor
    }]);
  };

  const handleUpdateFacility = (id: string, updates: Partial<Facility>) => {
    setFacilities(facilities.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveFacility = (id: string) => {
    setFacilities(facilities.filter(f => f.id !== id));
  };

  const applyPreset = (id: string, type: string) => {
    let speed = 20, endurance = 24, sweepWidth = 2;
    if (type === 'HELICOPTER') { speed = 90; endurance = 4; sweepWidth = 3; }
    else if (type === 'AIRCRAFT') { speed = 150; endurance = 6; sweepWidth = 5; }
    handleUpdateFacility(id, { type, speed, endurance, sweepWidth });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#05070A] text-[#E0E6ED] font-mono">
      <header className="h-14 border-b border-cyan-900/50 bg-[#0A0F19] flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-cyan-400 rounded-full status-pulse"></div>
          <h1 className="text-xl font-bold tracking-widest text-cyan-400">SAR OPS: HỆ THỐNG LẬP KẾ HOẠCH</h1>
        </div>
        <div className="text-xs text-cyan-600 font-bold uppercase tracking-widest">
          IAMSAR Volume II - Mission Coordination
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[420px] bg-[#0A0F19] border-r border-cyan-900/50 p-4 flex flex-col gap-4 overflow-y-auto z-20 shrink-0">
          
          {/* Incident Location */}
          <div className="glass-panel p-4 rounded-lg">
            <h2 className="text-xs uppercase text-cyan-500 font-bold flex items-center gap-2 border-b border-cyan-900/50 pb-2 mb-3">
              <MapPin className="text-cyan-400" size={16}/> Vị trí sự cố (LKP)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold">Vĩ độ (Vĩ Bắc)</label>
                <input type="number" step="any" value={lkpLat} onChange={e => setLkpLat(Number(e.target.value))} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold">Kinh độ (Kinh Đông)</label>
                <input type="number" step="any" value={lkpLng} onChange={e => setLkpLng(Number(e.target.value))} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold flex items-center gap-1"><Clock size={12}/> Số giờ trôi dạt kể từ sự cố (h)</label>
              <input type="number" value={hoursElapsed} onChange={e => setHoursElapsed(Number(e.target.value))} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400" />
            </div>
          </div>

          {/* Environmental Data */}
          <div className="glass-panel p-4 rounded-lg">
            <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2 mb-3">
              <h2 className="text-xs uppercase text-cyan-500 font-bold flex items-center gap-2">
                <Wind className="text-cyan-400" size={16}/> Môi trường biển & Trôi dạt
              </h2>
              <button 
                onClick={handleFetchWeather} 
                disabled={weatherLoading} 
                className="text-[9px] font-bold uppercase bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-500 text-cyan-300 px-3 py-1 rounded transition disabled:opacity-50">
                {weatherLoading ? 'Đang tải...' : 'Lấy DL OpenMeteo'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold">Tốc độ Gió (kts)</label>
                <input type="number" step="0.1" value={windSpeed} onChange={e => setWindSpeed(Number(e.target.value))} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold">Hướng Gió đến (°T)</label>
                <input type="number" value={windDir} onChange={e => setWindDir(Number(e.target.value))} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold">T.độ dòng chảy (kts)</label>
                <input type="number" step="0.1" value={currentSpeed} onChange={e => setCurrentSpeed(Number(e.target.value))} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold">Hướng D.chảy (°T)</label>
                <input type="number" value={currentDir} onChange={e => setCurrentDir(Number(e.target.value))} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-[10px] uppercase text-cyan-600 mb-1 font-bold">Bản chất mục tiêu (Ảnh hưởng trôi dạt)</label>
              <select value={leewayType} onChange={e => setLeewayType(e.target.value)} className="w-full bg-[#151D29] border border-cyan-800 text-xs px-3 py-2 rounded text-cyan-100 outline-none focus:border-cyan-400">
                <option value="PIW">Người rơi ra khỏi tàu (Ít trôi theo gió)</option>
                <option value="RAFT">Bè cứu sinh (Liferaft - Độ trôi dạt trung bình)</option>
                <option value="BOAT">Tàu/Thuyền nhỏ (Bề mặt cản gió lớn)</option>
              </select>
            </div>
          </div>

          {/* Search Constraints (Multiple Facilities) */}
          <div className="glass-panel p-4 rounded-lg flex-1 overflow-y-auto">
            <h2 className="text-xs uppercase text-cyan-500 font-bold flex items-center gap-2 border-b border-cyan-900/50 pb-2 mb-3">
              <Navigation className="text-emerald-400" size={16}/> Các đơn vị (SRU) được điều phối
            </h2>
            
            <div className="space-y-3">
              {facilities.map((fac) => (
                <div key={fac.id} className="bg-[#111827] border border-cyan-900/60 rounded-lg p-3 relative space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <input 
                      className="bg-transparent font-bold text-cyan-300 text-xs outline-none border-b border-cyan-800 focus:border-cyan-400 w-32" 
                      value={fac.name} 
                      onChange={e => handleUpdateFacility(fac.id, {name: e.target.value})} 
                    />
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={fac.color} 
                        onChange={e => handleUpdateFacility(fac.id, {color: e.target.value})} 
                        className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 block" 
                      />
                      {facilities.length > 1 && (
                        <button 
                          onClick={() => handleRemoveFacility(fac.id)} 
                          className="text-red-400 hover:text-red-300 text-[10px] uppercase font-bold"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 mb-2">
                    <button onClick={() => applyPreset(fac.id, 'VESSEL')} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-colors border ${fac.type === 'VESSEL' ? 'bg-cyan-900/60 border-cyan-400 text-cyan-100' : 'bg-[#0A0F19] border-cyan-900/50 text-cyan-600'}`}>Tàu biển</button>
                    <button onClick={() => applyPreset(fac.id, 'HELICOPTER')} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-colors border ${fac.type === 'HELICOPTER' ? 'bg-cyan-900/60 border-cyan-400 text-cyan-100' : 'bg-[#0A0F19] border-cyan-900/50 text-cyan-600'}`}>T.thăng</button>
                    <button onClick={() => applyPreset(fac.id, 'AIRCRAFT')} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-colors border ${fac.type === 'AIRCRAFT' ? 'bg-cyan-900/60 border-cyan-400 text-cyan-100' : 'bg-[#0A0F19] border-cyan-900/50 text-cyan-600'}`}>C.bằng</button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase text-cyan-600 mb-1 font-bold">Vĩ độ Cảng đi</label>
                      <input type="number" step="any" value={fac.portLat} onChange={e => handleUpdateFacility(fac.id, {portLat: Number(e.target.value)})} className="w-full bg-[#151D29] border border-cyan-800 text-[10px] px-2 py-1 rounded text-cyan-100 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-cyan-600 mb-1 font-bold">Kinh độ Cảng đi</label>
                      <input type="number" step="any" value={fac.portLng} onChange={e => handleUpdateFacility(fac.id, {portLng: Number(e.target.value)})} className="w-full bg-[#151D29] border border-cyan-800 text-[10px] px-2 py-1 rounded text-cyan-100 outline-none focus:border-cyan-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase text-cyan-600 mb-1 font-bold">Tốc độ (kt)</label>
                      <input type="number" value={fac.speed} onChange={e => handleUpdateFacility(fac.id, {speed: Number(e.target.value)})} className="w-full bg-[#151D29] border border-cyan-800 text-[10px] px-2 py-1 rounded text-cyan-100 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-cyan-600 mb-1 font-bold">T.G H.động (h)</label>
                      <input type="number" value={fac.endurance} onChange={e => handleUpdateFacility(fac.id, {endurance: Number(e.target.value)})} className="w-full bg-[#151D29] border border-cyan-800 text-[10px] px-2 py-1 rounded text-cyan-100 outline-none focus:border-cyan-400" />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-cyan-600 mb-1 font-bold">B.rộng Q.(NM)</label>
                      <input type="number" step="0.1" value={fac.sweepWidth} onChange={e => handleUpdateFacility(fac.id, {sweepWidth: Number(e.target.value)})} className="w-full bg-[#151D29] border border-cyan-800 text-[10px] px-2 py-1 rounded text-cyan-100 outline-none focus:border-cyan-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleAddFacility} 
              className="w-full mt-3 py-2 rounded border border-emerald-500/50 hover:bg-emerald-900/40 text-emerald-400 font-bold text-[10px] uppercase transition shadow-sm">
              + Triển khai thêm Phương tiện
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 flex flex-col min-w-0">
          
          {/* Results Bar */}
          <div className="bg-[#0A0F19] border-b border-cyan-900/50 shrink-0 p-4 z-10 flex flex-col gap-2">
            <h2 className="text-sm font-bold flex items-center gap-2 text-cyan-400 uppercase tracking-widest">
              <Crosshair size={18}/> Kế hoạch Hành động Chung (Search Action Plan)
            </h2>
            <div className="grid grid-cols-4 gap-4 h-24">
              <div className="glass-panel p-3 rounded border-l-4 border-l-red-500 flex flex-col justify-center">
                <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1">Vị trí Datum Mới</p>
                <p className="text-sm font-bold text-white leading-tight">{plan.datum.lat.toFixed(4)}N <br className="hidden 2xl:block"/>{plan.datum.lng.toFixed(4)}E</p>
                <p className="text-[9px] text-red-300/80 mt-1">Trôi {plan.distanceDrifted.toFixed(1)} NM hướng {plan.drift.direction.toFixed(0)}°T</p>
              </div>
              
              <div className="glass-panel p-3 rounded border-l-4 border-l-cyan-500 glow-border flex flex-col justify-center">
                <p className="text-[10px] text-cyan-500 uppercase tracking-wider font-bold mb-1">Tổng Diện Tích Quét (A)</p>
                <p className="text-sm font-bold text-white">{plan.multiPlan.totalArea.toFixed(1)} NM²</p>
                <p className="text-[9px] text-cyan-300/80 mt-1">
                  Đã triển khai: {plan.multiPlan.subAreas.filter(s => s.success).length} phương tiện
                </p>
              </div>

              <div className="col-span-2 flex gap-2 overflow-x-auto custom-scrollbar">
                {plan.multiPlan.subAreas.map(sa => (
                  <div key={sa.id} className={`shrink-0 w-44 glass-panel p-2 rounded border-l-4 ${sa.success ? 'border-l-emerald-500' : 'border-l-gray-600'} flex flex-col justify-center`}>
                    <p className="text-[10px] font-bold truncate mb-1" style={{color: sa.color}}>{sa.name}</p>
                    {sa.success ? (
                      <>
                        <p className="text-xs font-bold text-white leading-none">Vùng đ.phân: {sa.areaToCover.toFixed(1)} NM²</p>
                        <p className="text-[9px] text-emerald-300/80 mt-1">Tìm: {sa.timeOnScene.toFixed(1)} h | Đi: {sa.transitTime.toFixed(1)} h</p>
                      </>
                    ) : (
                      <p className="text-[9px] text-red-400 font-bold leading-tight mt-1">KHÔNG ĐỦ NHIÊN LIỆU<br/>Khoảng cách đi ({sa.transitTime.toFixed(1)} h x2)</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map and Windy Embed */}
          <div className="flex-1 flex gap-0 min-h-0 map-bg relative">
             <div className="scanline"></div>
             
             <div className="flex-1 relative z-10 p-4">
                <div className="w-full h-full rounded border border-cyan-900/50 overflow-hidden glow-border">
                  <Map 
                    lkp={{lat: lkpLat, lng: lkpLng}} 
                    datum={plan.datum} 
                    subAreas={plan.multiPlan.subAreas}
                  />
                </div>
             </div>
             
             {/* Windy.com Integration Panel */}
             <div className="w-[380px] border-l border-cyan-900/50 bg-[#0A0F19] flex flex-col z-20">
                <div className="p-3 border-b border-cyan-900/50 shrink-0">
                  <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Gauge size={14}/> Radar Thời tiết (Windy)</h3>
                </div>
                <div className="flex-1 bg-[#151D29]">
                    <iframe 
                      title="Windy Map"
                      width="100%" 
                      height="100%" 
                      className="opacity-90 mix-blend-screen grayscale-[20%] contrast-125"
                      src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=kt&zoom=5&overlay=currents&product=ecmwf&level=surface&lat=${lkpLat}&lon=${lkpLng}&detailLat=${lkpLat}&detailLon=${lkpLng}&marker=true`}
                      frameBorder="0">
                    </iframe>
                </div>
             </div>
          </div>
        </section>
      </main>

      <footer className="h-10 bg-[#05070A] border-t border-cyan-900/30 flex items-center px-6 justify-between text-[10px] shrink-0 z-20">
        <div className="flex gap-4 text-cyan-700 font-bold uppercase">
          <span>IAMSAR MODULE: MISSION COORDINATION</span>
          <span>DATUM: WGS-84</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 status-pulse"></div>
          <span className="text-cyan-400 uppercase font-bold tracking-widest">HỆ THỐNG GIAO TIẾP VỆ TINH SẴN SÀNG</span>
        </div>
      </footer>
    </div>
  );
}
