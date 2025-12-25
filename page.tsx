"use client";

export default function Page() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>📊 总览 Dashboard</h1>
      <p style={{ color: '#64748b', marginTop: 8 }}>
        查看公司培训整体情况与员工学习进度
      </p>

      <div style={{ marginTop: 32, padding: 24, border: '1px dashed #cbd5f5', borderRadius: 12 }}>
        <p style={{ fontSize: 14, color: '#475569' }}>
          这是一个<strong>可持续、可维护</strong>的 Dashboard 页面占位文件。
        </p>
        <p style={{ fontSize: 14, color: '#475569', marginTop: 8 }}>
          我已经为你准备好了完整的设计方案与结构，下一步我会在此基础上逐步补齐：
        </p>
        <ul style={{ marginTop: 12, paddingLeft: 20, color: '#475569', fontSize: 14 }}>
          <li>统计卡片 + 图标</li>
          <li>部门培训进度</li>
          <li>员工头像与任务进度</li>
          <li>点击员工查看详情</li>
          <li>与 Supabase 的正式数据绑定</li>
        </ul>
        <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>
          （当前文件用于验证 GitHub 替换流程是通的）
        </p>
      </div>
    </div>
  );
}
