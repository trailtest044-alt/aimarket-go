import { useEffect, useState } from "react";
import { isAdminAuthed } from "@/lib/api";

export function useAdminAuthReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(isAdminAuthed());
  }, []);

  return ready;
}
