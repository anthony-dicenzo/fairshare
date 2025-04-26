import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper to append auth data to requests via headers when cookies aren't working
function getAuthHeaders() {
  const headers: Record<string, string> = {};
  
  // Try to get auth data from localStorage for mobile devices where cookies often fail
  try {
    const authData = localStorage.getItem("fairshare_auth_state");
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.userId && parsed.sessionId) {
        headers["X-Session-Backup"] = parsed.sessionId;
        headers["X-User-Id"] = parsed.userId.toString();
      }
    }
  } catch (e) {
    console.error("Error getting auth headers:", e);
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Attempt to parse error first as JSON
    try {
      const errorData = await res.json();
      throw new Error(errorData.error || `${res.status}: ${res.statusText}`);
    } catch (e) {
      // If parsing as JSON fails, fallback to text
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Include auth headers for all requests
  const authHeaders = getAuthHeaders();
  
  const headers: Record<string, string> = {
    ...authHeaders,
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Function to attempt backup authentication and then retry the original request
async function tryBackupAuth() {
  try {
    const authData = localStorage.getItem("fairshare_auth_state");
    if (!authData) return null;
    
    const parsed = JSON.parse(authData);
    if (!parsed.userId || !parsed.sessionId) return null;
    
    console.log("Attempting backup authentication with stored credentials");
    
    const backupRes = await fetch(`/api/users/${parsed.userId}`, {
      headers: {
        "X-Session-Backup": parsed.sessionId
      },
      credentials: "include"
    });
    
    if (backupRes.ok) {
      console.log("Backup authentication successful");
      return true;
    }
    
    console.log("Backup authentication failed");
    return null;
  } catch (e) {
    console.error("Error in backup auth:", e);
    return null;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Include auth headers for all requests
    const authHeaders = getAuthHeaders();
    
    let res = await fetch(queryKey[0] as string, {
      headers: authHeaders,
      credentials: "include",
    });

    // If unauthorized, try backup authentication
    if (res.status === 401) {
      const backupAuthSuccess = await tryBackupAuth();
      
      if (backupAuthSuccess) {
        // Retry the request with fresh auth
        res = await fetch(queryKey[0] as string, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
      }
      
      // If still unauthorized and config says returnNull
      if (res.status === 401 && unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
