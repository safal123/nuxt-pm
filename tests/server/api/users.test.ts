import { beforeEach, describe, it, vi, expect, beforeAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
  },
}));

describe('API Endpoint: GET /api/users', () => {
  beforeAll(async () => {
    await setup({
      server: true,
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });


  it('should return 401 if user ID is not found in session claims', async () => {
    try {
      await $fetch('/api/users');
      expect.fail('Expected a 401 error but request succeeded');
    } catch (error: any) {
      console.log('error', error.response);
      expect(error.response.status).toBe(401);
      expect(error.response._data).toMatchObject({
        statusCode: 401,
        statusMessage: 'Unauthorized: User ID not found in session claims.',
      });
    }
  });
});