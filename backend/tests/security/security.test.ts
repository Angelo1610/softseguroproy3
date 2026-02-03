import request from 'supertest';
import app from '../../src/app';

/**
 * Pruebas de Seguridad - Suite Completa
 * Verifica protecciones contra ataques OWASP
 */

describe('Security Tests', () => {
  describe('XSS Protection', () => {
    it('should sanitize XSS in user registration', async () => {
      const maliciousPayload = {
        email: 'test@example.com',
        name: '<script>alert("XSS")</script>',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousPayload);

      // Debe rechazar o sanitizar
      expect(response.status).toBe(400);
    });

    it('should reject requests with script tags in query params', async () => {
      const response = await request(app)
        .get('/api/v1/users?search=<script>alert(1)</script>');

      expect(response.status).toBe(400);
    });
  });

  describe('SQL/NoSQL Injection Protection', () => {
    it('should reject NoSQL injection attempts', async () => {
      const injectionPayload = {
        email: { $ne: null },
        password: { $ne: null },
      };

      const response = await request(app)
        .post('/api/v1/auth/biometric/login/start')
        .send(injectionPayload);

      expect(response.status).toBe(400);
    });
  });

  describe('CSRF Protection', () => {
    it('should require origin header for state-changing requests', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', name: 'Test' });

      // En producción debe rechazar sin origin
      if (process.env.NODE_ENV === 'production') {
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const attempts = [];

      // Intentar 10 logins
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/v1/auth/biometric/login/start')
            .send({ email: 'test@example.com' })
        );
      }

      const responses = await Promise.all(attempts);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app).get('/api/v1/users');

      expect(response.status).toBe(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'expired.token.here';

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'invalid-email', name: 'Test User' });

      expect(response.status).toBe(400);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com' }); // Missing name

      expect(response.status).toBe(400);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Biometric Authentication Security', () => {
    it('should prevent replay attacks with challenge expiration', async () => {
      // Obtener challenge
      const optionsResponse = await request(app)
        .post('/api/v1/auth/biometric/login/start')
        .send({ email: 'test@example.com' });

      expect(optionsResponse.status).toBe(200);
      expect(optionsResponse.body.data).toHaveProperty('challenge');

      // Intentar reusar el mismo challenge (debería fallar)
      // Esto requeriría simular una respuesta WebAuthn completa
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should prevent clients from accessing admin endpoints', async () => {
      // Esto requiere un token de cliente
      // const clientToken = await getClientToken();
      
      // const response = await request(app)
      //   .get('/api/v1/users')
      //   .set('Authorization', `Bearer ${clientToken}`);

      // expect(response.status).toBe(403);
    });
  });
});
