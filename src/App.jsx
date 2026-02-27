import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, BarChart3, Hash } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import { TagCloud } from 'react-tagcloud';
import { db } from './firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import './App.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

// Custom tooltip for line chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        background: 'rgba(30, 41, 59, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
        <p style={{ margin: 0, color: '#3b82f6' }}>{`Open Roles: ${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

// Tag cloud renderer
const customRenderer = (tag, size, color) => (
  <span
    key={tag.value}
    style={{
      animation: 'blinker 3s linear infinite',
      animationDelay: `${Math.random() * 2}s`,
      fontSize: `${size / 2}em`,
      border: `2px solid ${color}`,
      margin: '3px',
      padding: '3px 8px',
      display: 'inline-block',
      borderRadius: '20px',
      color: 'white',
      cursor: 'pointer'
    }}
  >
    {tag.value}
  </span>
);

function App() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [latestData, setLatestData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const q = query(collection(db, 'daily_metrics'), orderBy('date', 'asc'), limit(30));
        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });

        // Ensure dates are parsed visually
        const formattedData = docs.map(d => ({
          ...d,
          displayDate: format(parseISO(d.date), 'MMM dd')
        }));

        setData(formattedData);
        if (formattedData.length > 0) {
          setLatestData(formattedData[formattedData.length - 1]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        // Fallback mock data for local display if firebase isn't fully configured
        mockDataFallback();
      } finally {
        setLoading(false);
      }
    }

    const mockDataFallback = () => {
      const mockHistory = Array.from({ length: 7 }).map((_, i) => ({
        displayDate: format(new Date(2026, 1, 20 + i), 'MMM dd'),
        totalOpenRoles: 400000 + Math.random() * 50000
      }));
      setData(mockHistory);
      setLatestData({
        split: { permanent: 350000, contract: 95000 },
        topPlatforms: [
          { name: "Direct Employer", count: 120 },
          { name: "Hays", count: 85 },
          { name: "Reed", count: 70 },
          { name: "Michael Page", count: 45 }
        ],
        trendingTags: [
          { text: "manager", value: 45 }, { text: "developer", value: 38 },
          { text: "engineer", value: 32 }, { text: "sales", value: 28 },
          { text: "remote", value: 25 }, { text: "lead", value: 22 }
        ]
      });
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2 className="text-gradient">Loading Pulse Data...</h2>
      </div>
    );
  }

  // Formatting for Pie chart (if we have latest data)
  const pieData = latestData?.split ? [
    { name: 'Permanent', value: latestData.split.permanent },
    { name: 'Contract', value: latestData.split.contract }
  ] : [];

  return (
    <div className="app-container">
      <header className="header" style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>Market <span className="text-gradient">Pulse</span></h1>
        <p style={{ fontSize: '1.25rem' }}>Daily insights and trends for the UK job market</p>
      </header>

      <main style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '2rem'
      }}>

        {/* Open Roles Line Chart */}
        <section className="glass-card" style={{ gridColumn: '1 / -1', minHeight: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Activity className="text-gradient" size={28} style={{ marginRight: '0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem' }}>Volume of Open Roles (Last 30 Days)</h2>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="displayDate" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="totalOpenRoles"
                  stroke="url(#colorUv)"
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={1} />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Contract vs Perm Pie Chart */}
        <section className="glass-card" style={{ minHeight: '350px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <TrendingUp className="text-gradient" size={28} style={{ marginRight: '0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem' }}>Contract vs Permanent</h2>
          </div>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top Platforms Bar Chart */}
        <section className="glass-card" style={{ minHeight: '350px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <BarChart3 className="text-gradient" size={28} style={{ marginRight: '0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem' }}>Top Job Sources (Today)</h2>
          </div>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latestData?.topPlatforms || []} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {
                    (latestData?.topPlatforms || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Trending Tags Cloud */}
        <section className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Hash className="text-gradient" size={28} style={{ marginRight: '0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem' }}>Trending Job Keywords</h2>
          </div>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            {latestData?.trendingTags && (
              <TagCloud
                minSize={16}
                maxSize={45}
                tags={latestData.trendingTags.map(t => ({ value: t.text, count: t.value }))}
                className="simple-cloud"
                renderer={customRenderer}
              />
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
