import { Outlet } from 'react-router-dom';
import Header from './Header';
import './MainContent.css';

interface MainContentProps {
  sidebarOpen: boolean;
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}

const MainContent = ({ sidebarOpen, user, onLogout }: MainContentProps) => {
  return (
    <main
      className={`main-content ${sidebarOpen ? 'main-content-expanded' : 'main-content-collapsed'}`}
    >
      <Header user={user} onLogout={onLogout} />
      <div className="content-wrapper">
        <Outlet />
      </div>
    </main>
  );
};

export default MainContent;
