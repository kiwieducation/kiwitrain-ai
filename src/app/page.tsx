"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const user = await getSessionUser();
      if (!user) {
        router.replace("/login");
      } else {
        router.replace("/dashboard");
      }
    })();
  }, [router]);

  // 首页只是跳转用，不渲染任何 UI
  return null;
}
