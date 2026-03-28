/**
 * 测试环境设置验证
 */

describe('测试环境', () => {
  test('Jest 应该正常工作', () => {
    expect(true).toBe(true);
  });

  test('异步测试应该工作', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });

  test('环境变量应该已设置', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
