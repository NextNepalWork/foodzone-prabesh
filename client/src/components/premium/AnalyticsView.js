import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../services/apiService';
import settingsService from '../../services/settingsService';

const AnalyticsView = ({ orders }) => {
  const [timeRange, setTimeRange] = useState('today');
  const [analyticsData, setAnalyticsData] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await fetchApi.get('/api/analytics');
      
      // Create 7-day revenue breakdown with proper day names
      const last7Days = [];
      const today = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];
        
        // Find matching data from API
        const dayData = data.last7Days?.find(d => d.date === dateStr);
        
        last7Days.push({
          day: dayName,
          date: dateStr,
          revenue: dayData ? parseFloat(dayData.revenue || 0) : 0,
          orders: dayData ? parseInt(dayData.order_count || 0) : 0
        });
      }
      
      setAnalyticsData({
        totalOrders: data.totalOrders || 0,
        completedOrders: data.completedOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        avgOrderValue: data.avgOrderValue || 0,
        completionRate: data.completionRate || 0,
        dineInCount: data.dineInOrders || 0,
        deliveryCount: data.deliveryOrders || 0,
        topItems: data.topItems || []
      });
      
      setRevenueData(last7Days);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    
    // Refresh analytics every dynamic interval for real-time updates
    const timeouts = settingsService.getTimeoutSettings();
    const interval = setInterval(fetchAnalyticsData, timeouts.analyticsIntervalMs);
    return () => clearInterval(interval);
  }, [timeRange]);

  const timeRanges = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' }
  ];

  const exportToCSV = () => {
    try {
      setExporting(true);
      
      // Prepare CSV data
      const csvData = [];
      csvData.push(['Food Zone Restaurant - Analytics Report']);
      csvData.push(['Generated:', new Date().toLocaleString()]);
      csvData.push(['Time Range:', timeRange]);
      csvData.push([]);
      
      // Summary metrics
      csvData.push(['Summary Metrics']);
      csvData.push(['Metric', 'Value']);
      csvData.push(['Total Orders', analyticsData.totalOrders || 0]);
      csvData.push(['Completed Orders', analyticsData.completedOrders || 0]);
      csvData.push(['Total Revenue', `NPR ${(analyticsData.totalRevenue || 0).toLocaleString()}`]);
      csvData.push(['Average Order Value', `NPR ${Math.round(analyticsData.avgOrderValue || 0)}`]);
      csvData.push(['Completion Rate', `${analyticsData.completionRate || 0}%`]);
      csvData.push(['Dine-In Orders', analyticsData.dineInCount || 0]);
      csvData.push(['Delivery Orders', analyticsData.deliveryCount || 0]);
      csvData.push([]);
      
      // Revenue by day
      csvData.push(['Revenue Breakdown (Last 7 Days)']);
      csvData.push(['Day', 'Date', 'Revenue', 'Orders']);
      revenueData.forEach(day => {
        csvData.push([day.day, day.date, `NPR ${day.revenue}`, day.orders]);
      });
      csvData.push([]);
      
      // Top items
      if (analyticsData.topItems && analyticsData.topItems.length > 0) {
        csvData.push(['Popular Items']);
        csvData.push(['Rank', 'Item Name', 'Quantity Sold']);
        analyticsData.topItems.forEach((item, index) => {
          csvData.push([index + 1, item.name, item.count]);
        });
      }
      
      // Convert to CSV string
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `foodzone-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('✅ CSV report exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('❌ Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    try {
      setExporting(true);
      
      // Create a printable HTML version
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Food Zone Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #475569; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
            .metric-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #1e293b; }
            .metric-label { color: #64748b; font-size: 14px; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>🍽️ Food Zone Restaurant - Analytics Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Time Range:</strong> ${timeRange}</p>
          
          <h2>Summary Metrics</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-label">Total Orders</div>
              <div class="metric-value">${analyticsData.totalOrders || 0}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Revenue</div>
              <div class="metric-value">NPR ${(analyticsData.totalRevenue || 0).toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Average Order Value</div>
              <div class="metric-value">NPR ${Math.round(analyticsData.avgOrderValue || 0)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Completion Rate</div>
              <div class="metric-value">${analyticsData.completionRate || 0}%</div>
            </div>
          </div>
          
          <h2>Revenue Breakdown (Last 7 Days)</h2>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Revenue</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              ${revenueData.map(day => `
                <tr>
                  <td>${day.day}</td>
                  <td>${day.date}</td>
                  <td>NPR ${day.revenue}</td>
                  <td>${day.orders}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${analyticsData.topItems && analyticsData.topItems.length > 0 ? `
            <h2>Popular Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Item Name</th>
                  <th>Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                ${analyticsData.topItems.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          <div class="footer">
            <p>Food Zone Restaurant Management System</p>
            <p>© ${new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      const timeouts = settingsService.getTimeoutSettings();
      setTimeout(() => {
        printWindow.print();
      }, timeouts.printDelayMs);
      
      alert('✅ PDF export initiated! Please use your browser\'s print dialog to save as PDF.');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('❌ Failed to export PDF report');
    } finally {
      setExporting(false);
    }
  };

  const emailReport = async () => {
    try {
      setExporting(true);
      
      const email = prompt('Enter email address to send the report:');
      if (!email) {
        setExporting(false);
        return;
      }
      
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert('❌ Please enter a valid email address');
        setExporting(false);
        return;
      }
      
      // Prepare report data
      const reportData = {
        email,
        timeRange,
        metrics: {
          totalOrders: analyticsData.totalOrders || 0,
          completedOrders: analyticsData.completedOrders || 0,
          totalRevenue: analyticsData.totalRevenue || 0,
          avgOrderValue: analyticsData.avgOrderValue || 0,
          completionRate: analyticsData.completionRate || 0,
          dineInCount: analyticsData.dineInCount || 0,
          deliveryCount: analyticsData.deliveryCount || 0
        },
        revenueData,
        topItems: analyticsData.topItems || []
      };
      
      // Send to backend
      const response = await fetchApi.post('/api/analytics/email-report', reportData);
      
      if (response.success) {
        alert(`✅ Report sent successfully to ${email}!`);
      } else {
        alert('❌ Failed to send report. Please try again.');
      }
    } catch (error) {
      console.error('Error emailing report:', error);
      alert('❌ Failed to send email report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analytics & Reports</h2>
            <p className="text-slate-600 mt-1">Business insights and performance metrics</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {timeRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === range.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Orders"
          value={analyticsData.totalOrders || 0}
          icon="📋"
          color="blue"
          change="+12%"
        />
        <MetricCard
          title="Revenue"
          value={`NPR ${(analyticsData.totalRevenue || 0).toLocaleString()}`}
          icon="💰"
          color="green"
          change="+8%"
        />
        <MetricCard
          title="Avg Order Value"
          value={`NPR ${Math.round(analyticsData.avgOrderValue || 0)}`}
          icon="📊"
          color="purple"
          change="+5%"
        />
        <MetricCard
          title="Completion Rate"
          value={`${analyticsData.totalOrders > 0 ? Math.round((analyticsData.completedOrders / analyticsData.totalOrders) * 100) : 0}%`}
          icon="✅"
          color="orange"
          change="+3%"
        />
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Revenue Trend (Last 7 Days)</h3>
        <div className="space-y-4">
          {revenueData.map((day, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-[60px]">
                <span className="font-medium text-slate-700 w-8">{day.day}</span>
                <div className="flex-1 bg-slate-200 rounded-full h-6 min-w-[200px]">
                  <div
                    className="bg-blue-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(5, (day.revenue / Math.max(...revenueData.map(d => d.revenue), 1)) * 100)}%`
                    }}
                  >
                    {day.revenue > 0 && (
                      <span className="text-white text-xs font-medium">
                        NPR {day.revenue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <div className="font-bold text-slate-900">NPR {day.revenue}</div>
                <div className="text-sm text-slate-500">({day.orders} orders)</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Order Status Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="font-medium text-slate-700">Completed</span>
              </div>
              <span className="font-bold text-slate-900">{analyticsData.completedOrders || 0} ({analyticsData.completionRate || 0}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${analyticsData.completionRate || 0}%`
                }}
              ></div>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold text-slate-900">Order Type Distribution</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-slate-700">Dine In</span>
              </div>
              <span className="font-bold text-slate-900">{analyticsData.dineInCount || 0} ({analyticsData.totalOrders > 0 ? Math.round((analyticsData.dineInCount / analyticsData.totalOrders) * 100) : 0}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-slate-700">Delivery</span>
              </div>
              <span className="font-bold text-slate-900">{analyticsData.deliveryCount || 0} ({analyticsData.totalOrders > 0 ? Math.round((analyticsData.deliveryCount / analyticsData.totalOrders) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Popular Items</h3>
          <div className="space-y-4">
            {analyticsData.topItems?.length > 0 ? (
              analyticsData.topItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-500' : 'bg-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count} sold</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block opacity-50">📊</span>
                <p className="text-slate-500">No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Orders Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Orders by Hour</h3>
        <div className="flex items-end justify-between h-64 gap-1">
          {analyticsData.hourlyData?.map((count, hour) => {
            const maxCount = Math.max(...(analyticsData.hourlyData || [1]));
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            return (
              <div key={hour} className="flex flex-col items-center flex-1">
                <div
                  className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-500 hover:from-blue-700 hover:to-blue-500 min-h-[4px] w-full"
                  style={{ height: `${height}%` }}
                  title={`${hour}:00 - ${count} orders`}
                ></div>
                <span className="text-xs text-slate-500 mt-2 transform -rotate-45 origin-center">
                  {hour}:00
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mt-4">
          <span className="text-sm text-slate-600">Peak hours: 12:00-14:00 & 19:00-21:00</span>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">🎯 Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Order Success Rate</span>
              <span className="font-semibold text-green-600">94%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Avg Prep Time</span>
              <span className="font-semibold text-slate-900">18 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Customer Satisfaction</span>
              <span className="font-semibold text-yellow-600">4.8/5</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">📈 Growth</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Orders vs Last Period</span>
              <span className="font-semibold text-green-600">+12%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Revenue Growth</span>
              <span className="font-semibold text-green-600">+8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">New Customers</span>
              <span className="font-semibold text-blue-600">+15%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">⚡ Export Reports</h3>
          <div className="space-y-2">
            <button 
              onClick={exportToCSV}
              disabled={exporting}
              className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-blue-700 font-medium">📊 Export CSV</span>
            </button>
            <button 
              onClick={exportToPDF}
              disabled={exporting}
              className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-green-700 font-medium">📄 Export PDF</span>
            </button>
            <button 
              onClick={emailReport}
              disabled={exporting}
              className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-purple-700 font-medium">📧 Email Report</span>
            </button>
          </div>
          {exporting && (
            <div className="mt-3 text-sm text-slate-600 text-center">
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, icon, color, change }) => {
  const colorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100'
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          <div className="flex items-center mt-2 text-sm text-green-600">
            <span>↗️</span>
            <span className="ml-1">{change} from last period</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
