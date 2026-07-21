import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { WebhookService } from './WebhookService';
import { getDatabaseService } from '../db/database';
import { SiteChange } from '../types/monitoring';

vi.mock('axios');
vi.mock('../db/database', () => ({
  getDatabaseService: vi.fn(),
}));

describe('WebhookService', () => {
  let service: WebhookService;
  const mockChange: SiteChange = {
    id: 'change-1',
    site_id: 'site-1',
    url: 'https://example.com/page1',
    title: 'Page 1',
    type: 'added',
    discovered_at: '2025-01-01T00:00:00.000Z',
    notified: false,
    created_at: '2025-01-01T00:00:00.000Z',
  };
  const mockDb = {
    markChangesNotified: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookService();
    (getDatabaseService as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  describe('notifyChange', () => {
    it('should send POST request to webhook URL and mark notified on success', async () => {
      (axios.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200 });

      const result = await service.notifyChange(
        'https://example.com',
        'site-1',
        mockChange,
        'https://hooks.example.com/webhook'
      );

      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://hooks.example.com/webhook',
        expect.objectContaining({
          event: 'site.change.detected',
          site: { id: 'site-1', url: 'https://example.com' },
          change: { id: 'change-1', url: 'https://example.com/page1', title: 'Page 1', discovered_at: '2025-01-01T00:00:00.000Z' },
        }),
        expect.objectContaining({ timeout: 10000 })
      );
      expect(mockDb.markChangesNotified).toHaveBeenCalledWith(['change-1']);
    });

    it('should return false when webhook is unreachable', async () => {
      (axios.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const result = await service.notifyChange(
        'https://example.com',
        'site-1',
        mockChange,
        'https://hooks.example.com/webhook'
      );

      expect(result).toBe(false);
      expect(mockDb.markChangesNotified).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      (axios.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue('Unknown error string');

      const result = await service.notifyChange(
        'https://example.com',
        'site-1',
        mockChange,
        'https://hooks.example.com/webhook'
      );

      expect(result).toBe(false);
    });
  });

  describe('notifyChanges', () => {
    it('should notify multiple changes and return counts', async () => {
      const changes: SiteChange[] = [
        mockChange,
        { ...mockChange, id: 'change-2', url: 'https://example.com/page2' },
        { ...mockChange, id: 'change-3', url: 'https://example.com/page3' },
      ];
      (axios.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200 });

      const result = await service.notifyChanges(
        'https://example.com',
        'site-1',
        changes,
        'https://hooks.example.com/webhook'
      );

      expect(result).toEqual({ notified: 3, failed: 0 });
      expect(axios.post).toHaveBeenCalledTimes(3);
      expect(mockDb.markChangesNotified).toHaveBeenCalledTimes(3);
    });

    it('should count failed notifications', async () => {
      const changes: SiteChange[] = [
        mockChange,
        { ...mockChange, id: 'change-2' },
      ];
      (axios.post as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ status: 200 })
        .mockRejectedValueOnce(new Error('Timeout'));

      const result = await service.notifyChanges(
        'https://example.com',
        'site-1',
        changes,
        'https://hooks.example.com/webhook'
      );

      expect(result).toEqual({ notified: 1, failed: 1 });
    });
  });
});
