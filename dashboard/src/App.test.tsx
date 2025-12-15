import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

describe('App', () => {
  it('renders the header title', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(screen.getByText('Server Health Monitor')).toBeInTheDocument();
  });

  it('shows dashboard page content', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(
      screen.getByText(
        'Monitor your server infrastructure in real-time with comprehensive metrics and alerts.'
      )
    ).toBeInTheDocument();
  });
});
