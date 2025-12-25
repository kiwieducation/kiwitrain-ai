export default function Home() {
  // 线上/本地都直接走 dashboard
  // 这里不用任何 session / permissions / supabase，避免构建缺失依赖
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <meta httpEquiv="refresh" content="0; url=/dashboard" />
      <p>Redirecting to dashboard…</p>
    </main>
  );
}
