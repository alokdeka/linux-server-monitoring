import { Outlet } from 'react-router-dom';
import './MainContent.css';

interface MainContentProps {
  sidebarOpen: boolean;
}

const MainContent = ({ sidebarOpen }: MainContentProps) => {
  return (
    <main
      className={`main-content ${sidebarOpen ? 'main-content-expanded' : 'main-content-collapsed'}`}
    >
      <div className="content-wrapper">
        <Outlet />
      </div>
    </main>
  );
};

export default MainContent;
