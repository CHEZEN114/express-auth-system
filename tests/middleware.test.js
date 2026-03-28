/**
 * 中间件测试
 */
const { requireAuth, requireGuest, requireRole } = require('../middleware/auth');

describe('认证中间件', () => {
  describe('requireAuth', () => {
    test('应该允许已登录用户访问', () => {
      const req = {
        session: { user: { id: '123', username: 'testuser' } },
        flash: jest.fn(),
        originalUrl: '/protected'
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    test('应该重定向未登录用户到登录页', () => {
      const req = {
        session: {},
        flash: jest.fn(),
        originalUrl: '/protected'
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(req.session.returnTo).toBe('/protected');
      expect(req.flash).toHaveBeenCalledWith('error', '请先登录');
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    test('应该重定向无 session 用户到登录页', () => {
      const req = {
        flash: jest.fn(),
        originalUrl: '/protected'
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', '请先登录');
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireGuest', () => {
    test('应该重定向已登录用户到用户中心', () => {
      const req = {
        session: { user: { id: '123', username: 'testuser' } }
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      requireGuest(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });

    test('应该允许未登录用户访问', () => {
      const req = {
        session: {}
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      requireGuest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    test('应该允许无 session 用户访问', () => {
      const req = {};
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      requireGuest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    test('应该允许具有正确角色的用户访问', () => {
      const req = {
        session: { user: { id: '123', username: 'admin', role: 'admin' } },
        flash: jest.fn()
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    test('应该拒绝不具有正确角色的用户', () => {
      const req = {
        session: { user: { id: '123', username: 'user', role: 'user' } },
        flash: jest.fn()
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', '您没有权限访问此页面');
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    test('应该重定向未登录用户', () => {
      const req = {
        session: {},
        flash: jest.fn()
      };
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error', '请先登录');
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
