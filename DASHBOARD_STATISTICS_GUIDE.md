# Dashboard Statistics Guide for Frontend

## API Endpoint

**GET** `/api/projects/stats`

**Authentication:** Required (Bearer Token)

**Response Format:** JSON with camelCase keys

---

## Complete Statistics Response Structure

```typescript
interface ProjectStats {
  // ========== PRIMARY STATISTICS ==========
  
  // Project Counts
  total: number;                    // Total projects in system
  totalProjects: number;             // Alias for 'total' (backward compatibility)
  active: number;                    // Active projects
  activeProjects: number;            // Alias for 'active'
  completed: number;                 // Completed projects
  completedProjects: number;         // Alias for 'completed'
  highRisk: number;                  // High-risk projects (not completed)
  
  // Task Statistics
  completedTasks: number;            // Completed tasks
  pendingTasks: number;             // Pending/Todo tasks
  overdueTasks: number;             // Overdue tasks (not completed/cancelled)
  
  // ========== FINANCIAL STATISTICS ==========
  
  totalValueNgn: number;            // Total contract value in NGN (sum of all non-cancelled projects)
  totalValueUsd: number;            // Total contract value in USD (sum of all non-cancelled projects)
  
  // ========== PROJECT METRICS ==========
  
  averageProgress: number;           // Average progress % of active projects (0-100)
  
  // ========== BREAKDOWN STATISTICS ==========
  
  // Projects grouped by status
  byStatus: {
    active: number;
    on_hold: number;
    completed: number;
    cancelled: number;
  };
  
  // Projects grouped by pipeline stage
  byStage: {
    [stageName: string]: number;    // e.g., "Planning": 12, "Implementation": 25
  };
  
  // Projects grouped by assignee
  byAssignee: Array<{
    assignee: {
      id: number;
      name: string;
      email: string;
    } | null;
    count: number;                   // Number of projects assigned
  }>;
  
  // ========== RECENT PROJECTS ==========
  
  recent: Array<Project>;            // Last 5 projects created (full project objects)
}
```

---

## Example API Response

```json
{
  "total": 67,
  "totalProjects": 67,
  "active": 45,
  "activeProjects": 45,
  "completed": 15,
  "completedProjects": 15,
  "completedTasks": 234,
  "pendingTasks": 89,
  "overdueTasks": 12,
  "highRisk": 8,
  "byStatus": {
    "active": 45,
    "on_hold": 7,
    "completed": 15,
    "cancelled": 0
  },
  "byStage": {
    "Planning": 12,
    "Implementation": 25,
    "Testing": 8,
    "Deployment": 10,
    "Closed": 12
  },
  "totalValueNgn": 1454995.00,
  "totalValueUsd": 0.0,
  "averageProgress": 52.35,
  "byAssignee": [
    {
      "assignee": {
        "id": 1,
        "name": "John Doe",
        "email": "john@emeraldcfze.com"
      },
      "count": 15
    },
    {
      "assignee": {
        "id": 2,
        "name": "Jane Smith",
        "email": "jane@emeraldcfze.com"
      },
      "count": 8
    }
  ],
  "recent": [
    {
      "id": 67,
      "name": "Latest Project",
      "status": "active",
      "progress": 45.5,
      "contractValueNgn": 500000.00,
      "createdAt": "2024-01-20T00:00:00.000000Z"
    }
  ]
}
```

---

## Frontend Implementation Guide

### 1. Fetch Statistics

```typescript
// Using Axios (or your HTTP client)
import axios from 'axios';

const fetchDashboardStats = async (): Promise<ProjectStats> => {
  const response = await axios.get('/api/projects/stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  return response.data;
};

// Using Fetch API
const fetchDashboardStats = async (): Promise<ProjectStats> => {
  const response = await fetch('/api/projects/stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  return response.json();
};
```

### 2. React Component Example

```tsx
import React, { useEffect, useState } from 'react';
import { ProjectStats } from './types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (err) {
        setError('Failed to load dashboard statistics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    // Optionally refresh every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="dashboard">
      {/* Your dashboard UI here */}
    </div>
  );
};
```

---

## UI Display Recommendations

### 1. Key Metrics Cards (Top Row)

Display the most important statistics as large, prominent cards:

```tsx
<div className="stats-grid">
  {/* Total Projects */}
  <StatCard
    title="Total Projects"
    value={stats.total}
    icon={<ProjectsIcon />}
    trend={null}
  />

  {/* Active Projects */}
  <StatCard
    title="Active Projects"
    value={stats.active}
    icon={<ActiveIcon />}
    trend="up"
  />

  {/* Total Revenue NGN */}
  <StatCard
    title="Total Revenue (NGN)"
    value={formatCurrency(stats.totalValueNgn, 'NGN')}
    icon={<MoneyIcon />}
    trend={null}
  />

  {/* Total Revenue USD */}
  <StatCard
    title="Total Revenue (USD)"
    value={formatCurrency(stats.totalValueUsd, 'USD')}
    icon={<MoneyIcon />}
    trend={null}
  />

  {/* Completed Tasks */}
  <StatCard
    title="Completed Tasks"
    value={stats.completedTasks}
    icon={<CheckIcon />}
    trend={null}
  />

  {/* Overdue Tasks */}
  <StatCard
    title="Overdue Tasks"
    value={stats.overdueTasks}
    icon={<AlertIcon />}
    trend={stats.overdueTasks > 0 ? "warning" : null}
  />
</div>
```

### 2. Financial Overview Section

```tsx
<div className="financial-section">
  <h2>Financial Overview</h2>
  <div className="financial-grid">
    <div className="financial-card">
      <h3>Total Contract Value (NGN)</h3>
      <div className="amount">{formatCurrency(stats.totalValueNgn, 'NGN')}</div>
      <p className="subtitle">
        {stats.totalProjects} {stats.totalProjects === 1 ? 'project' : 'projects'}
      </p>
    </div>
    
    <div className="financial-card">
      <h3>Total Contract Value (USD)</h3>
      <div className="amount">{formatCurrency(stats.totalValueUsd, 'USD')}</div>
      <p className="subtitle">
        {stats.totalProjects} {stats.totalProjects === 1 ? 'project' : 'projects'}
      </p>
    </div>
  </div>
</div>
```

### 3. Project Status Breakdown (Chart)

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const StatusChart: React.FC<{ byStatus: Record<string, number> }> = ({ byStatus }) => {
  const data = Object.entries(byStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    value: count
  }));

  const COLORS = {
    active: '#10b981',
    on_hold: '#f59e0b',
    completed: '#3b82f6',
    cancelled: '#ef4444'
  };

  return (
    <div className="chart-container">
      <h3>Projects by Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase().replace(' ', '_')]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 4. Pipeline Stage Breakdown (Bar Chart)

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StageChart: React.FC<{ byStage: Record<string, number> }> = ({ byStage }) => {
  const data = Object.entries(byStage).map(([stage, count]) => ({
    stage,
    count
  }));

  return (
    <div className="chart-container">
      <h3>Projects by Pipeline Stage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 5. Projects by Assignee (Table/List)

```tsx
const AssigneeList: React.FC<{ byAssignee: Array<{ assignee: User | null; count: number }> }> = ({ byAssignee }) => {
  return (
    <div className="assignee-section">
      <h3>Projects by Assignee</h3>
      <table className="assignee-table">
        <thead>
          <tr>
            <th>Assignee</th>
            <th>Project Count</th>
          </tr>
        </thead>
        <tbody>
          {byAssignee.map((item, index) => (
            <tr key={index}>
              <td>
                {item.assignee ? (
                  <>
                    <strong>{item.assignee.name}</strong>
                    <br />
                    <small>{item.assignee.email}</small>
                  </>
                ) : (
                  <em>Unassigned</em>
                )}
              </td>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 6. Recent Projects List

```tsx
const RecentProjects: React.FC<{ recent: Project[] }> = ({ recent }) => {
  return (
    <div className="recent-projects">
      <h3>Recent Projects</h3>
      <div className="project-list">
        {recent.map((project) => (
          <div key={project.id} className="project-card">
            <h4>{project.name}</h4>
            <div className="project-meta">
              <span className={`status-badge status-${project.status}`}>
                {project.status}
              </span>
              <span>Progress: {project.progress}%</span>
              {project.contractValueNgn && (
                <span>Value: {formatCurrency(project.contractValueNgn, 'NGN')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 7. Average Progress Indicator

```tsx
const ProgressIndicator: React.FC<{ averageProgress: number }> = ({ averageProgress }) => {
  return (
    <div className="progress-section">
      <h3>Average Project Progress</h3>
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${averageProgress}%` }}
        >
          {averageProgress.toFixed(1)}%
        </div>
      </div>
      <p>Across all active projects</p>
    </div>
  );
};
```

---

## Utility Functions

### Currency Formatting

```typescript
const formatCurrency = (amount: number, currency: 'NGN' | 'USD'): string => {
  if (amount === 0 || amount === null || amount === undefined) {
    return currency === 'NGN' ? '₦0.00' : '$0.00';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};

// Usage:
formatCurrency(1454995.00, 'NGN') // "₦1,454,995.00"
formatCurrency(2500.00, 'USD')   // "$2,500.00"
```

### Number Formatting

```typescript
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Usage:
formatNumber(67) // "67"
formatNumber(1234) // "1,234"
```

---

## Complete Dashboard Layout Example

```tsx
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  // ... loading/error states

  if (!stats) return <LoadingSpinner />;

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>

      {/* Key Metrics Row */}
      <div className="stats-grid">
        <StatCard title="Total Projects" value={stats.total} />
        <StatCard title="Active Projects" value={stats.active} />
        <StatCard title="Completed Projects" value={stats.completed} />
        <StatCard title="High Risk Projects" value={stats.highRisk} />
        <StatCard title="Completed Tasks" value={stats.completedTasks} />
        <StatCard title="Overdue Tasks" value={stats.overdueTasks} />
      </div>

      {/* Financial Overview */}
      <div className="financial-section">
        <h2>Financial Overview</h2>
        <div className="financial-grid">
          <FinancialCard 
            title="Total Revenue (NGN)" 
            amount={stats.totalValueNgn} 
            currency="NGN" 
          />
          <FinancialCard 
            title="Total Revenue (USD)" 
            amount={stats.totalValueUsd} 
            currency="USD" 
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <StatusChart byStatus={stats.byStatus} />
        <StageChart byStage={stats.byStage} />
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        <AssigneeList byAssignee={stats.byAssignee} />
        <RecentProjects recent={stats.recent} />
        <ProgressIndicator averageProgress={stats.averageProgress} />
      </div>
    </div>
  );
};
```

---

## CSS Styling Suggestions

```css
.dashboard-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.stat-card .value {
  font-size: 2rem;
  font-weight: bold;
  color: #111827;
}

.financial-section {
  margin: 2rem 0;
}

.financial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.financial-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
}

.financial-card h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
  opacity: 0.9;
}

.financial-card .amount {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.bottom-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}
```

---

## Summary

### Available Statistics:

1. **Project Counts**: `total`, `active`, `completed`, `highRisk`
2. **Task Counts**: `completedTasks`, `pendingTasks`, `overdueTasks`
3. **Financial**: `totalValueNgn`, `totalValueUsd`
4. **Metrics**: `averageProgress`
5. **Breakdowns**: `byStatus`, `byStage`, `byAssignee`
6. **Recent**: `recent` (last 5 projects)

### Key Points:

- All financial values are numbers (not strings)
- Use `formatCurrency()` for displaying money values
- Statistics update in real-time when fetched
- Consider auto-refreshing every 5-10 minutes
- Handle loading and error states gracefully
- Use charts for visual representation of breakdowns

### API Call:

```typescript
GET /api/projects/stats
Headers: {
  Authorization: Bearer {token},
  Accept: application/json
}
```
