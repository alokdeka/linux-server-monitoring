import React from 'react';
import { ServerGrid } from '../components/servers';
import './Servers.css';

const Servers: React.FC = () => {
  return (
    <div className="servers-page">
      <div className="page-header">
        <h1>Servers</h1>
        <p>
          Manage and monitor all your servers from this centralized dashboard.
        </p>
      </div>

      <ServerGrid />
    </div>
  );
};

export default Servers;
