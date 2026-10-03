import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ acquisition: vi.fn(), insert: vi.fn(), single: vi.fn() }));
vi.mock('@/lib/growth/acquisition', () => ({ currentAcquisition: mocks.acquisition }));
vi.mock('../client', () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
import { createActionLog } from './logAction';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
  mocks.single.mockResolvedValue({ data: { id: 'test-action' }, error: null });
});
describe('action acquisition context', () => {
  it('preserves operational filters while attaching the original landing', async () => {
    const acquisition = { landing: '/blog/clean-up-gmail', channel: 'google', at: 100 };
    mocks.acquisition.mockReturnValue(acquisition);
    await createActionLog({ user_id: 'test-user', type: 'analysis', status: 'started', filters: { mode: 'quick' } });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ filters: { mode: 'quick', acquisition }, status: 'started', completed_at: null }));
  });
  it('leaves ordinary actions untouched when there is no valid attribution', async () => {
    mocks.acquisition.mockReturnValue(null);
    await createActionLog({ user_id: 'test-user', type: 'delete', status: 'started', filters: { mode: 'trash' } });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ filters: { mode: 'trash' } }));
  });
});
