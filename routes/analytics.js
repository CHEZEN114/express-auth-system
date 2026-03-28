/**
 * 数据分析路由
 * Phase 10: 数据分析
 */
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/admin');

// 用户增长统计
router.get('/analytics/user-growth', requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // 模拟数据 - 实际应从数据库统计
    const data = Array.from({ length: parseInt(days) }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      newUsers: Math.floor(Math.random() * 50) + 10,
      activeUsers: Math.floor(Math.random() * 500) + 100
    }));
    
    res.json({
      success: true,
      data: {
        growth: data,
        summary: {
          totalNew: data.reduce((sum, d) => sum + d.newUsers, 0),
          averageDaily: Math.round(data.reduce((sum, d) => sum + d.newUsers, 0) / days)
        }
      }
    });
  } catch (error) {
    console.error('用户增长统计错误:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 登录分析
router.get('/analytics/login-stats', requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: Math.floor(Math.random() * 100)
        })),
        success: { count: 8542, rate: 96.5 },
        failure: { count: 312, rate: 3.5 }
      }
    });
  } catch (error) {
    console.error('登录分析错误:', error);
    res.status(500).json({ success: false, message: '获取分析失败' });
  }
});

// 系统健康检查
router.get('/health/system', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.version
  };
  
  res.json({ success: true, data: health });
});

module.exports = router;
