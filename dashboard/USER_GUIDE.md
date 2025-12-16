# Server Monitoring Dashboard - User Guide

Welcome to the Server Health Monitoring Dashboard! This guide will help you navigate and use all the features of the web interface to effectively monitor your Linux servers.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Server Monitoring](#server-monitoring)
4. [Alert Management](#alert-management)
5. [Server Management](#server-management)
6. [Settings & Configuration](#settings--configuration)
7. [Mobile & Responsive Usage](#mobile--responsive-usage)
8. [Troubleshooting](#troubleshooting)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [FAQ](#faq)

## 🚀 Getting Started

### First Time Login

1. **Access the Dashboard**
   - Open your web browser and navigate to the dashboard URL
   - Default: `http://localhost:3000` (development) or your configured domain

2. **Login Process**
   - Enter your username and password
   - Click "Sign In" or press Enter
   - You'll be redirected to the main dashboard upon successful authentication

3. **Initial Setup**
   - If no servers are registered, you'll see a welcome message with setup instructions
   - Follow the server registration process to add your first server

### Navigation Overview

The dashboard uses a clean, intuitive layout:

- **Header**: Contains the application title, user menu, and theme toggle
- **Sidebar**: Main navigation menu (collapsible on mobile)
- **Main Content**: Primary content area that changes based on your selection
- **Footer**: Connection status and system information

## 🏠 Dashboard Overview

### Main Dashboard Page

The main dashboard provides a comprehensive overview of your entire server infrastructure:

#### Server Grid

- **Server Cards**: Each monitored server is displayed as a card showing:
  - Server hostname and IP address
  - Current status (Online, Offline, Warning)
  - Key metrics: CPU usage, Memory usage, Disk usage
  - Last seen timestamp
  - Quick action buttons

#### Status Indicators

- 🟢 **Green**: Server is online and healthy
- 🟡 **Yellow**: Server is online but has warnings (high resource usage)
- 🔴 **Red**: Server is offline or has critical issues
- ⚪ **Gray**: Server status unknown or initializing

#### Real-time Updates

- Server metrics automatically refresh every 30 seconds
- Status changes appear immediately via WebSocket connections
- Connection status indicator shows real-time connectivity

### Quick Actions

- **View Details**: Click any server card to see detailed metrics
- **Refresh Data**: Manual refresh button for immediate updates
- **Filter Servers**: Search and filter servers by name or status

## 🖥 Server Monitoring

### Server Details View

Click on any server card to access the detailed monitoring view:

#### Metrics Charts

Interactive charts display historical data for:

1. **CPU Usage**
   - Real-time and historical CPU utilization
   - Load average (1min, 5min, 15min)
   - Per-core usage breakdown (if available)

2. **Memory Usage**
   - Total, used, and available memory
   - Memory percentage utilization
   - Swap usage information

3. **Disk Usage**
   - Usage by filesystem/mount point
   - Available space and percentage used
   - I/O statistics (if available)

#### Time Range Selection

Choose different time periods for historical data:

- **1 Hour**: Detailed recent activity
- **6 Hours**: Short-term trends
- **24 Hours**: Daily patterns
- **7 Days**: Weekly trends and patterns

#### System Information Panel

- **Uptime**: How long the server has been running
- **Operating System**: OS version and kernel information
- **Hardware**: CPU model, memory size, disk capacity
- **Network**: IP addresses and network interfaces

#### Failed Services

- **Service List**: All failed systemd services
- **Timestamps**: When each service failed
- **Status Details**: Reason for failure (if available)
- **Quick Actions**: Restart or investigate service issues

### Monitoring Features

#### Auto-refresh

- Metrics update automatically every 30 seconds
- Configurable refresh intervals in settings
- Manual refresh option always available

#### Alerts Integration

- Visual indicators when servers exceed thresholds
- Alert badges on server cards
- Direct links to alert details

#### Performance Optimization

- Efficient data loading with pagination
- Cached data for improved responsiveness
- Optimized for large numbers of servers

## 🚨 Alert Management

### Alert Panel

The alert system provides comprehensive monitoring and notification:

#### Active Alerts

- **Current Issues**: All active alerts requiring attention
- **Severity Levels**:
  - ⚠️ **Warning**: Issues that need monitoring
  - 🚨 **Critical**: Issues requiring immediate action
- **Alert Types**:
  - CPU usage exceeding thresholds
  - Memory usage too high
  - Disk space running low
  - Server offline/unreachable
  - Failed services detected

#### Alert Details

Click on any alert to see:

- **Full Description**: Detailed explanation of the issue
- **Affected Server**: Which server triggered the alert
- **Threshold Values**: What limit was exceeded
- **Current Values**: Actual measurements
- **Timeline**: When the alert was triggered
- **Suggested Actions**: Recommended steps to resolve

### Alert History

Access historical alert data:

#### Filtering Options

- **Date Range**: Filter by time period
- **Server**: Show alerts for specific servers
- **Severity**: Filter by warning or critical alerts
- **Status**: Active, resolved, or acknowledged alerts

#### Alert Resolution

- **Acknowledge**: Mark alerts as seen/being handled
- **Resolve**: Mark issues as fixed
- **Notes**: Add comments about resolution steps

### Real-time Notifications

#### Toast Notifications

- **Immediate Alerts**: Pop-up notifications for new alerts
- **Status Changes**: Server online/offline notifications
- **System Messages**: Important system updates

#### Notification Settings

Configure how you receive alerts:

- **Browser Notifications**: Desktop notifications (requires permission)
- **Sound Alerts**: Audio notifications for critical issues
- **Webhook Integration**: Send alerts to external systems (Slack, email, etc.)

## 🔧 Server Management

### Server Registration

Add new servers to monitoring:

#### Registration Process

1. **Access Server Management**: Navigate to the "Servers" section
2. **Add New Server**: Click "Register New Server"
3. **Server Information**: Enter server details:
   - Hostname or IP address
   - Description (optional)
   - Environment (production, staging, development)
4. **Generate API Key**: System creates unique API key for the server
5. **Agent Installation**: Follow provided instructions to install the monitoring agent

#### API Key Management

- **View Keys**: See all generated API keys
- **Regenerate**: Create new keys if compromised
- **Revoke**: Disable keys for decommissioned servers
- **Copy to Clipboard**: Easy copying for agent configuration

### Server Configuration

#### Server Details

- **Edit Information**: Update server descriptions and metadata
- **Environment Tags**: Organize servers by environment or purpose
- **Monitoring Settings**: Configure specific monitoring parameters

#### Deregistration

- **Remove Servers**: Safely remove servers from monitoring
- **Data Cleanup**: Option to preserve or delete historical data
- **Confirmation**: Safety prompts to prevent accidental removal

## ⚙️ Settings & Configuration

### User Preferences

#### Display Settings

- **Theme Selection**: Choose between light and dark themes
- **Refresh Intervals**: Customize how often data updates
- **Compact Mode**: Denser layout for more information on screen
- **Chart Preferences**: Enable/disable specific chart types

#### Dashboard Layout

- **Default View**: Set your preferred starting page
- **Grid Size**: Adjust server card size and layout
- **Sidebar Behavior**: Auto-collapse or always visible

### Alert Configuration

#### Threshold Settings

Customize when alerts are triggered:

- **CPU Thresholds**:
  - Warning: Default 80%
  - Critical: Default 90%
- **Memory Thresholds**:
  - Warning: Default 85%
  - Critical: Default 95%
- **Disk Thresholds**:
  - Warning: Default 85%
  - Critical: Default 95%

#### Notification Preferences

- **Alert Frequency**: How often to send repeat notifications
- **Quiet Hours**: Disable non-critical alerts during specific times
- **Escalation Rules**: Automatic escalation for unacknowledged alerts

### Integration Settings

#### Webhook Configuration

Set up external integrations:

- **Slack Integration**: Send alerts to Slack channels
- **Email Notifications**: Configure SMTP settings
- **Custom Webhooks**: Integration with other monitoring tools
- **Webhook Testing**: Verify configurations work correctly

#### API Settings

- **Rate Limiting**: Configure API request limits
- **Timeout Settings**: Adjust connection timeout values
- **Retry Behavior**: Configure automatic retry attempts

### Data Management

#### Data Retention

- **Metrics Storage**: How long to keep historical data
- **Alert History**: Retention period for alert records
- **Log Files**: System log retention settings

#### Export Options

- **Data Export**: Download metrics data in CSV/JSON format
- **Report Generation**: Create summary reports
- **Backup Settings**: Export configuration for backup

## 📱 Mobile & Responsive Usage

### Mobile Interface

The dashboard is fully optimized for mobile devices:

#### Navigation

- **Hamburger Menu**: Collapsible sidebar for mobile
- **Touch Gestures**: Swipe navigation between sections
- **Bottom Navigation**: Quick access to main sections

#### Mobile-Specific Features

- **Simplified Cards**: Condensed server information for small screens
- **Touch-Friendly Buttons**: Larger touch targets
- **Optimized Charts**: Charts adapted for mobile viewing
- **Pull-to-Refresh**: Refresh data with pull gesture

### Tablet Experience

- **Hybrid Layout**: Combines desktop and mobile features
- **Split View**: Side-by-side content when space allows
- **Landscape Optimization**: Better use of horizontal space
- **Touch and Keyboard**: Support for both input methods

### Responsive Breakpoints

- **Mobile**: < 768px - Single column, stacked layout
- **Tablet**: 768px - 1024px - Two-column layout with collapsible sidebar
- **Desktop**: > 1024px - Full multi-column layout with persistent sidebar

## 🔍 Troubleshooting

### Common Issues

#### Connection Problems

**Symptoms**: "Connection Lost" indicator, no data updates
**Solutions**:

1. Check your internet connection
2. Verify the API server is running
3. Check browser console for error messages
4. Try refreshing the page

#### Login Issues

**Symptoms**: Cannot log in, "Invalid credentials" error
**Solutions**:

1. Verify username and password
2. Check if account is locked
3. Clear browser cache and cookies
4. Contact administrator for password reset

#### Performance Issues

**Symptoms**: Slow loading, unresponsive interface
**Solutions**:

1. Close unnecessary browser tabs
2. Clear browser cache
3. Check system resources (RAM, CPU)
4. Try a different browser

#### Data Not Updating

**Symptoms**: Stale data, metrics not refreshing
**Solutions**:

1. Check WebSocket connection status
2. Verify server agents are running
3. Check network connectivity
4. Manual refresh to force update

### Browser Compatibility

#### Supported Browsers

- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

#### Known Issues

- **Internet Explorer**: Not supported
- **Older Mobile Browsers**: Limited functionality
- **Ad Blockers**: May interfere with WebSocket connections

### Getting Help

#### Built-in Help

- **Tooltips**: Hover over elements for quick help
- **Help Icons**: Click for contextual assistance
- **Status Messages**: System provides feedback on actions

#### Support Resources

- **Documentation**: Comprehensive guides and references
- **FAQ Section**: Common questions and answers
- **Contact Support**: Direct access to technical support

## ⌨️ Keyboard Shortcuts

### Global Shortcuts

- `Ctrl/Cmd + R`: Refresh current page
- `Ctrl/Cmd + F`: Search/filter current view
- `Esc`: Close modals and overlays
- `Tab`: Navigate between interactive elements

### Navigation Shortcuts

- `1`: Go to Dashboard
- `2`: Go to Servers
- `3`: Go to Alerts
- `4`: Go to Settings
- `?`: Show keyboard shortcuts help

### Dashboard Shortcuts

- `Space`: Refresh all data
- `Enter`: Open selected server details
- `Arrow Keys`: Navigate between server cards

### Accessibility Features

- **Screen Reader Support**: Full ARIA labels and descriptions
- **High Contrast Mode**: Enhanced visibility options
- **Keyboard Navigation**: Complete keyboard accessibility
- **Focus Indicators**: Clear visual focus indicators

## ❓ FAQ

### General Questions

**Q: How often does the dashboard update data?**
A: By default, metrics update every 30 seconds. You can customize this interval in Settings.

**Q: Can I monitor servers on different networks?**
A: Yes, as long as the servers can reach the monitoring server API endpoint.

**Q: Is there a limit to how many servers I can monitor?**
A: The system is designed to scale. Performance depends on your server resources and configuration.

**Q: Can I access the dashboard from mobile devices?**
A: Yes, the dashboard is fully responsive and optimized for mobile and tablet use.

### Technical Questions

**Q: What browsers are supported?**
A: Modern browsers including Chrome, Firefox, Safari, and Edge. Internet Explorer is not supported.

**Q: How is data secured?**
A: All communication uses HTTPS, authentication is JWT-based, and data is encrypted in transit.

**Q: Can I integrate with other monitoring tools?**
A: Yes, through webhook integrations and the REST API for custom integrations.

**Q: How long is historical data retained?**
A: Default retention is configurable in settings. Typical setups retain 30-90 days of detailed metrics.

### Troubleshooting Questions

**Q: Why am I not receiving alert notifications?**
A: Check your notification settings, browser permissions, and webhook configurations.

**Q: What should I do if a server shows as offline but it's running?**
A: Verify the monitoring agent is running and can communicate with the server. Check network connectivity and firewall settings.

**Q: How do I reset my password?**
A: Contact your system administrator or use the password reset feature if enabled.

**Q: Why are some features not working on mobile?**
A: Ensure you're using a supported mobile browser and have a stable internet connection. Some advanced features may be limited on very small screens.

---

## 📞 Support & Feedback

If you need additional help or have suggestions for improving the dashboard:

- **Documentation**: Check the complete documentation in the `/docs` folder
- **Issues**: Report bugs or request features on GitHub
- **Support**: Contact your system administrator or technical support team
- **Community**: Join discussions and share tips with other users

Thank you for using the Server Health Monitoring Dashboard! We hope this guide helps you make the most of all the available features.
