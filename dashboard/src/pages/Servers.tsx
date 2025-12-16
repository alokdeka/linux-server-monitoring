import React from 'react';
import { ServerGrid } from '../components/servers';
import './Servers.css';

const Servers: React.FC = () => {

  return (
    <div className="servers-page">
      <div className="servers-content">
        <ServerGrid />
      </div>
    </div>
  );
};

export default Servers;