import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('TakeAway App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.AUTH_MOCK_ENABLED = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health'],
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  describe('User-scoped Database', () => {
    const aliceAuth = 'Bearer mock-token:alice';
    const bobAuth = 'Bearer mock-token:bob';

    it('should isolate categories and allow identical slugs for different users', async () => {
      const testSlug = `doc-${Date.now()}`;

      // Alice creates a category
      const aliceCatRes = await request(app.getHttpServer())
        .post('/api/catalog/categories')
        .set('Authorization', aliceAuth)
        .send({ name: 'Documenti Personali', slug: testSlug })
        .expect(201);

      expect(aliceCatRes.body.slug).toBe(testSlug);
      expect(aliceCatRes.body.name).toBe('Documenti Personali');
      const aliceCatId = aliceCatRes.body.id;

      // Bob creates a category with the EXACT same slug
      const bobCatRes = await request(app.getHttpServer())
        .post('/api/catalog/categories')
        .set('Authorization', bobAuth)
        .send({ name: 'Documenti Bob', slug: testSlug })
        .expect(201);

      expect(bobCatRes.body.slug).toBe(testSlug);
      expect(bobCatRes.body.id).not.toBe(aliceCatId);

      // Alice fetches categories: sees only her own
      const aliceList = await request(app.getHttpServer())
        .get('/api/catalog/categories')
        .set('Authorization', aliceAuth)
        .expect(200);
      const aliceItem = aliceList.body.find((c: any) => c.id === aliceCatId);
      expect(aliceItem).toBeDefined();
      expect(aliceList.body.some((c: any) => c.id === bobCatRes.body.id)).toBe(false);

      // Bob fetches categories: does not see Alice's category
      const bobList = await request(app.getHttpServer())
        .get('/api/catalog/categories')
        .set('Authorization', bobAuth)
        .expect(200);
      const bobItem = bobList.body.find((c: any) => c.id === bobCatRes.body.id);
      expect(bobItem).toBeDefined();
      expect(bobList.body.some((c: any) => c.id === aliceCatId)).toBe(false);

      // Bob cannot view or delete Alice's category
      await request(app.getHttpServer())
        .get(`/api/catalog/categories/${aliceCatId}`)
        .set('Authorization', bobAuth)
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/catalog/categories/${aliceCatId}`)
        .set('Authorization', bobAuth)
        .expect(404);

      // Clean up
      await request(app.getHttpServer())
        .delete(`/api/catalog/categories/${aliceCatId}`)
        .set('Authorization', aliceAuth)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/catalog/categories/${bobCatRes.body.id}`)
        .set('Authorization', bobAuth)
        .expect(200);
    });

    it('should isolate items and prevent cross-user access', async () => {
      // Alice creates an item
      const aliceItemRes = await request(app.getHttpServer())
        .post('/api/catalog/items')
        .set('Authorization', aliceAuth)
        .send({ name: `Passaporto Alice ${Date.now()}`, defaultQuantity: 1 })
        .expect(201);

      const aliceItemId = aliceItemRes.body.id;

      // Bob fetches items: does not see Alice's item
      const bobItems = await request(app.getHttpServer())
        .get('/api/catalog/items')
        .set('Authorization', bobAuth)
        .expect(200);
      expect(bobItems.body.some((i: any) => i.id === aliceItemId)).toBe(false);

      // Bob cannot access or update Alice's item
      await request(app.getHttpServer())
        .get(`/api/catalog/items/${aliceItemId}`)
        .set('Authorization', bobAuth)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/api/catalog/items/${aliceItemId}`)
        .set('Authorization', bobAuth)
        .send({ name: 'Hacked Item' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/catalog/items/${aliceItemId}`)
        .set('Authorization', bobAuth)
        .expect(404);

      // Bob creates a trip and cannot add Alice's item
      const bobTripRes = await request(app.getHttpServer())
        .post('/api/trips')
        .set('Authorization', bobAuth)
        .send({ title: 'Viaggio di Bob' })
        .expect(201);
      const bobTripId = bobTripRes.body.id;

      await request(app.getHttpServer())
        .put(`/api/trips/${bobTripId}/items/${aliceItemId}`)
        .set('Authorization', bobAuth)
        .send({ status: 'packed', quantity: 1 })
        .expect(404);

      // Clean up
      await request(app.getHttpServer())
        .delete(`/api/catalog/items/${aliceItemId}`)
        .set('Authorization', aliceAuth)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/trips/${bobTripId}`)
        .set('Authorization', bobAuth)
        .expect(200);
    });
  });
});
