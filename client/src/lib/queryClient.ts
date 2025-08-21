import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { OrgContext } from "./orgContext";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const orgId = OrgContext.getOrgId();
  console.log(`[API Request] Sending X-Org-Id header: ${orgId} for ${method} ${url}`);
  
  const headers: Record<string, string> = {
    "X-Org-Id": orgId,
  };
  
  // Add JWT token for external API calls (needed for Excel import employee mapping)
  const jwtToken = localStorage.getItem('jwt_token');
  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
    console.log(`[API Request] Adding Authorization header with JWT token for ${url}`);
  }
  
  let body: any = undefined;
  
  if (data) {
    if (data instanceof FormData) {
      // For FormData (file uploads), don't set Content-Type - browser will set it with boundary
      body = data;
    } else {
      // For JSON data, set Content-Type and stringify
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const orgId = OrgContext.getOrgId();
    console.log(`[Query Request] Sending X-Org-Id header: ${orgId} for GET ${queryKey[0]}`);
    
    const headers: Record<string, string> = {
      "X-Org-Id": orgId,
    };
    
    // Add JWT token for authenticated requests
    const jwtToken = localStorage.getItem('jwt_token');
    if (jwtToken) {
      headers["Authorization"] = `Bearer ${jwtToken}`;
      console.log(`[Query Request] Adding Authorization header with JWT token for ${queryKey[0]}`);
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
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
