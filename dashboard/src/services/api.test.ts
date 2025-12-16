import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './api';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('getServers', () => {
    it('fetches servers successfully', async () => {
      const mockResponse = {
        servers: [
          {
            id: 1,
            server_id: 'server-1',
            hostname: 'test-server',
            ip_address: '192.168.1.100',
            registered_at: '2024-01-01T00:00:00Z',
            last_seen: new Date().toISOString(),
            is_active: true,
          },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']]),
      });

      const result = await apiClient.getServers();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/servers',
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('server-1');
      expect(result[0].hostname).toBe('test-server');
    });

    it('handles API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'Server error' }),
      });

      await expect(apiClient.getServers()).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('includes auth token in requests when available', async () => {
      localStorageMock.getItem.mockReturnValue('test-token');

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ servers: [] }),
        headers: new Map([['content-type', 'application/json']]),
      });

      await apiClient.getServers();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/servers',
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );
    });

    it('login returns auth token', async () => {
      const mockResponse = {
        access_token: 'new-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']]),
      });

      const result = await apiClient.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123',
        }),
      });
      expect(result.token).toBe('new-token');
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new TypeError('Network error'));

      await expect(apiClient.getServers()).rejects.toThrow('Network error');
    });

    it('handles 404 errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Not found' }),
      });

      await expect(apiClient.getServers()).rejects.toThrow(
        'Resource not found'
      );
    });
  });
});
